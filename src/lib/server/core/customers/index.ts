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

/**
 * A document named a client this business cannot see: archived-and-gone is not it (archived
 * clients are still visible), so it is another business's id, or one that never existed. Since
 * 0012 the database refuses the link; this says so before the statement is sent, in words a person
 * can act on rather than as a failed save.
 */
export class ClientNotFound extends Error {
	constructor() {
		super(
			"That client isn't in your address book. Pick one from the list, or add them as a new client."
		);
		this.name = 'ClientNotFound';
	}
}

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
				// The length is inlined, not bound: `core_customer_phone_tail_idx` indexes the expression
				// with a literal 9, and Postgres matches an expression index by its parse tree, so a
				// parameter in that position would stop a generic plan from using it.
				sql`right(regexp_replace(${customer.phone}, '\\D', '', 'g'), ${sql.raw(String(PHONE_TAIL_LENGTH))}) = ${tail}`
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
