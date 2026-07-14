// --- Helper functions for reminder display and datetime-local conversion ---

export type ReminderStatus = "reminded" | "upcoming" | "imminent" | "overdue";

export function getReminderStatus(
  reminderAt: Date,
  reminderSentAt: Date | null,
): ReminderStatus {
  const now = new Date();
  const diff = reminderAt.getTime() - now.getTime();
  if (diff < 0 && reminderSentAt) return "reminded";
  if (diff < 0) return "overdue";
  if (diff <= 60 * 60 * 1000) return "imminent"; // within 1 hour
  return "upcoming";
}

export function formatReminder(
  reminderAt: Date,
  reminderSentAt?: Date | null,
): string {
  const status = getReminderStatus(reminderAt, reminderSentAt ?? null);
  if (status === "reminded") return "Reminded";
  if (status === "overdue") return "Overdue";

  const now = new Date();
  const diff = reminderAt.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 60) return `in ${minutes}m`;
  if (hours < 24) return `in ${hours}h`;
  if (days < 7) return `in ${days}d`;
  return (
    reminderAt.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " at " +
    reminderAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  );
}

export function getReminderBadgeClasses(
  reminderAt: Date,
  reminderSentAt: Date | null,
): string {
  const status = getReminderStatus(reminderAt, reminderSentAt);
  switch (status) {
    case "reminded":
      return "border-border-strong bg-surface-2/80 text-muted-foreground";
    case "imminent":
      return "border-primary/50 bg-primary/10 text-primary";
    case "overdue":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "upcoming":
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  }
}
