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
import {
  Archive,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Download,
  Check,
  X,
} from "lucide-react";

function formatArchiveDate(value: string, language: "de" | "en") {
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function deriveArchiveHeadline(entry: ArchivedBriefing) {
  const briefingType = String(
    entry.briefing?.briefingType ?? entry.params?.briefingType ?? "Briefing"
  ).trim();

  let mainTitle = String(entry.briefing?.mainTitle ?? "").trim();

  if (!mainTitle) {
    const overview = String(entry.briefing?.overviewParagraph ?? "").trim();
    if (overview) {
      const firstSentence = overview.split(/(?<=[.!?])\s+/)[0]?.trim() || overview;
      mainTitle =
        firstSentence.length > 120
          ? `${firstSentence.slice(0, 117).trim()}...`
          : firstSentence;
    }
  }

  if (!mainTitle) {
    mainTitle = entry.name;
  }

  if (mainTitle.toLowerCase().startsWith(briefingType.toLowerCase() + ":")) {
    return mainTitle;
  }

  if (briefingType && mainTitle) {
    return `${briefingType}: ${mainTitle}`;
  }

  return mainTitle || briefingType;
}

function buildArchiveMeta(entry: ArchivedBriefing) {
  return formatArchiveDate(entry.updatedAt, entry.language);
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<ArchivedBriefing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  function startRename(entry: ArchivedBriefing) {
    setDeleteConfirmId(null);
    setEditingId(entry.id);
    setEditingValue(entry.name);
  }

  function cancelRename() {
    setEditingId(null);
    setEditingValue("");
  }

  function confirmRename(entry: ArchivedBriefing) {
    const trimmed = editingValue.trim();
    if (!trimmed) return;

    renameArchivedBriefing(entry.id, trimmed);
    setEditingId(null);
    setEditingValue("");
    refreshEntries();
  }

  function startDelete(entry: ArchivedBriefing) {
    setEditingId(null);
    setEditingValue("");
    setDeleteConfirmId(entry.id);
  }

  function cancelDelete() {
    setDeleteConfirmId(null);
  }

  function confirmDelete(entry: ArchivedBriefing) {
    const wasSelected = selectedId === entry.id;

    deleteArchivedBriefing(entry.id);

    const nextEntries = listArchivedBriefings();
    setEntries(nextEntries);
    setDeleteConfirmId(null);

    if (!nextEntries.length) {
      setSelectedId(null);
      return;
    }

    if (wasSelected) {
      setSelectedId(null);
    }
  }

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
                  const isEditing = editingId === entry.id;
                  const isDeleting = deleteConfirmId === entry.id;

                  return (
                    <Card
                      key={entry.id}
                      className={`briefing-card transition ${isSelected ? "border-primary/50" : ""}`}
                    >
                      <CardContent className="p-4 space-y-3">
                        {isEditing ? (
                          <div className="space-y-3">
                            <input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-primary"
                              placeholder="Name"
                              autoFocus
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                className="h-9"
                                onClick={() => confirmRename(entry)}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 border-white/10 hover:bg-white/5"
                                onClick={cancelRename}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : isDeleting ? (
                          <div className="space-y-3">
                            <div className="text-sm text-white font-medium">
                              {entry.language === "de"
                                ? "Dieses Briefing wirklich löschen?"
                                : "Delete this briefing?"}
                            </div>
                            <div className="text-xs text-muted-foreground break-words">
                              {deriveArchiveHeadline(entry)}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="destructive"
                                className="h-9"
                                onClick={() => confirmDelete(entry)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 border-white/10 hover:bg-white/5"
                                onClick={cancelDelete}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="w-full text-left space-y-1"
                              onClick={() => setSelectedId((prev) => (prev === entry.id ? null : entry.id))}
                            >
                              <div className="text-sm sm:text-base font-semibold text-white leading-snug break-words">
                                {deriveArchiveHeadline(entry)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {buildArchiveMeta(entry)}
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
                                onClick={() => startRename(entry)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                className="border-white/10 hover:bg-white/5 h-9 px-2"
                                onClick={() => startDelete(entry)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="lg:col-span-8 min-w-0 space-y-4">
                {selectedEntry ? (
                  <>
                    <div className="briefing-card p-4 sm:p-6">
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">
                          {selectedEntry.language === "de" ? "Archivdokument" : "Archive document"}
                        </div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-headline font-bold text-white leading-tight break-words">
                          {deriveArchiveHeadline(selectedEntry)}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {buildArchiveMeta(selectedEntry)}
                        </p>
                      </div>
                    </div>

                    <BriefingDisplay
                      briefing={selectedEntry.briefing}
                      language={selectedEntry.language}
                      fallbackTitle={selectedEntry.name}
                    />
                  </>
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