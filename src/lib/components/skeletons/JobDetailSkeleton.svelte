<script lang="ts">
	/** One job: the way back, its title and client, the work and the money side by side, then moving it on. */
	import { Skeleton } from '$lib/ui';
	import BadgeSkeleton from './BadgeSkeleton.svelte';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8">
	<SkeletonLine class="text-helper" bar="w-10" />
	<SkeletonLine
		class="mt-2 text-[24px] font-semibold"
		bar="h-5 w-56 max-w-full rounded-md"
		tone="raised"
		landmark="title"
	/>
	<SkeletonLine class="mt-1 text-ui" bar="w-48" />

	<div
		class="mt-6 grid gap-x-12 gap-y-4 rounded-[10px] border border-line-default bg-surface-card px-5 py-[18px] sm:grid-cols-2"
	>
		<div>
			<SkeletonLine class="text-helper" bar="w-16" />
			<div class="mt-1.5"><BadgeSkeleton /></div>
		</div>
		<div>
			<SkeletonLine class="text-helper" bar="w-16" />
			<SkeletonLine class="mt-1 text-ui" bar="w-40" tone="raised" />
		</div>
	</div>

	<div class="mt-8">
		<SkeletonLine class="text-[16px] font-medium" bar="w-24" tone="raised" />
		<SkeletonLine class="mt-1 text-helper" bar="w-64 max-w-full" />
		<div class="mt-4 flex flex-col gap-4">
			<Skeleton bar={false} tone="raised" class="h-11 w-40 rounded-md lg:h-9" />
			<Skeleton bar={false} class="h-11 w-full max-w-sm rounded-md lg:h-9" />
		</div>
	</div>
</div>
