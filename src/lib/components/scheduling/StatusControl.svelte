<script lang="ts">
	/**
	 * MOVING A JOB ON, BY HAND.
	 *
	 * The step a job usually takes next is the one obvious button. Any other status is a choice away,
	 * because real work goes on hold, gets cancelled and comes back. Nothing else moves a job: not a
	 * payment, not an invoice, not every document being settled. Closing work is a person's call.
	 */
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { Button, Field, Select, SelectContent, SelectItem, SelectTrigger } from '$lib/ui';
	import { submission } from '$lib/components/motion';
	import { JOB_STATUSES, nextStep, statusLabel, type JobStatus } from '$lib/core/jobs';

	let { status }: { status: JobStatus } = $props();

	const step = $derived(nextStep(status));

	/** The status being chosen. Follows the job's own status whenever that changes. */
	let chosen = $derived<JobStatus>(status);

	/** Said once the job has moved, for somebody who cannot see the badge change. */
	let announcement = $state('');

	let stepButton = $state<HTMLElement | null>(null);
	let statusTrigger = $state<HTMLElement | null>(null);

	/**
	 * After a move the page reloads the job and these controls stay mounted, so focus stays where it
	 * was. When the move finished the job there is no next step and its button goes; focus then lands
	 * on the status choice rather than falling back to the top of the page.
	 */
	const moved =
		() =>
		async ({ update }: { update: () => Promise<void> }) => {
			await update();
			await tick();
			announcement = `This job is now ${statusLabel(status).toLowerCase()}.`;
			(stepButton ?? statusTrigger)?.focus();
		};

	const advancing = submission(moved);
	const changing = submission(moved);
</script>

<p class="sr-only" aria-live="polite">{announcement}</p>

<div class="flex flex-col gap-4">
	{#if step}
		<form method="POST" action="?/status" use:enhance={advancing.enhance}>
			<input type="hidden" name="status" value={step.status} />
			<Button
				bind:ref={stepButton}
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
						bind:ref={statusTrigger}
						{...field}
						class="w-full data-[size=default]:h-11 lg:data-[size=default]:h-[38px]"
					>
						{statusLabel(chosen)}
					</SelectTrigger>
					<SelectContent>
						{#each JOB_STATUSES as option (option)}
							<SelectItem value={option} label={statusLabel(option)}>
								{statusLabel(option)}
							</SelectItem>
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
