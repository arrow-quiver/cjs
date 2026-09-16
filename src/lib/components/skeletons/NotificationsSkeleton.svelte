<script lang="ts">
	/** The feed: the title and its count, then the list of rows. */
	import { Skeleton } from '$lib/ui';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8">
	<SkeletonLine
		class="text-[24px] font-semibold"
		bar="h-5 w-48 rounded-md"
		tone="raised"
		landmark="title"
	/>
	<SkeletonLine class="mt-1 text-ui" bar="w-32" />

	<div class="mt-6 rounded-[10px] border border-line-default bg-surface-card">
		{#each [0, 1, 2] as i (i)}
			<div class="flex items-start gap-3 px-5 py-3.5 {i > 0 ? 'border-t border-line-subtle' : ''}">
				<Skeleton bar={false} class="mt-[7px] size-2 rounded-full" />
				<div class="min-w-0 flex-1">
					<SkeletonLine class="text-ui font-medium" bar="w-64 max-w-full" tone="raised" />
					<SkeletonLine class="mt-0.5 text-helper" bar="w-40" />
				</div>
				<SkeletonLine class="text-helper" bar="w-10" />
			</div>
		{/each}
	</div>
</div>
