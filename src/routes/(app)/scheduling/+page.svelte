<script lang="ts">
	/**
	 * JOB SCHEDULING, IN THREE STATES.
	 *
	 *   none   never owned  — `LockedModule`. Calm, concrete, no urgency.
	 *   read   removed      — `RemovedModule`, above the jobs, which stay readable.
	 *   write  owned        — the pipeline, and starting a job by hand.
	 */
	import { CreateJobDialog, JobList } from '$lib/components/scheduling';
	import { LockedModule, RemovedModule } from '$lib/components/modules';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { JobFilter } from '$lib/core/jobs';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let creating = $state(false);

	/** Reopen on a refusal, so the reason sits beside what was typed. */
	$effect(() => {
		if (form && (form.message || Object.keys(form.errors ?? {}).length > 0)) creating = true;
	});

	function hrefFor(filter: JobFilter): string {
		return filter === 'open' ? '?' : `?filter=${filter}`;
	}

	function pageHref(page: number): string {
		const params = new SvelteURLSearchParams();
		if (data.filter !== 'open') params.set('filter', data.filter);
		if (page > 1) params.set('page', String(page));
		const query = params.toString();
		return query ? `?${query}` : '?';
	}
</script>

<svelte:head><title>Jobs · CJs</title></svelte:head>

{#if data.access === 'none'}
	<div class="mx-auto w-full max-w-2xl px-4 py-10 lg:py-16">
		<LockedModule
			moduleKey="scheduling"
			label={data.module.label}
			accent={data.module.accent}
			price={data.price}
			carryover={data.carryover}
		/>
	</div>
{:else}
	{#if data.access === 'read'}
		<div class="mx-auto w-full max-w-4xl px-4 pt-8 lg:px-8">
			<RemovedModule moduleKey="scheduling" label={data.module.label} accent={data.module.accent} />
		</div>
	{/if}

	<JobList
		jobs={data.jobs}
		counts={data.counts}
		filter={data.filter}
		page={data.page}
		pageCount={data.pageCount}
		{hrefFor}
		{pageHref}
		readOnly={data.access !== 'write'}
		oncreate={() => (creating = true)}
	/>

	{#if data.access === 'write'}
		<CreateJobDialog
			bind:open={creating}
			customers={data.customers}
			errors={form?.errors ?? {}}
			message={form?.message ?? null}
		/>
	{/if}
{/if}
