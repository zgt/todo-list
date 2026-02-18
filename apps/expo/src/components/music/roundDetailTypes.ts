export interface SubmissionItem {
  id: string;
  isOwn: boolean;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string | null;
  spotifyTrackId: string;
  submitter: { name: string | null; image: string | null } | null;
  totalPoints: number;
  votes: {
    voter: { name: string | null; image: string | null } | null;
    points: number;
  }[];
  comments: {
    user: { name: string | null } | null;
    text: string;
  }[];
}

export const PHASE_LABELS: Record<string, string> = {
  SUBMISSION: "Listening",
  LISTENING: "Voting",
  VOTING: "Results",
  RESULTS: "Completed",
};
