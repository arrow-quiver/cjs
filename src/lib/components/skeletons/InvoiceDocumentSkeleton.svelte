<script lang="ts">
	/**
	 * One invoice. Drawn as an issued invoice, the common case when arriving from the list: on a
	 * desktop the document beside its side column, on a phone the compact header and the lines.
	 */
	import { Skeleton } from '$lib/ui';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="hidden lg:block">
	<div class="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<SkeletonLine class="text-helper" bar="w-24" />
				<SkeletonLine
					class="mt-1 text-[24px] font-semibold"
					bar="h-5 w-56 rounded-md"
					tone="raised"
					landmark="title"
				/>
			</div>
			<div class="flex items-center gap-2">
				<Skeleton bar={false} class="h-9 w-[112px] rounded-md" />
				<Skeleton bar={false} tone="raised" class="h-9 w-[140px] rounded-md" />
			</div>
		</div>
		<div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
			<div class="rounded-[12px] bg-surface-sunken p-4 lg:p-8">
				<Skeleton bar={false} tone="quiet" class="h-[560px] w-full max-w-[560px] rounded-md" />
			</div>
			<div class="flex flex-col gap-6">
				{#each [0, 1] as card (card)}
					<div
						class="flex flex-col gap-3 rounded-[10px] border border-line-default bg-surface-card p-5"
					>
						<SkeletonLine class="text-helper" bar="w-20" />
						<SkeletonLine class="text-ui" bar="w-48" tone="raised" />
						<SkeletonLine class="text-ui" bar="w-36" />
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<div class="flex min-h-dvh flex-col lg:hidden">
	<div class="flex items-center gap-2 px-4 py-3">
		<Skeleton bar={false} class="size-11 rounded-md" />
		<SkeletonLine class="text-[15px]" bar="w-24" tone="raised" landmark="title" />
	</div>
	<div class="flex-1 px-4 pb-4">
		<SkeletonLine class="mt-2 text-[32px]" bar="h-6 w-36 rounded-md" tone="raised" />
		<SkeletonLine class="mt-1 text-ui" bar="w-48" />
		<div class="mt-6 rounded-[12px] border border-line-default px-4 py-1.5">
			{#each [0, 1, 2] as row (row)}
				<div
					class="flex items-center justify-between gap-3 border-b border-line-subtle py-2.5 last:border-b-0"
				>
					<SkeletonLine class="text-ui" bar="w-40" tone="raised" />
					<SkeletonLine class="text-ui" bar="w-16" />
				</div>
			{/each}
		</div>
	</div>
</div>
