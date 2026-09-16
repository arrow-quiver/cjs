<script lang="ts">
	/** The jobs pipeline: header and action, four tabs, and rows of what, for whom and where it stands. */
	import { Skeleton } from '$lib/ui';
	import BadgeSkeleton from './BadgeSkeleton.svelte';
	import SkeletonLine from './SkeletonLine.svelte';
	import TabsSkeleton from './TabsSkeleton.svelte';
</script>

<div class="mx-auto w-full max-w-4xl px-4 py-8 lg:px-8">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<SkeletonLine class="text-helper font-medium" bar="w-24" />
			<SkeletonLine
				class="mt-1 text-[24px] font-semibold"
				bar="h-5 w-16 rounded-md"
				tone="raised"
				landmark="title"
			/>
			<SkeletonLine class="mt-1 text-ui" bar="w-28" />
		</div>
		<Skeleton bar={false} tone="raised" class="h-9 w-[104px] rounded-md" />
	</div>

	<TabsSkeleton class="mt-5" labels={['w-12', 'w-12', 'w-20', 'w-8']} />

	<div
		class="mt-4 overflow-hidden rounded-[10px] border border-line-default bg-surface-card"
		data-skeleton="list"
	>
		{#each [0, 1, 2, 3, 4, 5, 6, 7] as row (row)}
			<div
				class="flex min-h-11 items-center gap-4 border-b border-line-row px-4 py-3 last:border-b-0"
			>
				<div class="min-w-0 flex-1">
					<SkeletonLine class="text-ui" bar="w-48 max-w-full" tone="raised" />
					<SkeletonLine class="text-helper" bar="w-56 max-w-full" />
				</div>
				<BadgeSkeleton />
			</div>
		{/each}
	</div>
</div>
