<script lang="ts">
	/** The roster: the way back, the title, then employees wide and teams narrow. */
	import { Skeleton } from '$lib/ui';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="mx-auto w-full max-w-4xl px-4 py-8 lg:px-8">
	<SkeletonLine class="text-helper" bar="w-16" />
	<SkeletonLine
		class="mt-2 text-[24px] font-semibold"
		bar="h-5 w-32 rounded-md"
		tone="raised"
		landmark="title"
	/>
	<SkeletonLine class="mt-1 text-ui" bar="w-80 max-w-full" />

	<div class="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
		<div>
			<SkeletonLine class="text-[16px] font-medium" bar="w-24" tone="raised" />
			<div class="mt-3 flex items-end gap-2">
				<Skeleton bar={false} class="h-11 min-w-52 flex-1 rounded-md lg:h-[38px]" />
				<Skeleton bar={false} tone="raised" class="h-11 w-28 rounded-md lg:h-9" />
			</div>
			<Skeleton bar={false} class="mt-4 h-40 w-full rounded-[10px]" />
		</div>
		<div>
			<SkeletonLine class="text-[16px] font-medium" bar="w-16" tone="raised" />
			<div class="mt-3 flex items-end gap-2">
				<Skeleton bar={false} class="h-11 min-w-40 flex-1 rounded-md lg:h-[38px]" />
				<Skeleton bar={false} class="h-11 w-24 rounded-md lg:h-9" />
			</div>
			<Skeleton bar={false} class="mt-4 h-28 w-full rounded-[10px]" />
		</div>
	</div>
</div>
