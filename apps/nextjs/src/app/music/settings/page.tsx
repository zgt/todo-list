"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import { Label } from "@acme/ui/label";
import { Switch } from "@acme/ui/switch";

import { useTRPC } from "~/trpc/react";

interface NotificationPrefs {
  roundStart: boolean;
  submissionReminder: boolean;
  votingOpen: boolean;
  resultsAvailable: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  roundStart: true,
  submissionReminder: true,
  votingOpen: true,
  resultsAvailable: true,
};

const PREF_LABELS: Record<keyof NotificationPrefs, string> = {
  roundStart: "Round Started",
  submissionReminder: "Submission Reminder",
  votingOpen: "Voting Open",
  resultsAvailable: "Results Available",
};

const PREF_DESCRIPTIONS: Record<keyof NotificationPrefs, string> = {
  roundStart: "Get notified when a new round begins",
  submissionReminder: "Reminder before submission deadline",
  votingOpen: "Get notified when voting opens",
  resultsAvailable: "Get notified when round results are in",
};

function SettingsForm({ initialPrefs }: { initialPrefs: NotificationPrefs }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [dirty, setDirty] = useState(false);

  const updatePrefs = useMutation(
    trpc.musicLeague.updateNotificationPreferences.mutationOptions({
      onSuccess: () => {
        setDirty(false);
        void queryClient.invalidateQueries(
          trpc.musicLeague.getUserProfile.queryFilter(),
        );
      },
    }),
  );

  const handleToggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {(Object.keys(PREF_LABELS) as (keyof NotificationPrefs)[]).map(
          (key) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">
                  {PREF_LABELS[key]}
                </Label>
                <p className="text-muted-foreground text-xs">
                  {PREF_DESCRIPTIONS[key]}
                </p>
              </div>
              <Switch
                checked={prefs[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ),
        )}

        <Button
          onClick={() => updatePrefs.mutate(prefs)}
          disabled={!dirty || updatePrefs.isPending}
          className="w-full"
        >
          {updatePrefs.isPending ? "Saving..." : "Save Preferences"}
        </Button>

        {updatePrefs.isSuccess && !dirty && (
          <p className="text-primary text-center text-sm">Preferences saved</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const trpc = useTRPC();

  const { data: profile, isLoading } = useQuery(
    trpc.musicLeague.getUserProfile.queryOptions(),
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <SettingsForm
        initialPrefs={profile?.notificationPreferences ?? DEFAULT_PREFS}
      />
    </div>
  );
}
