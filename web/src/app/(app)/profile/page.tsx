"use client";

import { useAuth } from "@/store/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Dumbbell, MessageCircle, User, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-1">Your cricket training dashboard</p>
      </div>

      {/* User Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-amber/20 flex items-center justify-center">
              <User className="w-8 h-8 text-amber" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.username}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-amber/20 text-amber border-amber/30">
                  {user.primary_role}
                </Badge>
                <Badge variant="outline">{user.skill_level}</Badge>
              </div>
              {user.created_at && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber">--</div>
            <div className="text-xs text-muted-foreground mt-1">Total Sessions</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">--</div>
            <div className="text-xs text-muted-foreground mt-1">Avg Stance Score</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">--</div>
            <div className="text-xs text-muted-foreground mt-1">Drills Done</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { href: "/biometric", icon: Activity, label: "Stance Checkup", desc: "Analyze your batting stance" },
            { href: "/drills", icon: Dumbbell, label: "Footwork Practice", desc: "Start a training drill" },
            { href: "/mentor", icon: MessageCircle, label: "Chat with Mentor", desc: "Get coaching advice" },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border hover:border-amber/40 transition-colors">
                <action.icon className="w-5 h-5 text-amber" />
                <div>
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Recent Activity Placeholder */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            No activity yet. Start a session to see your progress here!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
