"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users } from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  primary_role: string;
  skill_level: string;
  is_admin: number;
  created_at: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.is_admin !== 1) {
      router.replace("/dashboard");
      return;
    }
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user || user.is_admin !== 1) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">Manage users and platform</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-amber mx-auto mb-2" />
            <div className="text-3xl font-bold">{users.length}</div>
            <div className="text-xs text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Shield className="w-6 h-6 text-amber mx-auto mb-2" />
            <div className="text-3xl font-bold">
              {users.filter((u) => u.is_admin === 1).length}
            </div>
            <div className="text-xs text-muted-foreground">Admins</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">
              Loading...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-medium">ID</th>
                    <th className="pb-2 font-medium">Username</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Skill</th>
                    <th className="pb-2 font-medium">Joined</th>
                    <th className="pb-2 font-medium">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="py-2">{u.id}</td>
                      <td className="py-2 font-medium">{u.username}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {u.primary_role}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {u.skill_level}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-2">
                        {u.is_admin === 1 ? (
                          <Badge className="bg-amber/20 text-amber border-amber/30 text-[10px]">
                            Admin
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
