/**
 * TELLING SOMEBODY SOMETHING, DURABLY.
 *
 * The write half fans a message out to named employees; the read half answers for the bell in
 * the shell, which is why this is floor rather than a module: the bell hangs on every screen,
 * outside any entitlement gate. A person sees the rows addressed to the employees their login
 * is linked to (`core_employee.user_id`) — an employee with no login accrues rows that wait,
 * honestly, until a login is linked.
 */
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { employee } from '../db/schema/people';
import { notification } from '../db/schema/notifications';
import type { Tx } from '../db/tx';

export type NotificationRow = {
	readonly id: string;
	readonly title: string;
	readonly detail: string | null;
	readonly href: string | null;
	readonly readAt: Date | null;
	readonly createdAt: Date;
};

export type NewNotification = {
	readonly title: string;
	readonly detail?: string | null;
	readonly href?: string | null;
};

/** One message, one row per recipient. The fan-out happens here so the reader never joins teams. */
export async function notifyEmployees(
	tx: Tx,
	businessId: string,
	employeeIds: readonly string[],
	message: NewNotification
): Promise<void> {
	if (employeeIds.length === 0) return;
	await tx.insert(notification).values(
		employeeIds.map((employeeId) => ({
			businessId,
			employeeId,
			title: message.title,
			detail: message.detail ?? null,
			href: message.href ?? null
		}))
	);
}

/** The employees this login is, in this business. Usually one; the model does not insist. */
async function employeesOf(tx: Tx, userId: string): Promise<string[]> {
	const rows = await tx
		.select({ id: employee.id })
		.from(employee)
		.where(and(eq(employee.userId, userId), isNull(employee.archivedAt)));
	return rows.map((row) => row.id);
}

/** What the bell shows: how many unread rows this login can claim. */
export async function unreadNotifications(tx: Tx, userId: string): Promise<number> {
	const [row] = await tx
		.select({ count: sql<number>`count(*)::int` })
		.from(notification)
		.innerJoin(employee, eq(employee.id, notification.employeeId))
		.where(
			and(eq(employee.userId, userId), isNull(employee.archivedAt), isNull(notification.readAt))
		);
	return row?.count ?? 0;
}

/** The feed, newest first. Bounded: a feed is the recent past, not an archive screen. */
export async function listNotifications(
	tx: Tx,
	userId: string,
	limit = 50
): Promise<readonly NotificationRow[]> {
	return tx
		.select({
			id: notification.id,
			title: notification.title,
			detail: notification.detail,
			href: notification.href,
			readAt: notification.readAt,
			createdAt: notification.createdAt
		})
		.from(notification)
		.innerJoin(employee, eq(employee.id, notification.employeeId))
		.where(and(eq(employee.userId, userId), isNull(employee.archivedAt)))
		.orderBy(desc(notification.createdAt))
		.limit(limit);
}

/** Opening the feed is reading it. Set on the person's own rows and nothing else. */
export async function markNotificationsRead(tx: Tx, userId: string): Promise<void> {
	const mine = await employeesOf(tx, userId);
	if (mine.length === 0) return;
	await tx
		.update(notification)
		.set({ readAt: new Date() })
		.where(and(inArray(notification.employeeId, mine), isNull(notification.readAt)));
}
