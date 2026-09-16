/**
 * THE FEED BEHIND THE BELL.
 *
 * `withBusiness`, not `withModule`: being told things is not an entitlement. Reading is marked
 * by the button, never by the load — a load runs on hover preload, and "you looked at it"
 * must mean a person did.
 */
import { fail } from '@sveltejs/kit';
import {
	listNotifications,
	markNotificationsRead,
	unreadNotifications
} from '$lib/server/core/notifications';
import { withBusiness } from '$lib/server/core/ctx';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) =>
	withBusiness(event, async (ctx) => {
		const [items, unread] = await Promise.all([
			listNotifications(ctx.tx, ctx.userId),
			unreadNotifications(ctx.tx, ctx.userId)
		]);

		return {
			unreadHere: unread,
			items: items.map((item) => ({
				id: item.id,
				title: item.title,
				detail: item.detail,
				href: item.href,
				read: item.readAt !== null,
				when: item.createdAt.toLocaleDateString(ctx.business.locale, {
					day: 'numeric',
					month: 'short'
				})
			}))
		};
	});

export const actions: Actions = {
	read: async (event) => {
		try {
			await withBusiness(event, async (ctx) => {
				await markNotificationsRead(ctx.tx, ctx.userId);
			});
		} catch {
			return fail(500, { message: 'We could not mark these read just now. Try again.' });
		}
		return { done: true };
	}
};
