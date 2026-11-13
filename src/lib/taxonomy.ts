/**
 * One list of sports, positions and skills for the whole app. Upload, Explore filters and
 * scouting preferences all read from here, so a tag saved on a video is always one a filter
 * can find. Matching in the database is case-insensitive.
 */
export const SPORTS = ["football", "cricket", "basketball"] as const;
export type Sport = (typeof SPORTS)[number];

export const SPORT_LABEL: Record<Sport, string> = {
  football: "Football",
  cricket: "Cricket",
  basketball: "Basketball",
};

export const POSITIONS: Record<Sport, string[]> = {
  football: ["Striker", "Winger", "Midfielder", "Defender", "Goalkeeper"],
  cricket: ["Batter", "Fast bowler", "Spin bowler", "Wicketkeeper", "All-rounder"],
  basketball: ["Point guard", "Shooting guard", "Small forward", "Power forward", "Center"],
};

export const TRAITS: Record<Sport, string[]> = {
  football: ["Pace", "Dribbling", "Vision", "Finishing", "Tackling", "Aerial"],
  cricket: ["Power hitting", "Technique", "Line and length", "Pace", "Spin", "Fielding"],
  basketball: ["Shooting", "Playmaking", "Finishing", "Defence", "Rebounding"],
};

export const ALL_TRAITS = Array.from(new Set(SPORTS.flatMap((s) => TRAITS[s])));

export const isSport = (s: unknown): s is Sport => typeof s === "string" && (SPORTS as readonly string[]).includes(s);

export const MAX_VIDEO_MB = 50;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/3gpp"];
export const MAX_AVATAR_MB = 5;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const formatCount = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 10_000) return Math.round(n / 1_000) + "K";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
};

export const timeAgo = (iso: string): string => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
};
