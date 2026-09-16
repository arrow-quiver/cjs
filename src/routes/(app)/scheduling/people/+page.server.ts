/**
 * PEOPLE AND TEAMS: the roster the schedule assigns to.
 *
 * Company → team → individual, and nothing deeper. Locked businesses are sent to
 * `/scheduling`, which draws the locked state properly.
 */
import { fail, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { moduleAccess, withModule } from '$lib/server/core/ctx';
import {
	EmployeeNotFound,
	MembershipNotFound,
	TeamNotFound,
	claimEmployee,
	createEmployee,
	createTeam,
	listEmployees,
	listTeams,
	setMembership
} from '$lib/server/core/people';
import { isId, parseMembership, parseName } from '$lib/server/modules/scheduling/wire';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const access = moduleAccess(event, 'scheduling');
	if (access === 'none') redirect(303, '/scheduling');

	return withModule(event, 'scheduling', 'read', async (ctx) => {
		const [employees, teams] = await Promise.all([listEmployees(ctx.tx), listTeams(ctx.tx)]);
		return { employees, teams, me: ctx.userId, readOnly: access !== 'write' };
	});
};

export const actions: Actions = {
	addEmployee: async (event) => {
		const parsed = parseName(await event.request.formData(), 'employeeName');
		if (!parsed.ok) return fail(422, { errors: parsed.errors });

		try {
			await withModule(event, 'scheduling', 'write', async (ctx) => {
				await createEmployee(ctx.tx, ctx.business.id, parsed.value);
			});
		} catch (cause) {
			if (isHttpError(cause) || isRedirect(cause)) throw cause;
			console.error('scheduling: could not add a person', cause);
			return fail(500, {
				errors: { employeeName: 'We could not add them just now. Nothing was saved. Try again.' }
			});
		}
		return { added: true };
	},

	addTeam: async (event) => {
		const parsed = parseName(await event.request.formData(), 'teamName');
		if (!parsed.ok) return fail(422, { errors: parsed.errors });

		try {
			await withModule(event, 'scheduling', 'write', async (ctx) => {
				await createTeam(ctx.tx, ctx.business.id, parsed.value);
			});
		} catch (cause) {
			if (isHttpError(cause) || isRedirect(cause)) throw cause;
			// The unique on the name: two teams called Plumbing are one team and a typo.
			if (cause instanceof Error && cause.message.includes('core_team_name_unique')) {
				return fail(422, {
					errors: { teamName: 'There is already a team with that name. Pick another, or use it.' }
				});
			}
			console.error('scheduling: could not add a team', cause);
			return fail(500, {
				errors: { teamName: 'We could not add that team just now. Nothing was saved. Try again.' }
			});
		}
		return { added: true };
	},

	membership: async (event) => {
		const parsed = parseMembership(await event.request.formData());
		if (!parsed.ok) return fail(422, { errors: parsed.errors });

		try {
			await withModule(event, 'scheduling', 'write', async (ctx) => {
				await setMembership(
					ctx.tx,
					ctx.business.id,
					parsed.value.employeeId,
					parsed.value.teamId,
					parsed.value.on
				);
			});
		} catch (cause) {
			if (isHttpError(cause) || isRedirect(cause)) throw cause;
			if (
				cause instanceof EmployeeNotFound ||
				cause instanceof TeamNotFound ||
				cause instanceof MembershipNotFound
			) {
				return fail(422, { errors: { membership: cause.message } });
			}
			console.error('scheduling: could not change a membership', cause);
			return fail(500, {
				errors: { membership: 'We could not change that just now. Nothing was saved. Try again.' }
			});
		}
		return { changed: true };
	},

	claim: async (event) => {
		const form = await event.request.formData();
		const employeeId = form.get('employeeId');
		if (!isId(employeeId)) {
			return fail(422, { errors: { membership: 'Choose the person you are.' } });
		}

		try {
			await withModule(event, 'scheduling', 'write', (ctx) =>
				claimEmployee(ctx.tx, employeeId, ctx.userId)
			);
		} catch (cause) {
			if (isHttpError(cause) || isRedirect(cause)) throw cause;
			if (cause instanceof EmployeeNotFound) {
				return fail(422, { errors: { membership: cause.message } });
			}
			console.error('scheduling: could not link a login', cause);
			return fail(500, {
				errors: { membership: 'We could not link that just now. Nothing was saved. Try again.' }
			});
		}
		return { changed: true };
	}
};
