import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

type AudioChapterInput = {
  id: string;
  title: string;
  text: string;
};

type AudioRequestBody = {
  language?: 'de' | 'en';
  mainTitle?: string;
  overviewParagraph?: string;
  sections?: Array<{ title?: string; content?: string }>;
  whyMarketsCare?: string;
  whatChanged?: string;
};

type ChapterAudioResponse = {
  id: string;
  title: string;
  audioBase64: string;
  mimeType: string;
};

function safeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeForSpeech(text: string, language: 'de' | 'en'): string {
  let normalized = text;

  if (language === 'de') {
    const replacements: Array<[RegExp, string]> = [
      [/\bDAX\b/g, 'Daks'],
      [/\bMDAX\b/g, 'Em Daks'],
      [/\bSDAX\b/g, 'Es Daks'],
      [/\bTecDAX\b/g, 'Tek Daks'],
      [/\bDow Jones\b/g, 'Dau Dschons'],
      [/\bNasdaq\b/g, 'Näsdäck'],
      [/\bNasdaq 100\b/g, 'Näsdäck hundert'],
      [/\bS&P 500\b/g, 'Ess and Pi fünfhundert'],
      [/\bEuro Stoxx 50\b/g, 'Euro Stocks fünfzig'],
      [/\bMSCI World\b/g, 'Em Ess Si Ei World'],
      [/\bMSCI Emerging Markets\b/g, 'Em Ess Si Ei Emerging Markets'],
      [/\bNikkei\b/g, 'Nikkei'],
      [/\bHang Seng\b/g, 'Hang Seng'],
      [/\bFTSE 100\b/g, 'Footsie hundert'],
      [/\bCAC 40\b/g, 'Kak vierzig'],
      [/\bRussell 2000\b/g, 'Russell zweitausend'],
      [/\bETF\b/g, 'E T F'],
      [/\bETFs\b/g, 'E T Fs'],
      [/\bETC\b/g, 'E T C'],
      [/\bAUM\b/g, 'A U M'],
      [/\bTER\b/g, 'T E R'],
      [/\bKGV\b/g, 'K G V'],
      [/\bEBIT\b/g, 'E Bit'],
      [/\bEBITDA\b/g, 'E Bit Da'],
      [/\bROE\b/g, 'R O E'],
      [/\bROCE\b/g, 'R O C E'],
      [/\bDCF\b/g, 'D C F'],
      [/\bIPO\b/g, 'Ei Pi O'],
      [/\bM&A\b/g, 'M and A'],
      [/\bUSD\b/g, 'US-Dollar'],
      [/\bUS-\s*Dollar\b/g, 'US-Dollar'],
      [/\bEUR\b/g, 'Euro'],
      [/\bGBP\b/g, 'britisches Pfund'],
      [/\bJPY\b/g, 'japanischer Yen'],
      [/\bCHF\b/g, 'Schweizer Franken'],
      [/\bCNY\b/g, 'chinesischer Yuan'],
      [/\bBIP\b/g, 'B I P'],
      [/\bCPI\b/g, 'C P I'],
      [/\bPPI\b/g, 'P P I'],
      [/\bPMI\b/g, 'P M I'],
      [/\bTreasury\b/g, 'Tretschery'],
      [/\bTreasuries\b/g, 'Tretscheries'],
      [/\bHigh Yield\b/g, 'Hai Jield'],
      [/\bNVIDIA\b/g, 'Envidia'],
      [/\bAMD\b/g, 'A M D'],
      [/\bTSMC\b/g, 'T S M C'],
      [/\bASML\b/g, 'A S M L'],
      [/\bApple\b/g, 'Äppel'],
      [/\bAlphabet\b/g, 'Alphabet'],
      [/\bMeta\b/g, 'Meta'],
      [/\bAmazon\b/g, 'Amazon'],
      [/\bTesla\b/g, 'Tesla'],
      [/\bPalantir\b/g, 'Palantier'],
      [/\bOpenAI\b/g, 'Open A I'],
      [/\bChatGPT\b/g, 'Tschätt G P T'],
      [/\bAI\b/g, 'A I'],
      [/\bKI\b/g, 'K I'],
      [/\bSAP\b/g, 'S A P'],
      [/\bBMW\b/g, 'B M W'],
      [/\bVW\b/g, 'Vau Vau'],
      [/\bVolkswagen\b/g, 'Volkswagen'],
      [/\bMercedes-Benz\b/g, 'Mercedes Benz'],
      [/\bRheinmetall\b/g, 'Rheinmetall'],
      [/\bBASF\b/g, 'B A S F'],
      [/\bUSA\b/g, 'U S A'],
      [/\bU\.S\.\b/g, 'U S'],
      [/\bEU\b/g, 'E U'],
      [/\bEZB\b/g, 'E Z B'],
      [/\bECB\b/g, 'E C B'],
      [/\bFed\b/g, 'Fett'],
      [/\bFBI\b/g, 'F B I'],
      [/\bCIA\b/g, 'C I A'],
      [/\bNATO\b/g, 'Nato'],
      [/\bUNO\b/g, 'U N O'],
      [/\bUN\b/g, 'U N'],
      [/\bIWF\b/g, 'I W F'],
      [/\bIMF\b/g, 'I M F'],
      [/\bOECD\b/g, 'O E C D'],
      [/\bWTO\b/g, 'W T O'],
      [/\bG7\b/g, 'G sieben'],
      [/\bG20\b/g, 'G zwanzig'],
      [/\bCDU\b/g, 'C D U'],
      [/\bCSU\b/g, 'C S U'],
      [/\bSPD\b/g, 'S P D'],
      [/\bFDP\b/g, 'F D P'],
      [/\bAfD\b/g, 'A F D'],
      [/\bBSW\b/g, 'B S W'],
      [/\bDonald Trump\b/g, 'Donald Trump'],
      [/\bJoe Biden\b/g, 'Joe Biden'],
      [/\bJerome Powell\b/g, 'Dscherom Pauell'],
      [/\bChristine Lagarde\b/g, 'Christine Lagarde'],
      [/\bUrsula von der Leyen\b/g, 'Ursula fon der Leyen'],
      [/\bEmmanuel Macron\b/g, 'Emanuel Makron'],
      [/\bOlaf Scholz\b/g, 'Olaf Scholz'],
      [/\bFriedrich Merz\b/g, 'Friedrich Merz'],
      [/\bWladimir Putin\b/g, 'Wladimir Putin'],
      [/\bVolodymyr Selenskyj\b/g, 'Wolodimir Selenskij'],
      [/\bXi Jinping\b/g, 'Schi Dschinping'],
      [/\bBenjamin Netanyahu\b/g, 'Benjamin Netanjahu'],
      [/\bKiew\b/g, 'Kijiw'],
      [/\bKyiv\b/g, 'Kijiw'],
      [/\bUkraine\b/g, 'Ukraine'],
      [/\bMoskau\b/g, 'Moskau'],
      [/\bGaza\b/g, 'Gasa'],
      [/\bGazastreifen\b/g, 'Gasa Streifen'],
      [/\bTeheran\b/g, 'Teheran'],
      [/\bIsrael\b/g, 'Israel'],
      [/\bLibanon\b/g, 'Libanon'],
      [/\bTaiwan\b/g, 'Taiwan'],
      [/\bPeking\b/g, 'Peking'],
      [/\bBeijing\b/g, 'Beidsching'],
      [/\bHongkong\b/g, 'Hongkong'],
      [/\bTokio\b/g, 'Tokio'],
      [/\bWashington\b/g, 'Washington'],
      [/\bNew York\b/g, 'New York'],
      [/\bWall Street\b/g, 'Wall Street'],
      [/\bLondon\b/g, 'London'],
      [/\bBrüssel\b/g, 'Brüssel'],
      [/\bParis\b/g, 'Paris'],
      [/\bMadrid\b/g, 'Madrid'],
      [/\bRom\b/g, 'Rom'],
      [/\bWarschau\b/g, 'Warschau'],
      [/\bBudapest\b/g, 'Budapest'],
      [/\bÖl\b/g, 'Öl'],
      [/\bBrent\b/g, 'Brent'],
      [/\bWTI\b/g, 'Double U T I'],
      [/\bLNG\b/g, 'L N G'],
      [/\bPipeline\b/g, 'Peiplein'],
      [/\bPipelines\b/g, 'Peipleins'],
      [/\bOPEC\b/g, 'Opec'],
      [/\bOPEC\+\b/g, 'Opec Plus'],
      [/\bz\. B\.\b/g, 'zum Beispiel'],
      [/\bu\. a\.\b/g, 'unter anderem'],
      [/\bca\.\b/g, 'circa'],
      [/\bevtl\.\b/g, 'eventuell'],
      [/\bNr\.\b/g, 'Nummer'],
      [/\bMio\.\b/g, 'Millionen'],
      [/\bMrd\.\b/g, 'Milliarden'],
      [/\bBio\.\b/g, 'Billionen'],
      [/\bvs\.\b/g, 'gegen'],
      [/\betc\.\b/g, 'etcetera'],
    ];

    for (const [pattern, replacement] of replacements) {
      normalized = normalized.replace(pattern, replacement);
    }
  } else {
    const replacements: Array<[RegExp, string]> = [
      [/\bDAX\b/g, 'Daks'],
      [/\bMDAX\b/g, 'M Daks'],
      [/\bSDAX\b/g, 'S Daks'],
      [/\bTecDAX\b/g, 'Tech Daks'],
      [/\bETF\b/g, 'E T F'],
      [/\bETFs\b/g, 'E T Fs'],
      [/\bAI\b/g, 'A I'],
      [/\bEU\b/g, 'E U'],
      [/\bECB\b/g, 'E C B'],
      [/\bS&P 500\b/g, 'S and P five hundred'],
      [/\bMSCI\b/g, 'M S C I'],
      [/\bTSMC\b/g, 'T S M C'],
      [/\bASML\b/g, 'A S M L'],
      [/\bSAP\b/g, 'S A P'],
      [/\bCEO\b/g, 'C E O'],
      [/\bCFO\b/g, 'C F O'],
      [/\bIPO\b/g, 'I P O'],
      [/\bM&A\b/g, 'M and A'],
      [/\bOpenAI\b/g, 'Open A I'],
      [/\bChatGPT\b/g, 'Chat G P T'],
      [/\bPipeline\b/g, 'Pipe line'],
      [/\bPipelines\b/g, 'Pipe lines'],
      [/\bUSD\b/g, 'U S dollar'],
      [/\bU\.S\.\b/g, 'U S'],
      [/\bU\.K\.\b/g, 'U K'],
      [/\be\.g\.\b/g, 'for example'],
      [/\bi\.e\.\b/g, 'that is'],
      [/\betc\.\b/g, 'etcetera'],
      [/\bvs\.\b/g, 'versus'],
      [/\bKyiv\b/g, 'Keev'],
      [/\bKiev\b/g, 'Keev'],
      [/\bXi Jinping\b/g, 'Shee Jin Ping'],
      [/\bJerome Powell\b/g, 'Jerome Powell'],
    ];

    for (const [pattern, replacement] of replacements) {
      normalized = normalized.replace(pattern, replacement);
    }
  }

  normalized = normalized
    .replace(/\s+/g, ' ')
    .replace(/–/g, ', ')
    .replace(/—/g, ', ')
    .replace(/\//g, language === 'de' ? ' oder ' : ' or ')
    .trim();

  return normalized;
}


function buildAudioChapters(body: AudioRequestBody): AudioChapterInput[] {
  const language = body.language === 'en' ? 'en' : 'de';
  const chapters: AudioChapterInput[] = [];

  const introText =
    language === 'de'
      ? `Guten Tag. Hier ist Ihr Briefing. ${safeText(body.mainTitle)}`
      : `Hello. Here is your briefing. ${safeText(body.mainTitle)}`;

  chapters.push({
    id: 'intro',
    title: 'Intro',
    text: normalizeForSpeech(introText, language),
  });

  if (safeText(body.overviewParagraph)) {
    chapters.push({
      id: 'overview',
      title: language === 'de' ? 'Überblick' : 'Overview',
      text: normalizeForSpeech(safeText(body.overviewParagraph), language),
    });
  }

  for (const section of body.sections ?? []) {
    const title = safeText(section.title);
    const content = safeText(section.content);

    if (!title && !content) continue;

    const spokenText = title ? `${title}. ${content}` : content;

    chapters.push({
      id: `section-${chapters.length}`,
      title: title || (language === 'de' ? 'Abschnitt' : 'Section'),
      text: normalizeForSpeech(spokenText, language),
    });
  }

  if (safeText(body.whyMarketsCare)) {
    const spokenText =
      language === 'de'
        ? `Warum das für Märkte wichtig ist. ${safeText(body.whyMarketsCare)}`
        : `Why this matters for markets. ${safeText(body.whyMarketsCare)}`;

    chapters.push({
      id: 'markets',
      title: language === 'de' ? 'Marktrelevanz' : 'Market relevance',
      text: normalizeForSpeech(spokenText, language),
    });
  }

  if (safeText(body.whatChanged)) {
    const spokenText =
      language === 'de'
        ? `Was sich verändert hat. ${safeText(body.whatChanged)}`
        : `What changed. ${safeText(body.whatChanged)}`;

    chapters.push({
      id: 'changes',
      title: language === 'de' ? 'Veränderungen' : 'What changed',
      text: normalizeForSpeech(spokenText, language),
    });
  }

  return chapters.filter((chapter) => safeText(chapter.text).length > 0);
}

function getPiperPaths(language: 'de' | 'en') {
  const projectRoot = process.cwd();
  const piperExe = path.join(projectRoot, 'tools', 'piper', 'piper.exe');

  const modelPath =
    language === 'de'
      ? path.join(
          projectRoot,
          'voices',
          'de_DE',
          'thorsten',
          'de_DE-thorsten-medium.onnx'
        )
      : path.join(
          projectRoot,
          'voices',
          'en_US',
          'amy',
          'en_US-amy-medium.onnx'
        );

  const configPath =
    language === 'de'
      ? path.join(
          projectRoot,
          'voices',
          'de_DE',
          'thorsten',
          'de_DE-thorsten-medium.onnx.json'
        )
      : path.join(
          projectRoot,
          'voices',
          'en_US',
          'amy',
          'en_US-amy-medium.onnx.json'
        );

  return { piperExe, modelPath, configPath };
}

async function ensureFileExists(filePath: string, label: string) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`${label} nicht gefunden: ${filePath}`);
  }
}

