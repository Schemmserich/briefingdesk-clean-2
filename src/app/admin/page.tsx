"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import {
  deleteTesterAccountCompletely,
  getAllTesterAccounts,
  getAppErrors,
  getUsageEvents,
  updateTesterAccountStatus,
} from "@/lib/db/queries";

type TesterAccount = {
  id: string;
  first_name: string;
  last_name: string;
  status: "pending" | "approved" | "blocked";
  is_admin: boolean;
  created_at: string;
  approved_at?: string | null;
  last_seen_at: string;
};

type UsageEvent = {
  id: string;
  account_id?: string | null;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
};

type AppErrorRow = {
  id: string;
  account_id?: string | null;
  error_message: string;
  context?: Record<string, any>;
  created_at: string;
};

type AdminTab = "testers" | "briefings" | "errors";

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

function getStatusLabel(status: TesterAccount["status"]) {
  if (status === "approved") return "Freigegeben";
  if (status === "blocked") return "Gesperrt";
  return "Freigabe ausstehend";
}

function getUserNameByAccountId(accountId: string | null | undefined, users: TesterAccount[]) {
  const user = users.find((u) => u.id === accountId);
  if (!user) return "Unbekannter Nutzer";
  return `${user.first_name} ${user.last_name}`;
}

function getReadableErrorTitle(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();
  if (normalized.includes("quota")) return "API-Limit erreicht";
  if (normalized.includes("503") || normalized.includes("high demand")) return "KI derzeit ausgelastet";
  if (normalized.includes("delete failed")) return "Löschen fehlgeschlagen";
  if (normalized.includes("briefing")) return "Briefing-Fehler";
  return "Technischer Fehler";
}

