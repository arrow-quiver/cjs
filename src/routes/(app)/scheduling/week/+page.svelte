<script lang="ts">
	/**
	 * THE WEEK: the catalogue's own promise, "plan the week and see who's on what".
	 *
	 * Assignment happens on the job card and nowhere else, so this screen only shows and
	 * navigates. The one create path it offers is the link back to the jobs.
	 */
	import { WeekBoard } from '$lib/components/scheduling';
	import { EmptyState } from '$lib/ui';
	import { formatShortDate } from '$lib/core/calendar';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>This week · Jobs · CJs</title></svelte:head>

<!-- Week hrefs carry query strings, not route ids. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
	<a
		href="/scheduling"
		class="text-helper text-ink-secondary underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid"
	>
		Jobs
	</a>

	<div class="mt-2 flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-[24px] font-semibold text-ink">This week</h1>
			<p class="mt-1 text-ui text-ink-secondary">
				Week of {formatShortDate(data.start)}. Assign work from its job card; it lands here.
			</p>
		</div>
		<nav aria-label="Change week" class="flex items-center gap-2">
			<a
				href="?start={data.prev}"
				class="flex h-11 items-center rounded-md border border-line-control px-3 text-ui text-ink transition-colors outline-none hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid lg:h-9"
			>
				Previous
			</a>
			<a
				href="/scheduling/week"
				class="flex h-11 items-center rounded-md border border-line-control px-3 text-ui text-ink transition-colors outline-none hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid lg:h-9"
			>
				Today
			</a>
			<a
				href="?start={data.next}"
				class="flex h-11 items-center rounded-md border border-line-control px-3 text-ui text-ink transition-colors outline-none hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid lg:h-9"
			>
				Next
			</a>
			<a
				href="/scheduling/people"
				class="flex h-11 items-center rounded-md border border-line-control px-3 text-ui text-ink transition-colors outline-none hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid lg:h-9"
			>
				People
			</a>
		</nav>
	</div>

	<div class="mt-6">
		{#if !data.hasAny && data.entries.length === 0}
			<EmptyState
				heading="Nothing on the plan yet"
				body="Open a job and give it a day, a time and a pair of hands. The week fills in here."
			/>
		{:else}
			<WeekBoard start={data.start} today={data.today} entries={data.entries} />
		{/if}
	</div>
</div>
