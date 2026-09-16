<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, waitFor, within } from 'storybook/test';
	import type { CreateCustomer } from '$lib/components/customers';
	import type { CustomerChoice } from '$lib/core/customers';
	import PickerHarness from './customers/PickerHarness.svelte';

	const { Story } = defineMeta({
		title: 'Customers/Client picker',
		parameters: { layout: 'fullscreen' }
	});

	const CLIENTS: readonly CustomerChoice[] = [
		{ id: 'c-1', name: 'Fynbos Interiors' },
		{ id: 'c-2', name: 'Meridian Developments' }
	];

	/** Adds whatever it is given, as the server does when nothing matches. */
	const adds: CreateCustomer = async (input) => ({
		kind: 'created',
		customer: { id: 'c-new', name: input.name }
	});

	/** Finds the number already on the books, and adds the client when told to anyway. */
	const matches: CreateCustomer = async (input) =>
		input.confirmDuplicate
			? { kind: 'created', customer: { id: 'c-new', name: input.name } }
			: {
					kind: 'duplicate',
					matches: [{ id: 'c-1', name: 'Fynbos Interiors', phone: '+27 82 123 4567' }]
				};

	/** Refuses a blank name the way the endpoint does. */
	const refuses: CreateCustomer = async () => ({
		kind: 'invalid',
		errors: { name: 'A client needs a name, even if it is only a first name for now' }
	});

	/**
	 * Every story here shares one page. A modal closing takes its exit animation to hand the pointer
	 * back, so each play waits for that before pressing anything.
	 */
	const pointerFree = (body: HTMLElement) =>
		waitFor(() => expect(getComputedStyle(body).pointerEvents).not.toBe('none'));
</script>

<!--
	The one client picker, on a quote, an invoice and a job. Choose a client, or add one without
	leaving the document: before this existed, nothing in the product could create a client at all.
-->
<Story name="Choose or add" asChild>
	<PickerHarness id="story-client" customers={CLIENTS} initial="c-2" create={adds} />
</Story>

<Story name="No clients yet" asChild>
	<PickerHarness id="story-client-empty" customers={[]} create={adds} />
</Story>

<!-- A client added from the picker is chosen at once. -->
<Story
	name="Adding a client"
	asChild
	play={async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		const screen = within(body);
		await pointerFree(body);

		await userEvent.click(screen.getByRole('button', { name: 'New client' }));
		await userEvent.type(await screen.findByLabelText('Name'), 'Baraka Café');
		await userEvent.click(screen.getByRole('button', { name: 'Add client' }));

		await waitFor(() =>
			expect(within(canvasElement).getByLabelText('Client')).toHaveTextContent('Baraka Café')
		);
	}}
>
	<PickerHarness id="story-client-add" customers={CLIENTS} create={adds} />
</Story>

<!-- The same number is asked about, with a way to use the existing client and a way past it. -->
<Story
	name="A number already on the books"
	asChild
	play={async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		const screen = within(body);
		await pointerFree(body);

		await userEvent.click(screen.getByRole('button', { name: 'New client' }));
		await userEvent.type(await screen.findByLabelText('Name'), 'Fynbos (Stellenbosch)');
		await userEvent.type(screen.getByLabelText('Phone (optional)'), '082 123 4567');
		await userEvent.click(screen.getByRole('button', { name: 'Add client' }));

		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent('You already have a client with this number.');
		expect(within(alert).getByRole('button', { name: 'Use Fynbos Interiors' })).toBeVisible();
		expect(screen.getByRole('button', { name: 'Add as a new client' })).toBeVisible();

		// Closed again, so the stories after this one are not left behind an open modal.
		await userEvent.keyboard('{Escape}');
		await pointerFree(body);
	}}
>
	<PickerHarness id="story-client-duplicate" customers={CLIENTS} create={matches} />
</Story>

<Story
	name="A name left blank"
	asChild
	play={async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		const screen = within(body);
		await pointerFree(body);

		await userEvent.click(screen.getByRole('button', { name: 'New client' }));
		const name = await screen.findByLabelText('Name');
		// The browser's own `required` would stop the form first; this is the server's answer.
		name.removeAttribute('required');
		await userEvent.click(screen.getByRole('button', { name: 'Add client' }));

		// Waited for, because the dialog is still fading in at 150ms when the answer comes back.
		await waitFor(() =>
			expect(
				screen.getByText('A client needs a name, even if it is only a first name for now')
			).toBeVisible()
		);

		await userEvent.keyboard('{Escape}');
		await pointerFree(body);
	}}
>
	<PickerHarness id="story-client-blank" customers={CLIENTS} create={refuses} />
</Story>
