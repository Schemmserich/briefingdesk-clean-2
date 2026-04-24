"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getOrCreateDeviceId } from "@/lib/testerDevice";
import {
  getTestUserByDeviceId,
  logAppError,
  logUsageEvent,
  registerTestUser,
  touchTestUserLastSeen,
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
    try {
      setErrorMessage("");
      const deviceId = getOrCreateDeviceId();

      const existingUser = await getTestUserByDeviceId(deviceId);

      if (!existingUser) {
        setStatus("unregistered");
        return;
      }

      await touchTestUserLastSeen(deviceId);

      await logUsageEvent({
        deviceId,
        eventType: "app_opened",
        payload: {
          status: existingUser.status,
        },
      });

      if (existingUser.status === "approved") {
        setStatus("approved");
        return;
      }

      if (existingUser.status === "blocked") {
        setStatus("blocked");
        return;
      }

      setStatus("pending");
    } catch (error: any) {
      try {
        await logAppError({
          deviceId: typeof window !== "undefined" ? getOrCreateDeviceId() : undefined,
          errorMessage: error?.message || "Failed to load tester state",
          context: {
            location: "TesterAccessGate.loadTesterState",
          },
        });
      } catch {}

      setErrorMessage("Die Testfreigabe konnte gerade nicht geladen werden.");
      setStatus("unregistered");
    }
  }

  useEffect(() => {
    loadTesterState();
  }, []);

  async function handleRegister() {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setErrorMessage("Bitte Vorname und Nachname vollständig eingeben.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const deviceId = getOrCreateDeviceId();

      await registerTestUser({
        deviceId,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      });

      await logUsageEvent({
        deviceId,
        eventType: "tester_registered",
        payload: {
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        },
      });

      setStatus("pending");
    } catch (error: any) {
      try {
        await logAppError({
          deviceId: typeof window !== "undefined" ? getOrCreateDeviceId() : undefined,
          errorMessage: error?.message || "Failed to register tester",
          context: {
            location: "TesterAccessGate.handleRegister",
          },
        });
      } catch {}

      setErrorMessage("Die Registrierung konnte gerade nicht gespeichert werden.");
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
            <div className="text-sm text-muted-foreground">
              Testzugang wird geprüft...
            </div>
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
              <h1 className="text-2xl font-bold text-white">Testzugang anfragen</h1>
              <p className="text-sm text-muted-foreground leading-6">
                Bitte registriere dich mit Vorname und Nachname. Danach wird dein Zugang manuell freigegeben.
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
                onClick={handleRegister}
                disabled={submitting}
              >
                {submitting ? "Wird registriert..." : "Registrieren"}
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
              Deine Registrierung wurde gespeichert. Der Zugang wird manuell freigegeben. Bitte versuche es später erneut.
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
              Dieser Testzugang ist derzeit nicht freigeschaltet. Bitte wende dich direkt an den Administrator.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}