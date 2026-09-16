import { describe, expect, it } from 'vitest';
import { JOB_STATUSES } from './types';
import {
	JOB_FILTERS,
	OPEN_STATUSES,
	isJobFilter,
	jobFilterLabel,
	jobTitle,
	jobsEmptyCopy,
	nextStep,
	statusTone,
	statusesFor
} from './pipeline';

describe('the tabs', () => {
	it('puts every status under exactly one of open, done and cancelled', () => {
		const covered = [
			...statusesFor('open')!,
			...statusesFor('done')!,
			...statusesFor('cancelled')!
		];
		expect([...covered].sort()).toEqual([...JOB_STATUSES].sort());
		expect(new Set(covered).size).toBe(covered.length);
	});

	it('shows every job under all', () => {
		expect(statusesFor('all')).toBeNull();
	});

	it('names every tab and has a sentence for every empty one', () => {
		for (const filter of JOB_FILTERS) {
			expect(jobFilterLabel(filter)).not.toBe('');
			expect(jobsEmptyCopy(filter)).toMatch(/\.$/);
		}
	});

	it('recognises its own filters and nothing else', () => {
		expect(isJobFilter('open')).toBe(true);
		expect(isJobFilter('unscheduled')).toBe(false);
		expect(isJobFilter(null)).toBe(false);
	});
});

describe('the next step', () => {
	it('walks a job from not scheduled to done', () => {
		expect(nextStep('unscheduled')?.status).toBe('scheduled');
		expect(nextStep('scheduled')?.status).toBe('in_progress');
		expect(nextStep('in_progress')?.status).toBe('done');
	});

	it('picks held work back up, and offers nothing once work is finished', () => {
		expect(nextStep('on_hold')?.status).toBe('in_progress');
		expect(nextStep('done')).toBeNull();
		expect(nextStep('cancelled')).toBeNull();
	});

	it('never offers a step to where the job already is', () => {
		for (const status of JOB_STATUSES) expect(nextStep(status)?.status).not.toBe(status);
	});
});

describe('the words', () => {
	it('asks for attention only for work nobody has scheduled', () => {
		const attention = JOB_STATUSES.filter((s) => statusTone(s) === 'attention');
		expect(attention).toEqual(['unscheduled']);
		expect(OPEN_STATUSES).toContain('unscheduled');
	});

	it('calls a job by its service, then its description, then says it has neither', () => {
		expect(jobTitle({ service: 'Geyser replacement', description: 'Kitchen' })).toBe(
			'Geyser replacement'
		);
		expect(jobTitle({ service: '  ', description: 'Leak under the sink' })).toBe(
			'Leak under the sink'
		);
		expect(jobTitle({ service: null, description: null })).toBe('Job with no description yet');
	});
});
