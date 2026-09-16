/**
 * THE CLASH RULE, AND THE BOARD IT PROTECTS.
 *
 * Pure, so CI holds the logic that makes the schedule trustworthy even though the database
 * tests only run locally. The transaction that applies the rule is held by the scheduling
 * module's own suite.
 */
import { describe, expect, it } from 'vitest';
import { clashSentence, overlaps, weekBoard, type ScheduleEntry } from './index';

const slot = (day: string, startMinute: number, endMinute: number) => ({
	day,
	startMinute,
	endMinute
});

describe('two slots clash when they claim the same clock', () => {
	it('sees a straddle, a containment, and an identical slot', () => {
		const morning = slot('2026-09-14', 480, 600);
		expect(overlaps(morning, slot('2026-09-14', 540, 660))).toBe(true);
		expect(overlaps(morning, slot('2026-09-14', 500, 560))).toBe(true);
		expect(overlaps(morning, slot('2026-09-14', 480, 600))).toBe(true);
	});

	it('lets back-to-back work share a boundary minute', () => {
		expect(overlaps(slot('2026-09-14', 480, 600), slot('2026-09-14', 600, 720))).toBe(false);
		expect(overlaps(slot('2026-09-14', 600, 720), slot('2026-09-14', 480, 600))).toBe(false);
	});

	it('never clashes across days', () => {
		expect(overlaps(slot('2026-09-14', 480, 600), slot('2026-09-15', 480, 600))).toBe(false);
	});
});

describe('the clash refusal', () => {
	it('says who, on what, when, and both ways out', () => {
		const sentence = clashSentence('Thabo Nkosi', {
			...slot('2026-09-14', 480, 600),
			title: 'Geyser replacement'
		});
		expect(sentence).toBe(
			'Thabo Nkosi is already on Geyser replacement that day (Monday, 14 September, 08:00 to 10:00). Pick a different time, or different hands.'
		);
	});
});

describe('the week board', () => {
	const entry = (
		id: string,
		day: string,
		startMinute: number,
		name = 'Thabo Nkosi'
	): ScheduleEntry => ({
		id,
		jobId: null,
		title: 'Site visit',
		customerName: null,
		assignee: { kind: 'employee', id: 'e-1', name },
		day,
		startMinute,
		endMinute: startMinute + 60
	});

	it('deals seven columns and files each entry under its day, ordered by start', () => {
		const board = weekBoard('2026-09-14', [
			entry('b', '2026-09-15', 600),
			entry('a', '2026-09-15', 480),
			entry('c', '2026-09-20', 480)
		]);

		expect(board).toHaveLength(7);
		expect(board[0].entries).toHaveLength(0);
		expect(board[1].entries.map((e) => e.id)).toEqual(['a', 'b']);
		expect(board[6].entries.map((e) => e.id)).toEqual(['c']);
	});

	it('breaks a shared start by name, so the column is stable', () => {
		const board = weekBoard('2026-09-14', [
			entry('b', '2026-09-14', 480, 'Zoleka Dube'),
			entry('a', '2026-09-14', 480, 'Anele Mthembu')
		]);
		expect(board[0].entries.map((e) => e.assignee.name)).toEqual(['Anele Mthembu', 'Zoleka Dube']);
	});
});
