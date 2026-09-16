/**
 * JOBS ON A PHONE.
 *
 * A job gets looked up on the way to it and moved on standing in front of it, so every row and
 * every button that moves a job carries the 44px floor. Measured in Chromium at 390 × 844.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mount, unmount, type Component } from 'svelte';
import '../../../routes/layout.css';
import type { JobFilter, JobRow } from '$lib/core/jobs';
import JobDetail from './JobDetail.svelte';
import JobList from './JobList.svelte';

const TOUCH_MINIMUM = 44;
const PHONE_WIDTH = 390;

let target: HTMLElement | null = null;
let instance: Record<string, unknown> | null = null;

function render<P extends Record<string, unknown>>(component: Component<P>, props: P): HTMLElement {
	target = document.createElement('div');
	target.style.width = `${PHONE_WIDTH}px`;
	document.body.style.margin = '0';
	document.body.append(target);
	instance = mount(component, { target, props }) as Record<string, unknown>;
	return target;
}

afterEach(() => {
	if (instance) unmount(instance);
	target?.remove();
	instance = null;
	target = null;
});

const JOB: JobRow = {
	id: 'j-1',
	ref: 'JOB-0014',
	status: 'scheduled',
	customerName: 'Fynbos Interiors and Bespoke Cabinetmaking Services',
	service: 'Geyser replacement in the main bathroom, including the drip tray',
	area: 'Main bathroom',
	description: null
};

const COUNTS: Readonly<Record<JobFilter, number>> = { open: 2, done: 0, cancelled: 0, all: 2 };

describe('jobs on a phone', () => {
	it('makes every row in the list a full touch target, however long its text', () => {
		const list = render(JobList, {
			jobs: [JOB, { ...JOB, id: 'j-2', ref: 'JOB-0015', service: 'Leak' }],
			counts: COUNTS,
			filter: 'open',
			page: 1,
			pageCount: 1,
			hrefFor: (f: JobFilter) => `?filter=${f}`,
			pageHref: (p: number) => `?page=${p}`
		});

		const rows = [...list.querySelectorAll('ul a')];
		expect(rows).toHaveLength(2);
		for (const row of rows) {
			expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(TOUCH_MINIMUM);
		}
		// Long text truncates rather than pushing the page sideways.
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(PHONE_WIDTH);
	});

	it('gives the buttons that move a job a full touch target', () => {
		const detail = render(JobDetail, { job: JOB, commercial: 'Quote accepted' });

		const controls = [...detail.querySelectorAll('section button')];
		expect(controls.length).toBeGreaterThanOrEqual(3);
		for (const control of controls) {
			expect(
				control.getBoundingClientRect().height,
				control.textContent ?? ''
			).toBeGreaterThanOrEqual(TOUCH_MINIMUM);
		}
	});
});
