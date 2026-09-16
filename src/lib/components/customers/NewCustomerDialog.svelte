<script lang="ts">
	/**
	 * ADD A CLIENT WITHOUT LEAVING WHAT YOU WERE DOING.
	 *
	 * Opened from the client picker on a quote, an invoice or a job, so it asks only what a first
	 * document needs: a name, and a way to reach them. The rest of a client's details are the
	 * document's to capture and, if the person wants, to save back.
	 *
	 * A NUMBER THAT IS ALREADY ON THE BOOKS IS ASKED ABOUT, NEVER REFUSED. The likely match is shown
	 * with a way to use it, because adding the same client twice is the common mistake; and a way to
	 * add this one anyway, because two clients can share a line.
	 */
	import {
		Button,
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		Field,
		Input
	} from '$lib/ui';
	import type { CustomerChoice, LikelyDuplicate } from '$lib/core/customers';
	import { createCustomerRequest, type CreateCustomer } from './request';

	let {
		open = $bindable(false),
		initialName = '',
		create = createCustomerRequest,
		onchoose
	}: {
		open?: boolean;
		/** What the person had already typed, if anything, so they do not type it twice. */
		initialName?: string;
		create?: CreateCustomer;
		/** Called with the client to use: the one just added, or the existing one they picked. */
		onchoose: (customer: CustomerChoice) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let name = $state(initialName);
	let phone = $state('');
	let email = $state('');
	let pending = $state(false);
	let errors = $state<Readonly<Record<string, string>>>({});
	let matches = $state<readonly LikelyDuplicate[]>([]);
	let message = $state<string | null>(null);

	/** Every close leaves the form clean, so the next opening starts from nothing typed. */
	function reset() {
		name = initialName;
		phone = '';
		email = '';
		errors = {};
		matches = [];
		message = null;
	}

	async function submit(confirmDuplicate: boolean) {
		pending = true;
		message = null;
		try {
			const answer = await create({ name, phone, email, confirmDuplicate });
			switch (answer.kind) {
				case 'created':
					choose(answer.customer);
					return;
				case 'duplicate':
					errors = {};
					matches = answer.matches;
					return;
				case 'invalid':
					matches = [];
					errors = answer.errors;
					return;
				case 'failed':
					message = answer.message;
					return;
			}
		} finally {
			pending = false;
		}
	}

	function choose(customer: CustomerChoice) {
		open = false;
		reset();
		onchoose(customer);
	}
</script>

<Dialog
	bind:open
	onOpenChange={(next) => {
		if (!next) reset();
	}}
>
	<DialogContent class="sm:max-w-md">
		<form
			onsubmit={(event) => {
				event.preventDefault();
				void submit(false);
			}}
		>
			<DialogHeader>
				<DialogTitle>Add a client</DialogTitle>
				<DialogDescription>
					A name is enough to start. Their address and VAT number can go on the document.
				</DialogDescription>
			</DialogHeader>

			<p class="mt-3 text-ui text-wrong-ink" aria-live="polite">{message ?? ''}</p>

			<div class="mt-1 flex flex-col gap-4">
				<Field label="Name" id="new-client-name" error={errors.name ?? null}>
					{#snippet control(field)}
						<Input
							{...field}
							bind:value={name}
							autocomplete="off"
							placeholder="Meridian Developments"
							required
						/>
					{/snippet}
				</Field>
				<Field label="Phone (optional)" id="new-client-phone" error={errors.phone ?? null}>
					{#snippet control(field)}
						<Input
							{...field}
							bind:value={phone}
							type="tel"
							inputmode="tel"
							autocomplete="off"
							placeholder="082 123 4567"
						/>
					{/snippet}
				</Field>
				<Field label="Email (optional)" id="new-client-email" error={errors.email ?? null}>
					{#snippet control(field)}
						<Input
							{...field}
							bind:value={email}
							type="email"
							inputmode="email"
							autocomplete="off"
							placeholder="accounts@meridian.co.za"
						/>
					{/snippet}
				</Field>
			</div>

			{#if matches.length > 0}
				<div class="mt-5 rounded-[10px] bg-attention-tint p-4" role="alert">
					<p class="text-ui text-attention-ink">
						{matches.length === 1
							? 'You already have a client with this number.'
							: 'You already have clients with this number.'}
					</p>
					<ul class="mt-3 flex flex-col gap-2">
						{#each matches as match (match.id)}
							<li class="flex flex-wrap items-center justify-between gap-2">
								<span class="min-w-0 text-ui text-ink">
									{match.name}
									<span class="numeric text-helper text-ink-muted">{match.phone}</span>
								</span>
								<Button variant="secondary" size="sm" onclick={() => choose(match)}>
									Use {match.name}
								</Button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<DialogFooter class="mt-5">
				<Button
					variant="secondary"
					type="button"
					onclick={() => {
						open = false;
						reset();
					}}
				>
					Cancel
				</Button>
				{#if matches.length > 0}
					<Button type="button" {pending} pendingLabel="Adding…" onclick={() => submit(true)}>
						Add as a new client
					</Button>
				{:else}
					<Button type="submit" {pending} pendingLabel="Adding…">Add client</Button>
				{/if}
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
