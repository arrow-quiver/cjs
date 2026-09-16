<script lang="ts">
	/**
	 * A quote being written: the editor header, the form column, and on a wide screen the preview.
	 * Full height and no centred column, because the editor fills the content area.
	 */
	import { Skeleton } from '$lib/ui';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="flex h-full min-h-0 flex-col">
	<div class="border-b border-line-subtle px-8 pt-7 pb-5">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<SkeletonLine class="text-[12px]" bar="w-20" />
				<SkeletonLine
					class="mt-1.5 text-[24px] font-semibold"
					bar="h-5 w-48 rounded-md"
					tone="raised"
					landmark="title"
				/>
				<SkeletonLine class="mt-2 text-[13px]" bar="w-28" />
			</div>
			<div class="flex items-center gap-2">
				<Skeleton bar={false} class="h-9 w-[104px] rounded-md" />
				<Skeleton bar={false} tone="raised" class="h-9 w-[120px] rounded-md" />
			</div>
		</div>
	</div>

	<div class="flex min-h-0 flex-1">
		<div class="min-w-0 flex-1 px-8 py-6">
			<div class="flex max-w-[720px] flex-col gap-8">
				<div
					class="flex flex-col gap-3 rounded-[10px] border border-line-default bg-surface-card p-5"
				>
					<SkeletonLine class="text-helper" bar="w-16" />
					<SkeletonLine class="text-ui" bar="w-56" tone="raised" />
					<SkeletonLine class="text-ui" bar="w-40" />
				</div>
				<div class="overflow-hidden rounded-[10px] border border-line-default">
					{#each [0, 1, 2] as row (row)}
						<div class="flex items-center gap-4 border-b border-line-row px-4 py-3 last:border-b-0">
							<SkeletonLine class="flex-1 text-ui" bar="w-60" tone="raised" />
							<SkeletonLine class="text-ui" bar="w-10" />
							<SkeletonLine class="text-ui" bar="w-16" />
						</div>
					{/each}
				</div>
				<div class="flex justify-end">
					<div class="flex w-64 flex-col gap-2">
						<SkeletonLine class="text-ui" bar="w-full" />
						<SkeletonLine class="text-ui" bar="w-full" />
						<SkeletonLine class="text-[20px]" bar="h-4 w-full rounded-md" tone="raised" />
					</div>
				</div>
			</div>
		</div>
		<div
			class="hidden w-[520px] shrink-0 border-l border-line-subtle bg-surface-sunken p-6 xl:flex"
		>
			<Skeleton bar={false} tone="quiet" class="h-[640px] w-full rounded-md" />
		</div>
	</div>
</div>
