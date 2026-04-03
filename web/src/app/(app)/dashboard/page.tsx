"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Dumbbell, MessageCircle, Video, TrendingUp, Zap } from "lucide-react";

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetch("/api/live")
      .then((r) => r.json())
      .then((data) => {
        setMatches(data.matches || []);
        setNews(data.news || []);
      })
      .catch(() => {});
  }, []);

  const liveMatches = matches.filter((m) => m.state === "live");
  const completedMatches = matches.filter((m) => m.state === "completed");
  const upcomingMatches = matches.filter((m) => m.state === "upcoming");

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, <span className="text-amber">{user?.username}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {user?.primary_role} &middot; {user?.skill_level} &middot; Ready to
          train?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/biometric", icon: Activity, label: "Analyze Stance", color: "text-green-400" },
          { href: "/drills", icon: Dumbbell, label: "Start Drill", color: "text-blue-400" },
          { href: "/mentor", icon: MessageCircle, label: "AI Mentor", color: "text-purple-400" },
          { href: "/ball-tracking", icon: Video, label: "Track Ball", color: "text-red-400" },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="bg-card border-border hover:border-amber/40 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <action.icon className={`w-8 h-8 ${action.color}`} />
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-amber mx-auto mb-1" />
            <div className="text-2xl font-bold">--</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Zap className="w-5 h-5 text-amber mx-auto mb-1" />
            <div className="text-2xl font-bold">--</div>
            <div className="text-xs text-muted-foreground">Avg Score</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Activity className="w-5 h-5 text-amber mx-auto mb-1" />
            <div className="text-2xl font-bold">--</div>
            <div className="text-xs text-muted-foreground">Streak</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Live Matches */}
        <div className="md:col-span-2 space-y-4">
          {liveMatches.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Live Matches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {liveMatches.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className="font-medium text-sm">{m.teams}</div>
                    {m.score && (
                      <div className="text-amber text-sm mt-1">{m.score}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {m.status}
                    </div>
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {m.league}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {completedMatches.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedMatches.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg bg-secondary/30 border border-border"
                  >
                    <div className="font-medium text-sm">{m.teams}</div>
                    {m.score && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {m.score}
                      </div>
                    )}
                    <div className="text-xs text-amber mt-1">{m.status}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {upcomingMatches.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Upcoming</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingMatches.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="flex justify-between items-center py-2 border-b border-border last:border-0"
                  >
                    <span className="text-sm">{m.teams}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.status}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* News Sidebar */}
        <div>
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cricket News</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {news.slice(0, 6).map((n, i) => (
                <div key={i} className="pb-3 border-b border-border last:border-0 last:pb-0">
                  <a
                    href={n.link}
                    className="text-sm font-medium hover:text-amber transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {n.title}
                  </a>
                  <div className="text-xs text-muted-foreground mt-1">
                    {n.published}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
