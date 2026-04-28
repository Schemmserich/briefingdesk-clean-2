"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefingDisplay } from "@/components/BriefingDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  deleteSavedBriefing,
  getSavedBriefingsForAccount,
  renameSavedBriefing,
  SavedBriefingEntry,
} from "@/lib/briefingArchive";
import { exportBriefingPdf } from "@/lib/exportBriefingPdf";
import { getCurrentTesterAccountId } from "@/lib/testerIdentity";
import { BriefingResult, Language } from "@/lib/types";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";

function formatDate(value?: string | null, language: Language = "de") {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function detectLanguageFromEntry(entry: SavedBriefingEntry): Language {
  return entry.language === "en" ? "en" : "de";
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<SavedBriefingEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [renameEntryId, setRenameEntryId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function loadArchive() {
    try {
      setLoading(true);
      setStatusMessage("");

      const accountId = getCurrentTesterAccountId();

      if (!accountId) {
        setEntries([]);
        setSelectedEntryId(null);
        return;
      }

      const rows = await getSavedBriefingsForAccount(accountId);
      setEntries(rows);

      if (rows.length === 0) {
        setSelectedEntryId(null);
        return;
      }

      setSelectedEntryId((prev) =>
        prev && rows.some((entry) => entry.id === prev) ? prev : rows[0].id
      );
    } catch (error) {
      console.error(error);
      setStatusMessage("Archiv konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArchive();
  }, []);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId]
  );

  const selectedLanguage = selectedEntry
    ? detectLanguageFromEntry(selectedEntry)
    : "de";

  async function handleDelete(entry: SavedBriefingEntry) {
    try {
      setStatusMessage("");
      await deleteSavedBriefing(entry.id);

      const nextEntries = entries.filter((item) => item.id !== entry.id);
      setEntries(nextEntries);

      if (selectedEntryId === entry.id) {
        setSelectedEntryId(nextEntries[0]?.id ?? null);
      }

      setStatusMessage("Briefing wurde gelöscht.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Briefing konnte nicht gelöscht werden.");
    }
  }

  function startRename(entry: SavedBriefingEntry) {
    setRenameEntryId(entry.id);
    setRenameValue(entry.title);
    setStatusMessage("");
  }

  function cancelRename() {
    setRenameEntryId(null);
    setRenameValue("");
  }

  async function saveRename(entry: SavedBriefingEntry) {
    const cleaned = renameValue.trim();

    if (!cleaned) {
      setStatusMessage("Bitte einen Titel eingeben.");
      return;
    }

    try {
      setStatusMessage("");
      const updated = await renameSavedBriefing(entry.id, cleaned);

      setEntries((prev) =>
        prev.map((item) => (item.id === entry.id ? updated : item))
      );

      setRenameEntryId(null);
      setRenameValue("");
      setStatusMessage("Titel wurde aktualisiert.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Titel konnte nicht aktualisiert werden.");
    }
  }

  async function handleExportPdf(entry: SavedBriefingEntry) {
    try {
      setStatusMessage("");
      await exportBriefingPdf({
        entry,
        language: detectLanguageFromEntry(entry),
      });
    } catch (error) {
      console.error(error);
      setStatusMessage("PDF konnte nicht erstellt werden.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4 lg:px-6 lg:py-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Archiv</h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-6">
            Öffnen, umbenennen, exportieren und verwalten deiner gespeicherten Briefings.
            Die letzten 5 generierten Briefings werden automatisch gespeichert.
          </p>
        </div>

        {statusMessage && (
          <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-white">
            {statusMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-card/30 p-6 text-muted-foreground">
            Archiv wird geladen...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card/30 p-6 text-muted-foreground">
            Noch keine gespeicherten Briefings vorhanden.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-4">
              {entries.map((entry) => {
                const entryLanguage = detectLanguageFromEntry(entry);
                const isSelected = entry.id === selectedEntryId;
                const isRenaming = renameEntryId === entry.id;

                return (
                  <Card
                    key={entry.id}
                    className={`briefing-card transition-all ${
                      isSelected ? "border-primary/40" : "border-white/10"
                    }`}
                  >
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-2">
                        {isRenaming ? (
                          <div className="space-y-2">
                            <input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary"
                              placeholder="Titel eingeben"
                            />
                            <div className="flex gap-2">
                              <Button
                                className="h-9"
                                onClick={() => saveRename(entry)}
                              >
                                Speichern
                              </Button>
                              <Button
                                variant="outline"
                                className="h-9 border-white/10"
                                onClick={cancelRename}
                              >
                                Abbrechen
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h2 className="text-lg font-semibold text-white leading-6">
                              {entry.title}
                            </h2>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(entry.updatedAt, entryLanguage)}
                            </div>
                          </>
                        )}
                      </div>

                      {!isRenaming && (
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            className="h-10 border-white/10"
                            onClick={() => setSelectedEntryId(entry.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Öffnen
                          </Button>

                          <Button
                            variant="outline"
                            className="h-10 border-white/10"
                            onClick={() => handleExportPdf(entry)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            PDF
                          </Button>

                          <Button
                            variant="outline"
                            className="h-10 border-white/10"
                            onClick={() => startRename(entry)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Umbenennen
                          </Button>

                          <Button
                            variant="outline"
                            className="h-10 border-red-400/20 text-red-300 hover:bg-red-500/10"
                            onClick={() => handleDelete(entry)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="lg:col-span-8 min-w-0">
              {selectedEntry ? (
                <BriefingDisplay
                  briefing={selectedEntry.briefing as BriefingResult}
                  language={selectedLanguage}
                />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-card/30 p-6 text-muted-foreground">
                  Bitte ein Briefing auswählen.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}