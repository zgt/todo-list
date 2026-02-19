"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, Calendar, Clock, Info, Sparkles } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Card, CardContent } from "@acme/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/dialog";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";
import { Textarea } from "@acme/ui/textarea";

import { useTRPC } from "~/trpc/react";

const THEME_TEMPLATES = [
  // Classic
  {
    name: "Guilty Pleasures",
    description: "Songs you love but are embarrassed to admit",
    category: "Classic",
  },
  {
    name: "One-Hit Wonders",
    description: "Artists known for just one big hit",
    category: "Classic",
  },
  {
    name: "Covers",
    description: "Cover versions of songs",
    category: "Classic",
  },
  {
    name: "Duets",
    description: "Songs featuring two or more artists",
    category: "Classic",
  },

  // Genre
  {
    name: "Jazz",
    description: "Jazz tracks of any era",
    category: "Genre",
  },
  {
    name: "Hip-Hop",
    description: "Hip-hop and rap tracks",
    category: "Genre",
  },
  {
    name: "Country",
    description: "Country music",
    category: "Genre",
  },
  {
    name: "Electronic",
    description: "Electronic, EDM, or synth-based music",
    category: "Genre",
  },
  {
    name: "Punk",
    description: "Punk rock and its subgenres",
    category: "Genre",
  },

  // Era
  {
    name: "Songs from the 80s",
    description: "Released between 1980-1989",
    category: "Era",
  },
  {
    name: "Songs from the 2000s",
    description: "Released between 2000-2009",
    category: "Era",
  },
  {
    name: "Songs from the Year You Were Born",
    description: "Released the year you were born",
    category: "Era",
  },

  // Mood
  {
    name: "Songs That Make You Cry",
    description: "Emotionally devastating tracks",
    category: "Mood",
  },
  {
    name: "Road Trip Anthems",
    description: "Perfect for driving with the windows down",
    category: "Mood",
  },
  {
    name: "Late Night Vibes",
    description: "Music for the late hours",
    category: "Mood",
  },
  {
    name: "Workout Bangers",
    description: "High energy tracks to get you moving",
    category: "Mood",
  },

  // Challenge
  {
    name: "Songs Under 3 Minutes",
    description: "Short and sweet - under 3 minutes",
    category: "Challenge",
  },
  {
    name: "Songs with a Color in the Title",
    description: "The title must contain a color",
    category: "Challenge",
  },
  {
    name: "One-Word Song Titles",
    description: "The title is a single word",
    category: "Challenge",
  },
  {
    name: "Instrumentals Only",
    description: "No vocals allowed",
    category: "Challenge",
  },
  {
    name: "Foreign Language Songs",
    description: "Sung in a language other than English",
    category: "Challenge",
  },

  // Personal
  {
    name: "Your Most Played Song",
    description: "Your current most-listened track",
    category: "Personal",
  },
  {
    name: "A Song That Changed Your Life",
    description: "A track that had a profound impact on you",
    category: "Personal",
  },
  {
    name: "Your Guilty Pleasure",
    description: "The song you secretly love",
    category: "Personal",
  },
  {
    name: "A Song That Reminds You of Someone",
    description: "A track tied to a specific person",
    category: "Personal",
  },
] as const;

const CATEGORIES = [
  "Classic",
  "Genre",
  "Era",
  "Mood",
  "Challenge",
  "Personal",
] as const;

export default function CreateRound() {
  const params = useParams<{ leagueId: string }>();
  const router = useRouter();
  const trpc = useTRPC();

  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [showThemeBrowser, setShowThemeBrowser] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Classic");

  const { data: league } = useQuery(
    trpc.musicLeague.getLeagueById.queryOptions({
      id: params.leagueId,
    }),
  );

  // Check if there's an unfinished round (not COMPLETED and not PENDING)
  const hasUnfinishedRound = league?.rounds.some(
    (r: { status: string }) =>
      r.status !== "COMPLETED" && r.status !== "PENDING",
  );

  const createRound = useMutation(
    trpc.musicLeague.createRound.mutationOptions({
      onSuccess: (round) => {
        if (round) {
          router.push(`/music/leagues/${params.leagueId}/rounds/${round.id}`);
        }
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createRound.mutate({
      leagueId: params.leagueId,
      themeName,
      themeDescription: themeDescription || undefined,
    });
  };

  const handleSelectTheme = (name: string, description: string) => {
    setThemeName(name);
    setThemeDescription(description);
    setShowThemeBrowser(false);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Create a New Round</h1>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme-name">Theme</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-auto px-2 py-1 text-xs"
                  onClick={() => setShowThemeBrowser(true)}
                >
                  <BookOpen className="mr-1 h-3 w-3" />
                  Browse Themes
                </Button>
              </div>
              <Input
                id="theme-name"
                type="text"
                required
                maxLength={200}
                placeholder="e.g. Guilty Pleasures"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="theme-desc">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="theme-desc"
                rows={2}
                maxLength={500}
                placeholder="Describe the theme to help participants..."
                value={themeDescription}
                onChange={(e) => setThemeDescription(e.target.value)}
              />
            </div>

            {/* League Defaults Summary */}
            <div className="bg-muted/50 border-border/50 rounded-lg border p-4">
              <p className="mb-3 text-sm font-medium">Round Schedule</p>
              {league ? (
                <div className="space-y-2">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {league.submissionWindowDays} day
                      {league.submissionWindowDays !== 1 ? "s" : ""} for
                      submissions
                    </span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {league.votingWindowDays} day
                      {league.votingWindowDays !== 1 ? "s" : ""} for voting
                    </span>
                  </div>
                  {hasUnfinishedRound && (
                    <div className="mt-2 flex items-start gap-2 rounded-md bg-orange-500/10 p-2.5">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                      <p className="text-xs text-orange-500">
                        This round will start after the current round ends
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">Loading...</div>
              )}
            </div>

            {createRound.error && (
              <p className="text-destructive text-sm">
                {createRound.error.message}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!themeName.trim() || createRound.isPending}
              >
                {createRound.isPending
                  ? "Creating..."
                  : hasUnfinishedRound
                    ? "Queue Round"
                    : "Create Round"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Theme Browser Dialog */}
      <Dialog open={showThemeBrowser} onOpenChange={setShowThemeBrowser}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Browse Theme Templates
            </DialogTitle>
          </DialogHeader>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Theme list */}
          <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
            {THEME_TEMPLATES.filter((t) => t.category === activeCategory).map(
              (theme) => (
                <button
                  key={theme.name}
                  type="button"
                  className="hover:bg-accent border-border/50 w-full rounded-lg border p-3 text-left transition-colors"
                  onClick={() =>
                    handleSelectTheme(theme.name, theme.description)
                  }
                >
                  <p className="text-sm font-medium">{theme.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {theme.description}
                  </p>
                </button>
              ),
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
