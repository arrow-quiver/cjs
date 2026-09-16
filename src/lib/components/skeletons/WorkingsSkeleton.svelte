<script lang="ts">
	/** "The numbers behind it": a back link, the heading, the margin block and the postings table. */
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8">
	<SkeletonLine class="text-helper" bar="w-24" />
	<SkeletonLine
		class="mt-2 text-[24px] font-semibold"
		bar="h-5 w-64 rounded-md"
		tone="raised"
		landmark="title"
	/>
	<div class="mt-6 flex flex-col gap-2 rounded-[12px] border border-line-default p-4">
		<SkeletonLine class="text-ui" bar="w-56" tone="raised" />
		<SkeletonLine class="text-ui" bar="w-40" />
	</div>
	<SkeletonLine class="mt-8 text-[16px]" bar="w-32" tone="raised" />
	<div class="mt-3 overflow-hidden rounded-[10px] border border-line-default">
		{#each [0, 1, 2, 3, 4] as row (row)}
			<div class="flex items-center gap-4 border-b border-line-row px-4 py-3 last:border-b-0">
				<SkeletonLine class="flex-1 text-ui" bar="w-40" />
				<SkeletonLine class="text-ui" bar="w-20" />
			</div>
		{/each}
	</div>
</div>
