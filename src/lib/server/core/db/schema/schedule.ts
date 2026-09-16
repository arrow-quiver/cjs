/**
 * THE SCHEDULE — `scheduling_schedule`. Work pinned to a day, a clock, and a pair of hands.
 *
 * `core_job.status = 'scheduled'` has meant "a day exists" since SPA-20, with a note that the
 * table holding the day was a later ticket. This is that table.
 *
 * WHY `scheduling_`, WHERE JOBS AND PEOPLE ARE `core_`
 * ----------------------------------------------------
 * A job is created by the platform with no entitlement gate (a client clicking Accept), and
 * people are shared floor. A schedule row is written from exactly one place: the scheduling
 * module's own screens, by a signed-in person, behind the module gate. The namespace states the
 * writer, per the argument in `schema/jobs.ts`.
 *
 * THE JOB IS NULLABLE, DELIBERATELY. A reminder or a non-billable site visit still takes a slot.
 * An entry with no job carries its own `title`; an entry with a job describes itself through the
 * job, so the `scheduling_schedule_titled` CHECK demands exactly the one that is needed.
 *
 * ONE ASSIGNEE, EXACTLY. A slot belongs to a person or to a team, never both and never neither —
 * the XOR CHECK is the same device as `inventory_movement_source_shape`. A team is not expanded
 * into per-member rows here: the team is what was assigned, and expansion happens where it is
 * asked about (the clash check, the notification fan-out), so a team gaining a member tomorrow
 * changes tomorrow's answers without rewriting yesterday's rows.
 *
 * THE CLOCK IS MINUTES FROM MIDNIGHT, `[start, end)`, one day, no midnight crossing —
 * `$lib/core/calendar.ts` carries the argument. The CHECK makes a backwards or absurd slot
 * unstorable. What the database deliberately does NOT enforce is the clash itself: two slots may
 * overlap for a team and a person who is on it, and deciding that needs membership expansion,
 * which is a transaction's job (`modules/scheduling/effects.ts`, which locks the employee rows).
 * An EXCLUDE constraint could hold the narrow same-employee case, but it would need the
 * `btree_gist` extension, a precedent this schema does not have, and it still could not see
 * through a team — half a guarantee in the database is a guarantee nobody can rely on.
 *
 * SCHEDULING NEVER CLOSES. Archiving a slot, finishing a week, paying an invoice: none of it
 * moves `core_job.status`. The one legal touch is forward, `unscheduled → scheduled`, made by
 * the person booking the slot, because booking IS the human act that status names. Removing the
 * last slot does not move it back; that would be derivation, and the person who wants it back in
 * the pile says so on the job.
 */
import {
	check,
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { MINUTES_IN_DAY } from '$lib/core/calendar';
import { businessId, id, timestamps } from '../base';
import { business } from './core';

export const scheduleEntry = pgTable(
	'scheduling_schedule',
	{
		id: id(),
		businessId: businessId().references(() => business.businessId, { onDelete: 'restrict' }),

		/** Composite, `(business_id, job_id) -> core_job`. Hand-written in 0014. Nullable; see header. */
		jobId: uuid(),
		/** What a jobless entry is. "Collect timber, Paarden Eiland." */
		title: text(),

		/** Composite to `core_employee`. Exactly one of these two; see header. */
		employeeId: uuid(),
		/** Composite to `core_team`. */
		teamId: uuid(),

		day: date().notNull(),
		startMinute: integer().notNull(),
		endMinute: integer().notNull(),

		/** Who booked it. Always a signed-in person; there is no unattended writer. */
		createdByUserId: text().notNull(),

		/** Unscheduling is an UPDATE. The application role holds no DELETE anywhere in `public`. */
		archivedAt: timestamp({ withTimezone: true }),

		...timestamps()
	},
	(t) => [
		unique('scheduling_schedule_business_id_unique').on(t.businessId, t.id),

		// An entry describes itself through its job, or by its own title.
		check('scheduling_schedule_titled', sql`${t.jobId} is not null or ${t.title} is not null`),
		// A person, or a team. Exactly one.
		check(
			'scheduling_schedule_one_assignee',
			sql`(${t.employeeId} is null) <> (${t.teamId} is null)`
		),
		// A forwards stretch of one day's clock.
		check(
			'scheduling_schedule_clock',
			sql`${t.startMinute} >= 0 and ${t.endMinute} <= ${sql.raw(String(MINUTES_IN_DAY))} and ${t.startMinute} < ${t.endMinute}`
		),

		// The three questions asked of it: the week board, one person's day, one team's day.
		index('scheduling_schedule_week_idx').on(t.businessId, t.day),
		index('scheduling_schedule_employee_idx').on(t.businessId, t.employeeId, t.day),
		index('scheduling_schedule_team_idx').on(t.businessId, t.teamId, t.day),
		// And a job's slots, for the job card.
		index('scheduling_schedule_job_idx').on(t.businessId, t.jobId)
	]
);
