/**
 * The one request the client picker makes: add a client. Passed to the picker as a prop that
 * defaults to this, so a story or a test can hand it an answer without a server.
 */
import {
	isCreateCustomerAnswer,
	type CreateCustomerAnswer,
	type NewCustomerRequest
} from '$lib/core/customers';
import { tracked } from '$lib/components/motion';

export type CreateCustomer = (input: NewCustomerRequest) => Promise<CreateCustomerAnswer>;

const UNREACHABLE: CreateCustomerAnswer = {
	kind: 'failed',
	message: 'We could not reach the server to add that client. Check the connection and try again.'
};

export const createCustomerRequest: CreateCustomer = async (input) => {
	try {
		const response = await tracked(
			fetch('/api/customers', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(input)
			})
		);
		const body: unknown = await response.json();
		// Anything that is not one of the four answers (a gateway page, a sign-in redirect that
		// happened to be JSON) is told as a failure rather than handed on as an answer.
		return isCreateCustomerAnswer(body) ? body : UNREACHABLE;
	} catch {
		return UNREACHABLE;
	}
};
