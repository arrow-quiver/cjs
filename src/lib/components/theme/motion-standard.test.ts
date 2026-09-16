/**
 * THE MOTION STANDARD, HELD BY READING THE SOURCE.
 *
 * The standard is written in `$lib/components/motion/index.ts`. This file is what stops it being
 * only written: every `.svelte`, `.css` and `.ts` file under `src/`, vendored primitives and
 * stories included, is scanned for a duration, delay or curve of its own, and for anything that
 * loops, reverses or springs. A component that invents `duration-300` fails here by file and
 * line, before a later module can drift.
 *
 * It reads source rather than rendered CSS because the offence is the spelling. A token-driven
 * class and a literal one can compute to the same 150ms today and part company the day the token
 * changes.
 *
 * Comments are blanked before scanning, so a comment may explain a banned thing by name. Visible
 * copy is not a comment, which is why the one place that quotes the design's words sits on the
 * allow-list with its reason.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../../', import.meta.url));
const LAYOUT_CSS = readFileSync(join(SRC, 'routes/layout.css'), 'utf8');

type Rule = { readonly name: string; readonly pattern: RegExp; readonly why: string };

/** A class-like token boundary: not preceded by a word character or a hyphen. */
const edge = String.raw`(?<![\w-])`;

const RULES: readonly Rule[] = [
	{
		name: 'literal-duration',
		pattern: new RegExp(`${edge}duration-(?!base(?![\\w-]))[\\w.\\[\\]()%-]+`),
		why: 'Durations come from tokens: a bare `transition-*` is --motion-fast, `duration-base` is --motion-base.'
	},
	{
		name: 'named-curve',
		pattern: new RegExp(`${edge}ease-[\\w.\\[\\](),-]+`),
		why: 'The curve is --motion-ease, applied by default. There is no second one.'
	},
	{
		name: 'delay',
		pattern: new RegExp(`${edge}delay-[\\w\\[\\]()-]+`),
		why: 'Acknowledgement is immediate; a delay is the opposite.'
	},
	{
		name: 'looping-animation',
		pattern: new RegExp(`${edge}animate-(?!(?:in|out)(?![\\w-]))[\\w\\[\\]()-]+`),
		why: 'Only the one-shot `animate-in` / `animate-out` exist. Pulses, spins, pings and bounces loop.'
	},
	{
		name: 'repeat-or-direction',
		pattern: new RegExp(`${edge}(?:repeat|direction)-[\\w\\[\\]()-]+`),
		why: 'Motion runs once, forward.'
	},
	{
		name: 'loop-keyword',
		pattern: new RegExp(`${edge}(?:infinite|alternate(?:-reverse)?)(?![\\w-])`),
		why: 'Nothing loops and nothing reverses.'
	},
	{
		name: 'keyframes',
		pattern: /@keyframes\b/,
		why: 'The only keyframes are tw-animate’s enter and exit, driven by the tokens.'
	},
	{
		name: 'svelte-motion',
		pattern: /svelte\/(?:transition|motion|animate)\b/,
		why: 'Svelte transitions and springs carry their own durations and easings.'
	},
	{
		name: 'web-animation',
		pattern: /\.animate\(/,
		why: 'The Web Animations API takes its own duration and easing.'
	},
	{
		name: 'literal-timing',
		pattern:
			/(?<![\w-])(?:transition|animation)(?:-duration|-delay|-timing-function)?\s*:\s*[^;"'}]*?(?:\d+(?:\.\d+)?m?s\b|cubic-bezier|(?<![\w-])(?:ease|linear)(?![\w-])|steps\()/,
		why: 'A transition or animation written in CSS still takes its timing from the tokens.'
	},
	{
		name: 'cubic-bezier',
		pattern: /cubic-bezier\(/,
		why: 'The one curve is --motion-ease.'
	},
	{
		name: 'spinner',
		pattern: /(?<![\w-])(?:Spinner|Loader2?Icon)\b|icons\/loader/,
		why: 'A skeleton, never a spinner over content.'
	}
];

type Allowance = { readonly file: string; readonly snippet: string; readonly reason: string };

/**
 * Every exception, with its reason. An entry that no longer matches anything fails the suite, so
 * the list cannot quietly outlive the code it excused.
 */
const ALLOWED: readonly Allowance[] = [
	{
		file: 'routes/layout.css',
		snippet: '--motion-ease: cubic-bezier(0.2, 0, 0, 1);',
		reason: 'The token itself: the one place the curve is written.'
	},
	{
		file: 'routes/layout.css',
		snippet: 'animation-duration: 0.01ms !important;',
		reason: 'The reduced-motion rule, which is what makes every animation instant.'
	},
	{
		file: 'routes/layout.css',
		snippet: 'transition-duration: 0.01ms !important;',
		reason: 'The reduced-motion rule, which is what makes every transition instant.'
	},
	{
		file: 'stories/foundations/Foundations.svelte',
		snippet: '150–200ms, ease-out, forward only.',
		reason: 'The foundations page quotes the design’s own sentence to a reader.'
	}
];

/**
 * Blank comments to spaces, keeping every newline so line numbers still point at the source.
 *
 * A `//` only starts a comment outside a string. Blanking from any `//` to the end of the line
 * would let a URL in copy (`"see https://…"`) hide a class written after it on the same line.
 */
function blankComments(text: string, file: string): string {
	const blank = (match: string) => match.replace(/[^\n]/g, ' ');
	let out = text.replace(/\/\*[\s\S]*?\*\//g, blank);
	if (file.endsWith('.svelte')) out = out.replace(/<!--[\s\S]*?-->/g, blank);
	return out
		.split('\n')
		.map((line) => {
			const at = lineCommentStart(line);
			return at === -1 ? line : line.slice(0, at) + ' '.repeat(line.length - at);
		})
		.join('\n');
}

/** Where a `//` comment starts on this line, ignoring any `//` inside quotes; -1 if none. */
function lineCommentStart(line: string): number {
	let quote: string | null = null;
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (quote) {
			if (char === '\\') i++;
			else if (char === quote) quote = null;
		} else if (char === "'" || char === '"' || char === '`') {
			quote = char;
		} else if (char === '/' && line[i + 1] === '/' && (i === 0 || /\s/.test(line[i - 1]))) {
			return i;
		}
	}
	return -1;
}

type Violation = {
	readonly file: string;
	readonly line: number;
	readonly rule: string;
	readonly text: string;
};

function scan(file: string, text: string): Violation[] {
	const lines = blankComments(text, file).split('\n');
	const original = text.split('\n');
	return lines.flatMap((line, index) =>
		RULES.filter((rule) => rule.pattern.test(line)).map((rule) => ({
			file,
			line: index + 1,
			rule: rule.name,
			text: original[index].trim()
		}))
	);
}

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		if (!/\.(svelte|css|ts)$/.test(entry.name)) return [];
		// Tests describe the rules; they are not screens.
		if (/\.(test|spec)\.ts$/.test(entry.name)) return [];
		return [path];
	});
}

