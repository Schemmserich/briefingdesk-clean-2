"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAllTestUsers, updateTestUserStatus } from "@/lib/db/queries";

type TestUser = {
  id: string;
  device_id: string;
  first_name: string;
  last_name: string;
  status: "pending" | "approved" | "blocked";
  created_at: string;
  approved_at?: string | null;
  last_seen_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [users, setUsers] = useState<TestUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      const result = await getAllTestUsers();
      setUsers(result as TestUser[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function checkAdminSession() {
    try {
      const response = await fetch("/api/admin-session", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (result?.authorized) {
        setAuthorized(true);
        await loadUsers();
      } else {
        setAuthorized(false);
      }
    } catch (error) {
      console.error(error);
      setAuthorized(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkAdminSession();
  }, []);

  async function handleLogin() {
    try {
      setLoginError("");

      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        setLoginError("Admin-Passcode ist nicht korrekt.");
        return;
      }

      setPasscode("");
      await checkAdminSession();
    } catch {
      setLoginError("Admin-Login konnte nicht durchgeführt werden.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin-logout", {
      method: "POST",
    });

    setAuthorized(false);
    setUsers([]);
  }

  async function handleStatusChange(
    deviceId: string,
    status: "pending" | "approved" | "blocked"
  ) {
    try {
      await updateTestUserStatus({ deviceId, status });
      await loadUsers();
    } catch (error) {
      console.error(error);
      alert("Status konnte nicht aktualisiert werden.");
    }
  }

  if (checking) {
    return (
      <main className="mx-auto w-full max-w-7xl px-3 py-10 sm:px-4 lg:px-6">
        <div className="min-h-[60vh] flex items-center justify-center text-white">
          Adminbereich wird geladen...
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="mx-auto w-full max-w-7xl px-3 py-10 sm:px-4 lg:px-6">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/40 p-6 sm:p-8 space-y-5">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-white">Admin Login</h1>
              <p className="text-sm text-muted-foreground leading-6">
                Bitte Admin-Passcode eingeben.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white">Passcode</label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-white outline-none focus:border-primary"
                  placeholder="Passcode"
                />
              </div>

              {loginError && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {loginError}
                </div>
              )}

              <Button className="w-full h-12" onClick={handleLogin}>
                Einloggen
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4 lg:px-6 lg:py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Tester verwalten und Freigaben steuern.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="border-white/10" onClick={loadUsers}>
              Aktualisieren
            </Button>
            <Button variant="outline" className="border-white/10" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {loadingUsers ? (
          <div className="text-sm text-muted-foreground">Tester werden geladen...</div>
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-card/30 p-6 text-muted-foreground">
            Noch keine Tester registriert.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {users.map((user) => (
              <Card key={user.id} className="briefing-card">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-white">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground break-all">
                      Device ID: {user.device_id}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Status</div>
                      <div className="text-white font-medium">{user.status}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Registriert</div>
                      <div className="text-white font-medium">{formatDate(user.created_at)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Zuletzt aktiv</div>
                      <div className="text-white font-medium">{formatDate(user.last_seen_at)}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      className="h-9"
                      onClick={() => handleStatusChange(user.device_id, "approved")}
                    >
                      Freigeben
                    </Button>

                    <Button
                      variant="outline"
                      className="h-9 border-white/10"
                      onClick={() => handleStatusChange(user.device_id, "pending")}
                    >
                      Auf pending setzen
                    </Button>

                    <Button
                      variant="outline"
                      className="h-9 border-white/10"
                      onClick={() => handleStatusChange(user.device_id, "blocked")}
                    >
                      Sperren
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}