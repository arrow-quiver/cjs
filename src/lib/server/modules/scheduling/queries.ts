/**
 * WHAT THE SCHEDULING SCREENS READ.
 *
 * Every read takes a `Tx` and no business id, per the floor's rule: `tenant_isolation` has
 * already decided whose rows these are. Entries come back as the core's `ScheduleEntry`, titled
 * through their job where they have one, so the week board and the job card cannot disagree
 * about what a slot is called.
 */
import { and, asc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { addDays, type CalendarDate } from '$lib/core/calendar';
import type { ScheduleEntry } from '$lib/core/schedule';
import { customer } from '$lib/server/core/db/schema/core';
import { job } from '$lib/server/core/db/schema/jobs';
import { employee, team } from '$lib/server/core/db/schema/people';
import { scheduleEntry } from '$lib/server/core/db/schema/schedule';
import type { Tx } from '$lib/server/core/db/tx';

const columns = {
	id: scheduleEntry.id,
	jobId: scheduleEntry.jobId,
	ownTitle: scheduleEntry.title,
	service: job.service,
	ref: job.numberFormatted,
	customerName: customer.name,
	employeeId: scheduleEntry.employeeId,
	employeeName: employee.name,
	teamId: scheduleEntry.teamId,
	teamName: team.name,
	day: scheduleEntry.day,
	startMinute: scheduleEntry.startMinute,
	endMinute: scheduleEntry.endMinute
};

type Row = {
	id: string;
	jobId: string | null;
	ownTitle: string | null;
	service: string | null;
	ref: string | null;
	customerName: string | null;
	employeeId: string | null;
	employeeName: string | null;
	teamId: string | null;
	teamName: string | null;
	day: string;
	startMinute: number;
	endMinute: number;
};

function toEntry(row: Row): ScheduleEntry {
	return {
		id: row.id,
		jobId: row.jobId,
		title: row.service ?? row.ref ?? row.ownTitle ?? 'Work',
		customerName: row.customerName,
		assignee:
			row.employeeId !== null
				? { kind: 'employee', id: row.employeeId, name: row.employeeName ?? 'Somebody' }
				: { kind: 'team', id: row.teamId ?? '', name: row.teamName ?? 'A team' },
		day: row.day,
		startMinute: row.startMinute,
		endMinute: row.endMinute
	};
}

function joined(tx: Tx) {
	return tx
		.select(columns)
		.from(scheduleEntry)
		.leftJoin(
			job,
			and(eq(job.businessId, scheduleEntry.businessId), eq(job.id, scheduleEntry.jobId))
		)
		.leftJoin(
			customer,
			and(eq(customer.businessId, job.businessId), eq(customer.id, job.customerId))
		)
		.leftJoin(employee, eq(employee.id, scheduleEntry.employeeId))
		.leftJoin(team, eq(team.id, scheduleEntry.teamId));
}

/** The seven days from `start`: the week board's whole read. */
export async function weekEntries(tx: Tx, start: CalendarDate): Promise<readonly ScheduleEntry[]> {
	const rows = await joined(tx)
		.where(
			and(
				isNull(scheduleEntry.archivedAt),
				gte(scheduleEntry.day, start),
				lt(scheduleEntry.day, addDays(start, 7))
			)
		)
		.orderBy(asc(scheduleEntry.day), asc(scheduleEntry.startMinute));
	return rows.map(toEntry);
}

/** One job's slots, today onward first, for the job card. */
export async function jobSlots(tx: Tx, jobId: string): Promise<readonly ScheduleEntry[]> {
	const rows = await joined(tx)
		.where(and(isNull(scheduleEntry.archivedAt), eq(scheduleEntry.jobId, jobId)))
		.orderBy(asc(scheduleEntry.day), asc(scheduleEntry.startMinute));
	return rows.map(toEntry);
}

/** Does anything sit on the plan at all? Decides the week view's empty state. */
export async function hasAnySchedule(tx: Tx): Promise<boolean> {
	const [row] = await tx
		.select({ one: sql<number>`1` })
		.from(scheduleEntry)
		.where(isNull(scheduleEntry.archivedAt))
		.limit(1);
	return row !== undefined;
}

/** Entries between two days for Home's Coming up panel. */
export async function entriesBetween(
	tx: Tx,
	from: CalendarDate,
	before: CalendarDate,
	limit = 20
): Promise<readonly ScheduleEntry[]> {
	const rows = await joined(tx)
		.where(
			and(
				isNull(scheduleEntry.archivedAt),
				gte(scheduleEntry.day, from),
				lt(scheduleEntry.day, before)
			)
		)
		.orderBy(asc(scheduleEntry.day), asc(scheduleEntry.startMinute))
		.limit(limit);
	return rows.map(toEntry);
}
