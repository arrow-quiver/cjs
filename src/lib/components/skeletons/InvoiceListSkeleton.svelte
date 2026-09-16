<script lang="ts">
	/**
	 * THE INVOICE LIST, BEFORE IT ARRIVES. Mirrors `invoicing/InvoiceList.svelte` element for
	 * element: the same container, the same header lines at the same type sizes, the summary bar
	 * and six-column table on a desktop, cards on a phone. `skeletons.cls.spec.ts` holds the title,
	 * the tabs and the start of the list to within a pixel of where the real page draws them.
	 */
	import BadgeSkeleton from './BadgeSkeleton.svelte';
	import SkeletonLine from './SkeletonLine.svelte';
	import TabsSkeleton from './TabsSkeleton.svelte';
	import { Skeleton } from '$lib/ui';

	/** A screenful. The real page holds up to 25; eight fills a laptop without promising more. */
	const ROWS = [0, 1, 2, 3, 4, 5, 6, 7];
	const CARDS = [0, 1, 2, 3];
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<!--
			Full width on a phone. The real sentence is wider than what is left beside "Export", so the
			link wraps to a row of its own, and the skeleton has to draw that row too.
		-->
		<div class="w-full min-w-0 lg:w-auto">
			<SkeletonLine class="gap-1.5 text-helper font-medium" bar="w-20" />
			<SkeletonLine
				class="mt-1 text-[24px] font-semibold"
				bar="h-5 w-28 rounded-md"
				tone="raised"
				landmark="title"
			/>
			<SkeletonLine class="mt-1 text-ui" bar="w-72 max-w-full" />
		</div>

		<Skeleton bar={false} tone="raised" class="hidden h-9 w-[132px] rounded-md lg:block" />
		<SkeletonLine class="text-[13px] lg:hidden" bar="w-12" />
	</div>

	<div class="hidden lg:block">
		<div
			class="mt-6 flex flex-wrap items-center justify-between gap-6 rounded-[10px] border border-line-default bg-surface-card px-5 py-[18px]"
		>
			<div class="flex flex-wrap items-center gap-x-12 gap-y-4">
				{#each [0, 1, 2] as figure (figure)}
					<div>
						<SkeletonLine class="text-helper" bar="w-20" />
						<SkeletonLine class="mt-1 text-[20px]" bar="h-4 w-24 rounded-md" tone="raised" />
					</div>
				{/each}
			</div>
			<div class="flex flex-col items-start gap-1 sm:items-end">
				<Skeleton bar={false} tone="raised" class="h-9 w-[104px] rounded-md" />
				<SkeletonLine class="text-helper" bar="w-32" />
			</div>
		</div>
	</div>

	<div class="overflow-x-auto lg:overflow-visible">
		<TabsSkeleton class="mt-5" labels={['w-12', 'w-16', 'w-16', 'w-12', 'w-14']} />
	</div>

	<div class="hidden lg:block">
		<div
			class="mt-4 overflow-hidden rounded-[10px] border border-line-default"
			data-skeleton="list"
		>
			<table class="w-full border-collapse text-left">
				<colgroup>
					<col style="width: 110px" />
					<col />
					<col style="width: 110px" />
					<col style="width: 130px" />
					<col style="width: 140px" />
					<col style="width: 140px" />
				</colgroup>
				<thead class="bg-surface-card">
					<tr class="border-b border-line-default">
						{#each ['w-12', 'w-10', 'w-10', 'w-8', 'w-10', 'w-12'] as width, index (index)}
							<th class="px-4 py-2.5 text-helper font-medium {index === 5 ? 'text-right' : ''}">
								<SkeletonLine inline class="text-helper" bar={width} />
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each ROWS as row (row)}
						<tr class="border-b border-line-row last:border-b-0">
							<td class="px-4 py-3"><SkeletonLine class="text-[13px]" bar="w-16" /></td>
							<td class="px-4 py-3"><SkeletonLine class="text-ui" bar="w-40" tone="raised" /></td>
							<td class="px-4 py-3"><SkeletonLine class="text-[13px]" bar="w-14" /></td>
							<td class="px-4 py-3"><SkeletonLine class="text-[13px]" bar="w-14" /></td>
							<td class="px-4 py-3"><BadgeSkeleton /></td>
							<td class="px-4 py-3 text-right">
								<SkeletonLine inline class="text-[13px]" bar="w-16" />
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div class="mt-4 flex flex-col gap-3 lg:hidden" data-skeleton="cards">
		{#each CARDS as card (card)}
			<div class="rounded-[12px] border border-line-default bg-surface-card p-4">
				<div class="flex items-start justify-between gap-3">
					<SkeletonLine class="text-[15px]" bar="w-40" tone="raised" />
					<BadgeSkeleton />
				</div>
				<SkeletonLine class="mt-2 text-[24px]" bar="h-5 w-28 rounded-md" tone="raised" />
				<SkeletonLine class="mt-1 text-helper" bar="w-24" />
			</div>
		{/each}
	</div>
</div>
