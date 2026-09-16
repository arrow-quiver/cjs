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
import { JobNotFound, setJobStatus, startJob } from './effects';
import { summariseScheduling } from './summary';

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
