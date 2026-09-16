/**
 * THE SCHEDULE'S CLIENT-SAFE MODEL.
 *
 * A schedule entry pins work to a day, a stretch of the clock, and a pair of hands. The hands are
 * an employee or a team — never a member. `core_member` is who may sign in; an employee is who
 * carries tools, and most of a trade business's employees never touch the software. The two lists
 * overlap without being the same list, which is why they are different tables.
 *
 * An entry's job is nullable by design: a reminder or a non-billable visit still takes a slot on
 * the calendar. This lane builds no screen for those, but the model refuses to make them
 * unrepresentable, because the schema decision is the expensive one to reverse.
 */
import type { CalendarDate, MinuteOfDay } from '$lib/core/calendar';

export const ASSIGNEE_KINDS = ['employee', 'team'] as const;

export type AssigneeKind = (typeof ASSIGNEE_KINDS)[number];

export function isAssigneeKind(value: unknown): value is AssigneeKind {
	return (ASSIGNEE_KINDS as readonly unknown[]).includes(value);
}

/** Who a slot belongs to: one person, or one team. Exactly one, held by a CHECK. */
export type Assignee = {
	readonly kind: AssigneeKind;
	readonly id: string;
	readonly name: string;
};

/** A stretch of one day's clock. The end is exclusive, so back-to-back slots do not clash. */
export type Slot = {
	readonly day: CalendarDate;
	readonly startMinute: MinuteOfDay;
	readonly endMinute: MinuteOfDay;
};

/** One row on the week board: a slot, whose it is, and what the work is. */
export type ScheduleEntry = Slot & {
	readonly id: string;
	readonly jobId: string | null;
	/** The job's own title, or the entry's for an entry with no job. */
	readonly title: string;
	readonly customerName: string | null;
	readonly assignee: Assignee;
};

/** An employee, as the screens hold one. */
export type EmployeeRow = {
	readonly id: string;
	readonly name: string;
	/** The login this employee is linked to, when they have one. See `claimEmployee`. */
	readonly userId: string | null;
	readonly teamIds: readonly string[];
};

/** A team, as the screens hold one. */
export type TeamRow = {
	readonly id: string;
	readonly name: string;
	readonly memberCount: number;
};
