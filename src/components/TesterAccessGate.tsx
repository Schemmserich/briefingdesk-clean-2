"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  clearCurrentTesterAccountId,
  getCurrentTesterAccountId,
  getOrCreateDeviceId,
  setCurrentTesterAccountId,
} from "@/lib/testerIdentity";
import {
  getTesterAccountById,
  logAppError,
  logUsageEvent,
  registerOrLoginTesterAccount,
  touchTesterAccountLastSeen,
} from "@/lib/db/queries";

type TesterAccessGateProps = {
  children: React.ReactNode;
};

type TesterStatus = "loading" | "unregistered" | "pending" | "approved" | "blocked";

export function TesterAccessGate({ children }: TesterAccessGateProps) {
  const [status, setStatus] = useState<TesterStatus>("loading");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadTesterState() {
    setErrorMessage("");

    try {
      getOrCreateDeviceId();

      const accountId = getCurrentTesterAccountId();

      if (!accountId) {
        setStatus("unregistered");
        return;
      }

      const existingAccount = await getTesterAccountById(accountId);

      if (!existingAccount) {
        clearCurrentTesterAccountId();
        setStatus("unregistered");
        return;
      }

      try {
        await touchTesterAccountLastSeen(accountId);
      } catch (error) {
        console.error("touchTesterAccountLastSeen failed:", error);
      }

      try {
        await logUsageEvent({
          accountId,
          eventType: "app_opened",
          payload: {
            status: existingAccount.status,
          },
        });
      } catch (error) {
        console.error("logUsageEvent failed:", error);
      }

      if (existingAccount.status === "approved") {
        setStatus("approved");
        return;
      }

      if (existingAccount.status === "blocked") {
        setStatus("blocked");
        return;
      }

      setStatus("pending");
    } catch (error: any) {
      console.error("loadTesterState failed:", error);

      try {
        await logAppError({
          accountId: getCurrentTesterAccountId() || undefined,
          errorMessage: error?.message || "Failed to load tester state",
          context: { location: "TesterAccessGate.loadTesterState" },
        });
      } catch (logError) {
        console.error("logAppError failed:", logError);
      }

      clearCurrentTesterAccountId();
      setStatus("unregistered");
    }
  }

  useEffect(() => {
    loadTesterState();
  }, []);

  async function handleRegisterOrLogin() {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setErrorMessage("Bitte Vorname und Nachname vollständig eingeben.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      getOrCreateDeviceId();

      const account = await registerOrLoginTesterAccount({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      });

      setCurrentTesterAccountId(account.id);

      try {
        await logUsageEvent({
          accountId: account.id,
          eventType: "tester_registered",
          payload: {
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
          },
        });
      } catch (error) {
        console.error("logUsageEvent failed:", error);
      }

      if (account.status === "approved") {
        setStatus("approved");
      } else if (account.status === "blocked") {
        setStatus("blocked");
      } else {
        setStatus("pending");
      }
    } catch (error: any) {
      console.error("handleRegisterOrLogin failed:", error);

      try {
        await logAppError({
          accountId: getCurrentTesterAccountId() || undefined,
          errorMessage: error?.message || "Failed to register tester",
          context: { location: "TesterAccessGate.handleRegisterOrLogin" },
        });
      } catch (logError) {
        console.error("logAppError failed:", logError);
      }

      setErrorMessage("Anmeldung oder Registrierung konnte nicht gespeichert werden.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="mx-auto w-full max-w-7xl px-3 py-10 sm:px-4 lg:px-6">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-xl font-semibold text-white">News Briefing</div>
            <div className="text-sm text-muted-foreground">Zugang wird geprüft...</div>
          </div>
        </div>
      </main>
    );
  }

  if (status === "unregistered") {
    return (
      <main className="mx-auto w-full max-w-7xl px-3 py-10 sm:px-4 lg:px-6">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/40 p-6 sm:p-8 space-y-5">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-white">Anmelden oder registrieren</h1>
              <p className="text-sm text-muted-foreground leading-6">
                Bitte gib Vorname und Nachname ein. Mit denselben Daten kannst du dich auf mehreren Geräten als derselbe Nutzer anmelden.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white">Vorname</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-white outline-none focus:border-primary"
                  placeholder="Vorname"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white">Nachname</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-white outline-none focus:border-primary"
                  placeholder="Nachname"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {errorMessage}
                </div>
              )}

              <Button
                className="w-full h-12"
                onClick={handleRegisterOrLogin}
                disabled={submitting}
              >
                {submitting ? "Wird verarbeitet..." : "Weiter"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (status === "pending") {
    return (
      <main className="mx-auto w-full max-w-7xl px-3 py-10 sm:px-4 lg:px-6">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/40 p-6 sm:p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-white">Freischaltung ausstehend</h1>
            <p className="text-sm text-muted-foreground leading-6">
              Dein Zugang ist registriert, aber noch nicht freigegeben.
            </p>
            <Button variant="outline" className="border-white/10" onClick={loadTesterState}>
              Status erneut prüfen
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (status === "blocked") {
    return (
      <main className="mx-auto w-full max-w-7xl px-3 py-10 sm:px-4 lg:px-6">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/40 p-6 sm:p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-white">Zugang gesperrt</h1>
            <p className="text-sm text-muted-foreground leading-6">
              Dieser Zugang ist derzeit nicht freigeschaltet.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}