function getReadableErrorDescription(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();
  if (normalized.includes("quota")) return "Das Kontingent der angebundenen API wurde erreicht.";
  if (normalized.includes("503") || normalized.includes("high demand")) return "Der Dienst war vorübergehend ausgelastet.";
  if (normalized.includes("delete failed")) return "Der Nutzer oder zugehörige Protokolle konnten nicht vollständig gelöscht werden.";
  if (normalized.includes("briefing")) return "Bei der Erstellung des Briefings ist ein Fehler aufgetreten.";
  return "Es ist ein technischer Fehler aufgetreten.";
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
export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [accounts, setAccounts] = useState<TesterAccount[]>([]);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [appErrors, setAppErrors] = useState<AppErrorRow[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("testers");

  async function loadAllData() {
    try {
      setLoadingAll(true);
      const [accountsResult, usageResult, errorResult] = await Promise.all([
        getAllTesterAccounts(),
        getUsageEvents(50),
        getAppErrors(30),
      ]);

      setAccounts(accountsResult as TesterAccount[]);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        setLoginError("Admin-Passcode ist nicht korrekt oder dieser Nutzer ist nicht berechtigt.");
        return;
      }

      setPasscode("");
      await checkAdminSession();
    } catch {
      setLoginError("Admin-Login konnte nicht durchgeführt werden.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin-logout", { method: "POST" });
    setAuthorized(false);
    setAccounts([]);
    setUsageEvents([]);
    setAppErrors([]);
    setStatusMessage("");
  }

  async function handleStatusChange(
    account: TesterAccount,
    nextStatus: "pending" | "approved" | "blocked"
  ) {
    try {
      setUpdatingId(account.id);
      setStatusMessage("");

      await updateTesterAccountStatus({
        accountId: account.id,
        status: nextStatus,
      });

      await loadAllData();
      setStatusMessage(
        `${account.first_name} ${account.last_name} wurde auf "${getStatusLabel(nextStatus)}" gesetzt.`
      );
    } catch (error) {
      console.error(error);
      setStatusMessage("Der Status konnte nicht aktualisiert werden.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmDeleteAccount(account: TesterAccount) {
    try {
      setDeletingId(account.id);
      setStatusMessage("");

      await deleteTesterAccountCompletely(account.id);
      setDeleteConfirmId(null);
      await loadAllData();

      setStatusMessage(
        `${account.first_name} ${account.last_name} wurde vollständig gelöscht.`
      );
    } catch (error: any) {
      console.error(error);
      setStatusMessage(
        `Der Nutzer konnte nicht gelöscht werden. Technischer Grund: ${error?.message || "Unbekannter Fehler"}`
      );
    } finally {
      setDeletingId(null);
    }
  }

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
                Tester, Briefings und Fehler übersichtlich in Reitern.
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

          {statusMessage && (
            <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-white">
              {statusMessage}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={activeTab === "testers" ? "default" : "outline"}
              className="border-white/10"
              onClick={() => setActiveTab("testers")}
            >
              Tester
            </Button>
            <Button
              variant={activeTab === "briefings" ? "default" : "outline"}
              className="border-white/10"
              onClick={() => setActiveTab("briefings")}
            >
              Letzte Briefings
            </Button>
            <Button
              variant={activeTab === "errors" ? "default" : "outline"}
              className="border-white/10"
              onClick={() => setActiveTab("errors")}
            >
              Letzte Fehler
            </Button>
          </div>

          {loadingAll ? (
            <div className="text-sm text-muted-foreground">Daten werden geladen...</div>
          ) : (
            <>
              {activeTab === "testers" && (
                <div className="grid grid-cols-1 gap-4">
                  {accounts.map((account) => (
                    <Card key={account.id} className="briefing-card">
                      <CardContent className="p-5 space-y-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-2 min-w-0">
                            <div className="text-xl font-semibold text-white">
                              {account.first_name} {account.last_name}
                              {account.is_admin && (
                                <span className="ml-2 text-xs text-primary">Admin</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Registriert: {formatDate(account.created_at)}
                            </div>
                          </div>

                          <div className="text-sm text-white">
                            {getStatusLabel(account.status)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="rounded-xl bg-white/[0.03] p-3">
                            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              Zuletzt aktiv
                            </div>
                            <div className="mt-2 text-sm font-medium text-white">
                              {formatDate(account.last_seen_at)}
                            </div>
                          </div>

                          <div className="rounded-xl bg-white/[0.03] p-3">
                            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              Aktivität
                            </div>
                            <div className="mt-2 text-sm font-medium text-white">
                              {getLastActivityState(account.last_seen_at).label}
                            </div>
                          </div>

                          <div className="rounded-xl bg-white/[0.03] p-3">
                            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              Freigegeben am
                            </div>
                            <div className="mt-2 text-sm font-medium text-white">
                              {formatDate(account.approved_at)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              className="h-10"
                              disabled={updatingId === account.id || deletingId === account.id || account.status === "approved"}
                              onClick={() => handleStatusChange(account, "approved")}
                            >
                              Freigeben
                            </Button>

                            <Button
                              variant="outline"
                              className="h-10 border-white/10"
                              disabled={updatingId === account.id || deletingId === account.id || account.status === "pending"}
                              onClick={() => handleStatusChange(account, "pending")}
                            >
                              Freigabe ausstehend
                            </Button>

                            <Button
                              variant="outline"
                              className="h-10 border-white/10"
                              disabled={updatingId === account.id || deletingId === account.id || account.status === "blocked"}
                              onClick={() => handleStatusChange(account, "blocked")}
                            >
                              Sperren
                            </Button>

                            <Button
                              variant="outline"
                              className="h-10 border-red-400/20 text-red-300 hover:bg-red-500/10"
                              disabled={updatingId === account.id || deletingId === account.id}
                              onClick={() => setDeleteConfirmId(account.id)}
                            >
                              Löschen
                            </Button>
                          </div>

                          {deleteConfirmId === account.id && (
                            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 space-y-3">
                              <div className="text-sm text-white font-medium">
                                Soll {account.first_name} {account.last_name} wirklich vollständig gelöscht werden?
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  disabled={deletingId === account.id}
                                  onClick={() => confirmDeleteAccount(account)}
                                >
                                  {deletingId === account.id ? "Wird gelöscht..." : "Endgültig löschen"}
                                </Button>
                                <Button
                                  variant="outline"
                                  className="border-white/10"
                                  disabled={deletingId === account.id}
                                  onClick={() => setDeleteConfirmId(null)}
                                >
                                  Abbrechen
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {activeTab === "briefings" && (
                <div className="grid grid-cols-1 gap-3">
                  {briefingEvents.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-card/30 p-6 text-muted-foreground">
                      Noch keine Briefing-Generierungen protokolliert.
                    </div>
                  ) : (
                    briefingEvents.map((event) => (
                      <Card key={event.id} className="briefing-card">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-1">
                              <div className="text-base font-semibold text-white">
                                {getUserNameByAccountId(event.account_id, accounts)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Briefing erstellt
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
                              <div className="mt-2 text-white">{event.payload?.briefingType ?? "—"}</div>
                            </div>

                            <div className="rounded-xl bg-white/[0.03] p-3">
                              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Zeitfenster
                              </div>
                              <div className="mt-2 text-white">{event.payload?.timeframe ?? "—"}</div>
                            </div>

                            <div className="rounded-xl bg-white/[0.03] p-3">
                              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Sprache
                              </div>
                              <div className="mt-2 text-white">{event.payload?.language ?? "—"}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {activeTab === "errors" && (
                <div className="grid grid-cols-1 gap-3">
                  {appErrors.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-card/30 p-6 text-muted-foreground">
                      Keine Fehler protokolliert.
                    </div>
                  ) : (
                    appErrors.map((errorRow) => (
                      <Card key={errorRow.id} className="briefing-card border-red-400/15">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-2">
                              <div className="text-base font-semibold text-white">
                                {getUserNameByAccountId(errorRow.account_id, accounts)}
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
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}