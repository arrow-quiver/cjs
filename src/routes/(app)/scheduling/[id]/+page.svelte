<script lang="ts">
	import { JobDetail } from '$lib/components/scheduling';
	import { jobTitle } from '$lib/core/jobs';
	import { Refusal } from '$lib/ui';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>{jobTitle(data.job)} · Jobs · CJs</title></svelte:head>

{#if form?.message}
	<div class="mx-auto w-full max-w-3xl px-4 pt-4 lg:px-8">
		<Refusal message={form.message} />
	</div>
{/if}

<JobDetail job={data.job} commercial={data.commercial} readOnly={data.readOnly} />
