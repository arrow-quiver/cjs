/**
 * The one request the client picker makes: add a client. Passed to the picker as a prop that
 * defaults to this, so a story or a test can hand it an answer without a server.
 */
import type { CreateCustomerAnswer, NewCustomer } from '$lib/core/customers';
import { tracked } from '$lib/components/motion';

export type CreateCustomer = (input: NewCustomer) => Promise<CreateCustomerAnswer>;

export const createCustomerRequest: CreateCustomer = async (input) => {
	try {
		const response = await tracked(
			fetch('/api/customers', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(input)
			})
		);
		return (await response.json()) as CreateCustomerAnswer;
	} catch {
		return {
			kind: 'failed',
			message:
				'We could not reach the server to add that client. Check the connection and try again.'
		};
	}
};
