<script lang="ts">
	/**
	 * `All 24 · Unpaid 6 · Overdue 0 · Paid 16 · Drafts 2`.
	 *
	 * Counts INLINE, not as badges — the design is specific about that, and a badge would give a
	 * zero count nowhere to go. `Overdue 0` is shown, because "'Overdue: none' is stated rather
	 * than hidden" is the rule this whole screen is built on.
	 *
	 * Real links, not buttons. The filter is in the URL, so a filtered list can be bookmarked,
	 * shared, reloaded and reached from Home's overdue standing point — which links straight to
	 * `?filter=overdue`. A click handler holding the state in a rune would break all four.
	 *
	 * Active: `--surface-raised`, radius 7px, weight 500, from the design.
	 */
	import { INVOICE_FILTERS, filterLabel, type InvoiceFilter } from '$lib/core/invoicing';

	let {
		active,
		counts,
		hrefFor
	}: {
		active: InvoiceFilter;
		counts: Readonly<Record<InvoiceFilter, number>>;
		hrefFor: (filter: InvoiceFilter) => string;
	} = $props();

	/**
	 * THE TAPPED TAB LIGHTS UP ON THE TAP. The next list has to come from the server, and until it
	 * does the press is acknowledged by drawing the tapped tab as selected. This is the look only:
	 * the link still navigates, the URL is still the truth, and `aria-current` keeps naming the
	 * page actually showing. The request remembers which tab was active when it was made, so the
	 * moment a new `active` arrives it stops applying.
	 *
	 * It cannot outlive a navigation that fails. SvelteKit either lands the page, renders the error
	 * page in its place, or falls back to a full page load, and each of those replaces this
	 * component or its `active`. A navigation superseded by a tap on another tab replaces the
	 * request with the newer one.
	 */
	let requested = $state<{ filter: InvoiceFilter; from: InvoiceFilter } | null>(null);
	const shown = $derived(requested && requested.from === active ? requested.filter : active);

	function request(event: MouseEvent, filter: InvoiceFilter) {
		// A modified click opens a new tab and leaves this page where it is.
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}
		requested = { filter, from: active };
	}
</script>

<!--
	The hrefs are query strings on the current route, so there is no literal route id for
	`resolve()` to type-check against — the same situation as the row links in `InvoiceTable`.
-->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<!--
	A tab list of links. `aria-current="page"` rather than the tab pattern's `aria-selected`,
	because these navigate — a screen reader should be told which page it is on, not which panel
	is showing.
-->
<nav class="mt-5 flex flex-wrap items-center gap-1" aria-label="Filter invoices">
	{#each INVOICE_FILTERS as filter (filter)}
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
			{filterLabel(filter)}
			<!--
				The count sits inside the link so it is read as part of the same control, and it is
				always rendered — a tab whose number vanished at zero would take the good news away
				exactly when there is some.
			-->
			<span class="ml-1 numeric text-ink-muted">{counts[filter]}</span>
		</a>
	{/each}
</nav>
