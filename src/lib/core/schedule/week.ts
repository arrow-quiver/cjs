/**
 * THE WEEK BOARD, DERIVED.
 *
 * The server hands the screen a flat list of the week's entries; this arranges them into the
 * seven columns a person plans by. Pure, so the arrangement is testable without a browser and
 * identical on the server and in the client's head.
 */
import { weekDays, type CalendarDate } from '$lib/core/calendar';
import type { ScheduleEntry } from './types';

export type DayColumn = {
	readonly day: CalendarDate;
	readonly entries: readonly ScheduleEntry[];
};

/** Seven columns from a week's start, each day's entries ordered by start then name. */
export function weekBoard(
	start: CalendarDate,
	entries: readonly ScheduleEntry[]
): readonly DayColumn[] {
	return weekDays(start).map((day) => ({
		day,
		entries: entries
			.filter((entry) => entry.day === day)
			.toSorted(
				(a, b) =>
					a.startMinute - b.startMinute || a.assignee.name.localeCompare(b.assignee.name)
			)
	}));
}
