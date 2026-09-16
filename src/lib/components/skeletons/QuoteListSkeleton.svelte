<script lang="ts">
	/** The quote list: one column at every width, a note, then rows of client and status. */
	import { Skeleton } from '$lib/ui';
	import BadgeSkeleton from './BadgeSkeleton.svelte';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="mx-auto w-full max-w-4xl px-4 py-8 lg:px-8">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<SkeletonLine
				class="text-[24px] font-semibold"
				bar="h-5 w-24 rounded-md"
				tone="raised"
				landmark="title"
			/>
			<SkeletonLine class="mt-1 text-ui" bar="w-64 max-w-full" />
		</div>
		<Skeleton bar={false} tone="raised" class="h-9 w-[104px] rounded-md" />
	</div>

	<div class="mt-4 rounded-[10px] border border-line-default bg-surface-card px-4 py-3">
		<SkeletonLine class="text-helper" bar="w-80 max-w-full" />
	</div>

	<div class="mt-6 overflow-hidden rounded-[10px] border border-line-default" data-skeleton="list">
		{#each [0, 1, 2, 3, 4, 5] as row (row)}
			<div
				class="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line-row px-4 py-3 last:border-b-0"
			>
				<div>
					<SkeletonLine class="text-ui" bar="w-44" tone="raised" />
					<SkeletonLine class="mt-0.5 text-helper" bar="w-28" />
				</div>
				<BadgeSkeleton />
			</div>
		{/each}
	</div>
</div>
