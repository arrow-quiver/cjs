/**
 * THE MOTION STANDARD.
 *
 * The design gives motion two sentences, and both are rules:
 *
 * > Motion: 150-200ms, ease-out, forward only. Acknowledge every input inside 400ms, even when
 * > the work takes longer.
 *
 * and, in the primitives block:
 *
 * > Loading: a skeleton, never a spinner over content.
 *
 * What that means in this codebase, and what holds each rule in place:
 *
 * 1. DURATIONS AND CURVES COME FROM TOKENS. `--motion-fast` (150ms), `--motion-base` (200ms) and
 *    `--motion-ease` in `src/routes/layout.css` are the only place either is written. A bare
 *    `transition-*` class runs at `--motion-fast`; `duration-base` is the one named alternative.
 *    `motion-standard.test.ts` fails any file that writes a duration, delay or curve of its own.
 *
 * 2. FORWARD ONLY. Nothing reverses, bounces, springs or loops: no `animate-pulse`, no
 *    `animate-spin`, no `infinite`, no `alternate`, and nothing from `svelte/motion`. A dialog
 *    closing is an exit, not a reversal. The same test enforces this.
 *
 * 3. EVERY INPUT IS ACKNOWLEDGED INSIDE 400MS. An enhanced form goes through `submission()` or
 *    `acknowledged()`, which raise the shell's activity bar the moment it is sent; a button that
 *    submits its own form shows `pending`. Navigation raises the same bar, and the tapped nav item
 *    or filter tab takes its selected state before the page arrives. Every `fetch` a component
 *    makes is listed with its acknowledgement in `acknowledgement.test.ts`, so a new one cannot be
 *    added without saying how it is acknowledged.
 *
 * 4. A SKELETON, NEVER A SPINNER OVER CONTENT. Skeletons mirror the shape of what is coming, and
 *    hold still.
 *
 * 5. `prefers-reduced-motion` IS HONOURED EVERYWHERE by one rule in `layout.css`: transitions and
 *    animations become instant. Skeletons stay, because they are content, not motion.
 */
export { default as ActivityBar } from './ActivityBar.svelte';
export { acknowledged, activity, submission, tracked, type Submission } from './acknowledge.svelte';
