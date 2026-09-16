/**
 * PEOPLE — `core_employee`, `core_team`, `core_employee_team`. Who carries the tools.
 *
 * NOT `core_member`, AND NOT A ROSTER BOLTED ONTO IT
 * --------------------------------------------------
 * `core_member` is access control: who may sign in, and what they may touch. An employee is who
 * does the work, and in a trade business most of them will never open the software. The client's
 * answer to SPA-24's Q6 settled it: the member table is not a roster, and the people model is
 * shaped now, deliberately, even though the full team module (capacity, skills, leave,
 * induction) is specced later. The hierarchy is exactly company → team → individual: a list of
 * employees, each belonging to zero or more teams, and nothing deeper.
 *
 * WHY `core_`, NOT `scheduling_`
 * ------------------------------
 * The schedule writes assignments against these rows today, but payroll is in the catalogue
 * (`MODULE_KEYS` has `payroll`) and a payroll that cannot see the employees would be absurd.
 * People are floor, exactly as customers are: the modules gate the screens, not the rows.
 *
 * `userId` IS TEXT AND NULLABLE. An employee who signs in has a better-auth user; the rest have
 * gumboots. It is unlinked text like `core_job.startedByUserId`, not a cross-schema key, because
 * identity rows are never deleted and an attribution column does not need the referential
 * ceremony a tenant row does.
 *
 * MEMBERSHIP IS NEVER DELETED. The application role holds no DELETE anywhere in `public`, so
 * leaving a team is `archived_at`, and rejoining clears it on the same row — which is why the
 * `(business_id, employee_id, team_id)` unique carries no `WHERE`: one row per pairing, ever,
 * whatever its current state.
 */
import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { businessId, id, notBlank, timestamps } from '../base';
import { business } from './core';

/** A pair of hands. "Thabo Nkosi", whether or not Thabo ever signs in. */
export const employee = pgTable(
	'core_employee',
	{
		id: id(),
		businessId: businessId().references(() => business.businessId, { onDelete: 'restrict' }),

		name: text().notNull(),

		/** The login this employee is, when they have one. See the header. */
		userId: text(),

		/** Removal is an UPDATE. The application role holds no DELETE anywhere in `public`. */
		archivedAt: timestamp({ withTimezone: true }),

		...timestamps()
	},
	(t) => [
		// The composite foreign keys on the schedule, the membership and the notification tables
		// point at this — the device `core_job` explains at length.
		unique('core_employee_business_id_unique').on(t.businessId, t.id),

		notBlank('core_employee_name_present', t.name),

		// The one query the people screen asks: this business's employees, by name.
		index('core_employee_business_idx').on(t.businessId, t.name)
	]
);

/**
 * A team. "The plumbing crew." Two employees called John Smith are two real people, so employee
 * names may repeat; two teams called Plumbing are one team and a typo, so team names may not.
 */
export const team = pgTable(
	'core_team',
	{
		id: id(),
		businessId: businessId().references(() => business.businessId, { onDelete: 'restrict' }),

		name: text().notNull(),

		archivedAt: timestamp({ withTimezone: true }),

		...timestamps()
	},
	(t) => [
		unique('core_team_business_id_unique').on(t.businessId, t.id),

		notBlank('core_team_name_present', t.name),
		unique('core_team_name_unique').on(t.businessId, t.name),

		index('core_team_business_idx').on(t.businessId, t.name)
	]
);

/** An employee on a team. Zero or more teams per employee; see the header for why no DELETE. */
export const employeeTeam = pgTable(
	'core_employee_team',
	{
		id: id(),
		businessId: businessId().references(() => business.businessId, { onDelete: 'restrict' }),

		/** Composite, `(business_id, employee_id) -> core_employee`. Hand-written in 0014. */
		employeeId: uuid().notNull(),
		/** Composite, `(business_id, team_id) -> core_team`. Hand-written in 0014. */
		teamId: uuid().notNull(),

		archivedAt: timestamp({ withTimezone: true }),

		...timestamps()
	},
	(t) => [
		// One row per pairing, forever. Rejoining clears `archived_at` on this row.
		unique('core_employee_team_once').on(t.businessId, t.employeeId, t.teamId),

		// Expanding a team to its people, and listing a person's teams.
		index('core_employee_team_team_idx').on(t.businessId, t.teamId),
		index('core_employee_team_employee_idx').on(t.businessId, t.employeeId)
	]
);
