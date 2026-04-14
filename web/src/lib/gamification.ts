import { ensureDb } from "./db";
import type { AnalysisResult } from "./pose-analysis";

// ─── Badge Definitions ───

export interface BadgeDefinition {
  name: string;
  description: string;
  icon: string; // Lucide icon name
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  first_analysis: {
    name: "First Analysis",
    description: "Complete your first stance analysis",
    icon: "trophy",
  },
  perfect_eyes: {
    name: "Perfect Eyes",
    description: "Get 'good' on Head & Eyes Level",
    icon: "eye",
  },
  balanced_batsman: {
    name: "Balanced Batsman",
    description: "Get 'good' on Balance metric",
    icon: "scale",
  },
  century_club: {
    name: "Century Club",
    description: "Achieve a stance score of 85+",
    icon: "star",
  },
  consistent_player: {
    name: "Consistent Player",
    description: "Maintain a 7-day practice streak",
    icon: "flame",
  },
  dedicated_cricketer: {
    name: "Dedicated Cricketer",
    description: "Maintain a 30-day practice streak",
    icon: "award",
  },
  improving_player: {
    name: "Improving Player",
    description: "Improve your score by 10+ from first analysis",
    icon: "trending-up",
  },
  all_rounder_stance: {
    name: "All-Rounder",
    description: "Get 'good' on all 6 metrics in one analysis",
    icon: "crown",
  },
};

// ─── Save Analysis ───

export async function saveAnalysis(
  userId: number,
  type: string,
  score: number,
  data: AnalysisResult
): Promise<number> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: "INSERT INTO analyses (user_id, type, score, data) VALUES (?, ?, ?, ?)",
    args: [userId, type, score, JSON.stringify(data)],
  });
  return Number(result.lastInsertRowid);
}

// ─── Streak Management ───

export async function updateStreak(
  userId: number
): Promise<{ current: number; best: number }> {
  const db = await ensureDb();

  // Get or create streak row
  const existing = await db.execute({
    sql: "SELECT current_streak, best_streak, last_activity_date FROM streaks WHERE user_id = ?",
    args: [userId],
  });

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  if (existing.rows.length === 0) {
    // First activity ever
    await db.execute({
      sql: "INSERT INTO streaks (user_id, current_streak, best_streak, last_activity_date) VALUES (?, 1, 1, ?)",
      args: [userId, today],
    });
    return { current: 1, best: 1 };
  }

  const row = existing.rows[0] as unknown as {
    current_streak: number;
    best_streak: number;
    last_activity_date: string;
  };

  const lastDate = row.last_activity_date;

  if (lastDate === today) {
    // Already counted today
    return { current: row.current_streak, best: row.best_streak };
  }

  // Check if yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newCurrent: number;
  if (lastDate === yesterdayStr) {
    newCurrent = row.current_streak + 1;
  } else {
    newCurrent = 1; // Streak broken
  }

  const newBest = Math.max(newCurrent, row.best_streak);

  await db.execute({
    sql: "UPDATE streaks SET current_streak = ?, best_streak = ?, last_activity_date = ? WHERE user_id = ?",
    args: [newCurrent, newBest, today, userId],
  });

  return { current: newCurrent, best: newBest };
}

// ─── Badge Checking ───

