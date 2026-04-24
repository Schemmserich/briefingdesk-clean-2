"use client";

import { useEffect, useMemo, useState } from "react";
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

function getStatusLabel(status: TestUser["status"]) {
  if (status === "approved") return "Freigegeben";
  if (status === "blocked") return "Gesperrt";
  return "Freigabe ausstehend";
}

function getStatusBadgeClass(status: TestUser["status"]) {
  if (status === "approved") {
    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-300";
  }
  if (status === "blocked") {
    return "border-red-400/30 bg-red-500/15 text-red-300";
  }
  return "border-amber-400/30 bg-amber-500/15 text-amber-300";
}

function getStatusCardClass(status: TestUser["status"]) {
  if (status === "approved") {
    return "border-emerald-400/20";
  }
  if (status === "blocked") {
    return "border-red-400/20";
  }
  return "border-amber-400/20";
}

function getLastActivityState(lastSeenAt?: string | null) {
  if (!lastSeenAt) {
    return {
      label: "Keine Aktivität",
      className: "text-muted-foreground",
    };
  }

  const lastSeen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(lastSeen)) {
    return {
      label: "Unbekannt",
      className: "text-muted-foreground",
    };
  }

  const diffMinutes = (Date.now() - lastSeen) / 1000 / 60;

  if (diffMinutes <= 15) {
    return {
      label: "Aktiv",
      className: "text-emerald-300",
    };
  }

  if (diffMinutes <= 60 * 24) {
    return {
      label: "Kürzlich aktiv",
      className: "text-amber-300",
    };
  }

  return {
    label: "Inaktiv",
    className: "text-red-300",
  };
}

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [users, setUsers] = useState<TestUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [updatingDeviceId, setUpdatingDeviceId] = useState<string | null>(null);

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      const result = await getAllTestUsers();
      setUsers(result as TestUser[]);
    } catch (error) {
      console.error(error);
      setStatusMessage("Tester konnten nicht geladen werden.");
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
      setStatusMessage("Admin-Session konnte nicht geprüft werden.");
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
    setStatusMessage("");
  }

  async function handleStatusChange(
    user: TestUser,
    nextStatus: "pending" | "approved" | "blocked"
  ) {
    try {
      setUpdatingDeviceId(user.device_id);
      setStatusMessage("");

      if (user.status === nextStatus) {
        setStatusMessage(
          `${user.first_name} ${user.last_name} ist bereits auf "${getStatusLabel(nextStatus)}" gesetzt.`
        );
        return;
      }

      await updateTestUserStatus({
        deviceId: user.device_id,
        status: nextStatus,
      });

      await loadUsers();

      setStatusMessage(
        `${user.first_name} ${user.last_name} wurde auf "${getStatusLabel(nextStatus)}" gesetzt.`
      );
    } catch (error) {
      console.error(error);
      setStatusMessage("Der Status konnte nicht aktualisiert werden.");
    } finally {
      setUpdatingDeviceId(null);
    }
  }

  const stats = useMemo(() => {
    const approved = users.filter((u) => u.status === "approved").length;
    const pending = users.filter((u) => u.status === "pending").length;
    const blocked = users.filter((u) => u.status === "blocked").length;

    return { approved, pending, blocked, total: users.length };
  }, [users]);

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
              Tester verwalten und Freigaben eindeutig steuern.
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Gesamt
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-300">
              Freigegeben
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{stats.approved}</div>
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-amber-300">
              Ausstehend
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{stats.pending}</div>
          </div>

          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-red-300">
              Gesperrt
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{stats.blocked}</div>
          </div>
        </div>

        {statusMessage && (
          <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-white">
            {statusMessage}
          </div>
        )}

        {loadingUsers ? (
          <div className="text-sm text-muted-foreground">Tester werden geladen...</div>
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-card/30 p-6 text-muted-foreground">
            Noch keine Tester registriert.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {users.map((user) => {
              const isUpdating = updatingDeviceId === user.device_id;
              const activityState = getLastActivityState(user.last_seen_at);

              return (
                <Card
                  key={user.id}
                  className={`briefing-card ${getStatusCardClass(user.status)}`}
                >
                  <CardContent className="p-5 space-y-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-2 min-w-0">
                        <div className="text-xl font-semibold text-white">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground break-all">
                          Device ID: {user.device_id}
                        </div>
                      </div>

                      <div
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusBadgeClass(
                          user.status
                        )}`}
                      >
                        {getStatusLabel(user.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Registriert
                        </div>
                        <div className="mt-2 text-sm font-medium text-white">
                          {formatDate(user.created_at)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Zuletzt aktiv
                        </div>
                        <div className="mt-2 text-sm font-medium text-white">
                          {formatDate(user.last_seen_at)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Aktivität
                        </div>
                        <div className={`mt-2 text-sm font-medium ${activityState.className}`}>
                          {activityState.label}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Freigegeben am
                        </div>
                        <div className="mt-2 text-sm font-medium text-white">
                          {formatDate(user.approved_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        className="h-10"
                        disabled={isUpdating || user.status === "approved"}
                        onClick={() => handleStatusChange(user, "approved")}
                      >
                        {isUpdating && updatingDeviceId === user.device_id
                          ? "Wird aktualisiert..."
                          : "Freigeben"}
                      </Button>

                      <Button
                        variant="outline"
                        className="h-10 border-white/10"
                        disabled={isUpdating || user.status === "pending"}
                        onClick={() => handleStatusChange(user, "pending")}
                      >
                        Freigabe ausstehend
                      </Button>

                      <Button
                        variant="outline"
                        className="h-10 border-white/10"
                        disabled={isUpdating || user.status === "blocked"}
                        onClick={() => handleStatusChange(user, "blocked")}
                      >
                        Sperren
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}