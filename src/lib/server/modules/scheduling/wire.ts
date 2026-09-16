/**
 * What the jobs screens post, parsed. Forms arrive as strings; blanks become nulls, a client is an
 * id, and a status is one of the six, or the request is refused with a sentence.
 */
import { z } from 'zod';
import { JOB_STATUSES, type JobStatus } from '$lib/core/jobs';
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
