import { NextResponse } from "next/server";

interface Match {
  id: string;
  teams: string;
  score: string;
  status: string;
  league: string;
  state: "live" | "completed" | "upcoming";
}

interface NewsItem {
  title: string;
  link: string;
  published: string;
}

const TEAM_FLAGS: Record<string, string> = {
  India: "🇮🇳", Australia: "🇦🇺", England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", Pakistan: "🇵🇰",
  "Sri Lanka": "🇱🇰", "New Zealand": "🇳🇿", "South Africa": "🇿🇦",
  "West Indies": "🌴", Bangladesh: "🇧🇩", Afghanistan: "🇦🇫",
  Ireland: "🇮🇪", Zimbabwe: "🇿🇼", Nepal: "🇳🇵",
};

function getFlag(team: string): string {
  for (const [country, flag] of Object.entries(TEAM_FLAGS)) {
    if (team.includes(country)) return flag;
  }
  return "🏏";
}

// Fallback demo data when API is unavailable
function getFallbackData(): { matches: Match[]; news: NewsItem[] } {
  return {
    matches: [
      { id: "1", teams: "🇮🇳 India vs 🇦🇺 Australia", score: "287/4 (42.3 ov)", status: "India batting", league: "ICC Champions Trophy", state: "live" },
      { id: "2", teams: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 England vs 🇵🇰 Pakistan", score: "ENG 312/8 | PAK 298/10", status: "England won by 14 runs", league: "Test Series", state: "completed" },
      { id: "3", teams: "🇳🇿 New Zealand vs 🇱🇰 Sri Lanka", score: "", status: "Starts Apr 10, 2026", league: "ODI Series", state: "upcoming" },
      { id: "4", teams: "🇿🇦 South Africa vs 🌴 West Indies", score: "SA 156/3 (18.2 ov)", status: "South Africa batting", league: "T20I Series", state: "live" },
      { id: "5", teams: "🇧🇩 Bangladesh vs 🇮🇪 Ireland", score: "BAN 245/10 | IRE 189/10", status: "Bangladesh won by 56 runs", league: "ODI Series", state: "completed" },
    ],
    news: [
      { title: "Virat Kohli hits century in Champions Trophy semi-final", link: "#", published: "2 hours ago" },
      { title: "Pat Cummins rested for ODI series against Pakistan", link: "#", published: "5 hours ago" },
      { title: "ICC announces new Test Championship points system", link: "#", published: "8 hours ago" },
      { title: "Jasprit Bumrah named ICC Cricketer of the Month", link: "#", published: "1 day ago" },
      { title: "T20 World Cup 2026 schedule announced", link: "#", published: "1 day ago" },
      { title: "Ben Stokes returns to England squad after injury", link: "#", published: "2 days ago" },
    ],
  };
}

export async function GET() {
  try {
    // Try CricAPI free tier
    const API_KEY = process.env.CRICAPI_KEY || "";
    if (API_KEY) {
      const res = await fetch(
        `https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`,
        { next: { revalidate: 60 } }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          const matches: Match[] = json.data.slice(0, 10).map((m: Record<string, unknown>) => {
            const teams = (m.teams as string[]) || [];
            const teamStr = teams.map((t: string) => `${getFlag(t)} ${t}`).join(" vs ");
            let state: "live" | "completed" | "upcoming" = "upcoming";
            if (m.matchStarted && !m.matchEnded) state = "live";
            else if (m.matchEnded) state = "completed";

            const scores = (m.score as Array<{ r?: number; w?: number; o?: number; inning?: string }>) || [];
            const scoreStr = scores.map((s) => `${s.r || 0}/${s.w || 0} (${s.o || 0} ov)`).join(" | ");

            return {
              id: m.id as string,
              teams: teamStr,
              score: scoreStr,
              status: (m.status as string) || "",
              league: (m.name as string) || "",
              state,
            };
          });
          return NextResponse.json({ matches, news: getFallbackData().news });
        }
      }
    }

    return NextResponse.json(getFallbackData());
  } catch {
    return NextResponse.json(getFallbackData());
  }
}
