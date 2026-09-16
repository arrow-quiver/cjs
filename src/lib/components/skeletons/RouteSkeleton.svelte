<script lang="ts">
	/**
	 * The skeleton for the page on its way, drawn in the content area in place of the page that is
	 * leaving. The shell decides when (see `(app)/+layout.svelte`); this only decides what.
	 *
	 * Hidden from assistive technology, which is told the region is busy instead: a screen reader has
	 * nothing to gain from a list of grey bars.
	 */
	import { skeletonFor } from './routes';

	let { routeId }: { routeId: string } = $props();

	const Shape = $derived(skeletonFor(routeId));
</script>

{#if Shape}
	<div class="h-full" aria-hidden="true" data-slot="route-skeleton" data-route={routeId}>
		<Shape />
	</div>
{/if}
