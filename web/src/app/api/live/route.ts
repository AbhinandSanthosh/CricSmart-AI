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

// ─── Cricket News from RSS Feeds ───

const NEWS_FEEDS = [
  "https://www.espncricinfo.com/rss/content/story/feeds/0.xml",
  "https://feeds.feedburner.com/ndtvcricket-latest",
  "https://www.cricbuzz.com/cb-rss/cb-top-stories",
];

// Keywords to validate cricket relevance
const CRICKET_KEYWORDS = [
  "cricket", "icc", "ipl", "bcci", "odi", "t20", "test match", "world cup",
  "innings", "wicket", "bowler", "batter", "batsman", "century", "fifty",
  "run out", "lbw", "catch", "stumps", "pitch", "crease",
  // Teams
  "india", "australia", "england", "pakistan", "sri lanka", "new zealand",
  "south africa", "west indies", "bangladesh", "afghanistan",
  // Tournaments
  "champions trophy", "ashes", "asia cup", "big bash", "psl",
  "cpl", "hundred", "premier league",
  // Players (top names)
  "kohli", "rohit", "bumrah", "cummins", "smith", "stokes", "babar",
  "williamson", "root", "rabada", "rashid", "gill", "pant", "dhoni",
  "sachin", "dravid", "warner", "head", "labuschagne", "starc",
];

function isCricketRelevant(title: string): boolean {
  const lower = title.toLowerCase();
  return CRICKET_KEYWORDS.some((kw) => lower.includes(kw));
}

function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

    if (title.trim()) {
      items.push({
        title: title.trim(),
        link: link.trim(),
        published: pubDate ? formatTimeAgo(new Date(pubDate)) : "",
      });
    }
  }

  return items;
}

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 0 || isNaN(diffMs)) return "";

  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

async function fetchRealNews(): Promise<NewsItem[]> {
  const allNews: NewsItem[] = [];

  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async (url) => {
      const res = await fetch(url, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRssItems(xml);
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allNews.push(...result.value);
    }
  }

  // Filter: cricket-relevant only
  const relevant = allNews.filter((n) => isCricketRelevant(n.title));

  // Deduplicate by similar titles
  const seen = new Set<string>();
  const deduped = relevant.filter((n) => {
    const key = n.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter out articles older than 7 days
  const recent = deduped.filter((n) => {
    if (!n.published) return true;
    return !n.published.includes("/"); // keep "Xh ago", "Xd ago" format, skip old dates
  });

  return recent.slice(0, 8);
}

// ─── Fallback data ───

function getFallbackNews(): NewsItem[] {
  return [
    { title: "Live cricket scores and updates available when connected", link: "#", published: "" },
  ];
}

function getFallbackMatches(): Match[] {
  return [
    { id: "1", teams: "🇮🇳 India vs 🇦🇺 Australia", score: "287/4 (42.3 ov)", status: "India batting", league: "ICC Champions Trophy", state: "live" },
    { id: "2", teams: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 England vs 🇵🇰 Pakistan", score: "ENG 312/8 | PAK 298/10", status: "England won by 14 runs", league: "Test Series", state: "completed" },
    { id: "3", teams: "🇳🇿 New Zealand vs 🇱🇰 Sri Lanka", score: "", status: "Starts tomorrow", league: "ODI Series", state: "upcoming" },
  ];
}

export async function GET() {
  try {
    let matches: Match[] = [];
    let news: NewsItem[] = [];

    // Fetch matches from CricAPI
    const API_KEY = process.env.CRICAPI_KEY || "";
    if (API_KEY) {
      try {
        const res = await fetch(
          `https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`,
          { next: { revalidate: 60 } }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success" && json.data) {
            matches = json.data.slice(0, 10).map((m: Record<string, unknown>) => {
              const teams = (m.teams as string[]) || [];
              const teamStr = teams.map((t: string) => `${getFlag(t)} ${t}`).join(" vs ");
              let state: "live" | "completed" | "upcoming" = "upcoming";
              if (m.matchStarted && !m.matchEnded) state = "live";
              else if (m.matchEnded) state = "completed";

              const scores = (m.score as Array<{ r?: number; w?: number; o?: number }>) || [];
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
          }
        }
      } catch {
        // CricAPI failed, use fallback matches
      }
    }

    // Fetch real news from RSS feeds
    try {
      news = await fetchRealNews();
    } catch {
      // RSS failed, use fallback
    }

    return NextResponse.json({
      matches: matches.length > 0 ? matches : getFallbackMatches(),
      news: news.length > 0 ? news : getFallbackNews(),
    });
  } catch {
    return NextResponse.json({
      matches: getFallbackMatches(),
      news: getFallbackNews(),
    });
  }
}
