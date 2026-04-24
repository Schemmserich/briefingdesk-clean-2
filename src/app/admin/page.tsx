"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import {
  deleteTestUserCompletely,
  getAllTestUsers,
  getAppErrors,
  getUsageEvents,
  updateTestUserStatus,
} from "@/lib/db/queries";

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

type UsageEvent = {
  id: string;
  device_id: string;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
};

type AppErrorRow = {
  id: string;
  device_id?: string | null;
  error_message: string;
  context?: Record<string, any>;
  created_at: string;
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
  if (status === "approved") return "border-emerald-400/20";
  if (status === "blocked") return "border-red-400/20";
  return "border-amber-400/20";
}

function getLastActivityState(lastSeenAt?: string | null) {
  if (!lastSeenAt) {
    return { label: "Keine Aktivität", className: "text-muted-foreground" };
  }

  const lastSeen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(lastSeen)) {
    return { label: "Unbekannt", className: "text-muted-foreground" };
  }

  const diffMinutes = (Date.now() - lastSeen) / 1000 / 60;

  if (diffMinutes <= 15) {
    return { label: "Aktiv", className: "text-emerald-300" };
  }

  if (diffMinutes <= 60 * 24) {
    return { label: "Kürzlich aktiv", className: "text-amber-300" };
  }

  return { label: "Inaktiv", className: "text-red-300" };
}

function getUserNameByDeviceId(deviceId: string, users: TestUser[]) {
  const user = users.find((u) => u.device_id === deviceId);
  if (!user) return "Unbekannter Tester";
  return `${user.first_name} ${user.last_name}`;
}

function getEventLabel(eventType: string) {
  if (eventType === "briefing_generated") return "Briefing erstellt";
  if (eventType === "app_opened") return "App geöffnet";
  if (eventType === "tester_registered") return "Tester registriert";
  return eventType;
}

function getReadableErrorTitle(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();

  if (normalized.includes("duplicate key value violates unique constraint")) {
    return "Doppelte Registrierung";
  }

  if (normalized.includes("invalid passcode")) {
    return "Ungültiger Admin-Passcode";
  }

  if (normalized.includes("failed to register tester")) {
    return "Registrierung fehlgeschlagen";
  }

  if (normalized.includes("failed to load tester state")) {
    return "Testerstatus konnte nicht geladen werden";
  }

  if (normalized.includes("briefing generation failed")) {
    return "Briefing-Erstellung fehlgeschlagen";
  }

  if (normalized.includes("unexpected briefing generation error")) {
    return "Unerwarteter Fehler bei der Briefing-Erstellung";
  }

  if (normalized.includes("quota")) {
    return "API-Limit erreicht";
  }

  if (normalized.includes("503") || normalized.includes("high demand")) {
    return "KI derzeit ausgelastet";
  }

  return "Technischer Fehler";
}

