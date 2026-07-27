// --- Due date helpers ---

/**
 * Due dates picked from the calendar carry no time component: they land on
 * local midnight and mean "some time on this day". Comparing those against
 * `now` directly marks a task overdue from the first second of the day it's
 * actually due, so all-day due dates are compared against the end of their day
 * instead. Due dates that do carry a time (set explicitly) keep exact
 * comparison.
 */
export function isDueDateOverdue(
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!dueDate) return false;

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;

  const isAllDay =
    due.getHours() === 0 &&
    due.getMinutes() === 0 &&
    due.getSeconds() === 0 &&
    due.getMilliseconds() === 0;

  if (isAllDay) {
    const endOfDueDay = new Date(due);
    endOfDueDay.setHours(23, 59, 59, 999);
    return endOfDueDay < now;
  }

  return due < now;
}
