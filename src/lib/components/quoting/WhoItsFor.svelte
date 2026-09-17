<script lang="ts">
	/**
	 * "WHO IT'S FOR."
	 *
	 * A two-column grid: a Client select at 38px with a chevron, and a Send-to field. Below, at
	 * 12px:
	 *
	 *   "Filled in from your customer list. Change it here and we'll ask if you want it saved."
	 *
	 * That sentence is a contract with two halves and the editor keeps both. Editing here writes
	 * to the QUOTE — `core_customer` is untouched — and the ask happens when the person leaves,
	 * through `SaveBackDialog`. Neither half works without the other: silent local edits would
	 * make the address book slowly wrong, and silent write-back would let a one-off correction
	 * on one document rewrite every other one.
	 *
	 * WHICH LEAVING, AND AFTER WHICH EDIT
	 * -----------------------------------
	 * "Change it HERE" — so this section owns the moment, and `onleave` fires on two conditions
	 * that both have to hold:
	 *
	 *   - Focus left THIS SECTION, not merely one field in it. Tabbing name -> contact person is
	 *     one editing session and must not be interrupted halfway through; the editor used to
	 *     listen on the whole form, so leaving a line's price asked about the client.
	 *   - One of the PROMOTABLE fields was actually typed in. A quote can differ from the address
	 *     book because somebody else edited the record since — which is not this person's edit to
	 *     be asked about, and not a question to answer while pricing a job. "Send to" sits in this
	 *     section and is not one of them: it is the quote's own field, and the address book has no
	 *     opinion on where one document was emailed.
	 */
	import { Field, Input } from '$lib/ui';
	import { CustomerField } from '$lib/components/customers';
	import type { EditorState } from '$lib/core/quoting';

	let {
		state = $bindable(),
		customers,
		onclientchange,
		onleave
	}: {
		state: EditorState;
		customers: readonly { id: string; name: string }[];
		/** Choosing a different client re-takes the whole snapshot, server-side. */
		onclientchange: (customerId: string) => void;
		/** Focus has left this section, and something in it was typed since the last leaving. */
		onleave?: () => void;
	} = $props();

	/** Typed-in-here, not differs-from-the-record. Reset on the leaving it reports. */
	let edited = false;

	function left(event: FocusEvent & { currentTarget: HTMLElement }) {
		// `relatedTarget` is where focus WENT. Still inside means the person is moving between
		// the client fields, which is one editing session, not the end of one.
		const to = event.relatedTarget;
		if (to instanceof Node && event.currentTarget.contains(to)) return;
		if (!edited) return;
		edited = false;
		onleave?.();
	}
</script>

<section onfocusoutcapture={left}>
	<h2 class="text-eyebrow text-ink-muted uppercase">Who it's for</h2>

	<div class="mt-3 grid gap-4 sm:grid-cols-2">
		<CustomerField
			id="quote-client"
			{customers}
			value={state.customerId}
			currentName={state.name || null}
			onchoose={(customer) => {
				if (customer.id === state.customerId) return;
				state.customerId = customer.id;
				onclientchange(customer.id);
			}}
		/>

		<Field label="Send to" id="quote-send-to">
			{#snippet control(field)}
				<!--
					`type="email"` for the keyboard and the browser's own check, not as the
					validation: the address that must be deliverable is checked at send, where
					failing is meaningful. Blocking a draft over a half-typed address would be the
					form fighting the person filling it in.
				-->
				<Input
					{...field}
					type="email"
					inputmode="email"
					autocomplete="email"
					placeholder="name@company.co.za"
					bind:value={state.sendToEmail}
				/>
			{/snippet}
		</Field>
	</div>

	<p class="mt-2 text-helper text-ink-muted">
		Filled in from your customer list. Change it here and we'll ask if you want it saved.
	</p>

	<!-- The two fields the address book also holds, and so the only two the ask is about. -->
	<div class="mt-4 grid gap-4 sm:grid-cols-2" oninput={() => (edited = true)}>
		<Field label="Name on the document" id="quote-client-name">
			{#snippet control(field)}
				<Input {...field} bind:value={state.name} />
			{/snippet}
		</Field>
		<Field label="Contact person" id="quote-client-contact">
			{#snippet control(field)}
				<Input {...field} bind:value={state.contactPerson} />
			{/snippet}
		</Field>
	</div>
</section>
