/**
 * NOTHING JUMPS WHEN THE CONTENT ARRIVES.
 *
 * Runs in a real Chromium at both of the design's frames, 390 × 844 and 1280 × 800, under the
 * `cls-phone` and `cls-desktop` projects. Two measurements, because there are two ways content
 * arrives in this product and the browser's own layout-shift metric only sees one of them.
 *
 * HOME STREAMS. Its four panels settle one at a time inside a page that is already on screen, so
 * the panels below a slow one are real, persistent elements that would move if a skeleton were the
 * wrong height. That is exactly what cumulative layout shift measures, so it is measured, with a
 * `layout-shift` PerformanceObserver, while each promise resolves.
 *
 * A ROUTE SKELETON IS REPLACED WHOLESALE. When the invoice list arrives, the skeleton leaves and
 * the list mounts in its place; no element survives the swap for the metric to catch moving, so a
 * CLS figure there would be zero for any skeleton at all. What a person sees instead is the title,
 * the tabs and the start of the list either staying put or jumping. So those landmarks are measured
 * in the skeleton, then in the real list, and must match to within a pixel.
 *
 * Both use content of the shape the skeleton promises: a resume panel with one card, the agenda
 * with three rows. A business with five cards to resume will see the page grow, and that is the
 * data, not the skeleton; this measures whether the skeleton tells the truth about its shape.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mount, unmount, type Component } from 'svelte';
import '../../../routes/layout.css';
import HomePage from '../../../routes/(app)/+page.svelte';
import InvoiceList from '../invoicing/InvoiceList.svelte';
import InvoiceListSkeleton from './InvoiceListSkeleton.svelte';
import {
	AGENDA_ROWS,
	MODULES_PANEL,
	MONTH_CARDS,
	RESUME_CARDS,
	STANDING_ATTENTION
} from '../../../stories/home/fixtures';
import {
	COUNTS,
	INVOICE_ROWS,
	LIST_TOTALS,
	SUMMARY,
	TODAY
} from '../../../stories/invoicing/fixtures';

const DESKTOP = 1024;
/** The design's floor for "effectively zero". Google's "good" threshold is 0.1; this is ten times stricter. */
const CLS_BUDGET = 0.01;

let target: HTMLElement | null = null;
let instance: Record<string, unknown> | null = null;

function render<P extends Record<string, unknown>>(component: Component<P>, props: P): HTMLElement {
	target = document.createElement('div');
	target.className = 'bg-surface-base';
	target.style.width = `${window.innerWidth}px`;
	document.body.style.margin = '0';
	document.body.append(target);
	instance = mount(component, { target, props }) as Record<string, unknown>;
	return target;
}

function clear() {
	if (instance) unmount(instance);
	target?.remove();
	instance = null;
	target = null;
}

afterEach(clear);

/** Let the browser lay out and paint `count` frames. */
function frames(count = 2): Promise<void> {
	return new Promise((resolve) => {
		let seen = 0;
		const step = () => (++seen >= count ? resolve() : requestAnimationFrame(step));
		requestAnimationFrame(step);
	});
}

async function settled(): Promise<void> {
	await document.fonts.ready;
	await frames(3);
}

function topOf(root: HTMLElement, selector: string): number {
	const element = root.querySelector(selector);
	expect(element, `nothing matches ${selector}`).not.toBeNull();
	return element!.getBoundingClientRect().top;
}

describe('the invoice list skeleton', () => {
	it('puts the title, the tabs and the list exactly where the list will draw them', async () => {
		const desktop = window.innerWidth >= DESKTOP;

		const skeleton = render(InvoiceListSkeleton, {});
		await settled();
		const drawn = {
			title: topOf(skeleton, '[data-skeleton="title"]'),
			tabs: topOf(skeleton, '[data-skeleton="tabs"]'),
			list: topOf(skeleton, desktop ? '[data-skeleton="list"]' : '[data-skeleton="cards"]'),
			firstRow: topOf(skeleton, desktop ? 'tbody tr' : '[data-skeleton="cards"] > *')
		};
		clear();

		const page = render(InvoiceList, {
			invoices: INVOICE_ROWS,
			counts: COUNTS,
			filter: 'all',
			today: TODAY,
			summary: SUMMARY,
			owed: LIST_TOTALS.owed,
			dueThisWeek: LIST_TOTALS.dueThisWeek,
			overdue: LIST_TOTALS.overdue,
			page: 1,
			pageCount: 1,
			sort: 'due',
			direction: 'asc',
			hrefFor: (filter: string) => `?filter=${filter}`,
			pageHref: (page: number) => `?page=${page}`,
			sortHref: (sort: string) => `?sort=${sort}`,
			exportHref: '/invoicing/export',
			oncreate: () => {}
		});
		await settled();

		const card = page.querySelector('[data-testid="invoice-card"]');
		const arrived = {
			title: topOf(page, 'h1'),
			tabs: topOf(page, 'nav[aria-label="Filter invoices"]'),
			list: desktop
				? page.querySelector('table')!.parentElement!.getBoundingClientRect().top
				: card!.parentElement!.getBoundingClientRect().top,
			firstRow: desktop ? topOf(page, 'tbody tr') : card!.getBoundingClientRect().top
		};

		for (const landmark of Object.keys(drawn) as (keyof typeof drawn)[]) {
			expect(
				Math.abs(arrived[landmark] - drawn[landmark]),
				`${landmark}: skeleton at ${drawn[landmark]}px, page at ${arrived[landmark]}px`
			).toBeLessThanOrEqual(1);
		}
	});
});

