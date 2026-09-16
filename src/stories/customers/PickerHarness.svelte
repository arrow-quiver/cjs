<script lang="ts">
	/**
	 * The client picker with a parent that does what a quote or an invoice does: keeps the chosen
	 * client's id and passes it back down. Without this a story's choice would go nowhere.
	 */
	import { CustomerField, type CreateCustomer } from '$lib/components/customers';
	import type { CustomerChoice } from '$lib/core/customers';

	let {
		id,
		customers,
		initial = null,
		create
	}: {
		id: string;
		customers: readonly CustomerChoice[];
		initial?: string | null;
		create: CreateCustomer;
	} = $props();

	// svelte-ignore state_referenced_locally
	let value = $state<string | null>(initial);
</script>

<div class="min-h-svh max-w-md bg-surface-base p-6">
	<CustomerField {id} {customers} {value} {create} onchoose={(customer) => (value = customer.id)} />
</div>
