/**
 * THE WEEK BOARD: who is on what.
 *
 * Locked and removed states redirect to `/scheduling`, which already draws them properly —
 * a sub-screen repeating the locked panel would be a second copy to keep honest. `?start`
 * names any day; the board shows the Monday-to-Sunday week that day falls in.
 */
import { redirect } from '@sveltejs/kit';
import { addDays, isCalendarDate, startOfWeek, todayIn } from '$lib/core/calendar';
import { moduleAccess, withModule } from '$lib/server/core/ctx';
import { weekEntries, hasAnySchedule } from '$lib/server/modules/scheduling/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const access = moduleAccess(event, 'scheduling');
	if (access === 'none') redirect(303, '/scheduling');

	const raw = event.url.searchParams.get('start');
	const today = todayIn(new Date());
	const start = startOfWeek(raw !== null && isCalendarDate(raw) ? raw : today);

	return withModule(event, 'scheduling', 'read', async (ctx) => {
		const [entries, hasAny] = await Promise.all([
			weekEntries(ctx.tx, start),
			hasAnySchedule(ctx.tx)
		]);
		return {
			start,
			today,
			prev: addDays(start, -7),
			next: addDays(start, 7),
			entries,
			hasAny,
			readOnly: access !== 'write'
		};
	});
};
