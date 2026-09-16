/**
 * THE ROSTER.
 *
 * Employees and teams sit in core beside `customers/` for the same reason customers do: the
 * schedule assigns to them today, and payroll will pay them tomorrow. Every read takes a `Tx`
 * and no business id — `tenant_isolation` has already decided whose rows these are.
 *
 * Membership is a row that is archived and revived, never deleted, because the application role
 * cannot delete. `setMembership` is therefore an upsert on `(business, employee, team)`.
 */
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { EmployeeRow, TeamRow } from '$lib/core/schedule';
import { employee, employeeTeam, team } from '../db/schema/people';
import type { Tx } from '../db/tx';

/** The person named is not this business's, or has been archived. */
export class EmployeeNotFound extends Error {
	constructor() {
		super('That person is not on your list. Pick somebody from it, or add them first.');
		this.name = 'EmployeeNotFound';
	}
}

/** The team named is not this business's, or has been archived. */
export class TeamNotFound extends Error {
	constructor() {
		super('That team is not on your list. Pick one from it, or add it first.');
		this.name = 'TeamNotFound';
	}
}

/** Taking somebody off a team they are not on. */
export class MembershipNotFound extends Error {
	constructor() {
		super('They are not on that team.');
		this.name = 'MembershipNotFound';
	}
}

/** Every employee that is not archived, by name, with the teams they are on. */
export async function listEmployees(tx: Tx): Promise<readonly EmployeeRow[]> {
	const [people, memberships] = await Promise.all([
		tx
			.select({ id: employee.id, name: employee.name, userId: employee.userId })
			.from(employee)
			.where(isNull(employee.archivedAt))
			.orderBy(asc(employee.name), asc(employee.id)),
		tx
			.select({ employeeId: employeeTeam.employeeId, teamId: employeeTeam.teamId })
			.from(employeeTeam)
			.where(isNull(employeeTeam.archivedAt))
	]);

	return people.map((person) => ({
		...person,
		teamIds: memberships.filter((m) => m.employeeId === person.id).map((m) => m.teamId)
	}));
}

/** Every team that is not archived, by name, with how many hands it currently has. */
export async function listTeams(tx: Tx): Promise<readonly TeamRow[]> {
	const rows = await tx
		.select({
			id: team.id,
			name: team.name,
			memberCount: sql<number>`(
				select count(*)::int from ${employeeTeam}
				 where ${employeeTeam.teamId} = ${team.id} and ${employeeTeam.archivedAt} is null
			)`
		})
		.from(team)
		.where(isNull(team.archivedAt))
		.orderBy(asc(team.name), asc(team.id));
	return rows;
}

/** Add a pair of hands. The name is the whole record; everything else can come later. */
export async function createEmployee(
	tx: Tx,
	businessId: string,
	name: string
): Promise<{ id: string }> {
	const [row] = await tx
		.insert(employee)
		.values({ businessId, name })
		.returning({ id: employee.id });
	return row;
}

/** Add a team. The unique on the name makes a duplicate a database refusal, caught by the caller. */
export async function createTeam(
	tx: Tx,
	businessId: string,
	name: string
): Promise<{ id: string }> {
	const [row] = await tx.insert(team).values({ businessId, name }).returning({ id: team.id });
	return row;
}

/**
 * Put an employee on a team, or take them off it. One row per pairing forever: joining revives
 * the archived row where one exists, leaving archives it.
 *
 * Both ends are looked up in this transaction first, so a stale or foreign id is refused as a
 * sentence rather than as the composite key's constraint error — `startJob`'s argument. The
 * employee row is locked for the same reason `scheduleJob` locks it: a booking of this person,
 * running now, holds that lock, and this change waits its turn rather than racing the clash
 * check. A change landing AFTER a booking is not re-validated against the plan; that is a known
 * seam, recorded on the PR.
 */
export async function setMembership(
	tx: Tx,
	businessId: string,
	employeeId: string,
	teamId: string,
	on: boolean
): Promise<void> {
	const [person] = await tx
		.select({ id: employee.id })
		.from(employee)
		.where(and(eq(employee.id, employeeId), isNull(employee.archivedAt)))
		.for('update');
	if (!person) throw new EmployeeNotFound();

	const [crew] = await tx
		.select({ id: team.id })
		.from(team)
		.where(and(eq(team.id, teamId), isNull(team.archivedAt)));
	if (!crew) throw new TeamNotFound();

	if (on) {
		await tx
			.insert(employeeTeam)
			.values({ businessId, employeeId, teamId })
			.onConflictDoUpdate({
				target: [employeeTeam.businessId, employeeTeam.employeeId, employeeTeam.teamId],
				set: { archivedAt: null }
			});
		return;
	}
	const left = await tx
		.update(employeeTeam)
		.set({ archivedAt: new Date() })
		.where(
			and(
				eq(employeeTeam.employeeId, employeeId),
				eq(employeeTeam.teamId, teamId),
				isNull(employeeTeam.archivedAt)
			)
		)
		.returning({ id: employeeTeam.id });
	if (left.length === 0) throw new MembershipNotFound();
}

/**
 * Link an employee row to the signed-in person's login: the People screen's "This is me".
 *
 * Self-service on purpose. It needs no member directory, and the claim is the person's own act,
 * which is also what makes the notification feed honest: rows reach whoever pressed the button
 * on their own name. Claiming moves the login off any employee it was on before, so one login
 * is one pair of hands at a time.
 */
export async function claimEmployee(tx: Tx, employeeId: string, userId: string): Promise<void> {
	await tx
		.update(employee)
		.set({ userId: null })
		.where(and(eq(employee.userId, userId), isNull(employee.archivedAt)));

	const claimed = await tx
		.update(employee)
		.set({ userId })
		.where(and(eq(employee.id, employeeId), isNull(employee.archivedAt)))
		.returning({ id: employee.id });
	if (claimed.length === 0) throw new EmployeeNotFound();
}

/**
 * A team's current people, for the clash check and the notification fan-out. Asked at the moment
 * it matters, so a team gaining a member tomorrow changes tomorrow's answer.
 */
export async function teamMembers(
	tx: Tx,
	teamId: string
): Promise<readonly { id: string; name: string }[]> {
	return tx
		.select({ id: employee.id, name: employee.name })
		.from(employeeTeam)
		.innerJoin(employee, eq(employee.id, employeeTeam.employeeId))
		.where(
			and(
				eq(employeeTeam.teamId, teamId),
				isNull(employeeTeam.archivedAt),
				isNull(employee.archivedAt)
			)
		)
		.orderBy(asc(employee.name));
}

/** The teams each of these people are currently on, for the clash check's team side. */
export async function teamsOf(
	tx: Tx,
	employeeIds: readonly string[]
): Promise<readonly { employeeId: string; teamId: string }[]> {
	if (employeeIds.length === 0) return [];
	return tx
		.select({ employeeId: employeeTeam.employeeId, teamId: employeeTeam.teamId })
		.from(employeeTeam)
		.where(and(inArray(employeeTeam.employeeId, employeeIds), isNull(employeeTeam.archivedAt)));
}
