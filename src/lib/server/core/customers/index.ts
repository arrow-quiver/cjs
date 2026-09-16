/**
 * THE ADDRESS BOOK.
 *
 * Customers belong to every business, whatever it owns: quoting, invoicing and jobs all name one.
 * So this sits in core beside `jobs/`, and every function takes a `Tx` and no business id for
 * reading. `tenant_isolation` has already decided whose rows these are, and a second
 * `where business_id = …` would be a weaker answer to a question the database has settled.
 */
import { and, asc, isNull, sql } from 'drizzle-orm';
import {
	PHONE_TAIL_LENGTH,
	phoneTail,
	type CustomerChoice,
	type LikelyDuplicate,
	type NewCustomer
} from '$lib/core/customers';
import { customer } from '../db/schema/core';
import type { Tx } from '../db/tx';

/** How many likely duplicates are worth showing. One is the usual case; five is plenty to choose from. */
const MAX_MATCHES = 5;

/** Every client that is not archived, by name, for a picker. */
export async function listCustomers(tx: Tx): Promise<readonly CustomerChoice[]> {
	return tx
		.select({ id: customer.id, name: customer.name })
		.from(customer)
		.where(isNull(customer.archivedAt))
		.orderBy(asc(customer.name));
}

/**
 * Clients already on the books with the same phone, however it was typed.
 *
 * The expression is the one `core_customer_phone_tail_idx` (0012) indexes, so this is a lookup and
 * not a scan of the address book. A number too short to have a tail matches nothing.
 */
export async function findPhoneMatches(
	tx: Tx,
	phone: string | null
): Promise<readonly LikelyDuplicate[]> {
	const tail = phoneTail(phone);
	if (tail === null) return [];

	const rows = await tx
		.select({ id: customer.id, name: customer.name, phone: customer.phone })
		.from(customer)
		.where(
			and(
				isNull(customer.archivedAt),
				sql`right(regexp_replace(${customer.phone}, '\\D', '', 'g'), ${PHONE_TAIL_LENGTH}) = ${tail}`
			)
		)
		.orderBy(asc(customer.name))
		.limit(MAX_MATCHES);

	return rows.map((row) => ({ id: row.id, name: row.name, phone: row.phone ?? '' }));
}

/**
 * Add a client. The business id is written because an INSERT has to name it; the policy's
 * `WITH CHECK` refuses any other business's id, so it cannot be pointed elsewhere.
 */
export async function createCustomer(
	tx: Tx,
	businessId: string,
	input: Pick<NewCustomer, 'name' | 'phone' | 'email'>
): Promise<CustomerChoice> {
	const [row] = await tx
		.insert(customer)
		.values({ businessId, name: input.name, phone: input.phone, email: input.email })
		.returning({ id: customer.id, name: customer.name });
	return row;
}
