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

  // Shared-list activity lives in the user's JSON preferences and has its own
  // procedure pair, so it's queried and saved separately from the reminder
  // preferences above.
  const { data: sharedPrefs, isLoading: isLoadingShared } = useQuery(
    trpc.notification.getSharedListNotificationPref.queryOptions(),
  );

  // Track local overrides; null means "use server value"
  const [localEmail, setLocalEmail] = useState<boolean | null>(null);
  const [localPush, setLocalPush] = useState<boolean | null>(null);
  const [localOffset, setLocalOffset] = useState<number | null>(null);
  const [localSharedList, setLocalSharedList] = useState<boolean | null>(null);

  // Derived values: local override ?? server value ?? defaults
  const emailReminders = localEmail ?? prefs?.emailReminders ?? false;
  const pushReminders = localPush ?? prefs?.pushReminders ?? true;
  const reminderOffsetMinutes =
    localOffset ?? prefs?.reminderOffsetMinutes ?? 15;
  const sharedListActivity =
    localSharedList ?? sharedPrefs?.sharedListActivity ?? true;

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

  const updateSharedPref = useMutation(
    trpc.notification.updateSharedListNotificationPref.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.notification.getSharedListNotificationPref.queryFilter(),
        );
        setLocalSharedList(null);
        toast.success("Preferences saved");
      },
      onError: () => {
        toast.error("Failed to save shared list preference");
      },
    }),
  );

  // Reminder prefs and the shared-list toggle come from separate queries and
  // are saved via separate mutations, so their "changed" state (and whether
  // to fire each mutation) must be tracked independently — otherwise a
  // resolved-undefined reminder-prefs query blocks Save even when only the
  // shared-list toggle changed, and saving fires the reminder mutation even
  // when nothing about reminders changed.
  const reminderPrefsChanged =
    !!prefs &&
    (emailReminders !== prefs.emailReminders ||
      pushReminders !== prefs.pushReminders ||
      reminderOffsetMinutes !== prefs.reminderOffsetMinutes);

  const sharedListChanged =
    !!sharedPrefs && sharedListActivity !== sharedPrefs.sharedListActivity;

  const handleSave = () => {
    if (reminderPrefsChanged) {
      updatePrefs.mutate({
        emailReminders,
        pushReminders,
        reminderOffsetMinutes,
      });
    }
    if (sharedListChanged) {
      updateSharedPref.mutate({ sharedListActivity });
    }
  };

  const hasChanges = reminderPrefsChanged || sharedListChanged;

  const isSaving = updatePrefs.isPending || updateSharedPref.isPending;

  if (isLoading || isLoadingShared) {
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

        {/* Shared List Activity */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <p className="text-foreground font-medium">Shared list activity</p>
            <p className="text-muted-foreground text-sm">
              Get notified when someone edits or completes a task in a list you
              share
            </p>
          </div>
          <Switch
            checked={sharedListActivity}
            onCheckedChange={setLocalSharedList}
          />
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
          disabled={isSaving || !hasChanges}
          className="bg-primary hover:bg-primary/90 text-black"
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
