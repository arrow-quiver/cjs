<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, waitFor } from 'storybook/test';
	import { ActivityBar } from '$lib/components/motion';
	import PendingButton from './PendingButton.svelte';
	import Specimen from './Specimen.svelte';

	const { Story } = defineMeta({
		title: 'Primitives/Motion',
		parameters: { layout: 'fullscreen' }
	});
</script>

<!--
	THE 400MS RULE, EXERCISED. The design: "Acknowledge every input inside 400ms, even when the work
	takes longer." The button below starts work that never ends, so what is asserted is the only
	thing the rule promises: that the press visibly took, fast, and that the button did not change
	width and shove its neighbours when its label did.
-->
<Story
	name="Pending button"
	asChild
	play={async ({ canvas }) => {
		const button = await canvas.getByRole('button', { name: 'Record it' });
		// Measured after the web font lands. Measured before, the width changes when Inter
		// replaces the fallback, which is the font arriving rather than the label changing.
		await document.fonts.ready;
		const before = button.getBoundingClientRect().width;
		const pressed = performance.now();

		await userEvent.click(button);

		await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'), { timeout: 400 });
		expect(performance.now() - pressed, 'acknowledged inside 400ms').toBeLessThan(400);
		expect(button).toHaveAttribute('aria-disabled', 'true');
		expect(document.activeElement, 'focus stayed on the button that was pressed').toBe(button);

		// A second press from the keyboard, where a pointer cannot reach it, does nothing.
		await userEvent.keyboard('{Enter}');
		expect(canvas.getByTestId('presses')).toHaveTextContent('Pressed 1');
		expect(button, 'the label says what is happening').toHaveAccessibleName('Recording…');
		expect(button.getBoundingClientRect().width, 'the button kept its width').toBe(before);
	}}
>
	<Specimen
		title="Pending"
		note="Press it. The button refuses further presses, says it is busy, and swaps its label for one that says what is happening. It keeps focus, and both labels share one grid cell, so it keeps the width of the longer."
	>
		<PendingButton />
	</Specimen>
</Story>

<!--
	The shell's activity bar, as it sits across the top of the content column while a page or a form
	is on its way. It slides in once and holds; it never loops and is removed rather than animated
	away. Its 2px track is there either way, so its arrival moves nothing.
-->
<Story name="Activity bar" asChild>
	<Specimen
		title="Activity bar"
		note="Shown from the press until the work settles. Idle below, busy above."
	>
		<div class="flex max-w-md flex-col gap-6">
			<div class="rounded-md border border-line-default bg-surface-card">
				<ActivityBar busy />
				<p class="px-4 py-3 text-ui text-ink-secondary">Busy</p>
			</div>
			<div class="rounded-md border border-line-default bg-surface-card">
				<ActivityBar busy={false} />
				<p class="px-4 py-3 text-ui text-ink-secondary">Idle</p>
			</div>
		</div>
	</Specimen>
</Story>
