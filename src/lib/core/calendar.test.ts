/**
 * THE WEEK AND THE CLOCK, HELD EXACT.
 *
 * The older calendar functions are held by the quoting and invoicing suites that depend on
 * them; these cover what scheduling added — the Monday of a week, and minutes from midnight.
 */
import { describe, expect, it } from 'vitest';
import {
	MINUTES_IN_DAY,
	formatMinuteOfDay,
	isMinuteOfDay,
	parseMinuteOfDay,
	startOfWeek,
	weekDays
} from './calendar';

describe('the week starts on Monday', () => {
	it('finds the Monday from every day of the week', () => {
		// 2026-09-14 is a Monday.
		expect(startOfWeek('2026-09-14')).toBe('2026-09-14');
		expect(startOfWeek('2026-09-16')).toBe('2026-09-14');
		expect(startOfWeek('2026-09-19')).toBe('2026-09-14');
		// Sunday belongs to the week that began the Monday before.
		expect(startOfWeek('2026-09-20')).toBe('2026-09-14');
		expect(startOfWeek('2026-09-21')).toBe('2026-09-21');
	});

	it('crosses a month and a year without losing a day', () => {
		expect(startOfWeek('2026-10-01')).toBe('2026-09-28');
		expect(startOfWeek('2027-01-01')).toBe('2026-12-28');
	});

	it('deals a week as seven consecutive days', () => {
		const days = weekDays('2026-09-14');
		expect(days).toHaveLength(7);
		expect(days[0]).toBe('2026-09-14');
		expect(days[6]).toBe('2026-09-20');
	});
});

describe('minutes from midnight', () => {
	it('accepts a whole minute of the day and nothing else', () => {
		expect(isMinuteOfDay(0)).toBe(true);
		expect(isMinuteOfDay(MINUTES_IN_DAY - 1)).toBe(true);
		expect(isMinuteOfDay(MINUTES_IN_DAY)).toBe(false);
		expect(isMinuteOfDay(-1)).toBe(false);
		expect(isMinuteOfDay(7.5)).toBe(false);
		expect(isMinuteOfDay('450')).toBe(false);
	});

	it('formats as the 24-hour clock a time input writes', () => {
		expect(formatMinuteOfDay(0)).toBe('00:00');
		expect(formatMinuteOfDay(450)).toBe('07:30');
		expect(formatMinuteOfDay(1439)).toBe('23:59');
	});

	it('parses what it formats, and refuses what is not a time', () => {
		expect(parseMinuteOfDay('07:30')).toBe(450);
		expect(parseMinuteOfDay('7:30')).toBe(450);
		expect(parseMinuteOfDay(' 23:59 ')).toBe(1439);
		expect(parseMinuteOfDay('24:00')).toBeNull();
		expect(parseMinuteOfDay('12:60')).toBeNull();
		expect(parseMinuteOfDay('noon')).toBeNull();
		expect(parseMinuteOfDay('')).toBeNull();
	});
});
