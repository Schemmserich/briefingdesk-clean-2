'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

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

type ChapterAudio = {
  id: string;
  title: string;
  audioBase64: string;
  mimeType: string;
};

type AudioResponse = {
  language: 'de' | 'en';
  provider: 'piper' | 'openai';
  voice: string;
  disclosure: string;
  chapters: ChapterAudio[];
  error?: string;
};

type Props = {
  briefing: BriefingData;
  language: 'de' | 'en';
};

type PreparedChapter = {
  id: string;
  title: string;
  url: string;
};

export function BriefingAudioPlayer({ briefing, language }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState<PreparedChapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [disclosure, setDisclosure] = useState<string | null>(null);

  const hasPlayableContent = useMemo(() => {
    return Boolean(
      briefing?.mainTitle ||
        briefing?.overviewParagraph ||
        briefing?.sections?.length ||
        briefing?.whyMarketsCare ||
        briefing?.whatChanged
    );
  }, [briefing]);

  useEffect(() => {
    return () => {
      chapters.forEach((chapter) => {
        URL.revokeObjectURL(chapter.url);
      });
    };
  }, [chapters]);

  async function handleGenerateAudio() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/briefing-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language,
          mainTitle: briefing.mainTitle,
          overviewParagraph: briefing.overviewParagraph,
          sections: briefing.sections ?? [],
          whyMarketsCare: briefing.whyMarketsCare,
          whatChanged: briefing.whatChanged,
        }),
      });

      const data = (await res.json()) as AudioResponse;

      if (!res.ok) {
        throw new Error(data.error || 'Audio konnte nicht erzeugt werden.');
      }

      chapters.forEach((chapter) => {
        URL.revokeObjectURL(chapter.url);
      });

      const preparedChapters: PreparedChapter[] = data.chapters.map((chapter) => {
        const binary = atob(chapter.audioBase64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: chapter.mimeType });
        const url = URL.createObjectURL(blob);

        return {
          id: chapter.id,
          title: chapter.title,
          url,
        };
      });

      setChapters(preparedChapters);
      setCurrentChapterIndex(0);
      setDisclosure(data.disclosure);

      setTimeout(() => {
        if (audioRef.current && preparedChapters[0]) {
          audioRef.current.src = preparedChapters[0].url;
          audioRef.current.load();
          audioRef.current.playbackRate = playbackRate;
        }
      }, 0);
    } catch (err: any) {
      setError(err?.message || 'Audio konnte nicht erzeugt werden.');
    } finally {
      setLoading(false);
    }
  }

  function loadChapter(index: number, autoplay = false) {
    if (!audioRef.current || !chapters[index]) return;

    setCurrentChapterIndex(index);
    audioRef.current.src = chapters[index].url;
    audioRef.current.load();
    audioRef.current.playbackRate = playbackRate;

    if (autoplay) {
      audioRef.current.play();
    }
  }

  function handlePlayPause() {
    if (!audioRef.current || !chapters.length) return;

    if (!audioRef.current.src) {
      loadChapter(currentChapterIndex, true);
      return;
    }

    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }

  function handleJumpToChapter(index: number) {
    loadChapter(index, true);
  }

  function handleRateChange(rate: number) {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }

  function handleEnded() {
    setIsPlaying(false);

    if (currentChapterIndex < chapters.length - 1) {
      loadChapter(currentChapterIndex + 1, true);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-card/30 p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {chapters.length === 0 ? (
          <Button
            onClick={handleGenerateAudio}
            disabled={loading || !hasPlayableContent}
          >
            {loading
              ? language === 'de'
                ? 'Audio wird erzeugt...'
                : 'Generating audio...'
              : language === 'de'
              ? 'Briefing anhören'
              : 'Listen to briefing'}
          </Button>
        ) : (
          <Button onClick={handlePlayPause}>
            {isPlaying ? 'Pause' : language === 'de' ? 'Abspielen' : 'Play'}
          </Button>
        )}

        <div className="flex items-center gap-2">
          {[1, 1.25, 1.5].map((rate) => (
            <Button
              key={rate}
              type="button"
              variant={playbackRate === rate ? 'default' : 'outline'}
              onClick={() => handleRateChange(rate)}
            >
              {rate}x
            </Button>
          ))}
        </div>
      </div>

      {error ? <div className="text-sm text-red-400">{error}</div> : null}

      {disclosure ? (
        <div className="text-xs text-muted-foreground">{disclosure}</div>
      ) : null}

      {chapters.length > 0 ? (
        <>
          <audio
            ref={audioRef}
            controls
            className="w-full"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
          />

          <div className="space-y-2">
            <div className="text-sm font-semibold">
              {language === 'de' ? 'Kapitel' : 'Chapters'}
            </div>

            <div className="grid gap-2">
              {chapters.map((chapter, index) => (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => handleJumpToChapter(index)}
                  className={`text-left rounded-lg border px-3 py-2 transition ${
                    index === currentChapterIndex
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="font-medium">{chapter.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {language === 'de' ? 'Kapitel' : 'Chapter'} {index + 1}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}