export async function checkAndAwardBadges(
  userId: number,
  result: AnalysisResult,
  streak: { current: number; best: number }
): Promise<string[]> {
  const db = await ensureDb();

  // Get already-earned badges
  const earned = await db.execute({
    sql: "SELECT badge_key FROM badges WHERE user_id = ?",
    args: [userId],
  });
  const earnedSet = new Set(
    (earned.rows as unknown as { badge_key: string }[]).map((r) => r.badge_key)
  );

  const newBadges: string[] = [];

  function award(key: string) {
    if (!earnedSet.has(key)) {
      newBadges.push(key);
      earnedSet.add(key);
    }
  }

  // first_analysis — always on first analysis
  award("first_analysis");

  // perfect_eyes
  if (result.metrics.find((m) => m.name === "Head & Eyes Level")?.status === "good") {
    award("perfect_eyes");
  }

  // balanced_batsman
  if (result.metrics.find((m) => m.name === "Balance")?.status === "good") {
    award("balanced_batsman");
  }

  // century_club
  if (result.score >= 85) {
    award("century_club");
  }

  // consistent_player
  if (streak.current >= 7 || streak.best >= 7) {
    award("consistent_player");
  }

  // dedicated_cricketer
  if (streak.current >= 30 || streak.best >= 30) {
    award("dedicated_cricketer");
  }

  // all_rounder_stance
  if (result.metrics.every((m) => m.status === "good")) {
    award("all_rounder_stance");
  }

  // improving_player — check first vs latest score
  const firstAnalysis = await db.execute({
    sql: "SELECT score FROM analyses WHERE user_id = ? AND type = 'stance' ORDER BY created_at ASC LIMIT 1",
    args: [userId],
  });
  if (firstAnalysis.rows.length > 0) {
    const firstScore = (firstAnalysis.rows[0] as unknown as { score: number }).score;
    if (result.score - firstScore >= 10) {
      award("improving_player");
    }
  }

  // Insert new badges
  for (const key of newBadges) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO badges (user_id, badge_key) VALUES (?, ?)",
      args: [userId, key],
    });
  }

  return newBadges;
}

// ─── User Stats ───

export interface UserStats {
  totalSessions: number;
  avgScore: number;
  improvementPct: number;
  highestScore: number;
  currentStreak: number;
  bestStreak: number;
  badges: { key: string; earnedAt: string }[];
  recentAnalyses: { id: number; score: number; createdAt: string }[];
}

export async function getUserStats(userId: number): Promise<UserStats> {
  const db = await ensureDb();

  // Total sessions
  const countRes = await db.execute({
    sql: "SELECT COUNT(*) as cnt FROM analyses WHERE user_id = ?",
    args: [userId],
  });
  const totalSessions = Number((countRes.rows[0] as unknown as { cnt: number }).cnt);

  // Average score
  const avgRes = await db.execute({
    sql: "SELECT AVG(score) as avg FROM analyses WHERE user_id = ? AND type = 'stance'",
    args: [userId],
  });
  const avgScore = Math.round(Number((avgRes.rows[0] as unknown as { avg: number | null }).avg) || 0);

  // Streak
  const streakRes = await db.execute({
    sql: "SELECT current_streak, best_streak FROM streaks WHERE user_id = ?",
    args: [userId],
  });
  let currentStreak = 0;
  let bestStreak = 0;
  if (streakRes.rows.length > 0) {
    const row = streakRes.rows[0] as unknown as { current_streak: number; best_streak: number };
    currentStreak = row.current_streak;
    bestStreak = row.best_streak;
  }

  // Badges
  const badgesRes = await db.execute({
    sql: "SELECT badge_key, earned_at FROM badges WHERE user_id = ? ORDER BY earned_at DESC",
    args: [userId],
  });
  const badges = (badgesRes.rows as unknown as { badge_key: string; earned_at: string }[]).map(
    (r) => ({ key: r.badge_key, earnedAt: r.earned_at })
  );

  // Improvement percentage (first score vs latest score)
  let improvementPct = 0;
  let highestScore = 0;
  const firstLastRes = await db.execute({
    sql: "SELECT score, created_at FROM analyses WHERE user_id = ? AND type = 'stance' ORDER BY created_at ASC",
    args: [userId],
  });
  if (firstLastRes.rows.length >= 2) {
    const scores = (firstLastRes.rows as unknown as { score: number }[]).map((r) => Number(r.score));
    const firstScore = scores[0];
    const latestScore = scores[scores.length - 1];
    highestScore = Math.max(...scores);
    if (firstScore > 0) {
      improvementPct = Math.round(((latestScore - firstScore) / firstScore) * 100);
    }
  } else if (firstLastRes.rows.length === 1) {
    highestScore = Number((firstLastRes.rows[0] as unknown as { score: number }).score);
  }

  // Recent analyses (last 20 for trend chart)
  const recentRes = await db.execute({
    sql: "SELECT id, score, created_at FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
    args: [userId],
  });
  const recentAnalyses = (
    recentRes.rows as unknown as { id: number; score: number; created_at: string }[]
  ).map((r) => ({ id: Number(r.id), score: Number(r.score), createdAt: r.created_at }));

  return { totalSessions, avgScore, improvementPct, highestScore, currentStreak, bestStreak, badges, recentAnalyses };
}
