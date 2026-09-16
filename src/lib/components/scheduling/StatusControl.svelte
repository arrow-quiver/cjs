<script lang="ts">
	/**
	 * MOVING A JOB ON, BY HAND.
	 *
	 * The step a job usually takes next is the one obvious button. Any other status is a choice away,
	 * because real work goes on hold, gets cancelled and comes back. Nothing else moves a job: not a
	 * payment, not an invoice, not every document being settled. Closing work is a person's call.
	 */
	import { enhance } from '$app/forms';
	import { Button, Field, Select, SelectContent, SelectItem, SelectTrigger } from '$lib/ui';
	import { submission } from '$lib/components/motion';
	import { JOB_STATUSES, nextStep, statusLabel, type JobStatus } from '$lib/core/jobs';

	let { status }: { status: JobStatus } = $props();

	const step = $derived(nextStep(status));
	// svelte-ignore state_referenced_locally
	let chosen = $state<JobStatus>(status);

	const advancing = submission();
	const changing = submission();
</script>

<div class="flex flex-col gap-4">
	{#if step}
		<form method="POST" action="?/status" use:enhance={advancing.enhance}>
			<input type="hidden" name="status" value={step.status} />
			<Button
				type="submit"
				class="h-11 w-full sm:w-auto lg:h-9"
				pending={advancing.pending}
				pendingLabel="Saving…"
				disabled={changing.pending}
			>
				{step.label}
			</Button>
		</form>
	{/if}

	<form
		method="POST"
		action="?/status"
		use:enhance={changing.enhance}
		class="flex flex-wrap items-end gap-2"
	>
		<input type="hidden" name="status" value={chosen} />
		<Field label="Status" id="job-status" class="min-w-48 flex-1">
			{#snippet control(field)}
				<Select type="single" value={chosen} onValueChange={(next) => (chosen = next as JobStatus)}>
					<SelectTrigger
						{...field}
						class="w-full data-[size=default]:h-11 lg:data-[size=default]:h-[38px]"
						>{statusLabel(chosen)}</SelectTrigger
					>
					<SelectContent>
						{#each JOB_STATUSES as option (option)}
							<SelectItem value={option} label={statusLabel(option)}
								>{statusLabel(option)}</SelectItem
							>
						{/each}
					</SelectContent>
				</Select>
			{/snippet}
		</Field>
		<Button
			type="submit"
			variant="secondary"
			class="h-11 lg:h-9"
			disabled={chosen === status || advancing.pending}
			pending={changing.pending}
			pendingLabel="Saving…"
		>
			Change status
		</Button>
	</form>
</div>
