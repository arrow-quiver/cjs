<script lang="ts">
	/**
	 * ONE LINE OF TEXT THAT HAS NOT ARRIVED YET, AT THE HEIGHT THE TEXT WILL BE.
	 *
	 * A route skeleton is replaced wholesale by the page, so what keeps the screen from jumping is
	 * that every line it draws is exactly as tall as the line that replaces it. Guessing a height in
	 * pixels drifts the moment a type token changes. So this takes the REAL element's typography
	 * classes (`text-[24px] font-semibold`, `mt-1 text-ui`), holds its line box open with an
	 * invisible glyph, and centres a bar in it. The line is the text's line; only the ink is missing.
	 */
	import { Skeleton } from '$lib/ui';
	import { cn } from '$lib/utils';
	import type { SkeletonTone } from '$lib/components/ui/skeleton/skeleton.svelte';

	let {
		class: className,
		bar,
		tone = 'default',
		inline = false,
		landmark
	}: {
		/** The real element's typography and spacing classes. */
		class?: string;
		/** The bar's width, and its height if it should not be the standard 10px. */
		bar: string;
		tone?: SkeletonTone;
		/** Sit in a row of text rather than taking a line to itself. */
		inline?: boolean;
		/** Names this line for the layout-shift spec, which compares it with the real element. */
		landmark?: string;
	} = $props();
</script>

<span
	class={cn(inline ? 'inline-flex' : 'flex', 'items-center', className)}
	data-skeleton={landmark}
>
	<span class="invisible w-0 overflow-hidden" aria-hidden="true">x</span>
	<Skeleton {tone} class={bar} />
</span>
