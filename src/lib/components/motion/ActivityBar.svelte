<script lang="ts">
	/**
	 * The shell's acknowledgement that something is happening: a 2px brand line across the top of
	 * the content column, shown from the moment a page is requested or a form is sent until it
	 * settles.
	 *
	 * NOT A SPINNER, AND NOT A LOOP. It slides in once, at `--motion-base`, and holds. When the work
	 * settles it is removed outright rather than animated away, because motion here is forward only:
	 * a bar that shrank back to nothing would be the one reversing animation in the product.
	 *
	 * Its track is always rendered at 2px, so the bar arriving never moves the content below it.
	 * Screen readers are told through `aria-busy` on the region it sits above, which the shell
	 * sets from the same flag; the line itself is decoration.
	 */
	let { busy }: { busy: boolean } = $props();
</script>

<div class="pointer-events-none h-0.5 w-full shrink-0 overflow-hidden" aria-hidden="true">
	{#if busy}
		<div
			data-slot="activity-bar"
			class="h-full w-full animate-in bg-brand duration-base slide-in-from-left-full"
		></div>
	{/if}
</div>
