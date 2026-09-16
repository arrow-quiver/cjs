<script lang="ts">
	/** One stock item: the header, the figures, and the movement history that produced them. */
	import { Skeleton } from '$lib/ui';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<SkeletonLine class="text-helper" bar="w-24" />
			<SkeletonLine
				class="mt-1 text-[20px] font-semibold lg:text-[24px]"
				bar="h-5 w-56 rounded-md"
				tone="raised"
				landmark="title"
			/>
			<SkeletonLine class="mt-1 text-ui" bar="w-72 max-w-full" />
			<SkeletonLine class="mt-2 text-helper" bar="w-80 max-w-full" />
		</div>
		<div class="flex items-center gap-2">
			<Skeleton bar={false} class="h-9 w-[72px] rounded-md" />
			<Skeleton bar={false} class="h-9 w-[88px] rounded-md" />
		</div>
	</div>

	<div
		class="mt-6 flex flex-wrap gap-x-12 gap-y-4 rounded-[10px] border border-line-default bg-surface-card px-5 py-[18px]"
	>
		{#each [0, 1, 2, 3, 4] as figure (figure)}
			<div>
				<SkeletonLine class="text-helper" bar="w-20" />
				<SkeletonLine class="mt-1 text-[18px]" bar="h-4 w-16 rounded-md" tone="raised" />
			</div>
		{/each}
	</div>

	<div class="mt-8">
		<SkeletonLine class="text-[16px] font-medium" bar="w-36" tone="raised" />
		<div class="mt-3 overflow-hidden rounded-[10px] border border-line-default">
			{#each [0, 1, 2, 3, 4, 5] as row (row)}
				<div class="flex items-center gap-6 border-b border-line-row px-3 py-2 last:border-b-0">
					<SkeletonLine class="w-24 text-ui" bar="w-16" />
					<SkeletonLine class="flex-1 text-ui" bar="w-32" tone="raised" />
					<SkeletonLine class="w-20 text-ui" bar="w-12" />
				</div>
			{/each}
		</div>
	</div>
</div>
