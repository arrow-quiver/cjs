/**
 * THE ROSTER AND THE FEED, AGAINST A REAL DATABASE.
 *
 * One suite for people and notifications because the two interlock on `core_employee.user_id`:
 * who is on which team decides who gets told, and the claim decides who can read it. Each
 * seeded tenant costs a dozen round trips to a hosted Postgres, so the pair share a seed, the
 * same argument `schema/schedule.test.ts` makes.
 */
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { closePool, runScoped } from '../db/client';
import {
	cleanupFixtures,
	createBusiness,
	createUser,
	messageFromRejection,
	type TestBusiness
} from '../db/fixtures';
import type { Tx } from '../db/tx';
import {
	listNotifications,
	markNotificationsRead,
	notifyEmployees,
	unreadNotifications
} from '../notifications';
import {
	EmployeeNotFound,
	MembershipNotFound,
	claimEmployee,
	createEmployee,
	createTeam,
	listEmployees,
	setMembership
} from './index';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 180_000 });

let mine: TestBusiness;
let theirs: TestBusiness;
let thabo: string;
let anele: string;
let crew: string;

function as<T>(business: TestBusiness, fn: (tx: Tx) => Promise<T>): Promise<T> {
	return runScoped(business.id, business.ownerUserId, fn);
}

beforeAll(async () => {
	mine = await createBusiness((await createUser('Alice Thornhill')).id, 'Thornhill Joinery');
	theirs = await createBusiness((await createUser('Bob Bayside')).id, 'Bayside Plumbing');
	thabo = (await as(mine, (tx) => createEmployee(tx, mine.id, 'Thabo Nkosi'))).id;
	anele = (await as(mine, (tx) => createEmployee(tx, mine.id, 'Anele Mthembu'))).id;
	crew = (await as(mine, (tx) => createTeam(tx, mine.id, 'Install crew'))).id;
});

afterAll(async () => {
	await cleanupFixtures();
	await closePool();
});

describe('membership', () => {
	it('joins, shows on the list, leaves, and refuses a second leaving', async () => {
		await as(mine, (tx) => setMembership(tx, mine.id, thabo, crew, true));
		let people = await as(mine, (tx) => listEmployees(tx));
		expect(people.find((p) => p.id === thabo)?.teamIds).toEqual([crew]);

		await as(mine, (tx) => setMembership(tx, mine.id, thabo, crew, false));
		people = await as(mine, (tx) => listEmployees(tx));
		expect(people.find((p) => p.id === thabo)?.teamIds).toEqual([]);

		const message = await messageFromRejection(
			as(mine, (tx) => setMembership(tx, mine.id, thabo, crew, false))
		);
		expect(message).toBe(new MembershipNotFound().message);
	});

	it("refuses another business's employee as a sentence, not a constraint error", async () => {
		const message = await messageFromRejection(
			as(theirs, (tx) => setMembership(tx, theirs.id, thabo, crew, true))
		);
		expect(message).toBe(new EmployeeNotFound().message);
	});
});

describe('the claim, and who the feed answers to', () => {
	it('routes a notification to the login that claimed the employee, and nobody else', async () => {
		await as(mine, (tx) => claimEmployee(tx, thabo, mine.ownerUserId));
		await as(mine, (tx) =>
			notifyEmployees(tx, mine.id, [thabo, anele], {
				title: 'You are on Geyser replacement for Fynbos Interiors',
				detail: 'Monday, 5 October, 08:00 to 10:00',
				href: '/scheduling/j-1'
			})
		);

		// The claimed employee's login sees its row; Anele has no login yet, so hers waits.
		expect(await as(mine, (tx) => unreadNotifications(tx, mine.ownerUserId))).toBe(1);
		const feed = await as(mine, (tx) => listNotifications(tx, mine.ownerUserId));
		expect(feed).toHaveLength(1);
		expect(feed[0].title).toContain('Geyser replacement');

		// Another business's login sees nothing, whatever it asks as.
		expect(await as(theirs, (tx) => unreadNotifications(tx, theirs.ownerUserId))).toBe(0);
		expect(await as(theirs, (tx) => listNotifications(tx, theirs.ownerUserId))).toHaveLength(0);
	});

	it('marks only the reader’s own rows read', async () => {
		await as(mine, (tx) => markNotificationsRead(tx, mine.ownerUserId));
		expect(await as(mine, (tx) => unreadNotifications(tx, mine.ownerUserId))).toBe(0);

		// Anele's row is still unread, waiting for a claim.
		await as(mine, (tx) => claimEmployee(tx, anele, mine.ownerUserId));
		expect(await as(mine, (tx) => unreadNotifications(tx, mine.ownerUserId))).toBe(1);
	});

	it('moves a login that claims again, so one login is one pair of hands', async () => {
		// The claim above moved the owner from Thabo to Anele.
		const people = await as(mine, (tx) => listEmployees(tx));
		expect(people.find((p) => p.id === thabo)?.userId).toBeNull();
		expect(people.find((p) => p.id === anele)?.userId).toBe(mine.ownerUserId);
	});

	it("refuses claiming another business's employee", async () => {
		const message = await messageFromRejection(
			as(theirs, (tx) => claimEmployee(tx, thabo, theirs.ownerUserId))
		);
		expect(message).toBe(new EmployeeNotFound().message);
	});
});
