/**
 * NOTIFICATIONS — `core_notification`. Somebody is told something, in the app.
 *
 * The product's first in-app channel. Until now the only way cjs told a person anything was
 * email (`server/core/mail.ts`) or a toast that dies with the tab. Assignment (SPA-24) is the
 * first fact that has to reach a specific person durably: "this job is yours, Tuesday at eight".
 *
 * ADDRESSED TO AN EMPLOYEE, NOT A USER. The thing being told is a pair of hands ("you are on
 * this job"), and a team assignment fans out to one row per member at write time — the fan-out
 * is the writer's job, so the reader is one indexed scan with no team logic. An employee sees
 * their rows through the login linked on `core_employee.user_id`; rows for an employee with no
 * login wait until one is linked, which is honest: the app cannot reach somebody who cannot
 * open it, and says so to whoever assigns rather than pretending otherwise.
 *
 * WHY `core_`: written by scheduling today, but read by the shell — the bell sits in the top
 * bar of every screen, outside any module gate, and the next module that needs to tell somebody
 * something will not want a second table.
 *
 * READING IS THE ONLY LIFECYCLE. `read_at` set by the person it belongs to; no archive column,
 * because a read notification already is the archive. Nothing is deleted; the application role
 * cannot.
 */
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { businessId, id, notBlank, timestamps } from '../base';
import { business } from './core';

export const notification = pgTable(
	'core_notification',
	{
		id: id(),
		businessId: businessId().references(() => business.businessId, { onDelete: 'restrict' }),

		/** Composite, `(business_id, employee_id) -> core_employee`. Hand-written in 0014. */
		employeeId: uuid().notNull(),

		/** "You are on Geyser replacement for Fynbos Interiors." */
		title: text().notNull(),
		/** The detail worth a second line: the day, the time, the place. */
		detail: text(),
		/** Where tapping it goes — the job, usually. App-relative. */
		href: text(),

		/** When the person saw it. Null is what the bell counts. */
		readAt: timestamp({ withTimezone: true }),

		...timestamps()
	},
	(t) => [
		notBlank('core_notification_title_present', t.title),

		// The bell's two questions: how many unread, and the feed newest-first.
		index('core_notification_recipient_idx').on(t.businessId, t.employeeId, t.readAt, t.createdAt)
	]
);
