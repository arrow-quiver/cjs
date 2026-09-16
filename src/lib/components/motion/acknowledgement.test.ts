/**
 * EVERY INPUT IS ACKNOWLEDGED INSIDE 400MS: ENUMERATED AND TESTED, NOT ASSUMED.
 *
 * Two halves. The first proves the machinery: `acknowledged`, `submission` and `tracked` raise
 * the activity flag the moment work starts and lower it however the work ends, including the
 * ways that are easy to forget (a cancel before sending, a throw).
 *
 * The second reads the source and holds the product to using it. Every progressively enhanced
 * form must go through the machinery, and every `fetch` a component makes must appear in the
 * table below, saying what the person sees while it runs. A new form or request that does
 * neither fails here by name, which is how "every interactive element that exists today" stays
 * true of the elements that exist tomorrow.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ActionResult } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { acknowledged, activity, submission, tracked } from './acknowledge.svelte';

const SRC = fileURLToPath(new URL('../../../', import.meta.url));

function input() {
	return {
		action: new URL('http://localhost/?/save'),
		formData: new FormData(),
		formElement: {} as HTMLFormElement,
		controller: new AbortController(),
		submitter: null,
		cancel: vi.fn()
	};
}

function outcome() {
	return {
		action: new URL('http://localhost/?/save'),
		formData: new FormData(),
		formElement: {} as HTMLFormElement,
		result: { type: 'success', status: 200 } as ActionResult,
		update: vi.fn(async () => {})
	};
}

describe('acknowledged()', () => {
	it('is busy from the press until the page has updated', async () => {
		const after = await acknowledged()(input());
		expect(activity.busy).toBe(true);

		const done = outcome();
		await (after as (o: ReturnType<typeof outcome>) => Promise<void>)(done);
		expect(done.update).toHaveBeenCalledOnce();
		expect(activity.busy).toBe(false);
	});

	it('runs the screen’s own callback instead of the default update', async () => {
		const own = vi.fn(async () => {});
		const after = await acknowledged(() => own)(input());

		const done = outcome();
		await (after as (o: ReturnType<typeof outcome>) => Promise<void>)(done);
		expect(own).toHaveBeenCalledOnce();
		expect(done.update).not.toHaveBeenCalled();
		expect(activity.busy).toBe(false);
	});

	it('settles when the screen cancels before anything is sent', async () => {
		const request = input();
		await acknowledged(({ cancel }) => cancel())(request);

		expect(request.cancel).toHaveBeenCalledOnce();
		expect(activity.busy).toBe(false);
	});

	it('settles when the screen’s submit function throws', async () => {
		await expect(
			acknowledged(() => {
				throw new Error('flush failed');
			})(input())
		).rejects.toThrow('flush failed');
		expect(activity.busy).toBe(false);
	});

	it('settles when the update itself fails', async () => {
		const after = await acknowledged()(input());
		const done = { ...outcome(), update: vi.fn(async () => Promise.reject(new Error('offline'))) };

		await expect((after as (o: typeof done) => Promise<void>)(done)).rejects.toThrow('offline');
		expect(activity.busy).toBe(false);
	});

	it('stays busy while any one of two requests is still in flight', async () => {
		const first = await acknowledged()(input());
		const second = await acknowledged()(input());

		await (first as (o: ReturnType<typeof outcome>) => Promise<void>)(outcome());
		expect(activity.busy).toBe(true);

		await (second as (o: ReturnType<typeof outcome>) => Promise<void>)(outcome());
		expect(activity.busy).toBe(false);
	});
});

describe('submission()', () => {
	it('gives the form’s own button a pending state for exactly as long as the request', async () => {
		const form = submission();
		expect(form.pending).toBe(false);

		const after = await form.enhance(input());
		expect(form.pending).toBe(true);
		expect(activity.busy).toBe(true);

		await (after as (o: ReturnType<typeof outcome>) => Promise<void>)(outcome());
		expect(form.pending).toBe(false);
		expect(activity.busy).toBe(false);
	});

	it('clears pending when the request is cancelled', async () => {
		const form = submission(({ cancel }) => cancel());
		await form.enhance(input());

		expect(form.pending).toBe(false);
		expect(activity.busy).toBe(false);
	});
});

describe('tracked()', () => {
	it('is busy while the work runs, and not after, even when it fails', async () => {
		let fail: (reason: Error) => void = () => {};
		const work = tracked(new Promise((_, reject) => (fail = reject)));
		expect(activity.busy).toBe(true);

		fail(new Error('network'));
		await expect(work).rejects.toThrow('network');
		expect(activity.busy).toBe(false);
	});
});

/**
 * EVERY `fetch` A COMPONENT MAKES, AND HOW THE PRESS BEHIND IT IS ACKNOWLEDGED.
 *
 * The count is exact. A second request in a file already listed fails until it says how it is
 * acknowledged, and an entry whose request has gone fails until it is removed.
 */
