<script lang="ts">
	/**
	 * ONE JOB: WHAT IT IS, WHERE THE WORK STANDS, AND WHERE THE MONEY STANDS.
	 *
	 * The two "where" answers sit side by side and never merge. Status is what a person set. The
	 * commercial sentence is derived, on this read, from the quotes and invoices that point at the
	 * job. "Done" beside "R2 400 still owed" is a normal job, not a contradiction, and this screen
	 * says both rather than choosing.
	 */
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/ui';
	import { jobTitle, statusLabel, statusTone, type JobRow } from '$lib/core/jobs';
	import type { EmployeeRow, ScheduleEntry, TeamRow } from '$lib/core/schedule';
	import ScheduleControl from './ScheduleControl.svelte';
	import StatusControl from './StatusControl.svelte';

	let {
		job,
		commercial,
		slots,
		employees,
		teams,
		readOnly = false
	}: {
		job: JobRow;
		/** `commercialSentence(jobCommercialState(...))`, already worded. */
		commercial: string;
		slots: readonly ScheduleEntry[];
		employees: readonly EmployeeRow[];
		teams: readonly TeamRow[];
		readOnly?: boolean;
	} = $props();
</script>

<div class="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8">
	<a
		href={resolve('/scheduling')}
		class="text-helper text-ink-secondary underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid"
	>
		Jobs
	</a>
	<h1 class="mt-2 text-[24px] font-semibold text-ink">{jobTitle(job)}</h1>
	<p class="mt-1 text-ui text-ink-secondary">
		For {job.customerName} · <span class="numeric">{job.ref}</span>
	</p>

	<dl
		class="mt-6 grid gap-x-12 gap-y-4 rounded-[10px] border border-line-default bg-surface-card px-5 py-[18px] sm:grid-cols-2"
	>
		<div>
			<dt class="text-helper text-ink-muted">The work</dt>
			<dd class="mt-1.5">
				<Badge variant={statusTone(job.status)}>{statusLabel(job.status)}</Badge>
			</dd>
		</div>
		<div>
			<dt class="text-helper text-ink-muted">The money</dt>
			<dd class="mt-1 text-ui text-ink">{commercial}</dd>
		</div>
		{#if job.area}
			<div>
				<dt class="text-helper text-ink-muted">Where</dt>
				<dd class="mt-1 text-ui text-ink">{job.area}</dd>
			</div>
		{/if}
		{#if job.description && job.description !== job.service}
			<div class="sm:col-span-2">
				<dt class="text-helper text-ink-muted">Notes</dt>
				<dd class="mt-1 text-ui whitespace-pre-line text-ink">{job.description}</dd>
			</div>
		{/if}
	</dl>

	{#if !readOnly || slots.length > 0}
		<section class="mt-8" aria-labelledby="job-plan-heading">
			<h2 id="job-plan-heading" class="text-[16px] font-medium text-ink">On the plan</h2>
			<p class="mt-1 text-helper text-ink-muted">
				A day, a stretch of the clock, and a person or a team. Assignment happens here and nowhere
				else, and everybody involved is told.
			</p>
			<div class="mt-4">
				<ScheduleControl {slots} {employees} {teams} {readOnly} />
			</div>
		</section>
	{/if}

	{#if !readOnly}
		<section class="mt-8" aria-labelledby="job-move-heading">
			<h2 id="job-move-heading" class="text-[16px] font-medium text-ink">Move it on</h2>
			<p class="mt-1 text-helper text-ink-muted">
				Only you close a job. Paying or invoicing it never does.
			</p>
			<div class="mt-4">
				<StatusControl status={job.status} />
			</div>
		</section>
	{/if}
</div>
