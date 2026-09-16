<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { CreateJobDialog, JobDetail, JobList } from '$lib/components/scheduling';
	import type { CreateCustomer } from '$lib/components/customers';
	import type { JobFilter, JobRow } from '$lib/core/jobs';
	import type { EmployeeRow, ScheduleEntry, TeamRow } from '$lib/core/schedule';

	const { Story } = defineMeta({
		title: 'Jobs/Pipeline',
		parameters: { layout: 'fullscreen' }
	});

	const EMPLOYEES: readonly EmployeeRow[] = [
		{ id: 'e-1', name: 'Thabo Nkosi', teamIds: ['t-1'] },
		{ id: 'e-2', name: 'Anele Mthembu', teamIds: [] }
	];

	const TEAMS: readonly TeamRow[] = [{ id: 't-1', name: 'Install crew', memberCount: 2 }];

	const SLOTS: readonly ScheduleEntry[] = [
		{
			id: 's-1',
			jobId: 'j-1',
			title: 'Geyser replacement',
			customerName: 'Fynbos Interiors',
			assignee: { kind: 'employee', id: 'e-1', name: 'Thabo Nkosi' },
			day: '2026-09-15',
			startMinute: 480,
			endMinute: 600
		}
	];

	const JOBS: readonly JobRow[] = [
		{
			id: 'j-1',
			ref: 'JOB-0014',
			status: 'unscheduled',
			customerName: 'Fynbos Interiors',
			service: 'Geyser replacement',
			area: 'Main bathroom',
			description: null
		},
		{
			id: 'j-2',
			ref: 'JOB-0013',
			status: 'in_progress',
			customerName: 'Baraka Café',
			service: 'Kitchen extraction',
			area: null,
			description: null
		},
		{
			id: 'j-3',
			ref: 'JOB-0012',
			status: 'scheduled',
			customerName: 'Meridian Developments',
			service: null,
			area: 'Unit 4',
			description: 'Leak under the basin, tenant reports it is getting worse'
		},
		{
			id: 'j-4',
			ref: 'JOB-0011',
			status: 'on_hold',
			customerName: 'Harbour Deli',
			service: 'Cold room drainage',
			area: null,
			description: null
		}
	];

	const COUNTS: Readonly<Record<JobFilter, number>> = { open: 4, done: 18, cancelled: 2, all: 24 };
	const NONE: Readonly<Record<JobFilter, number>> = { open: 0, done: 0, cancelled: 0, all: 0 };

	const hrefFor = (filter: JobFilter) => `?filter=${filter}`;
	const pageHref = (page: number) => `?page=${page}`;

	const adds: CreateCustomer = async (input) => ({
		kind: 'created',
		customer: { id: 'c-new', name: input.name }
	});
</script>

<!-- The open tab: work waiting to be scheduled asks for attention; the rest is in hand. -->
<Story name="Open jobs" asChild>
	<div class="min-h-svh bg-surface-base">
		<JobList
			jobs={JOBS}
			counts={COUNTS}
			filter="open"
			page={1}
			pageCount={2}
			{hrefFor}
			{pageHref}
		/>
	</div>
</Story>

<Story name="No jobs yet" asChild>
	<div class="min-h-svh bg-surface-base">
		<JobList jobs={[]} counts={NONE} filter="open" page={1} pageCount={1} {hrefFor} {pageHref} />
	</div>
</Story>

<Story name="Nothing under this tab" asChild>
	<div class="min-h-svh bg-surface-base">
		<JobList
			jobs={[]}
			counts={COUNTS}
			filter="cancelled"
			page={1}
			pageCount={1}
			{hrefFor}
			{pageHref}
		/>
	</div>
</Story>

<!--
	Done, with money still owed. Two facts, both true, side by side: the work is finished and the
	client has not paid. Neither answer is allowed to overwrite the other.
-->
<Story name="Done, and still owed" asChild>
	<div class="min-h-svh bg-surface-base">
		<JobDetail
			job={{ ...JOBS[0], status: 'done' }}
			commercial="Invoiced · R2 400,00 still owed"
			slots={SLOTS}
			employees={EMPLOYEES}
			teams={TEAMS}
		/>
	</div>
</Story>

<Story name="A removed module, read only" asChild>
	<div class="min-h-svh bg-surface-base">
		<JobDetail
			job={JOBS[1]}
			commercial="Paid in full"
			slots={SLOTS}
			employees={[]}
			teams={[]}
			readOnly
		/>
	</div>
</Story>

<Story name="Starting a job" asChild>
	<div class="min-h-svh bg-surface-base">
		<CreateJobDialog
			open
			customers={[
				{ id: 'c-1', name: 'Fynbos Interiors' },
				{ id: 'c-2', name: 'Meridian Developments' }
			]}
			createCustomer={adds}
		/>
	</div>
</Story>
