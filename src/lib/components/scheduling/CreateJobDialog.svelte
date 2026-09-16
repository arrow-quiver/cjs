<script lang="ts">
	/**
	 * START A JOB BY HAND.
	 *
	 * Most jobs start themselves: a client accepting a quote creates one. This is for the rest, the
	 * call-out that never needed a quote. It asks for the client and what the work is, and nothing
	 * about money: a job's commercial side is whatever documents come to point at it.
	 */
	import { enhance } from '$app/forms';
	import {
		Button,
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		Field,
		Input,
		Textarea
	} from '$lib/ui';
	import { CustomerField, type CreateCustomer } from '$lib/components/customers';
	import { submission } from '$lib/components/motion';
	import type { CustomerChoice } from '$lib/core/customers';

	let {
		open = $bindable(false),
		customers,
		createCustomer
	}: {
		open?: boolean;
		customers: readonly CustomerChoice[];
		/** For a story or a test; the picker's own request otherwise. */
		createCustomer?: CreateCustomer;
	} = $props();

	let customerId = $state<string | null>(null);

	/**
	 * THE REFUSAL BELONGS TO THIS ATTEMPT, NOT THE PAGE.
	 *
	 * Held here from the submission's own result rather than read from the page's `form`, which
	 * SvelteKit keeps until the next submission. Read from there, a refusal would still be showing
	 * after Cancel, the next time somebody opened a blank dialog. Closing clears it.
	 */
	let errors = $state<Readonly<Record<string, string>>>({});
	let message = $state<string | null>(null);

	function clear() {
		errors = {};
		message = null;
	}

	const starting = submission(() => async ({ result, update }) => {
		if (result.type === 'failure') {
			// Stay open with everything still typed, and say what to fix. The page is not updated,
			// so nothing behind the dialog changes for a refusal.
			errors = (result.data?.errors as Record<string, string> | undefined) ?? {};
			message = (result.data?.message as string | null | undefined) ?? null;
			return;
		}
		clear();
		// A success redirects to the new job.
		await update({ reset: false });
	});
</script>

<Dialog
	bind:open
	onOpenChange={(next) => {
		if (!next) clear();
	}}
>
	<DialogContent class="sm:max-w-lg">
		<form method="POST" action="?/create" use:enhance={starting.enhance}>
			<DialogHeader>
				<DialogTitle>New job</DialogTitle>
				<DialogDescription>
					Who it is for and what the work is. It starts as not scheduled.
				</DialogDescription>
			</DialogHeader>

			<p class="mt-3 text-ui text-wrong-ink" aria-live="polite">{message ?? ''}</p>

			<div class="mt-1 flex flex-col gap-4">
				<input type="hidden" name="customerId" value={customerId ?? ''} />
				<CustomerField
					id="job-client"
					{customers}
					value={customerId}
					error={errors.customerId ?? null}
					create={createCustomer}
					onchoose={(customer) => (customerId = customer.id)}
				/>
				<Field label="What the work is" id="job-service" error={errors.service ?? null}>
					{#snippet control(field)}
						<Input {...field} name="service" autocomplete="off" placeholder="Geyser replacement" />
					{/snippet}
				</Field>
				<Field label="Where (optional)" id="job-area" error={errors.area ?? null}>
					{#snippet control(field)}
						<Input {...field} name="area" autocomplete="off" placeholder="Main bathroom" />
					{/snippet}
				</Field>
				<Field label="Notes (optional)" id="job-description" error={errors.description ?? null}>
					{#snippet control(field)}
						<Textarea {...field} name="description" rows={3} />
					{/snippet}
				</Field>
			</div>

			<DialogFooter class="mt-5">
				<Button
					variant="secondary"
					type="button"
					onclick={() => {
						open = false;
						clear();
					}}
				>
					Cancel
				</Button>
				<Button type="submit" pending={starting.pending} pendingLabel="Starting…"
					>Start the job</Button
				>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
