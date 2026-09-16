<script lang="ts">
	/**
	 * SEVEN DAYS, AND WHO IS ON WHAT.
	 *
	 * On a desktop the week is seven columns, because planning is a sideways glance. On a phone
	 * it is the days stacked, because a phone answers "what is today", and a seven-column grid
	 * at 390px would be seven slivers and a sideways scroll the product bans.
	 */
	import {
		formatMinuteOfDay,
		formatShortDate,
		weekdayName,
		type CalendarDate
	} from '$lib/core/calendar';
	import { weekBoard, type ScheduleEntry } from '$lib/core/schedule';

	let {
		start,
		today,
		entries
	}: {
		start: CalendarDate;
		today: CalendarDate;
		entries: readonly ScheduleEntry[];
	} = $props();

	const days = $derived(weekBoard(start, entries));
</script>

<!-- Slot hrefs carry job ids, not route ids. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#snippet slot(entry: ScheduleEntry)}
	{@const body = `${formatMinuteOfDay(entry.startMinute)} to ${formatMinuteOfDay(entry.endMinute)}`}
	{#if entry.jobId}
		<a
			href="/scheduling/{entry.jobId}"
			class="block rounded-lg border border-line-default bg-surface-card px-3 py-2.5 transition-colors outline-none hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid"
		>
			<span class="block truncate text-ui font-medium text-ink">{entry.title}</span>
			<span class="mt-0.5 block truncate text-helper text-ink-secondary">
				{entry.assignee.name} · <span class="numeric">{body}</span>
			</span>
			{#if entry.customerName}
				<span class="mt-0.5 block truncate text-helper text-ink-muted">{entry.customerName}</span>
			{/if}
		</a>
	{:else}
		<div class="rounded-lg border border-line-default bg-surface-card px-3 py-2.5">
			<span class="block truncate text-ui font-medium text-ink">{entry.title}</span>
			<span class="mt-0.5 block truncate text-helper text-ink-secondary">
				{entry.assignee.name} · <span class="numeric">{body}</span>
			</span>
		</div>
	{/if}
{/snippet}

<!-- The phone reads down. -->
<div class="flex flex-col gap-5 lg:hidden">
	{#each days as column (column.day)}
		<section aria-labelledby="day-{column.day}">
			<h2 id="day-{column.day}" class="flex items-baseline gap-2 text-ui font-medium text-ink">
				{weekdayName(column.day)}
				<span class="text-helper font-normal text-ink-muted">{formatShortDate(column.day)}</span>
				{#if column.day === today}
					<span class="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] text-brand-ink"
						>Today</span
					>
				{/if}
			</h2>
			{#if column.entries.length === 0}
				<p class="mt-2 text-helper text-ink-muted">Nothing planned.</p>
			{:else}
				<ul class="mt-2 flex flex-col gap-2">
					{#each column.entries as entry (entry.id)}
						<li>{@render slot(entry)}</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/each}
</div>

<!-- The desktop reads across. -->
<div class="hidden grid-cols-7 gap-3 lg:grid">
	{#each days as column (column.day)}
		<section aria-labelledby="col-{column.day}" class="min-w-0">
			<h2
				id="col-{column.day}"
				class="rounded-t-lg border-b-2 px-1 pb-2 text-helper font-medium {column.day === today
					? 'border-brand-ink text-ink'
					: 'border-line-subtle text-ink-secondary'}"
			>
				{weekdayName(column.day).slice(0, 3)}
				<span class="numeric font-normal text-ink-muted">{formatShortDate(column.day)}</span>
			</h2>
			<ul class="mt-2 flex min-h-24 flex-col gap-2">
				{#each column.entries as entry (entry.id)}
					<li>{@render slot(entry)}</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
