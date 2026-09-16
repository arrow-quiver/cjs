<script lang="ts">
	/** A status badge's box, `rounded-[5px] px-2.25 py-1 text-helper`, with no word in it. */
	import SkeletonLine from './SkeletonLine.svelte';

	let { bar = 'w-12' }: { bar?: string } = $props();
</script>

<span class="inline-flex rounded-[5px] bg-surface-raised px-2.25 py-1">
	<SkeletonLine inline class="text-helper" {bar} tone="quiet" />
</span>