describe('Home, as its panels stream in', () => {
	/**
	 * THE LAST PANEL HAS NOTHING BELOW IT TO MOVE, so layout shift cannot see it: an agenda skeleton
	 * of the wrong height would pass the test after this one. So every panel's skeleton is also held
	 * to the height of the panel that replaces it, measured in place on the real page.
	 */
	it('holds every panel skeleton to the height of the panel that replaces it', async () => {
		const deferred = <T>() => {
			let resolve: (value: T) => void = () => {};
			const promise = new Promise<T>((done) => (resolve = done));
			return { promise, resolve };
		};
		const standing = deferred<typeof STANDING_ATTENTION>();
		const resume = deferred<typeof RESUME_CARDS>();
		const figures = deferred<typeof MONTH_CARDS>();
		const agenda = deferred<typeof AGENDA_ROWS>();

		const page = render(HomePage as unknown as Component<Record<string, unknown>>, {
			data: {
				greeting: 'Good morning, Alice',
				modules: MODULES_PANEL,
				standing: standing.promise,
				resume: resume.promise,
				figures: figures.promise,
				agenda: agenda.promise
			}
		});
		await settled();

		const heightOf = (selector: string) =>
			page.querySelector(selector)!.getBoundingClientRect().height;
		const skeletons = [...page.querySelectorAll('[data-slot="panel-skeleton"]')].map(
			(element) => element.getBoundingClientRect().height
		);
		expect(skeletons, 'one skeleton per streamed panel').toHaveLength(4);

		standing.resolve(STANDING_ATTENTION);
		resume.resolve(RESUME_CARDS.slice(0, 1));
		figures.resolve(MONTH_CARDS);
		agenda.resolve(AGENDA_ROWS.slice(0, 3));
		await settled();

		const panels = ['standing', 'resume', 'month', 'coming-up'].map((slot) =>
			heightOf(`[data-slot="${slot}"]`)
		);
		panels.forEach((height, index) => {
			expect(
				Math.abs(height - skeletons[index]),
				`panel ${index}: skeleton ${skeletons[index]}px, panel ${height}px`
			).toBeLessThanOrEqual(1);
		});
	});

	it('moves nothing already on screen while each panel lands', async () => {
		expect(PerformanceObserver.supportedEntryTypes, 'this browser cannot measure CLS').toContain(
			'layout-shift'
		);

		const deferred = <T>() => {
			let resolve: (value: T) => void = () => {};
			const promise = new Promise<T>((done) => (resolve = done));
			return { promise, resolve };
		};
		const standing = deferred<typeof STANDING_ATTENTION>();
		const resume = deferred<typeof RESUME_CARDS>();
		const figures = deferred<typeof MONTH_CARDS>();
		const agenda = deferred<typeof AGENDA_ROWS>();

		render(HomePage as unknown as Component<Record<string, unknown>>, {
			data: {
				greeting: 'Good morning, Alice',
				modules: MODULES_PANEL,
				standing: standing.promise,
				resume: resume.promise,
				figures: figures.promise,
				agenda: agenda.promise
			}
		});
		await settled();

		let shift = 0;
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries() as (PerformanceEntry & {
				value: number;
				hadRecentInput: boolean;
			})[]) {
				if (!entry.hadRecentInput) shift += entry.value;
			}
		});
		observer.observe({ type: 'layout-shift', buffered: false });

		// In the order a slow module would leave them: the money first, the standing last.
		figures.resolve(MONTH_CARDS);
		await settled();
		agenda.resolve(AGENDA_ROWS.slice(0, 3));
		await settled();
		resume.resolve(RESUME_CARDS.slice(0, 1));
		await settled();
		standing.resolve(STANDING_ATTENTION);
		await settled();

		observer.takeRecords().forEach((entry) => {
			const { value, hadRecentInput } = entry as PerformanceEntry & {
				value: number;
				hadRecentInput: boolean;
			};
			if (!hadRecentInput) shift += value;
		});
		observer.disconnect();

		// eslint-disable-next-line zones/float-money -- a layout-shift score, not an amount
		expect(shift, `cumulative layout shift ${shift.toFixed(4)}`).toBeLessThan(CLS_BUDGET);
	});
});
