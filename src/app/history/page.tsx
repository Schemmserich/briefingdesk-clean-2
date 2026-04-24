"use client";

import { useEffect, useMemo, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { BriefingDisplay } from "@/components/BriefingDisplay";
import {
  ArchivedBriefing,
  deleteArchivedBriefing,
  listArchivedBriefings,
  renameArchivedBriefing,
} from "@/lib/briefingArchive";
import { exportArchivedBriefingToPdf } from "@/lib/exportBriefingPdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Archive, Pencil, Trash2, Eye, FileText, Download } from "lucide-react";

function formatArchiveDate(value: string, language: "de" | "en") {
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildArchiveLabel(entry: ArchivedBriefing) {
  const briefingType = entry.params?.briefingType ?? entry.briefing?.briefingType ?? "Briefing";
  const time = formatArchiveDate(entry.updatedAt, entry.language);
  return `${briefingType} · ${time}`;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<ArchivedBriefing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function refreshEntries() {
    const nextEntries = listArchivedBriefings();
    setEntries(nextEntries);

    if (!nextEntries.length) {
      setSelectedId(null);
      return;
    }

    if (selectedId && nextEntries.some((entry) => entry.id === selectedId)) {
      return;
    }

    setSelectedId(null);
  }

  useEffect(() => {
    refreshEntries();
  }, []);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId]
  );

  const handleRename = (entry: ArchivedBriefing) => {
    const nextName = window.prompt(
      entry.language === "de" ? "Bitte neuen Namen eingeben:" : "Please enter a new name:",
      entry.name
    );

    if (!nextName || !nextName.trim()) return;

    renameArchivedBriefing(entry.id, nextName.trim());
    refreshEntries();
  };

  const handleDelete = (entry: ArchivedBriefing) => {
    const confirmed = window.confirm(
      entry.language === "de"
        ? `"${entry.name}" wirklich löschen?`
        : `Delete "${entry.name}"?`
    );

    if (!confirmed) return;

    const wasSelected = selectedId === entry.id;

    deleteArchivedBriefing(entry.id);
    const nextEntries = listArchivedBriefings();
    setEntries(nextEntries);

    if (!nextEntries.length) {
      setSelectedId(null);
      return;
    }

    if (wasSelected) {
      setSelectedId(null);
    }
  };

  const handlePdfExport = (entry: ArchivedBriefing) => {
    exportArchivedBriefingToPdf(entry);
  };

  return (
    <>
      <Navigation />
      <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 lg:px-6 lg:py-8" translate="no">
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-bold text-white tracking-tight">
              Archive
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl leading-6 sm:leading-7">
              Open, rename, export, and manage saved briefings. The latest 5 generated briefings are saved automatically.
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="min-h-[420px] flex flex-col items-center justify-center space-y-4 bg-card/30 rounded-xl border border-dashed border-white/10 px-6 text-center">
              <div className="w-14 h-14 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
                <Archive className="w-7 h-7 text-white/20" />
              </div>
              <div className="space-y-2 max-w-md">
                <p className="text-base sm:text-lg font-semibold text-white">
                  No saved briefings yet
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-6">
                  Generate a briefing in the dashboard. The latest 5 are saved automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8">
              <div className="lg:col-span-4 space-y-3">
                {entries.map((entry) => {
                  const isSelected = selectedId === entry.id;

                  return (
                    <Card
                      key={entry.id}
                      className={`briefing-card transition ${isSelected ? "border-primary/50" : ""}`}
                    >
                      <CardContent className="p-4 space-y-3">
                        <button
                          type="button"
                          className="w-full text-left space-y-1"
                          onClick={() => setSelectedId((prev) => (prev === entry.id ? null : entry.id))}
                        >
                          <div className="text-sm font-semibold text-white break-words">
                            {entry.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {buildArchiveLabel(entry)}
                          </div>
                        </button>

                        <div className="grid grid-cols-4 gap-2">
                          <Button
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className="h-9 px-2"
                            onClick={() => setSelectedId((prev) => (prev === entry.id ? null : entry.id))}
                          >
                            {isSelected ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/10 hover:bg-white/5 h-9 px-2"
                            onClick={() => handlePdfExport(entry)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/10 hover:bg-white/5 h-9 px-2"
                            onClick={() => handleRename(entry)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/10 hover:bg-white/5 h-9 px-2"
                            onClick={() => handleDelete(entry)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="lg:col-span-8 min-w-0">
                {selectedEntry ? (
                  <BriefingDisplay
                    briefing={selectedEntry.briefing}
                    language={selectedEntry.language}
                  />
                ) : (
                  <div className="min-h-[420px] flex flex-col items-center justify-center space-y-4 bg-card/30 rounded-xl border border-dashed border-white/10 px-6 text-center">
                    <div className="w-14 h-14 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
                      <FileText className="w-7 h-7 text-white/20" />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <p className="text-base sm:text-lg font-semibold text-white">
                        Select a saved briefing
                      </p>
                      <p className="text-sm sm:text-base text-muted-foreground leading-6">
                        Click one of the archive entries on the left to open the full briefing.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}