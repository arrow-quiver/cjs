/**
 * THE JOBS PIPELINE, AGAINST A REAL DATABASE.
 *
 * What #32 promises, each held where it is kept: a job is started for this business's client and
 * no other; its status moves only because somebody moved it, to any status; money never moves it,
 * so paying every invoice on a job leaves it exactly where it was; and the list pages and counts
 * the whole pipeline rather than stopping at a cap.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { NO_ACCESS } from '$lib/core/modules/catalogue';
import { commercialSentence, type JobStatus } from '$lib/core/jobs';
import { closePool, runScoped } from '$lib/server/core/db/client';
import {
	cleanupFixtures,
	createBusiness,
	createCustomer,
	createUser,
	messageFromRejection,
	type TestBusiness
} from '$lib/server/core/db/fixtures';
import { business as businessTable } from '$lib/server/core/db/schema/core';
import { job } from '$lib/server/core/db/schema/jobs';
import { toBusiness } from '$lib/server/core/db/map';
import type { Tx } from '$lib/server/core/db/tx';
import { ClientNotFound } from '$lib/server/core/customers';
import { countJobs, jobCommercialState, loadPipelineJob, pageJobs } from '$lib/server/core/jobs';
import { createEmployee, createTeam, setMembership } from '$lib/server/core/people';
import { JobNotFound, scheduleJob, setJobStatus, startJob, unscheduleEntry } from './effects';
import { jobSlots, weekEntries } from './queries';
import { summariseScheduling } from './summary';
import { parseNewJob, parseScheduleEntry, parseStatus } from './wire';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 300_000 });

let mine: TestBusiness;
let theirs: TestBusiness;
let myClient: string;
let theirClient: string;

function as<T>(business: TestBusiness, fn: (tx: Tx) => Promise<T>): Promise<T> {
	return runScoped(business.id, business.ownerUserId, fn);
}

beforeAll(async () => {
	mine = await createBusiness((await createUser('Alice Thornhill')).id, 'Thornhill Joinery');
	theirs = await createBusiness((await createUser('Bob Bayside')).id, 'Bayside Plumbing');
	myClient = await createCustomer(mine, 'Fynbos Interiors');
	theirClient = await createCustomer(theirs, 'Harbour Deli');
});

afterAll(async () => {
	await cleanupFixtures();
	await closePool();
});

const start = (service: string, business = mine, customerId = myClient) =>
	as(business, (tx) =>
		startJob(tx, business.id, business.ownerUserId, {
			customerId,
			service,
			area: 'Main bathroom',
			description: null
		})
	);

describe('starting a job by hand', () => {
	it('starts it unscheduled, numbered, for this business’s client, and says who started it', async () => {
		const started = await start('Geyser replacement');

		expect(started.status).toBe('unscheduled');
		expect(started.ref).toMatch(/^JOB-\d{4}$/);
		expect(started.startedByUserId).toBe(mine.ownerUserId);

		const shown = await as(mine, (tx) => loadPipelineJob(tx, started.id));
		expect(shown).toMatchObject({
			customerName: 'Fynbos Interiors',
			service: 'Geyser replacement'
		});
	});

	it("refuses another business's client with a sentence, and starts nothing", async () => {
		const before = await as(mine, (tx) => countJobs(tx));

		const message = await messageFromRejection(start('Smuggled', mine, theirClient));

		expect(message).toBe(new ClientNotFound().message);
		expect(await as(mine, (tx) => countJobs(tx))).toEqual(before);
	});

	it("keeps one business's jobs out of another's list", async () => {
		const mineOnly = await start('Kitchen fit');
		const seen = await as(theirs, (tx) => pageJobs(tx, { filter: 'all', page: 1 }));
		expect(seen.items.map((j) => j.id)).not.toContain(mineOnly.id);
		expect(await as(theirs, (tx) => loadPipelineJob(tx, mineOnly.id))).toBeNull();
	});
});

describe('moving a job', () => {
	it('moves to any status, in any order, because a person said so', async () => {
		const started = await start('Leak under the sink');
		const walk: JobStatus[] = ['done', 'on_hold', 'cancelled', 'scheduled', 'in_progress'];

		for (const status of walk) {
			await as(mine, (tx) => setJobStatus(tx, started.id, status));
			const [row] = await as(mine, (tx) => tx.select().from(job).where(eq(job.id, started.id)));
			expect(row.status).toBe(status);
		}
	});

	it("cannot move another business's job, and cannot tell it exists", async () => {
		const theirJob = await start('Their job', theirs, theirClient);
		const message = await messageFromRejection(
			as(mine, (tx) => setJobStatus(tx, theirJob.id, 'done'))
		);
		expect(message).toBe(new JobNotFound().message);
	});
});

describe('money never moves a job', () => {
	/**
	 * The client's words: jobs "require the act of a human beyond keyboard to close, because we
	 * don't want a job slipping out". So an invoice on a job that is paid in full leaves the job
	 * under way, and the screen shows both facts.
	 */
	it('leaves a job under way when every invoice on it is paid', async () => {
		const started = await start('Bathroom refit');
		await as(mine, (tx) => setJobStatus(tx, started.id, 'in_progress'));

		const invoiceId = randomUUID();
		await as(mine, async (tx) => {
			await tx.execute(sql`
				insert into invoicing_invoice (id, business_id, customer_id, job_id, vat_policy)
				values (${invoiceId}, ${mine.id}, ${myClient}, ${started.id}, 'standard')
			`);
			await tx.execute(sql`
				update invoicing_invoice
				   set status = 'sent', issued_at = now(), issue_date = current_date,
				       due_date = current_date + 30, number_prefix = 'INV', number_value = 9101,
				       number_formatted = 'INV-9101', snapshot_subtotal_cents = 100000,
				       snapshot_tax_cents = 15000, snapshot_total_cents = 115000, snapshot_at = now()
				 where id = ${invoiceId}
			`);
			await tx.execute(sql`
				insert into invoicing_payment (business_id, invoice_id, kind, amount_cents, method, received_on)
				values (${mine.id}, ${invoiceId}, 'payment', 115000, 'eft', current_date)
			`);
			await tx.execute(sql`
				update invoicing_invoice set status = 'paid', paid_at = now(), paid_on = current_date
				 where id = ${invoiceId}
			`);
		});

		const after = await as(mine, (tx) => loadPipelineJob(tx, started.id));
		expect(after?.status).toBe('in_progress');

		const money = await as(mine, (tx) =>
			jobCommercialState(tx, { ...NO_ACCESS, quoting: 'write', invoicing: 'write' }, started.id)
		);
		expect(money?.kind).toBe('settled');
		expect(commercialSentence(money!)).toBe('Paid in full');
	});
});

