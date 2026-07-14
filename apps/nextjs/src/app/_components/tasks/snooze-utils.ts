// --- Snooze helper functions ---

export function getLaterToday(): Date {
  const later = new Date();
  later.setHours(later.getHours() + 4);
  later.setMinutes(0, 0, 0);
  return later;
}

export function getTomorrowAt9am(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

export function getNextMondayAt9am(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(monday.getDate() + daysUntilMonday);
  monday.setHours(9, 0, 0, 0);
  return monday;
}
