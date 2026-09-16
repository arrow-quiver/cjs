/**
 * THE TWO THINGS A PERSON DOES TO A JOB HERE: start one, and move it on.
 *
 * Both run inside the caller's tenant transaction. Neither touches money, and nothing here is
 * called by anything that does: a job's status changes only because somebody pressed a button.
 */
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { formatMinuteOfDay, formatWeekdayDate } from '$lib/core/calendar';
import type { Job, JobStatus } from '$lib/core/jobs';
import { clashSentence, overlaps } from '$lib/core/schedule';
import { ClientNotFound } from '$lib/server/core/customers';
import { createJob } from '$lib/server/core/jobs';
import { notifyEmployees } from '$lib/server/core/notifications';
import { EmployeeNotFound, TeamNotFound, teamMembers, teamsOf } from '$lib/server/core/people';
import { customer } from '$lib/server/core/db/schema/core';
import { job } from '$lib/server/core/db/schema/jobs';
import { employee, team } from '$lib/server/core/db/schema/people';
import { scheduleEntry } from '$lib/server/core/db/schema/schedule';
import type { Tx } from '$lib/server/core/db/tx';
import type { NewJob, NewScheduleEntry } from './wire';

/** The job is not this business's, or has been archived. Said the same way as any not-found. */
export class JobNotFound extends Error {
	constructor() {
		super("We couldn't find that job.");
		this.name = 'JobNotFound';
	}
}

/**
 * Start a job for a client, by hand. The client is looked up in THIS transaction first: row
 * security returns nothing for another business's id, and that is refused as a sentence before the
 * composite key would refuse it as a constraint error.
 */
export async function startJob(
	tx: Tx,
	businessId: string,
	userId: string,
	input: NewJob
): Promise<Job> {
	const [client] = await tx
		.select({ id: customer.id })
		.from(customer)
		.where(eq(customer.id, input.customerId))
		.limit(1);
	if (!client) throw new ClientNotFound();

	return createJob(tx, {
		businessId,
		customerId: client.id,
		service: input.service,
		area: input.area,
		description: input.description,
		startedByUserId: userId
	});
}

/** Move a job to any status. There is no transition table; see `$lib/core/jobs/pipeline.ts`. */
export async function setJobStatus(tx: Tx, jobId: string, status: JobStatus): Promise<void> {
	const updated = await tx
		.update(job)
		.set({ status })
		.where(and(eq(job.id, jobId), isNull(job.archivedAt)))
		.returning({ id: job.id });
	if (updated.length === 0) throw new JobNotFound();
}

/** The person is already somewhere else. Carries the sentence, ready for the form. */
export class ScheduleClash extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ScheduleClash';
	}
}

/** The slot to remove is not this business's, or is already gone. */
export class SlotNotFound extends Error {
	constructor() {
		super("We couldn't find that slot.");
		this.name = 'SlotNotFound';
	}
}

/**
 * BOOK A JOB: a day, a stretch of the clock, and a person or a team.
 *
 * The one write that has to be serialized: two people booking the same hands at once must not
 * both pass the clash check. So the employee rows involved are locked (`FOR UPDATE`) before the
 * day's entries are read — the second booking waits on the first, then sees its slot.
 *
 * A team is expanded to its current members for the check, because "a person cannot be in two
 * places" has to hold whether the person was booked by name or inside a team. The stored row
 * keeps the team, though: the team is what was assigned.
 *
 * Booking an unscheduled job moves it to `scheduled` — the human act the status names. Nothing
 * here ever moves one back, and nothing else in this function touches status.
 */
