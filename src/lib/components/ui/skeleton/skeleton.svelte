<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	/**
	 * A skeleton, never a spinner over content. The design is explicit about this: a
	 * spinner says "wait", a skeleton says "here is the shape of what is coming", and the
	 * second is the one that lowers anxiety.
	 *
	 * Bars are 10px high with a 5px radius. Three tones let a block of them read as a
	 * paragraph rather than a wall — vary the tone and the width, not the height.
	 *
	 * It does not pulse. A pulse fades out and back again, forever, and the motion standard is
	 * forward only: nothing reverses and nothing loops. A skeleton is content, not motion, so it
	 * holds still and stays visible under `prefers-reduced-motion` without any special case.
	 */
	export const skeletonVariants = tv({
		base: 'block rounded-[5px]',
		variants: {
			tone: {
				default: 'bg-line-default',
				raised: 'bg-surface-raised',
				quiet: 'bg-surface-quiet'
			},
			bar: {
				true: 'h-2.5',
				false: ''
			}
		},
		defaultVariants: { tone: 'default', bar: true }
	});

	export type SkeletonTone = VariantProps<typeof skeletonVariants>['tone'];
</script>

<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		tone = 'default',
		bar = true,
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> & {
		tone?: SkeletonTone;
		/** The design's 10px bar. Set false for a block that needs its own height. */
		bar?: boolean;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="skeleton"
	aria-hidden="true"
	class={cn(skeletonVariants({ tone, bar }), className)}
	{...restProps}
></div>
