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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Archive, Pencil, Trash2, Eye } from "lucide-react";

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

    if (!selectedId || !nextEntries.some((entry) => entry.id === selectedId)) {
      setSelectedId(nextEntries[0].id);
    }
  }

  useEffect(() => {
    refreshEntries();
  }, []);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId]
  );

  const handleRename = (entry: ArchivedBriefing) => {
    const nextName = window.prompt("Bitte neuen Namen eingeben:", entry.name);
    if (!nextName || !nextName.trim()) return;

    renameArchivedBriefing(entry.id, nextName.trim());
    refreshEntries();
  };

  const handleDelete = (entry: ArchivedBriefing) => {
    const confirmed = window.confirm(`"${entry.name}" wirklich löschen?`);
    if (!confirmed) return;

    deleteArchivedBriefing(entry.id);
    refreshEntries();
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
              Open, rename, and manage saved briefings. The last 5 generated briefings are also saved automatically.
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
                  Generate a briefing in the dashboard. The latest 5 are saved automatically, and you can also save your favorites manually.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8">
              <div className="lg:col-span-4 space-y-3">
                {entries.map((entry) => (
                  <Card
                    key={entry.id}
                    className={`briefing-card cursor-pointer transition ${
                      selectedId === entry.id ? "border-primary/50" : ""
                    }`}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-white break-words">
                          {entry.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.autoSaved ? "Auto-saved" : "Manually saved"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(entry.updatedAt))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/10 hover:bg-white/5 h-9 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(entry.id);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/10 hover:bg-white/5 h-9 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(entry);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/10 hover:bg-white/5 h-9 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(entry);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="lg:col-span-8 min-w-0">
                {selectedEntry ? (
                  <BriefingDisplay
                    briefing={selectedEntry.briefing}
                    language={selectedEntry.language}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}