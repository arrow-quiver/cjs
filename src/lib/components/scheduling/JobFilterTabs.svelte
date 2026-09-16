<script lang="ts">
	/**
	 * `Open 12 · Done 40 · Cancelled 3 · All 55`.
	 *
	 * The same tabs as invoicing and stock: real links, counts inline and shown at zero, and the tapped
	 * tab lit on the tap. See `invoicing/FilterTabs.svelte` for why each of those holds.
	 */
	import { JOB_FILTERS, jobFilterLabel, type JobFilter } from '$lib/core/jobs';

	let {
		active,
		counts,
		hrefFor
	}: {
		active: JobFilter;
		counts: Readonly<Record<JobFilter, number>>;
		hrefFor: (filter: JobFilter) => string;
	} = $props();

	let requested = $state<{ filter: JobFilter; from: JobFilter } | null>(null);
	const shown = $derived(requested && requested.from === active ? requested.filter : active);

	function request(event: MouseEvent, filter: JobFilter) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}
		requested = { filter, from: active };
	}
</script>

<!-- Query strings on the current route, so there is no route id for `resolve()` to check. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<nav class="mt-5 flex flex-wrap items-center gap-1" aria-label="Filter jobs">
	{#each JOB_FILTERS as filter (filter)}
		{@const isActive = filter === active}
		{@const isShown = filter === shown}
		<a
			href={hrefFor(filter)}
			aria-current={isActive ? 'page' : undefined}
			data-active={isShown ? 'true' : undefined}
			onclick={(event) => request(event, filter)}
			class="rounded-[7px] px-3 py-1.5 text-ui transition-colors outline-none
				hover:bg-surface-raised/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring
				focus-visible:outline-solid
				data-[active=true]:bg-surface-raised data-[active=true]:font-medium
				{isShown ? 'text-ink' : 'text-ink-secondary'}"
		>
			{jobFilterLabel(filter)}
			<span class="ml-1 numeric text-ink-muted">{counts[filter]}</span>
		</a>
	{/each}
</nav>
