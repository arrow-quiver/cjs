/**
 * THE SCHEDULE'S CLIENT-SAFE CORE. Import from here.
 *
 * The model, the clash rule and the words. The database side lives in
 * `$lib/server/core/people` and `$lib/server/modules/scheduling`, and nothing in here knows
 * either exists. Dates and times of day come from `$lib/core/calendar`, which is the one place
 * in the product allowed to think about them.
 */
export { ASSIGNEE_KINDS, isAssigneeKind } from './types';
export type { Assignee, AssigneeKind, EmployeeRow, ScheduleEntry, Slot, TeamRow } from './types';

export { clashSentence, overlaps } from './clash';
export type { Engagement } from './clash';

export { weekBoard } from './week';
export type { DayColumn } from './week';
