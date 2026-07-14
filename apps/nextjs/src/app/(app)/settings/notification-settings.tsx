"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@acme/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";
import { Switch } from "@acme/ui/switch";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

const OFFSET_OPTIONS = [
  { value: "0", label: "At time of reminder" },
  { value: "5", label: "5 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

export function NotificationSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery(
    trpc.notification.getUserPreferences.queryOptions(),
  );

  // Track local overrides; null means "use server value"
  const [localEmail, setLocalEmail] = useState<boolean | null>(null);
  const [localPush, setLocalPush] = useState<boolean | null>(null);
  const [localOffset, setLocalOffset] = useState<number | null>(null);

  // Derived values: local override ?? server value ?? defaults
  const emailReminders = localEmail ?? prefs?.emailReminders ?? false;
  const pushReminders = localPush ?? prefs?.pushReminders ?? true;
  const reminderOffsetMinutes =
    localOffset ?? prefs?.reminderOffsetMinutes ?? 15;

  const updatePrefs = useMutation(
    trpc.notification.updateUserPreferences.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.notification.getUserPreferences.queryFilter(),
        );
        // Reset local overrides since server now reflects the saved state
        setLocalEmail(null);
        setLocalPush(null);
        setLocalOffset(null);
        toast.success("Preferences saved");
      },
      onError: () => {
        toast.error("Failed to save preferences");
      },
    }),
  );

  const handleSave = () => {
    updatePrefs.mutate({
      emailReminders,
      pushReminders,
      reminderOffsetMinutes,
    });
  };

  const hasChanges =
    prefs &&
    (emailReminders !== prefs.emailReminders ||
      pushReminders !== prefs.pushReminders ||
      reminderOffsetMinutes !== prefs.reminderOffsetMinutes);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="border-border-strong bg-surface-2/80 rounded-2xl border p-6 backdrop-blur-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Notification Settings</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure how and when you receive task reminders.
        </p>
      </div>

      <div className="space-y-3">
        {/* Email Reminders */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <p className="text-foreground font-medium">Email reminders</p>
            <p className="text-muted-foreground text-sm">
              Receive reminder notifications via email
            </p>
          </div>
          <Switch checked={emailReminders} onCheckedChange={setLocalEmail} />
        </div>

        {/* Push Reminders */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <p className="text-foreground font-medium">Push reminders</p>
            <p className="text-muted-foreground text-sm">
              Receive push notifications on your devices
            </p>
          </div>
          <Switch checked={pushReminders} onCheckedChange={setLocalPush} />
        </div>

        {/* Reminder Offset */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <p className="text-foreground font-medium">Reminder timing</p>
            <p className="text-muted-foreground text-sm">
              When to send the reminder relative to the set time
            </p>
          </div>
          <Select
            value={String(reminderOffsetMinutes)}
            onValueChange={(v) => setLocalOffset(Number(v))}
          >
            <SelectTrigger className="border-border-strong bg-surface w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OFFSET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6">
        <Button
          onClick={handleSave}
          disabled={updatePrefs.isPending || !hasChanges}
          className="bg-primary hover:bg-primary/90 text-black"
        >
          {updatePrefs.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