const FETCHES: Readonly<
	Record<string, { readonly count: number; readonly acknowledgement: string }>
> = {
	'lib/components/quoting/state.svelte.ts': {
		count: 1,
		acknowledgement:
			'Quote autosave. The save state flips to pending on the keystroke and `SaveState` says "Saving as you go" before the request is sent.'
	},
	'lib/components/quoting/QuoteEditor.svelte': {
		count: 1,
		acknowledgement:
			'Saving client details back to the record. The ask closes on the press, and `tracked()` raises the activity bar until the save lands.'
	},
	'lib/components/inventory/count.svelte.ts': {
		count: 1,
		acknowledgement:
			'Stock count autosave. `status` becomes pending on the keystroke, and `CountHeader` shows it.'
	},
	'routes/(app)/+layout.svelte': {
		count: 1,
		acknowledgement: 'Command bar search. The bar shows "Searching…" as soon as a query is typed.'
	},
	'routes/(app)/invoicing/[id]/+page.svelte': {
		count: 1,
		acknowledgement:
			'Invoice save. `saving` is set before the request, so the Save button goes pending and the live line says "Saving…".'
	}
};

function blankComments(text: string): string {
	const blank = (match: string) => match.replace(/[^\n]/g, ' ');
	return text
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/(^|\s)\/\/[^\n]*/g, blank);
}

function browserFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return browserFiles(path);
		return /\.svelte(\.ts)?$/.test(entry.name) ? [path] : [];
	});
}

const sources = browserFiles(SRC).map((path) => ({
	file: relative(SRC, path).replaceAll('\\', '/'),
	text: blankComments(readFileSync(path, 'utf8'))
}));

describe('the product, read from source', () => {
	it('finds the forms and requests it claims to hold', () => {
		// A scan of nothing would pass everything.
		const enhanced = sources.filter((s) => s.text.includes('use:enhance'));
		expect(enhanced.length).toBeGreaterThan(10);
		expect(sources.some((s) => s.file === 'routes/(app)/+layout.svelte')).toBe(true);
	});

	it('sends every enhanced form through acknowledged() or submission()', () => {
		const unacknowledged = sources.flatMap(({ file, text }) =>
			text.split('\n').flatMap((line, index) => {
				if (!line.includes('use:enhance')) return [];
				if (/use:enhance=\{acknowledged\(/.test(line)) return [];

				const named = line.match(/use:enhance=\{(\w+)\.enhance\}/)?.[1];
				if (named && new RegExp(`\\b${named}\\s*=\\s*submission\\(`).test(text)) return [];

				return [`${file}:${index + 1} ${line.trim()}`];
			})
		);

		expect(unacknowledged).toEqual([]);
	});

	it('lists every fetch a component makes, with its acknowledgement', () => {
		const counted = Object.fromEntries(
			sources
				.map(({ file, text }) => [file, text.match(/(?<![\w.])fetch\(/g)?.length ?? 0] as const)
				.filter(([, count]) => count > 0)
		);

		const listed = Object.fromEntries(
			Object.entries(FETCHES).map(([file, entry]) => [file, entry.count])
		);

		expect(counted).toEqual(listed);
	});
});
