"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Disc3, Loader2, Music, Star, Trophy } from "lucide-react";

import { Card, CardContent } from "@acme/ui/card";

import { useTRPC } from "~/trpc/react";

export default function ProfilePage() {
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

  if (!profile) return null;

  const stats = [
    {
      label: "Total Points",
      value: profile.totalPoints,
      icon: Star,
    },
    {
      label: "Rounds Won",
      value: profile.roundsWon,
      icon: Trophy,
    },
    {
      label: "Leagues Active",
      value: profile.leaguesJoined,
      icon: Music,
    },
    {
      label: "Submissions",
      value: profile.totalSubmissions,
      icon: Disc3,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Your Profile</h1>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <stat.icon className="text-primary h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {profile.bestSubmission && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Best Submission</h2>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <Image
                src={profile.bestSubmission.albumArtUrl}
                alt={profile.bestSubmission.trackName}
                width={56}
                height={56}
                className="rounded-md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {profile.bestSubmission.trackName}
                </p>
                <p className="text-muted-foreground truncate text-sm">
                  {profile.bestSubmission.artistName}
                </p>
                <p className="text-muted-foreground text-xs">
                  {profile.bestSubmission.roundTheme}
                </p>
              </div>
              <div className="text-right">
                <p className="text-primary text-lg font-bold">
                  {profile.bestSubmission.points}
                </p>
                <p className="text-muted-foreground text-xs">points</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
