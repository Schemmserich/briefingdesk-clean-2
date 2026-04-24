export type ArchivedBriefing = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  autoSaved: boolean;
  language: "de" | "en";
  params: any;
  briefing: any;
};

const STORAGE_KEY = "news-briefing-archive-v1";
const MAX_AUTO_SAVED = 5;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readArchive(): ArchivedBriefing[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArchive(entries: ArchivedBriefing[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function sortArchive(entries: ArchivedBriefing[]) {
  return [...entries].sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
}

function makeDefaultName(params: any, language: "de" | "en") {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const briefingType = params?.briefingType ?? "Briefing";
  return `${briefingType} - ${formatted}`;
}

export function listArchivedBriefings(): ArchivedBriefing[] {
  return sortArchive(readArchive());
}

export function saveAutoBriefing(input: {
  language: "de" | "en";
  params: any;
  briefing: any;
}) {
  const entries = readArchive();
  const now = new Date().toISOString();

  const newEntry: ArchivedBriefing = {
    id: crypto.randomUUID(),
    name: makeDefaultName(input.params, input.language),
    createdAt: now,
    updatedAt: now,
    autoSaved: true,
    language: input.language,
    params: input.params,
    briefing: input.briefing,
  };

  const nextEntries = [newEntry, ...entries];
  const manualEntries = nextEntries.filter((entry) => !entry.autoSaved);
  const autoEntries = nextEntries.filter((entry) => entry.autoSaved).slice(0, MAX_AUTO_SAVED);

  writeArchive(sortArchive([...manualEntries, ...autoEntries]));
  return newEntry;
}

export function saveManualBriefing(input: {
  language: "de" | "en";
  params: any;
  briefing: any;
  name: string;
}) {
  const entries = readArchive();
  const now = new Date().toISOString();

  const newEntry: ArchivedBriefing = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    createdAt: now,
    updatedAt: now,
    autoSaved: false,
    language: input.language,
    params: input.params,
    briefing: input.briefing,
  };

  writeArchive(sortArchive([newEntry, ...entries]));
  return newEntry;
}

export function renameArchivedBriefing(id: string, newName: string) {
  const entries = readArchive();
  const trimmedName = newName.trim();

  const nextEntries = entries.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          name: trimmedName,
          updatedAt: new Date().toISOString(),
        }
      : entry
  );

  writeArchive(sortArchive(nextEntries));
}

export function deleteArchivedBriefing(id: string) {
  const entries = readArchive();
  const nextEntries = entries.filter((entry) => entry.id !== id);
  writeArchive(sortArchive(nextEntries));
}

export function getArchivedBriefing(id: string): ArchivedBriefing | null {
  const entries = readArchive();
  return entries.find((entry) => entry.id === id) ?? null;
}