describe('putting work on the plan', () => {
	const book = (
		jobId: string,
		assignee: { kind: 'employee' | 'team'; id: string },
		day: string,
		startMinute: number,
		endMinute: number
	) =>
		as(mine, (tx) =>
			scheduleJob(tx, mine.id, mine.ownerUserId, jobId, {
				assignee,
				day,
				startMinute,
				endMinute
			})
		);

	it('books a person, moves the job to scheduled, and tells them', async () => {
		const started = await start('Geyser replacement');
		const { id: thabo } = await as(mine, (tx) => createEmployee(tx, mine.id, 'Thabo Nkosi'));

		await book(started.id, { kind: 'employee', id: thabo }, '2026-10-05', 480, 600);

		const after = await as(mine, (tx) => loadPipelineJob(tx, started.id));
		expect(after?.status).toBe('scheduled');

		const slots = await as(mine, (tx) => jobSlots(tx, started.id));
		expect(slots).toHaveLength(1);
		expect(slots[0]).toMatchObject({
			day: '2026-10-05',
			startMinute: 480,
			endMinute: 600,
			assignee: { kind: 'employee', id: thabo, name: 'Thabo Nkosi' }
		});

		// The person was told, durably and in words that carry the detail.
		const [note] = await as(mine, (tx) =>
			tx
				.execute<{ title: string; detail: string; href: string }>(
					sql`select title, detail, href from core_notification where employee_id = ${thabo}`
				)
				.then((r) => r.rows)
		);
		expect(note.title).toBe('You are on Geyser replacement for Fynbos Interiors');
		expect(note.detail).toContain('Monday, 5 October');
		expect(note.detail).toContain('08:00 to 10:00');
		expect(note.href).toBe(`/scheduling/${started.id}`);
	});

	it('refuses to put one person in two places, with the sentence', async () => {
		const first = await start('Morning callout');
		const second = await start('Second callout');
		const { id: anele } = await as(mine, (tx) => createEmployee(tx, mine.id, 'Anele Mthembu'));

		await book(first.id, { kind: 'employee', id: anele }, '2026-10-06', 480, 600);

		const message = await messageFromRejection(
			book(second.id, { kind: 'employee', id: anele }, '2026-10-06', 540, 660)
		);
		expect(message).toBe(
			'Anele Mthembu is already on Morning callout that day (Tuesday, 6 October, 08:00 to 10:00). Pick a different time, or different hands.'
		);

		// Back to back is a morning's work, not a clash.
		await book(second.id, { kind: 'employee', id: anele }, '2026-10-06', 600, 720);
	});

	it('sees through a team in both directions', async () => {
		const solo = await start('Solo visit');
		const crewJob = await start('Crew job');
		const { id: zoleka } = await as(mine, (tx) => createEmployee(tx, mine.id, 'Zoleka Dube'));
		const { id: crew } = await as(mine, (tx) => createTeam(tx, mine.id, 'Install crew'));
		await as(mine, (tx) => setMembership(tx, mine.id, zoleka, crew, true));

		// Booked by name first; the team cannot then take the same morning.
		await book(solo.id, { kind: 'employee', id: zoleka }, '2026-10-07', 480, 600);
		const throughTeam = await messageFromRejection(
			book(crewJob.id, { kind: 'team', id: crew }, '2026-10-07', 540, 660)
		);
		expect(throughTeam).toContain('Zoleka Dube is already on Solo visit');

		// And booked with the team first, the person cannot be taken solo.
		await book(crewJob.id, { kind: 'team', id: crew }, '2026-10-07', 720, 840);
		const throughPerson = await messageFromRejection(
			book(solo.id, { kind: 'employee', id: zoleka }, '2026-10-07', 780, 900)
		);
		expect(throughPerson).toContain('Zoleka Dube is already on Crew job');

		// The team booking notified its member.
		const notes = await as(mine, (tx) =>
			tx
				.execute<{ title: string }>(
					sql`select title from core_notification where employee_id = ${zoleka} order by created_at`
				)
				.then((r) => r.rows)
		);
		expect(notes.some((n) => n.title.includes('Crew job'))).toBe(true);
	});

	it('unschedules a slot without touching the status', async () => {
		const started = await start('Removable work');
		const { id: person } = await as(mine, (tx) => createEmployee(tx, mine.id, 'Sipho Zulu'));
		await book(started.id, { kind: 'employee', id: person }, '2026-10-08', 480, 540);

		const [slot] = await as(mine, (tx) => jobSlots(tx, started.id));
		await as(mine, (tx) => unscheduleEntry(tx, slot.id));

		expect(await as(mine, (tx) => jobSlots(tx, started.id))).toHaveLength(0);
		const after = await as(mine, (tx) => loadPipelineJob(tx, started.id));
		expect(after?.status).toBe('scheduled');
	});

	it('keeps the week board inside the business', async () => {
		const week = await as(theirs, (tx) => weekEntries(tx, '2026-10-05'));
		expect(week).toHaveLength(0);
	});
});

