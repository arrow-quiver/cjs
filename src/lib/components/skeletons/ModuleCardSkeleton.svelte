<script lang="ts">
	/** A module without screens of its own yet: the one card it shows, locked, removed or coming. */
	import { Skeleton } from '$lib/ui';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="mx-auto w-full max-w-2xl px-4 py-10 lg:py-16">
	<div
		class="flex flex-col items-start gap-2.5 rounded-[10px] border border-line-default bg-surface-card p-7"
		data-skeleton="title"
	>
		<Skeleton bar={false} tone="raised" class="size-[22px] rounded-md" />
		<SkeletonLine class="text-[16px]" bar="w-48" tone="raised" />
		<SkeletonLine class="text-[13px]" bar="w-80 max-w-full" />
		<Skeleton bar={false} tone="raised" class="mt-1.5 h-9 w-[132px] rounded-md" />
	</div>
</div>
