<script lang="ts">
	/**
	 * HOME, ON THE WAY TO IT. The page's own header, then the same four streamed-panel skeletons Home
	 * shows while its promises settle, in the same two columns. Arriving from another screen and
	 * waiting on Home's own data therefore look like one continuous wait, not two.
	 */
	import { PanelSkeleton } from '$lib/components/home';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8 lg:py-10">
	<header class="mb-7">
		<SkeletonLine class="text-title" bar="h-5 w-20 rounded-md" tone="raised" landmark="title" />
		<SkeletonLine class="mt-1 text-ui" bar="w-64 max-w-full" />
	</header>

	<div class="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-8">
		<div class="flex min-w-0 flex-1 flex-col gap-7">
			<PanelSkeleton shape="standing" />
			<PanelSkeleton shape="resume" />
			<div class="flex flex-col gap-2.5">
				<SkeletonLine class="eyebrow" bar="w-20" />
				<PanelSkeleton shape="figures" />
			</div>
		</div>

		<div class="flex w-full flex-col gap-7 lg:w-[336px] lg:shrink-0">
			<PanelSkeleton shape="agenda" />
			<div class="flex flex-col gap-2.5">
				<SkeletonLine class="eyebrow" bar="w-24" />
				<div class="rounded-[10px] bg-surface-card px-4 py-1.5">
					{#each [0, 1, 2] as row (row)}
						<div class="flex items-center gap-3 border-b border-line-subtle py-3">
							<SkeletonLine class="flex-1 text-[13px]" bar="w-24" tone="raised" />
							<SkeletonLine class="text-[13px]" bar="w-12" />
						</div>
					{/each}
					<div class="flex items-center gap-3 py-3">
						<SkeletonLine class="flex-1 text-[13px]" bar="w-20" />
						<SkeletonLine class="text-[13px]" bar="w-24" />
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
