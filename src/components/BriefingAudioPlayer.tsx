"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

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

function estimateSpeechDurationMs(text: string, rate: number) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 150 * rate;
  const minutes = words / wordsPerMinute;
  return Math.max(minutes * 60 * 1000, 2000);
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
      [/\bDonald Trump\b/g, "Donald Trump"],
      [/\bJerome Powell\b/g, "Dscherom Pauell"],
      [/\bNvidia\b/g, "Envidia"],
      [/\bMicrosoft\b/g, "Meikrosoft"],
      [/\bAlphabet\b/g, "Alphabet"],
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
  const [progress, setProgress] = useState(0);
  const [chapterProgress, setChapterProgress] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const chapterStartRef = useRef<number | null>(null);
  const chapterDurationRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false);
      return;
    }

    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const loadedVoices = synth.getVoices();
      setVoices(loadedVoices);

      const preferred =
        language === "de"
          ? loadedVoices.find((v) => v.lang.toLowerCase().startsWith("de"))
          : loadedVoices.find((v) => v.lang.toLowerCase().startsWith("en"));

      setSelectedVoice(preferred ?? loadedVoices[0] ?? null);
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;

    return () => {
      synth.onvoiceschanged = null;
      synth.cancel();
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [language]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, []);

  function stopSpeaking() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    utteranceRef.current = null;

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    setIsSpeaking(false);
  }

  function speakChapter(index: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!chapters[index]) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

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
      setChapterProgress(0);

      chapterStartRef.current = Date.now();
      chapterDurationRef.current = estimateSpeechDurationMs(chapter.text, playbackRate);

      progressTimerRef.current = window.setInterval(() => {
        if (!chapterStartRef.current || !chapterDurationRef.current) return;

        const elapsed = Date.now() - chapterStartRef.current;
        const currentChapterPercent = Math.min(
          (elapsed / chapterDurationRef.current) * 100,
          100
        );

        setChapterProgress(currentChapterPercent);

        const overallPercent =
          ((index + currentChapterPercent / 100) / chapters.length) * 100;
        setProgress(overallPercent);
      }, 250);
    };

    utterance.onend = () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }

      setChapterProgress(100);
      const nextIndex = index + 1;

      if (nextIndex < chapters.length) {
        speakChapter(nextIndex);
      } else {
        setProgress(100);
        setIsSpeaking(false);
        utteranceRef.current = null;
      }
    };

    utterance.onerror = () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }

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

  if (!isSupported) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
        <div className="text-sm font-semibold text-white">
          {language === "de" ? "Audio-Briefing" : "Audio Briefing"}
        </div>
        <p className="text-sm text-muted-foreground">
          {language === "de"
            ? "Dieses Gerät oder dieser Browser unterstützt die integrierte Sprachwiedergabe nicht."
            : "This device or browser does not support built-in speech playback."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-white">
            {language === "de" ? "Audio-Briefing" : "Audio Briefing"}
          </div>
          <div className="text-xs text-muted-foreground">
            {language === "de"
              ? "Kostenlose Geräte-Stimme mit Kapitelsprüngen"
              : "Free device voice with chapter jumping"}
          </div>
        </div>

        {voices.length > 0 && (
          <select
            className="bg-secondary/50 border border-white/10 rounded-md px-2 py-1 text-xs text-white max-w-full"
            value={selectedVoice?.name ?? ""}
            onChange={(e) => {
              const voice = voices.find((v) => v.name === e.target.value) ?? null;
              setSelectedVoice(voice);
            }}
          >
            {voices
              .filter((v) =>
                language === "de"
                  ? v.lang.toLowerCase().startsWith("de")
                  : v.lang.toLowerCase().startsWith("en")
              )
              .map((voice) => (
                <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                  {voice.name}
                </option>
              ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePlayPause}>
          {isSpeaking
            ? "Pause"
            : language === "de"
            ? "Abspielen"
            : "Play"}
        </Button>

        <Button variant="outline" onClick={handlePrevious} disabled={!chapters.length}>
          {language === "de" ? "Zurück" : "Previous"}
        </Button>

        <Button variant="outline" onClick={handleNext} disabled={!chapters.length}>
          {language === "de" ? "Weiter" : "Next"}
        </Button>

        <Button variant="outline" onClick={stopSpeaking}>
          Stop
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[0.9, 1, 1.1, 1.2].map((rate) => (
          <Button
            key={rate}
            type="button"
            variant={playbackRate === rate ? "default" : "outline"}
            onClick={() => handleRateChange(rate)}
          >
            {rate}x
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {language === "de"
              ? `Gesamtfortschritt: ${Math.round(progress)}%`
              : `Overall progress: ${Math.round(progress)}%`}
          </span>
          <span>
            {language === "de"
              ? `Kapitel: ${Math.round(chapterProgress)}%`
              : `Chapter: ${Math.round(chapterProgress)}%`}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowChapters((prev) => !prev)}
          className="w-full px-3 py-2 border-b border-white/10 text-left text-xs uppercase tracking-wider text-muted-foreground hover:bg-white/5"
        >
          {language === "de"
            ? showChapters
              ? "Kapitel ausblenden"
              : "Kapitel anzeigen"
            : showChapters
            ? "Hide chapters"
            : "Show chapters"}
        </button>

        {showChapters && (
          <div className="divide-y divide-white/10">
            {chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => handleJumpToChapter(index)}
                className={cn(
                  "w-full text-left px-3 py-3 transition hover:bg-white/5",
                  currentChapterIndex === index ? "bg-white/5" : ""
                )}
              >
                <div className="text-sm font-medium text-white">{chapter.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {currentChapterIndex === index
                    ? language === "de"
                      ? "Aktives Kapitel"
                      : "Active chapter"
                    : language === "de"
                    ? "Zum Kapitel springen"
                    : "Jump to chapter"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}