function allowanceFor(violation: Violation): Allowance | undefined {
	return ALLOWED.find((a) => a.file === violation.file && violation.text.includes(a.snippet));
}

describe('the scanner', () => {
	it.each([
		['literal-duration', 'x.svelte', '<div class="transition-colors duration-300">'],
		['literal-duration', 'x.svelte', '<div class="data-open:duration-100">'],
		['named-curve', 'x.svelte', '<div class="transition ease-in-out">'],
		['delay', 'x.svelte', '<div class="delay-150">'],
		['looping-animation', 'x.svelte', '<div class="animate-pulse rounded">'],
		['looping-animation', 'x.svelte', '<Loader class="animate-spin" />'],
		['loop-keyword', 'x.css', '.x { animation: glow 1s infinite; }'],
		['keyframes', 'x.css', '@keyframes glow { to { opacity: 0 } }'],
		['svelte-motion', 'x.svelte', "import { fade } from 'svelte/transition';"],
		['svelte-motion', 'x.ts', "import { spring } from 'svelte/motion';"],
		['web-animation', 'x.ts', 'element.animate(frames, 300);'],
		['literal-timing', 'x.svelte', '<div style="transition: opacity 300ms">'],
		['literal-timing', 'x.css', '.x { transition-timing-function: ease; }'],
		['cubic-bezier', 'x.css', '.x { --curve: cubic-bezier(0.3, 1.4, 0.6, 1); }'],
		['spinner', 'x.svelte', "import Loader2Icon from '@lucide/svelte/icons/loader-2';"],
		[
			'literal-duration',
			'x.svelte',
			'<p>See https://example.com <span class="duration-300">x</span></p>'
		],
		['literal-duration', 'x.ts', "const copy = 'read this // then'; const cls = 'duration-300';"]
	])('catches %s in %s', (rule, file, text) => {
		expect(scan(file, text).map((v) => v.rule)).toContain(rule);
	});

	it.each([
		['x.svelte', '<div class="transition-colors hover:bg-surface-raised">'],
		['x.svelte', '<div class="animate-in fade-in-0 duration-base slide-in-from-left-full">'],
		['x.svelte', '<div class="data-closed:animate-out data-closed:fade-out-0">'],
		['x.css', '.x { --default-transition-duration: var(--motion-fast); }'],
		['x.svelte', '<div style="transition: width var(--motion-base) var(--motion-ease)">'],
		['x.ts', 'const settlementDuration = daysBetween(a, b); // a duration-150 in a comment'],
		['x.ts', 'reversePayment(tx, id); // reverse is a business word'],
		['x.svelte', '<!-- `animate-pulse` loops, which is why it is gone -->'],
		['x.ts', "const note = 'a // is not a comment in a string'; // but duration-300 in one is"]
	])('passes %s: %s', (file, text) => {
		expect(scan(file, text)).toEqual([]);
	});
});

