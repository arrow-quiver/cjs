/**
 * What the jobs screens post, parsed. Forms arrive as strings; blanks become nulls, a client is an
 * id, and a status is one of the six, or the request is refused with a sentence.
 */
import { z } from 'zod';
import {
	isCalendarDate,
	parseMinuteOfDay,
	type CalendarDate,
	type MinuteOfDay
} from '$lib/core/calendar';
import { JOB_STATUSES, type JobStatus } from '$lib/core/jobs';
import { isAssigneeKind, type AssigneeKind } from '$lib/core/schedule';
import { check, messagesByField, type Vocabulary } from '$lib/core/validation';

const MAX_TEXT = 200;
const MAX_DESCRIPTION = 2000;

const optional = (max: number, tooLong: string) =>
	z
		.string()
		.trim()
		.max(max, tooLong)
		.optional()
		.transform((value) => (value ? value : null));

const newJob = z.object({
	customerId: z.uuid('Choose the client this work is for'),
	service: optional(MAX_TEXT, 'Keep what the work is to a short line, like "Geyser replacement"'),
	area: optional(MAX_TEXT, 'Keep where it is to a short line, like "Main bathroom"'),
	description: optional(
		MAX_DESCRIPTION,
		'That is longer than a job card holds. Trim it to the essentials'
	)
});

export type NewJob = z.output<typeof newJob>;

const WORDS: Vocabulary = {
	fields: {
		customerId: 'A client',
		service: 'What the work is',
		area: 'Where it is',
		description: 'The description'
	}
};

export type Parsed<T> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly errors: Readonly<Record<string, string>> };

export function parseNewJob(form: FormData): Parsed<NewJob> {
	const result = check(newJob, Object.fromEntries(form), WORDS);
	return result.ok
		? { ok: true, value: result.value }
		: { ok: false, errors: messagesByField(result) };
}

/** A status from a form, or null when it is not one of the six. */
export function parseStatus(form: FormData): JobStatus | null {
	const value = form.get('status');
	return typeof value === 'string' && (JOB_STATUSES as readonly string[]).includes(value)
		? (value as JobStatus)
		: null;
}

/** What the assign form posts: whose slot it is, and which stretch of which day. */
export type NewScheduleEntry = {
	readonly assignee: { readonly kind: AssigneeKind; readonly id: string };
	readonly day: CalendarDate;
	readonly startMinute: MinuteOfDay;
	readonly endMinute: MinuteOfDay;
};

/**
 * Parsed by hand rather than through zod, because two of the fields (`HH:MM` into minutes, the
 * `kind:id` assignee) are transformations the validation core has no vocabulary for, and four
 * fields do not earn a schema. Each refusal is a sentence naming the fix, per the standard.
 */
export function parseScheduleEntry(form: FormData): Parsed<NewScheduleEntry> {
	const errors: Record<string, string> = {};

	const rawAssignee = form.get('assignee');
	let assignee: NewScheduleEntry['assignee'] | null = null;
	if (typeof rawAssignee === 'string' && rawAssignee.includes(':')) {
		const kind = rawAssignee.slice(0, rawAssignee.indexOf(':'));
		const id = rawAssignee.slice(rawAssignee.indexOf(':') + 1);
		if (isAssigneeKind(kind) && id.length > 0) assignee = { kind, id };
	}
	if (!assignee) errors.assignee = 'Choose who this work is for: a person, or a team';

	const rawDay = form.get('day');
	const day = typeof rawDay === 'string' && isCalendarDate(rawDay) ? rawDay : null;
	if (!day) errors.day = 'Pick the day this work happens';

	const startMinute =
		typeof form.get('start') === 'string' ? parseMinuteOfDay(form.get('start') as string) : null;
	if (startMinute === null) errors.start = 'Give a start time, like 08:00';

	const endMinute =
		typeof form.get('end') === 'string' ? parseMinuteOfDay(form.get('end') as string) : null;
	if (endMinute === null) {
		errors.end = 'Give an end time, like 10:00';
	} else if (startMinute !== null && endMinute <= startMinute) {
		errors.end = 'The end has to come after the start. Swap them, or pick a later end';
	}

	if (
		Object.keys(errors).length > 0 ||
		!assignee ||
		!day ||
		startMinute === null ||
		endMinute === null
	) {
		return { ok: false, errors };
	}
	return { ok: true, value: { assignee, day, startMinute, endMinute } };
}

/** A person's or a team's name from the add forms: trimmed, present, and short enough to say. */
export function parseName(form: FormData, field: string): Parsed<string> {
	const raw = form.get(field);
	const name = typeof raw === 'string' ? raw.trim() : '';
	if (name.length === 0) return { ok: false, errors: { [field]: 'Give them a name' } };
	if (name.length > MAX_TEXT) {
		return { ok: false, errors: { [field]: 'Keep the name to a short line' } };
	}
	return { ok: true, value: name };
}

/** The membership toggle: which employee, which team, and on or off. */
export function parseMembership(
	form: FormData
): Parsed<{ employeeId: string; teamId: string; on: boolean }> {
	const employeeId = form.get('employeeId');
	const teamId = form.get('teamId');
	const on = form.get('on');
	if (
		typeof employeeId !== 'string' ||
		employeeId.length === 0 ||
		typeof teamId !== 'string' ||
		teamId.length === 0
	) {
		return { ok: false, errors: { membership: 'Choose the person and the team' } };
	}
	return { ok: true, value: { employeeId, teamId, on: on === 'true' } };
}
