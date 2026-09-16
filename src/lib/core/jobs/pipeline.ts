/**
 * THE PIPELINE: HOW THE JOBS SCREEN SORTS, NAMES AND MOVES WORK.
 *
 * Everything here is about `job.status`, which is OPERATIONAL and set by a person. None of it reads
 * money. Whether a job has been quoted, invoiced or paid is `commercialState`, derived on read and
 * shown beside the status, never folded into it: a job can be done with money still owed, or paid
 * in full and still under way, and both are ordinary.
 *
 * Nothing moves a job but a person pressing a button. There is no transition table: any status can
 * follow any other, because real work goes back on hold, gets cancelled and gets revived. What this
 * offers instead is the ONE next step a job usually takes, as the obvious button.
 */
import type { JobStatus } from './types';

/** A job as the pipeline screens show it: what, for whom, and where it stands. */
export type JobRow = {
	readonly id: string;
	readonly ref: string;
	readonly status: JobStatus;
	readonly customerName: string;
	readonly service: string | null;
	readonly area: string | null;
	readonly description: string | null;
};

/** The tabs on the jobs list, in order. `open` is where a person starts. */
export const JOB_FILTERS = ['open', 'done', 'cancelled', 'all'] as const;
export type JobFilter = (typeof JOB_FILTERS)[number];

export function isJobFilter(value: unknown): value is JobFilter {
	return typeof value === 'string' && (JOB_FILTERS as readonly string[]).includes(value);
}

/** Work that is still somebody's to do. */
export const OPEN_STATUSES: readonly JobStatus[] = [
	'unscheduled',
	'scheduled',
	'in_progress',
	'on_hold'
];

/** The statuses a tab shows, or null for every job. */
export function statusesFor(filter: JobFilter): readonly JobStatus[] | null {
	switch (filter) {
		case 'open':
			return OPEN_STATUSES;
		case 'done':
			return ['done'];
		case 'cancelled':
			return ['cancelled'];
		case 'all':
			return null;
	}
}

export function jobFilterLabel(filter: JobFilter): string {
	switch (filter) {
		case 'open':
			return 'Open';
		case 'done':
			return 'Done';
		case 'cancelled':
			return 'Cancelled';
		case 'all':
			return 'All';
	}
}

/** The step a job most often takes next, for the one obvious button. Null when it is finished. */
export function nextStep(
	status: JobStatus
): { readonly status: JobStatus; readonly label: string } | null {
	switch (status) {
		case 'unscheduled':
			return { status: 'scheduled', label: 'Mark as scheduled' };
		case 'scheduled':
			return { status: 'in_progress', label: 'Start the work' };
		case 'in_progress':
			return { status: 'done', label: 'Mark as done' };
		case 'on_hold':
			return { status: 'in_progress', label: 'Pick it back up' };
		case 'done':
		case 'cancelled':
			return null;
	}
}

/** How a status is coloured. Only a job waiting on somebody to schedule it asks for attention. */
export function statusTone(status: JobStatus): 'attention' | 'sent' | 'settled' | 'draft' {
	switch (status) {
		case 'unscheduled':
			return 'attention';
		case 'scheduled':
		case 'in_progress':
			return 'sent';
		case 'done':
			return 'settled';
		case 'on_hold':
		case 'cancelled':
			return 'draft';
	}
}

/** What a job is called on a screen: what the work is, in the words somebody gave it. */
export function jobTitle(job: {
	readonly service: string | null;
	readonly description: string | null;
}): string {
	return job.service?.trim() || job.description?.trim() || 'Job with no description yet';
}

/** The sentence for a tab with nothing on it. */
export function jobsEmptyCopy(filter: JobFilter): string {
	switch (filter) {
		case 'open':
			return 'Nothing open. Every job is done or cancelled.';
		case 'done':
			return 'Nothing marked done yet.';
		case 'cancelled':
			return 'Nothing cancelled.';
		case 'all':
			return 'Add a job and it will move through here, from not scheduled to done.';
	}
}
