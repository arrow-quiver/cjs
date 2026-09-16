/**
 * CLASH DETECTION IS WHAT MAKES A SCHEDULE TRUSTWORTHY.
 *
 * The legacy suite catches double-booking at the point of scheduling, and that is the feature
 * that makes the calendar a plan rather than a decoration. The rule is pure interval arithmetic
 * on one person's one day; the transaction that applies it (locking, team expansion) lives in
 * `$lib/server/modules/scheduling`, and the sentence a refusal carries is written here so the
 * server and the tests cannot drift on the words.
 */
import { formatMinuteOfDay, formatWeekdayDate } from '$lib/core/calendar';
import type { Slot } from './types';

/**
 * Do two slots claim the same person at the same time?
 *
 * Ends are exclusive: 08:00–10:00 and 10:00–12:00 are a morning's honest work, not a clash.
 */
export function overlaps(a: Slot, b: Slot): boolean {
	return a.day === b.day && a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

/** What already has the person, as a clash refusal needs to describe it. */
export type Engagement = Slot & { readonly title: string };

/**
 * The refusal, per the validation standard: what is wrong, and the likely intent.
 *
 * Names the person, what already has them and when, then offers the two ways out — a different
 * time, or different hands. A person reading it standing in the yard should know which of the
 * two they meant.
 */
export function clashSentence(person: string, taken: Engagement): string {
	const when = `${formatWeekdayDate(taken.day)}, ${formatMinuteOfDay(taken.startMinute)} to ${formatMinuteOfDay(taken.endMinute)}`;
	return `${person} is already on ${taken.title} that day (${when}). Pick a different time, or different hands.`;
}
