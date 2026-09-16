<script lang="ts" module>
	/** One per streamed panel. `modules` has no skeleton — it needs no query and never waits. */
	export type PanelShape = 'standing' | 'resume' | 'figures' | 'agenda';
</script>

<script lang="ts">
	/**
	 * THE SHAPE OF WHAT IS COMING.
	 *
	 * Home's panels arrive separately, so each one holds its own place while it waits. Never a
	 * spinner over the page: a spinner says "wait", a skeleton says "here is what will be
	 * here", and on the screen an owner opens first the second is the one that lowers the
	 * pulse rather than raising it.
	 *
	 * Each shape below is the height of the panel it stands in for, line box for line box, so the
	 * layout does not jump as the panels land. `skeletons.cls.spec.ts` streams Home's panels in at
	 * both of the design's frames and fails if anything already on screen moves.
	 */
	import { Skeleton } from '$lib/ui';
	import SkeletonLine from '$lib/components/skeletons/SkeletonLine.svelte';

	let { shape }: { shape: PanelShape } = $props();
</script>

<!--
	Every line below uses the real panel's typography through `SkeletonLine`, so each is exactly as
	tall as the text that replaces it. Where copy usually wraps (the standing explanation, a point's
	explanation), the skeleton draws the two lines it usually takes.
-->
{#if shape === 'standing'}
	<div
		data-slot="panel-skeleton"
		class="flex flex-col gap-7 rounded-lg border border-line-default bg-surface-card p-8"
	>
		<div class="flex flex-col gap-3">
			<Skeleton bar={false} tone="raised" class="size-[30px] rounded-full" />
			<SkeletonLine class="text-section" bar="h-4 w-56 max-w-full rounded-md" tone="raised" />
			<!-- Two lines on a phone, where the explanation wraps; one beside it on a wide screen. -->
			<div class="max-w-[520px]">
				<SkeletonLine class="text-ui leading-[1.55]" bar="w-full" />
				<SkeletonLine class="text-ui leading-[1.55] lg:hidden" bar="w-2/3" />
			</div>
		</div>
		<div class="border-t border-line-subtle pt-7">
			<div class="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
				<!--
					A point's explanation is a sentence. In a third of a wide panel it wraps; across a
					phone most fit on one line, so only the first is drawn wrapping there.
				-->
				{#each [0, 1, 2] as point (point)}
					<div class="flex flex-col gap-1">
						<SkeletonLine class="text-ui" bar="w-40 max-w-full" tone="raised" />
						<div>
							<SkeletonLine class="text-helper" bar="w-full" />
							<SkeletonLine class="text-helper {point === 0 ? '' : 'hidden lg:flex'}" bar="w-1/2" />
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{:else if shape === 'figures'}
	<div data-slot="panel-skeleton" class="grid gap-3.5 sm:grid-cols-3">
		{#each [0, 1, 2] as card (card)}
			<div class="flex flex-col gap-2 rounded-[10px] bg-surface-card p-[18px]">
				<SkeletonLine class="text-[13px]" bar="w-28" />
				<SkeletonLine class="text-[24px]" bar="h-5 w-32 rounded-md" tone="raised" />
				<SkeletonLine class="text-helper" bar="w-36 max-w-full" />
			</div>
		{/each}
	</div>
{:else if shape === 'resume'}
	<!--
		Deliberately ONE card, not three. The section is absent when there is nothing to
		resume, so a three-card skeleton would promise work that usually does not exist and
		then collapse — the worst kind of layout shift, because it reads as something having
		been taken away.
	-->
	<div data-slot="panel-skeleton" class="flex flex-col gap-3.5">
		<SkeletonLine class="eyebrow" bar="w-44" />
		<div class="flex items-center gap-3.5 rounded-[10px] bg-surface-card px-4 py-3.5">
			<Skeleton bar={false} tone="raised" class="size-[17px] rounded-md" />
			<div class="min-w-0 flex-1">
				<SkeletonLine class="text-ui" bar="w-48 max-w-full" tone="raised" />
				<SkeletonLine class="text-helper" bar="w-64 max-w-full" />
			</div>
		</div>
	</div>
{:else}
	<div data-slot="panel-skeleton" class="flex flex-col gap-2.5">
		<SkeletonLine class="eyebrow" bar="w-24" />
		<div class="rounded-[10px] bg-surface-card px-4 py-1.5">
			{#each [true, true, false] as detail, row (row)}
				<div class="flex gap-3 border-b border-line-subtle py-3 last:border-b-0">
					<SkeletonLine class="min-w-[46px] shrink-0 text-helper" bar="w-[46px]" />
					<div class="min-w-0 flex-1">
						<SkeletonLine class="text-[13px]" bar="w-32" tone="raised" />
						{#if detail}
							<SkeletonLine class="mt-0.5 text-helper" bar="w-40 max-w-full" />
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
