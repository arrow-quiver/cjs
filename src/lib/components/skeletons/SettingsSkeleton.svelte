<script lang="ts">
	/** Settings, and the modules page beneath it: a narrow column of cards. */
	import { Skeleton } from '$lib/ui';
	import SkeletonLine from './SkeletonLine.svelte';
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 px-4 py-10">
	<div>
		<SkeletonLine
			class="text-2xl font-semibold"
			bar="h-5 w-32 rounded-md"
			tone="raised"
			landmark="title"
		/>
		<SkeletonLine class="mt-1 text-sm" bar="w-72 max-w-full" />
	</div>
	{#each [0, 1, 2] as card (card)}
		<div class="flex flex-col gap-4 rounded-lg border border-line-default py-4">
			<div class="flex flex-col gap-1.5 px-4">
				<SkeletonLine class="text-ui font-medium" bar="w-40" tone="raised" />
				<SkeletonLine class="text-ui" bar="w-64 max-w-full" />
			</div>
			<div class="px-4">
				<Skeleton bar={false} class="h-9 w-full rounded-md" />
			</div>
		</div>
	{/each}
</div>