export async function scheduleJob(
	tx: Tx,
	businessId: string,
	userId: string,
	jobId: string,
	input: NewScheduleEntry
): Promise<void> {
	const [found] = await tx
		.select({
			id: job.id,
			status: job.status,
			service: job.service,
			ref: job.numberFormatted,
			customerName: customer.name,
			area: job.area
		})
		.from(job)
		.innerJoin(
			customer,
			and(eq(customer.businessId, job.businessId), eq(customer.id, job.customerId))
		)
		.where(and(eq(job.id, jobId), isNull(job.archivedAt)))
		.limit(1);
	if (!found) throw new JobNotFound();

	// Whose hands. A team answers with its people as of now.
	let hands: readonly { id: string; name: string }[];
	if (input.assignee.kind === 'employee') {
		const [person] = await tx
			.select({ id: employee.id, name: employee.name })
			.from(employee)
			.where(and(eq(employee.id, input.assignee.id), isNull(employee.archivedAt)))
			.limit(1);
		if (!person) throw new EmployeeNotFound();
		hands = [person];
	} else {
		const [crew] = await tx
			.select({ id: team.id })
			.from(team)
			.where(and(eq(team.id, input.assignee.id), isNull(team.archivedAt)))
			.limit(1);
		if (!crew) throw new TeamNotFound();
		hands = await teamMembers(tx, crew.id);
	}

	// An empty team books cleanly and quietly: nobody to double-book, nobody to tell. The entry
	// still lands on the board, which is what makes the gap visible.
	if (hands.length > 0) {
		const handIds = hands.map((person) => person.id);

		// Serialize on the people, not the schedule: a person with no entries yet has no row
		// there to lock, and the employee row always exists.
		await tx
			.select({ id: employee.id })
			.from(employee)
			.where(inArray(employee.id, handIds))
			.for('update');

		// Anything that day that could claim one of these people: a slot in their own name, or
		// a slot for any team they are currently on.
		const theirTeams = await teamsOf(tx, handIds);
		const teamIds = [...new Set(theirTeams.map((membership) => membership.teamId))];
		const taken = await tx
			.select({
				employeeId: scheduleEntry.employeeId,
				teamId: scheduleEntry.teamId,
				day: scheduleEntry.day,
				startMinute: scheduleEntry.startMinute,
				endMinute: scheduleEntry.endMinute,
				title: sql<
					string | null
				>`coalesce(${job.service}, ${job.numberFormatted}, ${scheduleEntry.title})`
			})
			.from(scheduleEntry)
			.leftJoin(
				job,
				and(eq(job.businessId, scheduleEntry.businessId), eq(job.id, scheduleEntry.jobId))
			)
			.where(
				and(
					isNull(scheduleEntry.archivedAt),
					eq(scheduleEntry.day, input.day),
					or(
						inArray(scheduleEntry.employeeId, handIds),
						teamIds.length > 0 ? inArray(scheduleEntry.teamId, teamIds) : sql`false`
					)
				)
			);

		for (const person of hands) {
			const personTeams = new Set(
				theirTeams
					.filter((membership) => membership.employeeId === person.id)
					.map((membership) => membership.teamId)
			);
			const clash = taken.find(
				(entry) =>
					(entry.employeeId === person.id ||
						(entry.teamId !== null && personTeams.has(entry.teamId))) &&
					overlaps(entry, input)
			);
			if (clash) {
				throw new ScheduleClash(
					clashSentence(person.name, { ...clash, title: clash.title ?? 'other work' })
				);
			}
		}
	}

	await tx.insert(scheduleEntry).values({
		businessId,
		jobId,
		employeeId: input.assignee.kind === 'employee' ? input.assignee.id : null,
		teamId: input.assignee.kind === 'team' ? input.assignee.id : null,
		day: input.day,
		startMinute: input.startMinute,
		endMinute: input.endMinute,
		createdByUserId: userId
	});

	if (found.status === 'unscheduled') {
		await tx.update(job).set({ status: 'scheduled' }).where(eq(job.id, jobId));
	}

	const what = found.service ?? found.ref;
	const when = `${formatWeekdayDate(input.day)}, ${formatMinuteOfDay(input.startMinute)} to ${formatMinuteOfDay(input.endMinute)}`;
	await notifyEmployees(
		tx,
		businessId,
		hands.map((person) => person.id),
		{
			title: `You are on ${what} for ${found.customerName}`,
			detail: found.area ? `${when} · ${found.area}` : when,
			href: `/scheduling/${jobId}`
		}
	);
}

/**
 * Take a slot off the plan. An UPDATE, never a DELETE, and it says nothing to `job.status`:
 * un-scheduling the last slot does not put the job back in the pile, because status is a
 * person's statement and this is not the person making it.
 */
export async function unscheduleEntry(tx: Tx, entryId: string): Promise<void> {
	const updated = await tx
		.update(scheduleEntry)
		.set({ archivedAt: new Date() })
		.where(and(eq(scheduleEntry.id, entryId), isNull(scheduleEntry.archivedAt)))
		.returning({ id: scheduleEntry.id });
	if (updated.length === 0) throw new SlotNotFound();
}
