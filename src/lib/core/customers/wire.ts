/**
 * ADDING A CLIENT: WHAT THE BROWSER SENDS, AND EVERY ANSWER IT CAN GET BACK.
 *
 * One contract for the endpoint and the dialog, so neither can drift from the other. The answer is
 * a closed union rather than a status code to interpret: a person adding a client either has the
 * client, is told the number looks like someone they already have, is told what to fix, or is told
 * it did not work. Each of those is a different thing to show.
 */
import { z } from 'zod';
import { check, type Checked, type Vocabulary } from '$lib/core/validation';

/** Long enough for any business's legal name; short enough to fit the header of a quote. */
export const MAX_CUSTOMER_NAME = 200;
const MAX_CONTACT_FIELD = 200;

const optionalText = (max: number, tooLong: string) =>
	z
		.string()
		.trim()
		.max(max, tooLong)
		.optional()
		.transform((value) => (value ? value : null));

const schema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'A client needs a name, even if it is only a first name for now')
		.max(MAX_CUSTOMER_NAME, 'That name is longer than a quote can print. Try a shorter form of it'),
	phone: optionalText(MAX_CONTACT_FIELD, 'That is longer than any phone number'),
	email: z
		.email('Enter an email address like accounts@client.co.za')
		.max(MAX_CONTACT_FIELD, 'That is longer than any email address')
		.optional()
		.or(z.literal('').transform(() => undefined))
		.transform((value) => value ?? null),
	/** The person has seen the likely duplicate and wants this client added anyway. */
	confirmDuplicate: z.boolean().optional().default(false)
});

/** What the endpoint hands the server code, once parsed. */
export type NewCustomer = z.output<typeof schema>;

/** What the browser sends: the form's strings as typed, before blanks become nulls. */
export type NewCustomerRequest = z.input<typeof schema>;

const WORDS: Vocabulary = {
	fields: {
		name: 'A name',
		phone: 'A phone number',
		email: 'An email address',
		confirmDuplicate: 'The confirmation'
	}
};

export function parseNewCustomer(input: unknown): Checked<NewCustomer> {
	return check(schema, input, WORDS);
}

/** A client, as far as choosing one needs to know. */
export type CustomerChoice = { readonly id: string; readonly name: string };

/** An existing client whose phone number matches the one being added. */
export type LikelyDuplicate = CustomerChoice & { readonly phone: string };

/**
 * Whether a response body is an answer this contract knows. A gateway's error page or a sign-in
 * redirect is JSON-shaped nonsense or not JSON at all, and neither should reach the dialog's switch
 * as if it were an answer.
 */
export function isCreateCustomerAnswer(value: unknown): value is CreateCustomerAnswer {
	if (typeof value !== 'object' || value === null) return false;
	const kind = (value as { kind?: unknown }).kind;
	switch (kind) {
		case 'created':
			return typeof (value as { customer?: { id?: unknown } }).customer?.id === 'string';
		case 'duplicate':
			return Array.isArray((value as { matches?: unknown }).matches);
		case 'invalid':
			return typeof (value as { errors?: unknown }).errors === 'object';
		case 'failed':
			return typeof (value as { message?: unknown }).message === 'string';
		default:
			return false;
	}
}

export type CreateCustomerAnswer =
	| { readonly kind: 'created'; readonly customer: CustomerChoice }
	| { readonly kind: 'duplicate'; readonly matches: readonly LikelyDuplicate[] }
	| { readonly kind: 'invalid'; readonly errors: Readonly<Record<string, string>> }
	| { readonly kind: 'failed'; readonly message: string };