describe('the whole source tree', () => {
	const found = sourceFiles(SRC).flatMap((path) =>
		scan(relative(SRC, path).replaceAll('\\', '/'), readFileSync(path, 'utf8'))
	);

	it('scans the tree it claims to', () => {
		// A scan of nothing would pass everything. The shell, the button and the vendored dialog
		// are all in it, or the walk is broken.
		const files = sourceFiles(SRC).map((p) => relative(SRC, p).replaceAll('\\', '/'));
		expect(files).toEqual(
			expect.arrayContaining([
				'routes/layout.css',
				'lib/components/ui/button/button.svelte',
				'lib/components/ui/dialog/dialog-content.svelte',
				'routes/(app)/+layout.svelte'
			])
		);
	});

	it('defines no duration, curve or loop outside the tokens', () => {
		const unexcused = found
			.filter((v) => !allowanceFor(v))
			.map((v) => {
				const why = RULES.find((r) => r.name === v.rule)?.why;
				return `${v.file}:${v.line} [${v.rule}] ${v.text}\n    ${why}`;
			});
		expect(unexcused).toEqual([]);
	});

	it('keeps no allowance that no longer excuses anything', () => {
		const stale = ALLOWED.filter((a) => !found.some((v) => allowanceFor(v) === a)).map(
			(a) => `${a.file}: "${a.snippet}"`
		);
		expect(stale).toEqual([]);
	});
});

/** How far along a CSS cubic-bezier is at a given fraction of its duration. */
function progressAt(time: number, [x1, y1, x2, y2]: readonly number[]): number {
	const at = (t: number, a: number, b: number) =>
		3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
	// x(t) is monotonic for control x within [0, 1], so bisection finds the t for this time.
	let low = 0;
	let high = 1;
	for (let i = 0; i < 60; i++) {
		const mid = (low + high) / 2;
		if (at(mid, x1, x2) < time) low = mid;
		else high = mid;
	}
	return at((low + high) / 2, y1, y2);
}

describe('the tokens', () => {
	it('measures a curve the way a browser would', () => {
		expect(progressAt(0.5, [0, 0, 1, 1])).toBeCloseTo(0.5, 5);
		expect(progressAt(0.5, [0.42, 0, 1, 1])).toBeLessThan(0.5);
		expect(progressAt(0.5, [0, 0, 0.58, 1])).toBeGreaterThan(0.5);
	});

	const token = (name: string) => LAYOUT_CSS.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim();

	it('keeps both durations inside 150-200ms', () => {
		for (const name of ['--motion-fast', '--motion-base']) {
			const value = token(name);
			expect(value, name).toMatch(/^\d+ms$/);
			const ms = Number.parseInt(value!, 10);
			expect(ms, name).toBeGreaterThanOrEqual(150);
			expect(ms, name).toBeLessThanOrEqual(200);
		}
	});

	it('eases out without overshoot', () => {
		const curve = token('--motion-ease')?.match(/^cubic-bezier\(([^)]+)\)$/)?.[1];
		expect(curve).toBeDefined();
		const [x1, y1, x2, y2] = curve!.split(',').map(Number);
		// Every control point inside the unit square: nothing bounces past its end state.
		for (const v of [x1, y1, x2, y2]) {
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThanOrEqual(1);
		}
		// Eased OUT: it decelerates into its end state, so more than half of the change has landed
		// by half the time. An ease-in curve arrives late and fails this; so does linear.
		expect(progressAt(0.5, [x1, y1, x2, y2])).toBeGreaterThan(0.5);
	});

	it('routes Tailwind’s defaults and the dialog animations through them', () => {
		expect(LAYOUT_CSS).toMatch(/--default-transition-duration:\s*var\(--motion-fast\);/);
		expect(LAYOUT_CSS).toMatch(/--default-transition-timing-function:\s*var\(--motion-ease\);/);
		expect(LAYOUT_CSS).toMatch(/--transition-duration-base:\s*var\(--motion-base\);/);
		expect(LAYOUT_CSS).toMatch(/--ease-\*:\s*initial;/);
		for (const name of ['--animate-in', '--animate-out']) {
			const value = token(name);
			expect(value, name).toContain('var(--motion-fast)');
			expect(value, name).toContain('var(--motion-ease)');
		}
	});

	it('makes every transition and animation instant under reduced motion', () => {
		const block = LAYOUT_CSS.match(
			/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\t\}/
		)?.[1];
		expect(block).toBeDefined();
		expect(block).toMatch(/transition-duration:\s*0\.01ms !important/);
		expect(block).toMatch(/animation-duration:\s*0\.01ms !important/);
		expect(block).toMatch(/animation-iteration-count:\s*1 !important/);
	});
});
