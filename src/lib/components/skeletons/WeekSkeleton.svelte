<script lang="ts">
	/** The week: the way back, the title and week controls, then seven columns (or the phone's stacked days). */
	import { Skeleton } from '$lib/ui';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
	<SkeletonLine class="text-helper" bar="w-10" />
	<div class="mt-2 flex flex-wrap items-end justify-between gap-3">
		<div>
			<SkeletonLine
				class="text-[24px] font-semibold"
				bar="h-5 w-40 rounded-md"
				tone="raised"
				landmark="title"
			/>
			<SkeletonLine class="mt-1 text-ui" bar="w-72 max-w-full" />
		</div>
		<div class="flex items-center gap-2">
			{#each [0, 1, 2, 3] as i (i)}
				<Skeleton bar={false} class="h-11 w-20 rounded-md lg:h-9" />
			{/each}
		</div>
	</div>

	<!-- The phone reads down. -->
	<div class="mt-6 flex flex-col gap-5 lg:hidden">
		{#each [0, 1, 2] as i (i)}
			<div>
				<SkeletonLine class="text-ui font-medium" bar="w-32" tone="raised" />
				<Skeleton bar={false} class="mt-2 h-16 w-full rounded-lg" />
			</div>
		{/each}
	</div>

	<!-- The desktop reads across. -->
	<div class="mt-6 hidden grid-cols-7 gap-3 lg:grid">
		{#each [0, 1, 2, 3, 4, 5, 6] as i (i)}
			<div class="min-w-0">
				<SkeletonLine class="border-b-2 border-line-subtle px-1 pb-2 text-helper" bar="w-14" />
				<Skeleton bar={false} class="mt-2 h-20 w-full rounded-lg" />
			</div>
		{/each}
	</div>
</div>
