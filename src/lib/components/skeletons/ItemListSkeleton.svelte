<script lang="ts">
	/** The stock list: header and actions, the desktop summary, three tabs, a table or cards. */
	import { Skeleton } from '$lib/ui';
	import BadgeSkeleton from './BadgeSkeleton.svelte';
	import SkeletonLine from './SkeletonLine.svelte';
	import TabsSkeleton from './TabsSkeleton.svelte';
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<SkeletonLine class="text-helper font-medium" bar="w-20" />
			<SkeletonLine
				class="mt-1 text-[20px] font-semibold lg:text-[24px]"
				bar="h-5 w-20 rounded-md"
				tone="raised"
				landmark="title"
			/>
			<SkeletonLine class="mt-1 text-ui" bar="w-72 max-w-full" />
		</div>
		<div class="hidden items-center gap-2 lg:flex">
			<Skeleton bar={false} class="h-9 w-[112px] rounded-md" />
			<Skeleton bar={false} tone="raised" class="h-9 w-[104px] rounded-md" />
		</div>
	</div>

	<div
		class="mt-5 hidden flex-wrap items-start gap-x-12 gap-y-4 rounded-[10px] border border-line-default bg-surface-card px-5 py-[18px] lg:flex"
	>
		{#each [0, 1, 2, 3] as figure (figure)}
			<div>
				<SkeletonLine class="text-helper" bar="w-20" />
				<SkeletonLine class="mt-1 text-[18px]" bar="h-4 w-16 rounded-md" tone="raised" />
			</div>
		{/each}
	</div>

	<TabsSkeleton class="mt-5" labels={['w-12', 'w-20', 'w-16']} />

	<div
		class="mt-4 hidden overflow-hidden rounded-[10px] border border-line-default lg:block"
		data-skeleton="list"
	>
		<div class="flex h-10 items-center gap-6 border-b border-line-default px-3">
			{#each ['w-24', 'w-16', 'w-16', 'w-20', 'w-16'] as width, index (index)}
				<SkeletonLine class="flex-1 text-helper" bar={width} />
			{/each}
		</div>
		{#each [0, 1, 2, 3, 4, 5, 6, 7] as row (row)}
			<div class="flex items-center gap-6 border-b border-line-row px-3 py-2 last:border-b-0">
				<SkeletonLine class="flex-1 text-ui" bar="w-40" tone="raised" />
				<SkeletonLine class="flex-1 text-ui" bar="w-14" />
				<SkeletonLine class="flex-1 text-ui" bar="w-16" />
				<span class="flex-1"><BadgeSkeleton /></span>
				<SkeletonLine class="flex-1 text-ui" bar="w-16" />
			</div>
		{/each}
	</div>

	<div class="mt-4 flex flex-col gap-3 lg:hidden" data-skeleton="cards">
		{#each [0, 1, 2, 3] as card (card)}
			<div class="flex min-h-11 flex-col gap-2.5 rounded-[10px] border border-line-default p-4">
				<div class="flex items-start justify-between gap-3">
					<SkeletonLine class="text-ui" bar="w-40" tone="raised" />
					<BadgeSkeleton />
				</div>
				<SkeletonLine class="text-[22px]" bar="h-5 w-20 rounded-md" tone="raised" />
				<SkeletonLine class="text-helper" bar="w-32" />
			</div>
		{/each}
	</div>
</div>