describe('the list', () => {
	let fresh: TestBusiness;
	let client: string;

	beforeAll(async () => {
		fresh = await createBusiness((await createUser('Carol Counts')).id, 'Counted Carpentry');
		client = await createCustomer(fresh, 'Only Client');
		for (const service of ['One', 'Two', 'Three', 'Four']) await start(service, fresh, client);
		const all = await as(fresh, (tx) => pageJobs(tx, { filter: 'all', page: 1 }));
		await as(fresh, (tx) => setJobStatus(tx, all.items[0].id, 'done'));
	});

	it('counts every tab, with done work out of open', async () => {
		expect(await as(fresh, (tx) => countJobs(tx))).toEqual({
			open: 3,
			done: 1,
			cancelled: 0,
			all: 4
		});
	});

	it('pages the whole pipeline rather than stopping at a cap', async () => {
		const first = await as(fresh, (tx) => pageJobs(tx, { filter: 'open', page: 1, pageSize: 2 }));
		const second = await as(fresh, (tx) => pageJobs(tx, { filter: 'open', page: 2, pageSize: 2 }));

		expect(first.total).toBe(3);
		expect(first.items).toHaveLength(2);
		expect(second.items).toHaveLength(1);
		expect(new Set([...first.items, ...second.items].map((j) => j.id)).size).toBe(3);
	});

	it('reads a page past the end as the last page', async () => {
		const beyond = await as(fresh, (tx) =>
			pageJobs(tx, { filter: 'open', page: 999_999, pageSize: 2 })
		);
		expect(beyond.page).toBe(2);
		expect(beyond.items).toHaveLength(1);
	});
});

