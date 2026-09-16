<script lang="ts">
	/**
	 * CHOOSE A CLIENT, OR ADD ONE.
	 *
	 * The one client picker, on a quote, an invoice and a job. Until this existed nothing in the
	 * product could create a client, so a new business could not send its first quote: a quote
	 * cannot leave draft without one, and the only clients were seeded.
	 *
	 * A client added here is chosen at once and appears in the list straight away, before the page
	 * behind it has reloaded anything.
	 */
	import Plus from '@lucide/svelte/icons/plus';
	import { Button, Field, Select, SelectContent, SelectItem, SelectTrigger } from '$lib/ui';
	import type { CustomerChoice } from '$lib/core/customers';
	import NewCustomerDialog from './NewCustomerDialog.svelte';
	import { createCustomerRequest, type CreateCustomer } from './request';

	let {
		id,
		label = 'Client',
		customers,
		value,
		disabled = false,
		error = null,
		currentName = null,
		create = createCustomerRequest,
		onchoose
	}: {
		id: string;
		label?: string;
		customers: readonly CustomerChoice[];
		value: string | null;
		disabled?: boolean;
		error?: string | null;
		/**
		 * The name the document already carries, shown when its client is not in the list: archived
		 * since, say. The document's snapshot is still the truth about who it was for.
		 */
		currentName?: string | null;
		create?: CreateCustomer;
		onchoose: (customer: CustomerChoice) => void;
	} = $props();

	let adding = $state(false);
	let added = $state<readonly CustomerChoice[]>([]);

	const choices = $derived(
		[...customers, ...added.filter((a) => !customers.some((c) => c.id === a.id))].sort((a, b) =>
			a.name.localeCompare(b.name)
		)
	);
	const selectedName = $derived(choices.find((c) => c.id === value)?.name ?? currentName ?? '');

	function chooseAdded(customer: CustomerChoice) {
		added = [...added, customer];
		onchoose(customer);
	}
</script>

<Field {label} {id} {error} {disabled}>
	{#snippet control(field)}
		<div class="flex items-center gap-2">
			<Select
				type="single"
				value={value ?? ''}
				onValueChange={(next) => {
					if (!next || next === value) return;
					const chosen = choices.find((c) => c.id === next);
					if (chosen) onchoose(chosen);
				}}
			>
				<SelectTrigger
					{...field}
					class="min-w-0 flex-1 data-[size=default]:h-11 lg:data-[size=default]:h-[38px]"
				>
					{selectedName || (choices.length === 0 ? 'No clients yet' : 'Choose a client')}
				</SelectTrigger>
				<SelectContent>
					{#each choices as customer (customer.id)}
						<SelectItem value={customer.id} label={customer.name}>{customer.name}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
			<!-- 44px under a thumb, the control height beside the select on a desktop. -->
			<Button
				variant="secondary"
				class="h-11 shrink-0 lg:h-9"
				{disabled}
				onclick={() => (adding = true)}
			>
				<Plus class="size-4" aria-hidden="true" />
				New client
			</Button>
		</div>
	{/snippet}
</Field>

<NewCustomerDialog bind:open={adding} {create} onchoose={chooseAdded} />
