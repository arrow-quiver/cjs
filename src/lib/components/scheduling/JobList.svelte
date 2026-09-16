<script lang="ts">
	/**
	 * THE JOBS PIPELINE.
	 *
	 * One list at every width: what the work is, who it is for, and where it stands. Each row is the
	 * whole tap target, because the phone is where a job gets looked up on the way to it.
	 *
	 * Status here is only what a person set. Whether the work has been quoted, invoiced or paid is on
	 * the job itself, where it is derived from the documents rather than stored beside them.
	 */
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Plus from '@lucide/svelte/icons/plus';
	import { Badge, Button, EmptyState, NoMatches } from '$lib/ui';
	import {
		jobTitle,
		jobsEmptyCopy,
		statusLabel,
		statusTone,
		type JobFilter,
		type JobRow
	} from '$lib/core/jobs';
	import JobFilterTabs from './JobFilterTabs.svelte';

	let {
		jobs,
		counts,
		filter,
		page,
		pageCount,
		hrefFor,
		pageHref,
		readOnly = false,
		oncreate
	}: {
		jobs: readonly JobRow[];
		counts: Readonly<Record<JobFilter, number>>;
		filter: JobFilter;
		page: number;
		pageCount: number;
		hrefFor: (filter: JobFilter) => string;
		pageHref: (page: number) => string;
		readOnly?: boolean;
		oncreate?: () => void;
	} = $props();

	const moduleIsEmpty = $derived(counts.all === 0);
	const sentence = $derived(
		counts.open === 0
			? 'Nothing open right now.'
			: `${counts.open} open ${counts.open === 1 ? 'job' : 'jobs'}.`
	);
</script>

{#snippet newJob()}
	<Button onclick={oncreate}>
		<Plus class="size-4" aria-hidden="true" />
		New job
	</Button>
{/snippet}

<!-- Row and page hrefs carry ids and query strings, not route ids. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class="mx-auto w-full max-w-4xl px-4 py-8 lg:px-8">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="flex items-center gap-1.5 text-helper font-medium text-ink-secondary">
				<BadgeCheck class="size-3.5" aria-hidden="true" />
				Job scheduling
			</p>
			<h1 class="mt-1 text-[24px] font-semibold text-ink">Jobs</h1>
			<p class="mt-1 text-ui text-ink-secondary">{sentence}</p>
		</div>
		{#if !readOnly && !moduleIsEmpty}
			{@render newJob()}
		{/if}
	</div>

	<JobFilterTabs active={filter} {counts} {hrefFor} />

	{#if moduleIsEmpty}
		<EmptyState
			class="mt-8"
			icon={BadgeCheck}
			heading="No jobs yet"
			body={jobsEmptyCopy('all')}
			action={readOnly ? undefined : newJob}
		/>
	{:else if jobs.length === 0}
		<NoMatches class="mt-8" message={jobsEmptyCopy(filter)} />
	{:else}
		<ul class="mt-4 overflow-hidden rounded-[10px] border border-line-default bg-surface-card">
			{#each jobs as job (job.id)}
				<li class="border-b border-line-row last:border-b-0">
					<a
						href="/scheduling/{job.id}"
						class="flex min-h-11 items-center gap-4 px-4 py-3 transition-colors outline-none hover:bg-surface-raised/40
							focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid"
					>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-ui text-ink">{jobTitle(job)}</span>
							<span class="block truncate text-helper text-ink-muted">
								{job.customerName}{job.area ? ` · ${job.area}` : ''} ·
								<span class="numeric">{job.ref}</span>
							</span>
						</span>
						<Badge variant={statusTone(job.status)}>{statusLabel(job.status)}</Badge>
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	{#if pageCount > 1}
		<nav class="mt-6 flex items-center justify-between gap-4" aria-label="Pages of jobs">
			<a
				href={pageHref(page - 1)}
				aria-disabled={page <= 1}
				class="rounded-[7px] border border-line-control px-3 py-1.5 text-ui text-ink-secondary outline-none
					hover:bg-surface-raised/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring
					focus-visible:outline-solid aria-disabled:pointer-events-none aria-disabled:opacity-40"
			>
				Previous
			</a>
			<p class="text-helper text-ink-muted">Page {page} of {pageCount}</p>
			<a
				href={pageHref(page + 1)}
				aria-disabled={page >= pageCount}
				class="rounded-[7px] border border-line-control px-3 py-1.5 text-ui text-ink-secondary outline-none
					hover:bg-surface-raised/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring
					focus-visible:outline-solid aria-disabled:pointer-events-none aria-disabled:opacity-40"
			>
				Next
			</a>
		</nav>
	{/if}
</div>
