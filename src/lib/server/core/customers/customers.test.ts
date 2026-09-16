/**
 * THE ADDRESS BOOK, AGAINST A REAL DATABASE.
 *
 * Two guarantees are the point of #44 and both are Postgres's to keep, so both are tested where
 * Postgres keeps them, as `cjs_app` with row security in force: a client belongs to exactly one
 * business, and no quote, invoice or job can name another business's client. The rest is the
 * duplicate check, which has to find the same phone however it was typed.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { parseNewCustomer } from '$lib/core/customers';
import { closePool, runScoped } from '../db/client';
import {
	cleanupFixtures,
	createBusiness,
	createUser,
	messageFromRejection,
	type TestBusiness
} from '../db/fixtures';
import type { Tx } from '../db/tx';
import { createCustomer, findPhoneMatches, listCustomers } from './index';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 180_000 });

let mine: TestBusiness;
let theirs: TestBusiness;

function as<T>(business: TestBusiness, fn: (tx: Tx) => Promise<T>): Promise<T> {
	return runScoped(business.id, business.ownerUserId, fn);
}

beforeAll(async () => {
	mine = await createBusiness((await createUser()).id, 'Thornhill Joinery');
	theirs = await createBusiness((await createUser()).id, 'Bayside Plumbing');
});

afterAll(async () => {
	await cleanupFixtures();
	await closePool();
});

describe('adding a client', () => {
	it('adds one with only a name, and lists it', async () => {
		const added = await as(mine, (tx) =>
			createCustomer(tx, mine.id, { name: 'Baraka Café', phone: null, email: null })
		);

		expect(added.name).toBe('Baraka Café');
		const listed = await as(mine, (tx) => listCustomers(tx));
		expect(listed).toContainEqual({ id: added.id, name: 'Baraka Café' });
	});

	it("keeps one business's clients invisible to another", async () => {
		const added = await as(mine, (tx) =>
			createCustomer(tx, mine.id, { name: 'Private client', phone: '021 555 0100', email: null })
		);

		const seen = await as(theirs, (tx) => listCustomers(tx));
		expect(seen.map((c) => c.id)).not.toContain(added.id);
		expect(await as(theirs, (tx) => findPhoneMatches(tx, '021 555 0100'))).toEqual([]);
	});

	it("refuses to add a client under another business's name", async () => {
		const message = await messageFromRejection(
			as(mine, (tx) =>
				createCustomer(tx, theirs.id, { name: 'Smuggled', phone: null, email: null })
			)
		);
		expect(message).toMatch(/row-level security|tenant_isolation/i);
	});
});

describe('noticing a client who is already on the books', () => {
	it('finds the same phone however it was typed', async () => {
		const existing = await as(mine, (tx) =>
			createCustomer(tx, mine.id, {
				name: 'Fynbos Interiors',
				phone: '+27 82 123 4567',
				email: null
			})
		);

		for (const typed of ['082 123 4567', '0821234567', '27 82 123 4567', '(082) 123-4567']) {
			const matches = await as(mine, (tx) => findPhoneMatches(tx, typed));
			expect(
				matches.map((m) => m.id),
				typed
			).toContain(existing.id);
		}
	});

	it('does not match a different number, or a number too short to compare', async () => {
		await as(mine, (tx) =>
			createCustomer(tx, mine.id, { name: 'Harbour Deli', phone: '083 765 4321', email: null })
		);

		expect(await as(mine, (tx) => findPhoneMatches(tx, '083 765 4322'))).toEqual([]);
		expect(await as(mine, (tx) => findPhoneMatches(tx, '4321'))).toEqual([]);
		expect(await as(mine, (tx) => findPhoneMatches(tx, null))).toEqual([]);
	});

	it('leaves archived clients out of the check', async () => {
		const archived = await as(mine, (tx) =>
			createCustomer(tx, mine.id, { name: 'Gone Away', phone: '084 000 1111', email: null })
		);
		await as(mine, (tx) =>
			tx.execute(sql`update core_customer set archived_at = now() where id = ${archived.id}`)
		);

		expect(await as(mine, (tx) => findPhoneMatches(tx, '084 000 1111'))).toEqual([]);
	});
});

describe("no document can name another business's client", () => {
	/**
	 * Postgres checks referential integrity with row security BYPASSED, so before 0012 each of these
	 * statements succeeded: the link crossed the tenant boundary and every screen still looked
	 * right. Each now fails on its composite key, and the same statement with this business's own
	 * client succeeds, so the refusal is about the boundary and not the column.
	 */
	let myClient: string;
	let theirClient: string;

	beforeAll(async () => {
		myClient = (
			await as(mine, (tx) =>
				createCustomer(tx, mine.id, { name: 'Mine', phone: null, email: null })
			)
		).id;
		theirClient = (
			await as(theirs, (tx) =>
				createCustomer(tx, theirs.id, { name: 'Theirs', phone: null, email: null })
			)
		).id;
	});

	it.each([
		['quoting_quote', 'quoting_quote_customer_fk'],
		['invoicing_invoice', 'invoicing_invoice_customer_fk']
	])('refuses a %s naming their client', async (table, constraint) => {
		const id = randomUUID();
		await as(mine, (tx) =>
			tx.execute(
				sql`insert into ${sql.identifier(table)} (id, business_id, vat_policy) values (${id}, ${mine.id}, 'standard')`
			)
		);

		const message = await messageFromRejection(
			as(mine, (tx) =>
				tx.execute(
					sql`update ${sql.identifier(table)} set customer_id = ${theirClient} where id = ${id}`
				)
			)
		);
		expect(message).toContain(constraint);

		await as(mine, (tx) =>
			tx.execute(
				sql`update ${sql.identifier(table)} set customer_id = ${myClient} where id = ${id}`
			)
		);
	});

	it('refuses a job naming their client', async () => {
		const job = () =>
			sql`insert into core_job
				(id, business_id, customer_id, number_prefix, number_value, number_formatted, service)
				values (${randomUUID()}, ${mine.id}, ${theirClient}, 'JOB', 901, 'JOB-0901', 'Leak')`;

		const message = await messageFromRejection(as(mine, (tx) => tx.execute(job())));
		expect(message).toContain('core_job_customer_fk');
	});
});

describe('what the endpoint accepts', () => {
	it('takes a name alone, and treats blank phone and email as absent', () => {
		const parsed = parseNewCustomer({ name: '  Baraka Café ', phone: '', email: '' });
		expect(parsed.ok && parsed.value).toEqual({
			name: 'Baraka Café',
			phone: null,
			email: null,
			confirmDuplicate: false
		});
	});

	it('explains a missing name and a malformed email, per field', () => {
		const parsed = parseNewCustomer({ name: '   ', email: 'accounts at meridian' });
		expect(parsed.ok).toBe(false);
		if (parsed.ok) return;
		const fields = parsed.problems.map((p) => p.field);
		expect(fields).toContain('name');
		expect(fields).toContain('email');
	});
});
