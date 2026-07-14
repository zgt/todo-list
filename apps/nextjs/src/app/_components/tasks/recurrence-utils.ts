// --- Recurrence helpers shared across create/edit and read-only badges ---

export type RecurrenceRuleType =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom"
  | null;

export const RECURRENCE_OPTIONS: {
  label: string;
  value: RecurrenceRuleType;
}[] = [
  { label: "None", value: null },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

export function getRecurrenceUnitLabel(rule: RecurrenceRuleType): string {
  switch (rule) {
    case "daily":
      return "day";
    case "weekly":
      return "week";
    case "monthly":
      return "month";
    case "yearly":
      return "year";
    default:
      return "";
  }
}

// Shared formatter deduping the recurrence-label logic used in the recurrence
// pill and the collapsed/expanded read-only badges. Returns "" for no rule;
// callers supply their own fallback label (e.g. "Repeat") when needed.
export function formatRecurrenceLabel(
  rule: RecurrenceRuleType,
  interval: number,
): string {
  if (!rule) return "";
  const unitLabel = getRecurrenceUnitLabel(rule);
  return interval === 1
    ? rule.charAt(0).toUpperCase() + rule.slice(1)
    : `Every ${interval} ${unitLabel}s`;
}
