/**
 * THE SCHEDULING PLATFORM'S GUARANTEES, ASKED OF A REAL POSTGRES.
 *
 * One suite for the five tables 0013/0014 create — employee, team, membership, notification,
 * schedule — because their guarantees interlock (the schedule's keys point at the people) and
 * because each seeded tenant costs a dozen round trips to a hosted database. The pattern and
 * the reasons are `jobs.test.ts`'s: the policy body is only proven by a positive read beside a
 * cross-tenant refusal, and a CHECK, a unique, a composite key and a withheld DELETE are
 * properties of the database, honestly asserted only by asking it.
 */
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { closePool, runScoped } from '../client';
import {
	cleanupFixtures,
	createBusiness,
	createCustomer,
	createUser,
	messageFromRejection,
	type TestBusiness
} from '../fixtures';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 180_000 });

type Seeded = {
	business: TestBusiness;
	customerId: string;
	jobId: string;
	employeeId: string;
	teamId: string;
};

let mine: Seeded;
let theirs: Seeded;

async function seedBusiness(tradingName: string): Promise<Seeded> {
	const owner = await createUser();
	const business = await createBusiness(owner.id, tradingName);
	const customerId = await createCustomer(business);
	const jobId = randomUUID();
	const employeeId = randomUUID();
	const teamId = randomUUID();

	await runScoped(business.id, owner.id, async (tx) => {
		await tx.execute(sql`
			insert into core_job
				(id, business_id, customer_id, number_prefix, number_value, number_formatted, service)
			values (${jobId}, ${business.id}, ${customerId}, 'JOB', 1, 'JOB-0001', 'Kitchen fit')
		`);
		await tx.execute(sql`
			insert into core_employee (id, business_id, name)
			values (${employeeId}, ${business.id}, 'Thabo Nkosi')
		`);
		await tx.execute(sql`
			insert into core_team (id, business_id, name)
			values (${teamId}, ${business.id}, 'Plumbing')
		`);
	});

	return { business, customerId, jobId, employeeId, teamId };
}

beforeAll(async () => {
	mine = await seedBusiness('Thornhill Joinery');
	theirs = await seedBusiness('Bayside Plumbing');
});

afterAll(async () => {
	await cleanupFixtures();
	await closePool();
});

function as<T>(seeded: Seeded, fn: Parameters<typeof runScoped<T>>[2]): Promise<T> {
	return runScoped(seeded.business.id, seeded.business.ownerUserId, fn);
}

/** A well-formed schedule entry for `seeded`'s own job and employee, with room to override. */
function entryValues(seeded: Seeded) {
	return {
		id: randomUUID(),
		jobId: seeded.jobId,
		employeeId: seeded.employeeId,
		day: '2026-09-14',
		startMinute: 480,
		endMinute: 600
	};
}

describe('the roster belongs to exactly one business', () => {
	it('is visible to the business that owns it', async () => {
		// The positive read first, or every refusal below would also pass against a table nobody
		// can read at all.
		const rows = await as(mine, async (tx) => {
			const result = await tx.execute(
				sql`select id from core_employee where id = ${mine.employeeId}`
			);
			return result.rows;
		});
		expect(rows).toHaveLength(1);
	});

	it('cannot be read by another business', async () => {
		const rows = await as(theirs, async (tx) => {
			const result = await tx.execute(
				sql`select id from core_employee where id = ${mine.employeeId}`
			);
			return result.rows;
		});
		expect(rows).toHaveLength(0);
	});

	it('has row level security enabled and forced on all five tables', async () => {
		const rows = await as(mine, async (tx) => {
			const result = await tx.execute<{ relname: string; enabled: boolean; forced: boolean }>(sql`
				select relname, relrowsecurity as enabled, relforcerowsecurity as forced
				  from pg_class
				 where relname in
					('core_employee', 'core_team', 'core_employee_team', 'core_notification', 'scheduling_schedule')
				 order by relname
			`);
			return result.rows;
		});

		expect(rows).toHaveLength(5);
		for (const row of rows) {
			expect(row, row.relname).toMatchObject({ enabled: true, forced: true });
		}
	});
});

describe('names are real words', () => {
	it('refuses a blank employee name', async () => {
		const message = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into core_employee (business_id, name) values (${mine.business.id}, '  ')
				`);
			})
		);
		expect(message).toContain('core_employee_name_present');
	});

	it('refuses a second team with the same name in one business', async () => {
		const message = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into core_team (business_id, name) values (${mine.business.id}, 'Plumbing')
				`);
			})
		);
		expect(message).toContain('core_team_name_unique');
	});
});

describe('membership pairs a business’s own people with its own teams, once', () => {
	it('accepts the pairing, and refuses it a second time', async () => {
		await as(mine, async (tx) => {
			await tx.execute(sql`
				insert into core_employee_team (business_id, employee_id, team_id)
				values (${mine.business.id}, ${mine.employeeId}, ${mine.teamId})
			`);
		});

		const message = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into core_employee_team (business_id, employee_id, team_id)
					values (${mine.business.id}, ${mine.employeeId}, ${mine.teamId})
				`);
			})
		);
		expect(message).toContain('core_employee_team_once');
	});

	it("refuses another business's employee on this business's team", async () => {
		const message = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into core_employee_team (business_id, employee_id, team_id)
					values (${mine.business.id}, ${theirs.employeeId}, ${mine.teamId})
				`);
			})
		);
		expect(message).toContain('core_employee_team_employee_fk');
	});
});

