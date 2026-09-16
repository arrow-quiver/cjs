<script lang="ts">
	/**
	 * A row of filter tabs, each the size of a real one: `rounded-[7px] px-3 py-1.5 text-ui`, a label
	 * and its count. The first is drawn selected, because a list always opens on a tab.
	 */
	import { cn } from '$lib/utils';
	import SkeletonLine from './SkeletonLine.svelte';

	let { labels, class: className }: { labels: readonly string[]; class?: string } = $props();
</script>

<div class={cn('flex flex-wrap items-center gap-1', className)} data-skeleton="tabs">
	{#each labels as width, index (index)}
		<span class={cn('rounded-[7px] px-3 py-1.5', index === 0 && 'bg-surface-raised')}>
			<SkeletonLine inline class="text-ui" bar={width} tone={index === 0 ? 'raised' : 'default'} />
		</span>
	{/each}
</div>