describe('what jobs tell Home', () => {
	async function summaryFor(business: TestBusiness) {
		return as(business, async (tx) => {
			const [row] = await tx
				.select()
				.from(businessTable)
				.where(eq(businessTable.businessId, business.id));
			return summariseScheduling({
				tx,
				business: toBusiness(row),
				access: { ...NO_ACCESS, scheduling: 'write' },
				now: new Date()
			});
		});
	}

	it('raises work nobody has scheduled, and offers work under way to pick back up', async () => {
		const business = await createBusiness((await createUser('Dan Home')).id, 'Home Joinery');
		const client = await createCustomer(business, 'Client');
		await start('Waiting', business, client);
		const underWay = await start('Under way', business, client);
		await as(business, (tx) => setJobStatus(tx, underWay.id, 'in_progress'));

		const summary = await summaryFor(business);

		expect(summary.standing?.standing).toBe('attention');
		expect(summary.standing?.statement).toBe('A job is not scheduled');
		expect(summary.standing?.explanation).toMatch(
			/^The oldest has been waiting since \d{1,2} \w+\.$/
		);
		expect(summary.resume.map((card) => card.href)).toEqual([`/scheduling/${underWay.id}`]);
	});

	it('is clear once every open job is on the plan', async () => {
		const business = await createBusiness((await createUser('Eve Clear')).id, 'Clear Joinery');
		const client = await createCustomer(business, 'Client');
		const planned = await start('Planned', business, client);
		await as(business, (tx) => setJobStatus(tx, planned.id, 'scheduled'));

		const summary = await summaryFor(business);
		expect(summary.standing?.standing).toBe('clear');
		expect(summary.standing?.statement).toBe('Every open job is scheduled');
	});
});

describe('what the forms send', () => {
	const form = (entries: Record<string, string>) => {
		const data = new FormData();
		for (const [key, value] of Object.entries(entries)) data.set(key, value);
		return data;
	};

	it('takes a client and the work, and treats blanks as absent', () => {
		const parsed = parseNewJob(
			form({ customerId: randomUUID(), service: '  Geyser  ', area: '', description: '' })
		);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.value).toMatchObject({ service: 'Geyser', area: null, description: null });
	});

	it('asks for a client when none was chosen', () => {
		const parsed = parseNewJob(form({ customerId: '', service: 'Geyser' }));
		expect(parsed.ok).toBe(false);
		if (parsed.ok) return;
		expect(parsed.errors.customerId).toBe('Choose the client this work is for.');
	});

	it('accepts only the six statuses', () => {
		expect(parseStatus(form({ status: 'on_hold' }))).toBe('on_hold');
		expect(parseStatus(form({ status: 'paid' }))).toBeNull();
		expect(parseStatus(new FormData())).toBeNull();
	});

	it('reads a booking: whose, which day, and the stretch of clock', () => {
		const id = randomUUID();
		const parsed = parseScheduleEntry(
			form({ assignee: `team:${id}`, day: '2026-10-05', start: '08:00', end: '10:30' })
		);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.value).toEqual({
			assignee: { kind: 'team', id },
			day: '2026-10-05',
			startMinute: 480,
			endMinute: 630
		});
	});

	it('refuses a booking that is missing its parts, a sentence each', () => {
		const parsed = parseScheduleEntry(
			form({ assignee: 'nobody', day: 'Tuesday', start: 'early', end: '07:00' })
		);
		expect(parsed.ok).toBe(false);
		if (parsed.ok) return;
		expect(parsed.errors.assignee).toBe('Choose who this work is for: a person, or a team');
		expect(parsed.errors.day).toBe('Pick the day this work happens');
		expect(parsed.errors.start).toBe('Give a start time, like 08:00');
		expect(parsed.errors.end).toBeUndefined();

		const backwards = parseScheduleEntry(
			form({
				assignee: `employee:${randomUUID()}`,
				day: '2026-10-05',
				start: '10:00',
				end: '09:00'
			})
		);
		expect(backwards.ok).toBe(false);
		if (backwards.ok) return;
		expect(backwards.errors.end).toBe(
			'The end has to come after the start. Swap them, or pick a later end'
		);
	});
});