describe('a notification reaches a business’s own employee', () => {
	it("refuses another business's employee as recipient", async () => {
		const message = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into core_notification (business_id, employee_id, title)
					values (${mine.business.id}, ${theirs.employeeId}, 'You are on a job')
				`);
			})
		);
		expect(message).toContain('core_notification_employee_fk');
	});

	it('refuses a blank title', async () => {
		const message = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into core_notification (business_id, employee_id, title)
					values (${mine.business.id}, ${mine.employeeId}, ' ')
				`);
			})
		);
		expect(message).toContain('core_notification_title_present');
	});
});

describe('a schedule entry is shaped before it is stored', () => {
	it('accepts a well-formed entry for this business’s own job and employee', async () => {
		const values = entryValues(mine);
		await as(mine, async (tx) => {
			await tx.execute(sql`
				insert into scheduling_schedule
					(id, business_id, job_id, employee_id, day, start_minute, end_minute, created_by_user_id)
				values (${values.id}, ${mine.business.id}, ${values.jobId}, ${values.employeeId},
					${values.day}, ${values.startMinute}, ${values.endMinute}, ${mine.business.ownerUserId})
			`);
		});

		const rows = await as(mine, async (tx) => {
			const result = await tx.execute(
				sql`select id from scheduling_schedule where id = ${values.id}`
			);
			return result.rows;
		});
		expect(rows).toHaveLength(1);
	});

	it('refuses an entry with neither a job nor a title', async () => {
		const message = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into scheduling_schedule
						(business_id, employee_id, day, start_minute, end_minute, created_by_user_id)
					values (${mine.business.id}, ${mine.employeeId}, '2026-09-14', 480, 600,
						${mine.business.ownerUserId})
				`);
			})
		);
		expect(message).toContain('scheduling_schedule_titled');
	});

	it('refuses both assignees, and neither', async () => {
		const both = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into scheduling_schedule
						(business_id, job_id, employee_id, team_id, day, start_minute, end_minute, created_by_user_id)
					values (${mine.business.id}, ${mine.jobId}, ${mine.employeeId}, ${mine.teamId},
						'2026-09-14', 480, 600, ${mine.business.ownerUserId})
				`);
			})
		);
		expect(both).toContain('scheduling_schedule_one_assignee');

		const neither = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into scheduling_schedule
						(business_id, job_id, day, start_minute, end_minute, created_by_user_id)
					values (${mine.business.id}, ${mine.jobId}, '2026-09-14', 480, 600,
						${mine.business.ownerUserId})
				`);
			})
		);
		expect(neither).toContain('scheduling_schedule_one_assignee');
	});

	it('refuses a backwards clock, and a minute past midnight', async () => {
		const backwards = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into scheduling_schedule
						(business_id, job_id, employee_id, day, start_minute, end_minute, created_by_user_id)
					values (${mine.business.id}, ${mine.jobId}, ${mine.employeeId}, '2026-09-14',
						600, 480, ${mine.business.ownerUserId})
				`);
			})
		);
		expect(backwards).toContain('scheduling_schedule_clock');

		const late = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into scheduling_schedule
						(business_id, job_id, employee_id, day, start_minute, end_minute, created_by_user_id)
					values (${mine.business.id}, ${mine.jobId}, ${mine.employeeId}, '2026-09-14',
						480, 1441, ${mine.business.ownerUserId})
				`);
			})
		);
		expect(late).toContain('scheduling_schedule_clock');
	});

	it("refuses another business's job, and another business's employee", async () => {
		const foreignJob = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into scheduling_schedule
						(business_id, job_id, employee_id, day, start_minute, end_minute, created_by_user_id)
					values (${mine.business.id}, ${theirs.jobId}, ${mine.employeeId}, '2026-09-14',
						480, 600, ${mine.business.ownerUserId})
				`);
			})
		);
		expect(foreignJob).toContain('scheduling_schedule_job_fk');

		const foreignHands = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`
					insert into scheduling_schedule
						(business_id, job_id, employee_id, day, start_minute, end_minute, created_by_user_id)
					values (${mine.business.id}, ${mine.jobId}, ${theirs.employeeId}, '2026-09-14',
						480, 600, ${mine.business.ownerUserId})
				`);
			})
		);
		expect(foreignHands).toContain('scheduling_schedule_employee_fk');
	});
});

describe('nothing here is deleted', () => {
	it('refuses DELETE to the application role on the roster and the schedule', async () => {
		const employee = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`delete from core_employee where id = ${mine.employeeId}`);
			})
		);
		expect(employee).toMatch(/permission denied/i);

		const schedule = await messageFromRejection(
			as(mine, async (tx) => {
				await tx.execute(sql`delete from scheduling_schedule where business_id = ${mine.business.id}`);
			})
		);
		expect(schedule).toMatch(/permission denied/i);
	});
});