async function runPiperToFile(
  text: string,
  language: 'de' | 'en',
  outputFile: string
) {
  const { piperExe, modelPath, configPath } = getPiperPaths(language);

  await ensureFileExists(piperExe, 'Piper');
  await ensureFileExists(modelPath, 'Stimmmodell');
  await ensureFileExists(configPath, 'Stimmkonfiguration');

  return await new Promise<void>((resolve, reject) => {
    const child = spawn(
      piperExe,
      [
        '--model',
        modelPath,
        '--config',
        configPath,
        '--output_file',
        outputFile,
      ],
      {
        windowsHide: true,
      }
    );

    let stderr = '';
    let stdout = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Piper beendet mit Code ${code}. stdout: ${stdout} stderr: ${stderr}`
          )
        );
      }
    });

    child.stdin.write(text);
    child.stdin.end();
  });
}

async function generateChapterAudio(
  chapter: AudioChapterInput,
  language: 'de' | 'en'
): Promise<ChapterAudioResponse> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'briefing-audio-'));
  const outputFile = path.join(tempDir, `${chapter.id}.wav`);

  try {
    await runPiperToFile(chapter.text, language, outputFile);

    const audioBuffer = await fs.readFile(outputFile);
    const audioBase64 = audioBuffer.toString('base64');

    return {
      id: chapter.id,
      title: chapter.title,
      audioBase64,
      mimeType: 'audio/wav',
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AudioRequestBody;
    const language: 'de' | 'en' = body.language === 'en' ? 'en' : 'de';

    const chapters = buildAudioChapters(body);

    if (!chapters.length) {
      return NextResponse.json(
        { error: 'Es wurde kein Audio-Text erzeugt.' },
        { status: 400 }
      );
    }

    const chapterAudios: ChapterAudioResponse[] = [];
    for (const chapter of chapters) {
      const audio = await generateChapterAudio(chapter, language);
      chapterAudios.push(audio);
    }

    return NextResponse.json({
      language,
      provider: 'piper',
      voice:
        language === 'de'
          ? 'de_DE-thorsten-medium'
          : 'en_US-amy-medium',
      disclosure:
        language === 'de'
          ? 'Diese Stimme ist lokal KI-generiert.'
          : 'This voice is locally AI-generated.',
      chapters: chapterAudios,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Unbekannter Fehler bei der Audio-Erzeugung.',
      },
      { status: 500 }
    );
  }
}