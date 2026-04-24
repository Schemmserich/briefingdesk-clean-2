"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Play, Pause, SkipBack, SkipForward, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type BriefingSection = {
  title?: string;
  content?: string;
};

type BriefingData = {
  mainTitle?: string;
  overviewParagraph?: string;
  sections?: BriefingSection[];
  whyMarketsCare?: string;
  whatChanged?: string;
};

type Props = {
  briefing: BriefingData;
  language: "de" | "en";
};

type Chapter = {
  id: string;
  title: string;
  text: string;
};

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeForSpeech(text: string, language: "de" | "en") {
  let normalized = text;

  if (language === "de") {
    const replacements: Array<[RegExp, string]> = [
      [/\bDAX\b/g, "Daks"],
      [/\bMDAX\b/g, "Em Daks"],
      [/\bSDAX\b/g, "Ess Daks"],
      [/\bTecDAX\b/g, "Tech Daks"],
      [/\bDow Jones\b/g, "Dau Dschons"],
      [/\bNasdaq\b/g, "Nasdäck"],
      [/\bS&P 500\b/g, "Ess and Pi fünfhundert"],
      [/\bEUR\b/g, "Euro"],
      [/\bUSD\b/g, "US-Dollar"],
      [/\bUS-Dollar\b/g, "US Dollar"],
      [/\bEU\b/g, "EU"],
      [/\bUSA\b/g, "USA"],
      [/\bKI\b/g, "K I"],
      [/\bAI\b/g, "Ä I"],
      [/\bCEO\b/g, "Si I O"],
      [/\bCFO\b/g, "Si Ef O"],
      [/\bIPO\b/g, "Ai Pi O"],
      [/\bNATO\b/g, "Nato"],
      [/\bUkraine\b/g, "Ukra-ine"],
      [/\bKiew\b/g, "Kijiw"],
      [/\bTaiwan\b/g, "Taiwan"],
      [/\bPeking\b/g, "Peking"],
      [/\bXi Jinping\b/g, "Schi Dschinping"],
      [/\bJerome Powell\b/g, "Dscherom Pauell"],
      [/\bNvidia\b/g, "Envidia"],
      [/\bMicrosoft\b/g, "Meikrosoft"],
      [/\bAmazon\b/g, "Amazon"],
      [/\bApple\b/g, "Äppel"],
      [/\bMeta\b/g, "Meta"],
      [/\bPipeline\b/g, "Peiplein"],
      [/\bMrd\.\b/g, "Milliarden"],
      [/\bMio\.\b/g, "Millionen"],
      [/\bBio\.\b/g, "Billionen"],
      [/&/g, " und "],
      [/\//g, " oder "],
    ];

    for (const [pattern, replacement] of replacements) {
      normalized = normalized.replace(pattern, replacement);
    }
  } else {
    const replacements: Array<[RegExp, string]> = [
      [/\bDAX\b/g, "Daks"],
      [/\bMDAX\b/g, "M Daks"],
      [/\bSDAX\b/g, "S Daks"],
      [/\bTecDAX\b/g, "Tech Daks"],
      [/\bEUR\b/g, "Euro"],
      [/\bUSD\b/g, "U S Dollar"],
      [/\bEU\b/g, "E U"],
      [/\bCEO\b/g, "C E O"],
      [/\bCFO\b/g, "C F O"],
      [/\bIPO\b/g, "I P O"],
      [/\bNATO\b/g, "Nato"],
      [/\bXi Jinping\b/g, "Shee Jin Ping"],
      [/\bKiew\b/g, "Kyiv"],
      [/&/g, " and "],
      [/\//g, " or "],
    ];

    for (const [pattern, replacement] of replacements) {
      normalized = normalized.replace(pattern, replacement);
    }
  }

  return normalized.replace(/\s+/g, " ").trim();
}

function buildChapters(briefing: BriefingData, language: "de" | "en"): Chapter[] {
  const chapters: Chapter[] = [];

  const title = safeText(briefing.mainTitle);
  const overview = safeText(briefing.overviewParagraph);

  if (title || overview) {
    chapters.push({
      id: "intro",
      title: language === "de" ? "Überblick" : "Overview",
      text: normalizeForSpeech(`${title ? `${title}. ` : ""}${overview}`, language),
    });
  }

  for (let i = 0; i < (briefing.sections ?? []).length; i++) {
    const section = briefing.sections?.[i];
    const sectionTitle = safeText(section?.title);
    const sectionContent = safeText(section?.content);

    if (!sectionTitle && !sectionContent) continue;

    chapters.push({
      id: `section-${i}`,
      title: sectionTitle || (language === "de" ? "Abschnitt" : "Section"),
      text: normalizeForSpeech(
        `${sectionTitle ? `${sectionTitle}. ` : ""}${sectionContent}`,
        language
      ),
    });
  }

  const whyMarketsCare = safeText(briefing.whyMarketsCare);
  if (whyMarketsCare) {
    chapters.push({
      id: "markets",
      title: language === "de" ? "Warum Märkte darauf achten" : "Why Markets Care",
      text: normalizeForSpeech(
        language === "de"
          ? `Warum Märkte darauf achten. ${whyMarketsCare}`
          : `Why markets care. ${whyMarketsCare}`,
        language
      ),
    });
  }

  const whatChanged = safeText(briefing.whatChanged);
  if (whatChanged) {
    chapters.push({
      id: "changed",
      title: language === "de" ? "Was sich verändert hat" : "What Changed",
      text: normalizeForSpeech(
        language === "de"
          ? `Was sich verändert hat. ${whatChanged}`
          : `What changed. ${whatChanged}`,
        language
      ),
    });
  }

  return chapters;
}

export function BriefingAudioPlayer({ briefing, language }: Props) {
  const chapters = useMemo(() => buildChapters(briefing, language), [briefing, language]);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showChapters, setShowChapters] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false);
      return;
    }

    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const loadedVoices = synth.getVoices();
      setVoices(loadedVoices);

      const filteredVoices = loadedVoices.filter((v) =>
        language === "de"
          ? v.lang.toLowerCase().startsWith("de")
          : v.lang.toLowerCase().startsWith("en")
      );

      const preferred =
        language === "de"
          ? filteredVoices.find((v) => v.lang.toLowerCase().includes("de"))
          : filteredVoices.find((v) => v.lang.toLowerCase().includes("en"));

      setSelectedVoice(preferred ?? filteredVoices[0] ?? loadedVoices[0] ?? null);
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;

    return () => {
      synth.onvoiceschanged = null;
      synth.cancel();
    };
  }, [language]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stopSpeaking() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }

  function speakChapter(index: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!chapters[index]) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const chapter = chapters[index];
    const utterance = new SpeechSynthesisUtterance(chapter.text);

    utterance.lang = language === "de" ? "de-DE" : "en-US";
    utterance.rate = playbackRate;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setCurrentChapterIndex(index);
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      const nextIndex = index + 1;
      if (nextIndex < chapters.length) {
        speakChapter(nextIndex);
      } else {
        setIsSpeaking(false);
        utteranceRef.current = null;
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
  }

  function handlePlayPause() {
    if (!chapters.length) return;

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    speakChapter(currentChapterIndex);
  }

  function handleJumpToChapter(index: number) {
    setCurrentChapterIndex(index);
    speakChapter(index);
  }

  function handlePrevious() {
    const nextIndex = Math.max(0, currentChapterIndex - 1);
    setCurrentChapterIndex(nextIndex);
    speakChapter(nextIndex);
  }

  function handleNext() {
    const nextIndex = Math.min(chapters.length - 1, currentChapterIndex + 1);
    setCurrentChapterIndex(nextIndex);
    speakChapter(nextIndex);
  }

  function handleRateChange(rate: number) {
    setPlaybackRate(rate);

    if (isSpeaking) {
      speakChapter(currentChapterIndex);
    }
  }

  if (!chapters.length) {
    return null;
  }

  const progressPercent =
    chapters.length > 0 ? ((currentChapterIndex + 1) / chapters.length) * 100 : 0;

  if (!isSupported) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
        <div className="text-sm font-semibold text-white">
          {language === "de" ? "Audio-Briefing" : "Audio Briefing"}
        </div>
        <p className="text-sm text-muted-foreground leading-6">
          {language === "de"
            ? "Dieses Gerät oder dieser Browser unterstützt die integrierte Sprachwiedergabe nicht."
            : "This device or browser does not support built-in speech playback."}
        </p>
      </div>
    );
  }

  const filteredVoices = voices.filter((v) =>
    language === "de"
      ? v.lang.toLowerCase().startsWith("de")
      : v.lang.toLowerCase().startsWith("en")
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3 overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">
            {language === "de" ? "Audio-Briefing" : "Audio Briefing"}
          </div>
        </div>

        {filteredVoices.length > 0 && (
          <select
            className="bg-secondary/40 border border-white/10 rounded-md px-2 py-1.5 text-[11px] text-white h-8 max-w-[150px]"
            value={selectedVoice?.name ?? ""}
            onChange={(e) => {
              const voice = filteredVoices.find((v) => v.name === e.target.value) ?? null;
              setSelectedVoice(voice);
            }}
          >
            {filteredVoices.map((voice) => (
              <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                {voice.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {language === "de" ? "Kapitel" : "Chapter"} {Math.min(currentChapterIndex + 1, chapters.length)} / {chapters.length}
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-[36px_1fr_36px] gap-2 items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={!chapters.length}
          className="h-9 w-9 p-0 border-white/10 hover:bg-white/5"
        >
          <SkipBack className="w-4 h-4" />
        </Button>

        <Button
          onClick={handlePlayPause}
          className="h-9 rounded-full px-3 text-sm"
        >
          {isSpeaking ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5 ml-0.5" />}
          {language === "de" ? "Play" : "Play"}
        </Button>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={!chapters.length}
          className="h-9 w-9 p-0 border-white/10 hover:bg-white/5"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
        <Button
          variant="outline"
          onClick={stopSpeaking}
          className="h-8 px-2.5 border-white/10 hover:bg-white/5 text-[11px]"
        >
          <Square className="w-3 h-3 mr-1.5" />
          Stop
        </Button>

        <div className="grid grid-cols-4 gap-2">
          {[0.9, 1, 1.1, 1.2].map((rate) => (
            <Button
              key={rate}
              type="button"
              variant={playbackRate === rate ? "default" : "outline"}
              onClick={() => handleRateChange(rate)}
              className={cn(
                "h-8 px-0 text-[11px]",
                playbackRate !== rate && "border-white/10 hover:bg-white/5"
              )}
            >
              {rate}x
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowChapters((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 transition"
        >
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {language === "de" ? "Kapitel" : "Chapters"}
            </div>
            <div className="text-sm text-white mt-0.5 truncate">
              {chapters[currentChapterIndex]?.title ?? "—"}
            </div>
          </div>

          <div className="text-muted-foreground shrink-0">
            {showChapters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showChapters && (
          <div className="divide-y divide-white/10">
            {chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => handleJumpToChapter(index)}
                className={cn(
                  "w-full text-left px-3 py-2.5 transition hover:bg-white/5",
                  currentChapterIndex === index ? "bg-white/5" : ""
                )}
              >
                <div className="text-sm font-medium text-white">{chapter.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {currentChapterIndex === index
                    ? language === "de"
                      ? "Aktiv"
                      : "Active"
                    : language === "de"
                    ? "Springen"
                    : "Jump"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}