/**
 * ADD A CLIENT, FROM WHEREVER ONE IS BEING CHOSEN.
 *
 * One endpoint rather than a form action per screen, because the client picker lives inside the
 * quote editor, the invoice editor and the job dialog, and all three need the same answer. JSON in,
 * a `CreateCustomerAnswer` out.
 *
 * `withBusiness`, not `withModule`: a client belongs to the business, whatever it owns.
 *
 * A LIKELY DUPLICATE IS ASKED ABOUT, NOT REFUSED. Two clients can share a number (a landlord and a
 * tenant on one office line), so a match comes back as `duplicate` with the matches, and the person
 * either picks the existing client or sends again with `confirmDuplicate`.
 */
import { json } from '@sveltejs/kit';
import { messagesByField } from '$lib/core/validation';
import { parseNewCustomer, type CreateCustomerAnswer } from '$lib/core/customers';
import { withBusiness } from '$lib/server/core/ctx';
import { createCustomer, findPhoneMatches } from '$lib/server/core/customers';
import { RateLimiter, callerKey } from '$lib/server/core/ratelimit';
import type { RequestHandler } from './$types';

/** Generous for a person at a keyboard, and a wall for a script filling an address book. */
const ADDS = new RateLimiter({ burst: 20, perMinute: 20 });

const answer = (body: CreateCustomerAnswer, status: number) => json(body, { status });

export const POST: RequestHandler = async (event) => {
	const limit = ADDS.take(callerKey(event.request));
	if (!limit.allowed) {
		return json(
			{
				kind: 'failed',
				message: 'That is a lot of new clients at once. Wait a minute and try again.'
			} satisfies CreateCustomerAnswer,
			{ status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } }
		);
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return answer({ kind: 'failed', message: 'We could not read that. Try again.' }, 400);
	}

	const parsed = parseNewCustomer(body);
	if (!parsed.ok) return answer({ kind: 'invalid', errors: messagesByField(parsed) }, 422);
	const input = parsed.value;

	return withBusiness(event, async (ctx) => {
		if (!input.confirmDuplicate) {
			const matches = await findPhoneMatches(ctx.tx, input.phone);
			if (matches.length > 0) return answer({ kind: 'duplicate', matches }, 409);
		}

		const customer = await createCustomer(ctx.tx, ctx.business.id, input);
		return answer({ kind: 'created', customer }, 201);
	});
};