function getReadableErrorDescription(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();

  if (normalized.includes("duplicate key value violates unique constraint")) {
    return "Dieses Gerät war bereits registriert. Der vorhandene Testzugang wurde erneut erkannt.";
  }

  if (normalized.includes("invalid passcode")) {
    return "Für den Adminbereich wurde ein falscher Passcode eingegeben.";
  }

  if (normalized.includes("failed to register tester")) {
    return "Die Registrierung des Testers konnte nicht gespeichert werden.";
  }

  if (normalized.includes("failed to load tester state")) {
    return "Der Freigabestatus des Testers konnte nicht geladen werden.";
  }

  if (normalized.includes("briefing generation failed")) {
    return "Das Briefing konnte nicht erfolgreich erzeugt werden.";
  }

  if (normalized.includes("unexpected briefing generation error")) {
    return "Bei der Briefing-Erstellung ist ein unerwarteter technischer Fehler aufgetreten.";
  }

  if (normalized.includes("quota")) {
    return "Das Kontingent der angebundenen KI/API wurde erreicht.";
  }

  if (normalized.includes("503") || normalized.includes("high demand")) {
    return "Die KI oder der Dienst war zum Zeitpunkt der Anfrage vorübergehend überlastet.";
  }

  return "Es ist ein technischer Fehler aufgetreten. Der Originaltext steht unten zur genaueren Prüfung.";
}

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [users, setUsers] = useState<TestUser[]>([]);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [appErrors, setAppErrors] = useState<AppErrorRow[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
const [updatingDeviceId, setUpdatingDeviceId] = useState<string | null>(null);
const [deleteConfirmDeviceId, setDeleteConfirmDeviceId] = useState<string | null>(null);
const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);

  async function loadAllData() {
    try {
      setLoadingAll(true);

      const [usersResult, usageResult, errorResult] = await Promise.all([
        getAllTestUsers(),
        getUsageEvents(50),
        getAppErrors(30),
      ]);

      setUsers(usersResult as TestUser[]);
      setUsageEvents(usageResult as UsageEvent[]);
      setAppErrors(errorResult as AppErrorRow[]);
    } catch (error) {
      console.error(error);
      setStatusMessage("Daten konnten nicht vollständig geladen werden.");
    } finally {
      setLoadingAll(false);
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
        await loadAllData();
      } else {
        setAuthorized(false);

        if (result?.isEligibleAdmin === false) {
          setStatusMessage("Dieser Nutzer ist nicht für den Adminbereich berechtigt.");
        }
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
        if (response.status === 403) {
          setLoginError("Dieser Nutzer ist nicht für den Adminbereich berechtigt.");
        } else {
          setLoginError("Admin-Passcode ist nicht korrekt.");
        }
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
    setUsageEvents([]);
    setAppErrors([]);
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

      await loadAllData();

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

function startDeleteUser(deviceId: string) {
  setDeleteConfirmDeviceId(deviceId);
  setStatusMessage("");
}

function cancelDeleteUser() {
  setDeleteConfirmDeviceId(null);
}

async function confirmDeleteUser(user: TestUser) {
  try {
    setDeletingDeviceId(user.device_id);
    setStatusMessage("");

    await deleteTestUserCompletely(user.device_id);
    setDeleteConfirmDeviceId(null);
    await loadAllData();

    setStatusMessage(
      `${user.first_name} ${user.last_name} wurde vollständig gelöscht. Eine erneute Registrierung ist möglich.`
    );
  } catch (error: any) {
    console.error(error);
    setStatusMessage(
      `Der Nutzer konnte nicht gelöscht werden. Technischer Grund: ${error?.message || "Unbekannter Fehler"}`
    );
  } finally {
    setDeletingDeviceId(null);
  }
}  try {
    setDeletingDeviceId(user.device_id);
    setStatusMessage("");

    await deleteTestUserCompletely(user.device_id);
    setDeleteConfirmDeviceId(null);
    await loadAllData();

    setStatusMessage(
      `${user.first_name} ${user.last_name} wurde vollständig gelöscht. Eine erneute Registrierung ist möglich.`
    );
  } catch (error) {
    console.error(error);
    setStatusMessage("Der Nutzer konnte nicht gelöscht werden.");
  } finally {
    setDeletingDeviceId(null);
  }
}



  const stats = useMemo(() => {
    const approved = users.filter((u) => u.status === "approved").length;
    const pending = users.filter((u) => u.status === "pending").length;
    const blocked = users.filter((u) => u.status === "blocked").length;
    const briefingCount = usageEvents.filter((e) => e.event_type === "briefing_generated").length;

    return {
      approved,
      pending,
      blocked,
      total: users.length,
      briefingCount,
      errorCount: appErrors.length,
    };
  }, [users, usageEvents, appErrors]);

  const briefingEvents = useMemo(
    () => usageEvents.filter((e) => e.event_type === "briefing_generated"),
    [usageEvents]
  );

  if (checking) {
    return (
      <>
        <Navigation />
        <main className="mx-auto w-full max-w-7xl px-3 py-10 sm:px-4 lg:px-6">
          <div className="min-h-[60vh] flex items-center justify-center text-white">
            Adminbereich wird geladen...
          </div>
        </main>
      </>
    );
  }

  if (!authorized) {
    return (
      <>
        <Navigation />
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

                <div className="flex gap-2">
                  <Button className="flex-1 h-12" onClick={handleLogin}>
                    Einloggen
                  </Button>
                  <Button asChild variant="outline" className="h-12 border-white/10">
                    <Link href="/">Zur App</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4 lg:px-6 lg:py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Tester, Briefings und Fehler zentral überwachen.
              </p>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline" className="border-white/10">
                <Link href="/">Zur App</Link>
              </Button>
              <Button variant="outline" className="border-white/10" onClick={loadAllData}>
                Aktualisieren
              </Button>
              <Button variant="outline" className="border-white/10" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Tester gesamt
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

            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-blue-300">
                Briefings
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{stats.briefingCount}</div>
            </div>

            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-rose-300">
                Fehler
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{stats.errorCount}</div>
            </div>
          </div>

          {statusMessage && (
            <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-white">
              {statusMessage}
            </div>
          )}

          {loadingAll ? (
            <div className="text-sm text-muted-foreground">Daten werden geladen...</div>
          ) : (
            <>
              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-white">Tester</h2>
                  <p className="text-sm text-muted-foreground">
                    Freigabe und Aktivität aller registrierten Tester.
                  </p>
                </div>

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

                          <div className="space-y-3">
  <div className="flex gap-2 flex-wrap">
    <Button
      className="h-10"
      disabled={isUpdating || deletingDeviceId === user.device_id || user.status === "approved"}
      onClick={() => handleStatusChange(user, "approved")}
    >
      {isUpdating ? "Wird aktualisiert..." : "Freigeben"}
    </Button>

    <Button
      variant="outline"
      className="h-10 border-white/10"
      disabled={isUpdating || deletingDeviceId === user.device_id || user.status === "pending"}
      onClick={() => handleStatusChange(user, "pending")}
    >
      Freigabe ausstehend
    </Button>

    <Button
      variant="outline"
      className="h-10 border-white/10"
      disabled={isUpdating || deletingDeviceId === user.device_id || user.status === "blocked"}
      onClick={() => handleStatusChange(user, "blocked")}
    >
      Sperren
    </Button>

    <Button
      variant="outline"
      className="h-10 border-red-400/20 text-red-300 hover:bg-red-500/10"
      disabled={isUpdating || deletingDeviceId === user.device_id}
      onClick={() => startDeleteUser(user.device_id)}
    >
      Löschen
    </Button>
  </div>

  {deleteConfirmDeviceId === user.device_id && (
    <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 space-y-3">
      <div className="text-sm text-white font-medium">
        Soll {user.first_name} {user.last_name} wirklich vollständig gelöscht werden?
      </div>
      <div className="text-xs text-muted-foreground leading-5">
        Dabei werden auch die zugehörigen Briefing-Logs und Fehlerprotokolle dieses Geräts entfernt.
        Der Nutzer kann sich später erneut registrieren.
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          className="h-10 bg-red-600 hover:bg-red-700 text-white"
          disabled={deletingDeviceId === user.device_id}
          onClick={() => confirmDeleteUser(user)}
        >
          {deletingDeviceId === user.device_id ? "Wird gelöscht..." : "Endgültig löschen"}
        </Button>

        <Button
          variant="outline"
          className="h-10 border-white/10"
          disabled={deletingDeviceId === user.device_id}
          onClick={cancelDeleteUser}
        >
          Abbrechen
        </Button>
      </div>
    </div>
  )}
</div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-white">Letzte Briefings</h2>
                  <p className="text-sm text-muted-foreground">
                    Wer wann welches Briefing generiert hat.
                  </p>
                </div>

                {briefingEvents.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-card/30 p-6 text-muted-foreground">
                    Noch keine Briefing-Generierungen protokolliert.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {briefingEvents.map((event) => (
                      <Card key={event.id} className="briefing-card">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-1">
                              <div className="text-base font-semibold text-white">
                                {getUserNameByDeviceId(event.device_id, users)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {getEventLabel(event.event_type)}
                              </div>
                            </div>

                            <div className="text-sm text-muted-foreground">
                              {formatDate(event.created_at)}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                            <div className="rounded-xl bg-white/[0.03] p-3">
                              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Ausgabeformat
                              </div>
                              <div className="mt-2 text-white">
                                {event.payload?.briefingType ?? "—"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-white/[0.03] p-3">
                              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Zeitfenster
                              </div>
                              <div className="mt-2 text-white">
                                {event.payload?.timeframe ?? "—"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-white/[0.03] p-3">
                              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Sprache
                              </div>
                              <div className="mt-2 text-white">
                                {event.payload?.language ?? "—"}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl bg-white/[0.03] p-3">
                              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Kategorien
                              </div>
                              <div className="mt-2 text-white">
                                {Array.isArray(event.payload?.categories)
                                  ? event.payload.categories.join(", ")
                                  : "—"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-white/[0.03] p-3">
                              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Regionen
                              </div>
                              <div className="mt-2 text-white">
                                {Array.isArray(event.payload?.regions)
                                  ? event.payload.regions.join(", ")
                                  : "—"}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl bg-white/[0.03] p-3 text-sm">
                            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              Überschrift
                            </div>
                            <div className="mt-2 text-white">
                              {event.payload?.headline || "—"}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-white">Letzte Fehler</h2>
                  <p className="text-sm text-muted-foreground">
                    Fehlermeldungen und technische Probleme der Tester.
                  </p>
                </div>

                {appErrors.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-card/30 p-6 text-muted-foreground">
                    Keine Fehler protokolliert.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                  {appErrors.map((errorRow) => (
  <Card key={errorRow.id} className="briefing-card border-red-400/15">
    <CardContent className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="text-base font-semibold text-white">
            {errorRow.device_id
              ? getUserNameByDeviceId(errorRow.device_id, users)
              : "Unbekannter Tester"}
          </div>

          <div className="inline-flex items-center rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">
            {getReadableErrorTitle(errorRow.error_message)}
          </div>

          <div className="text-sm text-white/90 leading-6">
            {getReadableErrorDescription(errorRow.error_message)}
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {formatDate(errorRow.created_at)}
        </div>
      </div>

      <div className="rounded-xl bg-white/[0.03] p-3 text-sm">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Technischer Originaltext
        </div>
        <div className="mt-2 text-red-300 break-words">
          {errorRow.error_message}
        </div>
      </div>

      <div className="rounded-xl bg-white/[0.03] p-3 text-sm">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Kontext
        </div>
        <pre className="mt-2 whitespace-pre-wrap break-words text-white text-xs">
          {JSON.stringify(errorRow.context ?? {}, null, 2)}
        </pre>
      </div>
    </CardContent>
  </Card>
))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}