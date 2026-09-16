<script lang="ts">
	/** A stock count in progress: the header, the four-step stepper, and the sheet of lines. */
	import { Skeleton } from '$lib/ui';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
	<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
		<div>
			<SkeletonLine class="text-helper" bar="w-24" />
			<SkeletonLine
				class="mt-1 text-title"
				bar="h-5 w-56 rounded-md"
				tone="raised"
				landmark="title"
			/>
		</div>
		<div class="flex flex-col gap-1 lg:items-end">
			<SkeletonLine class="text-helper" bar="w-32" />
			<SkeletonLine class="text-helper" bar="w-24" />
		</div>
	</div>

	<div class="mt-6 flex items-center gap-3">
		{#each [0, 1, 2, 3] as step (step)}
			<Skeleton bar={false} tone={step === 0 ? 'raised' : 'default'} class="h-8 w-28 rounded-md" />
		{/each}
	</div>

	<div class="mt-6">
		<SkeletonLine class="text-ui" bar="w-60" />
		<div class="mt-3 overflow-x-auto">
			<div class="min-w-[860px] rounded-[10px] border border-line-default" data-skeleton="list">
				<div
					class="grid grid-cols-[1fr_150px_100px_120px_110px_130px] gap-3 border-b border-line-default px-3 py-2"
				>
					{#each ['w-16', 'w-16', 'w-12', 'w-16', 'w-14', 'w-16'] as width, index (index)}
						<SkeletonLine class="text-helper" bar={width} />
					{/each}
				</div>
				{#each [0, 1, 2, 3, 4, 5, 6, 7] as row (row)}
					<div
						class="grid grid-cols-[1fr_150px_100px_120px_110px_130px] items-center gap-3 border-b border-line-row px-3 py-2.5 last:border-b-0"
					>
						<SkeletonLine class="text-ui" bar="w-40" tone="raised" />
						<SkeletonLine class="text-ui" bar="w-20" />
						<SkeletonLine class="text-ui" bar="w-10" />
						<Skeleton bar={false} class="h-8 w-full rounded-md" />
						<SkeletonLine class="text-ui" bar="w-10" />
						<SkeletonLine class="text-ui" bar="w-16" />
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
