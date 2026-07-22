"use client";

import { FormEvent, useEffect, useState } from "react";
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

type TesterStatus =
  | "loading"
  | "unregistered"
  | "pending"
  | "approved"
  | "blocked"
  | "error";

const REQUEST_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function statusFromAccount(account: any): TesterStatus {
  if (account?.status === "approved") return "approved";
  if (account?.status === "blocked") return "blocked";
  return "pending";
}

function loginErrorMessage(error: any) {
  const code = String(error?.code ?? error?.message ?? "");

  if (code.includes("DUPLICATE_TESTER_NAME") || code.includes("multiple")) {
    return "Für diesen Namen existieren mehrere Konten. Bitte wende dich an den Administrator, damit die doppelten Einträge bereinigt werden.";
  }

  if (code.includes("REQUEST_TIMEOUT")) {
    return "Die Anmeldung dauert ungewöhnlich lange. Bitte prüfe deine Internetverbindung und versuche es erneut.";
  }

  if (code.includes("INVALID_TESTER_NAME")) {
    return "Bitte Vorname und Nachname vollständig eingeben.";
  }

  return "Die Anmeldung konnte vorübergehend nicht abgeschlossen werden. Bitte versuche es erneut.";
}

export function TesterAccessGate({ children }: TesterAccessGateProps) {
  const [status, setStatus] = useState<TesterStatus>("loading");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadTesterState() {
    setErrorMessage("");
    setStatus("loading");

    try {
      getOrCreateDeviceId();
      const accountId = getCurrentTesterAccountId();

      if (!accountId) {
        setStatus("unregistered");
        return;
      }

      const existingAccount = await withTimeout(getTesterAccountById(accountId));

      if (!existingAccount) {
        clearCurrentTesterAccountId();
        setStatus("unregistered");
        return;
      }

      setStatus(statusFromAccount(existingAccount));

      void touchTesterAccountLastSeen(accountId).catch((error) => {
        console.warn("Could not update last_seen_at:", error);
      });

      void logUsageEvent({
        accountId,
        eventType: "app_opened",
        payload: { status: existingAccount.status },
      }).catch((error) => {
        console.warn("Could not log app_opened:", error);
      });
    } catch (error: any) {
      console.error("Tester access check failed:", error);
      setErrorMessage(
        error?.message === "REQUEST_TIMEOUT"
          ? "Die Zugangsprüfung hat zu lange gedauert. Bitte prüfe deine Verbindung und versuche es erneut."
          : "Der Zugang konnte vorübergehend nicht geprüft werden. Deine gespeicherte Anmeldung wurde nicht gelöscht."
      );
      setStatus("error");

      const accountId = getCurrentTesterAccountId();
      void logAppError({
        accountId: accountId || undefined,
        errorMessage: error?.message || "Failed to load tester state",
        context: { location: "TesterAccessGate.loadTesterState" },
      }).catch(() => undefined);
    }
  }

  useEffect(() => {
    void loadTesterState();
  }, []);

  async function handleRegisterOrLogin(event?: FormEvent) {
    event?.preventDefault();

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

      const account = await withTimeout(
        registerOrLoginTesterAccount({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        })
      );

      setCurrentTesterAccountId(account.id);
      setStatus(statusFromAccount(account));

      void logUsageEvent({
        accountId: account.id,
        eventType: "tester_registered_or_signed_in",
        payload: {
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        },
      }).catch((error) => {
        console.warn("Could not log sign-in event:", error);
      });
    } catch (error: any) {
      console.error("Tester sign-in failed:", error);
      setErrorMessage(loginErrorMessage(error));

      void logAppError({
        accountId: getCurrentTesterAccountId() || undefined,
        errorMessage: error?.message || "Failed to register or sign in tester",
        context: { location: "TesterAccessGate.handleRegisterOrLogin" },
      }).catch(() => undefined);
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <AccessShell>
        <div className="text-center space-y-3">
          <div className="text-xl font-semibold text-white">News Briefing</div>
          <div className="text-sm text-muted-foreground">Zugang wird geprüft…</div>
        </div>
      </AccessShell>
    );
  }

  if (status === "error") {
    return (
      <AccessShell>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/40 p-6 sm:p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Zugang derzeit nicht prüfbar</h1>
          <p className="text-sm text-muted-foreground leading-6">{errorMessage}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => void loadTesterState()}>Erneut prüfen</Button>
            <Button
              variant="outline"
              className="border-white/10"
              onClick={() => {
                clearCurrentTesterAccountId();
                setStatus("unregistered");
                setErrorMessage("");
              }}
            >
              Neu anmelden
            </Button>
          </div>
        </div>
      </AccessShell>
    );
  }

  if (status === "unregistered") {
    return (
      <AccessShell>
        <form
          onSubmit={handleRegisterOrLogin}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-card/40 p-6 sm:p-8 space-y-5"
        >
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-white">Anmelden oder registrieren</h1>
            <p className="text-sm text-muted-foreground leading-6">
              Bitte gib Vorname und Nachname ein. Mit denselben Daten kannst du dich auf mehreren Geräten als derselbe Nutzer anmelden.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="tester-first-name" className="text-sm text-white">Vorname</label>
              <input
                id="tester-first-name"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-white outline-none focus:border-primary"
                placeholder="Vorname"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="tester-last-name" className="text-sm text-white">Nachname</label>
              <input
                id="tester-last-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-white outline-none focus:border-primary"
                placeholder="Nachname"
              />
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            <Button className="w-full h-12" type="submit" disabled={submitting}>
              {submitting ? "Wird verarbeitet…" : "Weiter"}
            </Button>
          </div>
        </form>
      </AccessShell>
    );
  }

  if (status === "pending") {
    return (
      <AccessShell>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/40 p-6 sm:p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Freischaltung ausstehend</h1>
          <p className="text-sm text-muted-foreground leading-6">
            Dein Zugang ist registriert, aber noch nicht freigegeben.
          </p>
          <Button variant="outline" className="border-white/10" onClick={() => void loadTesterState()}>
            Status erneut prüfen
          </Button>
        </div>
      </AccessShell>
    );
  }

  if (status === "blocked") {
    return (
      <AccessShell>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/40 p-6 sm:p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Zugang gesperrt</h1>
          <p className="text-sm text-muted-foreground leading-6">
            Dieser Zugang ist derzeit nicht freigeschaltet.
          </p>
        </div>
      </AccessShell>
    );
  }

  return <>{children}</>;
}

function AccessShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-10 sm:px-4 lg:px-6">
      <div className="min-h-[60vh] flex items-center justify-center">{children}</div>
    </main>
  );
}
