'use server';
/**
 * @fileOverview Ein Genkit-Flow zur Generierung verschiedener Arten von kuratierten Nachrichtenbriefings.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { withAiRetry, mapAiErrorToUserMessage } from '@/lib/aiRetry';

const ArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  publicationDate: z.string(),
  sourceName: z.string(),
  region: z.string(),
  category: z.string(),
  content: z.string(),
  summary: z.string().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional(),
  canonicalHash: z.string().optional(),
  trustScore: z.number().optional(),
});

const InternalInputSchema = z.object({
  language: z.enum(['en', 'de']),
  timeframe: z.string(),
  categories: z.array(z.string()),
  regions: z.array(z.string()),
  articles: z.array(ArticleSchema),
  briefingType: z.enum([
    'Ultra Short Update',
    'Short Update',
    'Morning Briefing',
    'Executive Summary',
  ]),
  includeMarketInsights: z.boolean().optional(),
  includeChangeAnalysis: z.boolean().optional(),
});

const InternalOutputSchema = z.object({
  mainTitle: z.string(),
  overviewParagraph: z.string(),
  briefingType: z.enum([
    'Ultra Short Update',
    'Short Update',
    'Morning Briefing',
    'Executive Summary',
  ]),
  confidenceScore: z.number().min(0).max(100),
  sections: z
    .array(
      z.object({
        title: z.string(),
        content: z.string(),
      })
    )
    .optional(),
  whyMarketsCare: z.string().optional(),
  whatChanged: z.string().optional(),
});

const generateCuratedBriefingPrompt = ai.definePrompt({
  name: 'generateCuratedBriefingPrompt',
  input: { schema: InternalInputSchema },
  output: { schema: InternalOutputSchema },
  prompt: `You are an expert news analyst and briefing generator for a professional audience.

Create a concise, professional news briefing in "{{language}}".

Strict rules:
- Use ONLY the provided input articles.
- Do NOT invent sources, URLs, publication dates, companies, events, or supporting references.
- Do NOT fabricate article metadata.
- If some information is not explicitly present in the input, do not add it.
- Summaries must be original, concise, and based strictly on the provided content.
- Clearly distinguish factual reporting from interpretation.
- The entire output language MUST be "{{language}}".

Focus timeframe: "{{timeframe}}".
Prioritized categories: {{#each categories}}{{{this}}}, {{/each}}
Prioritized regions: {{#each regions}}{{{this}}}, {{/each}}

Briefing type: "{{briefingType}}".

Formatting rules:
1. "Ultra Short Update": return only mainTitle and overviewParagraph.
2. "Short Update": return mainTitle, overviewParagraph, and 1-2 short sections.
3. "Morning Briefing": return mainTitle, overviewParagraph, and several sections.
4. "Executive Summary": return mainTitle, analytical overviewParagraph, and deeper sections.

{{#if includeMarketInsights}}
Add a short "whyMarketsCare" field in "{{language}}", based only on the provided articles.
{{/if}}

{{#if includeChangeAnalysis}}
Add a short "whatChanged" field in "{{language}}", based only on the provided articles and timeframe.
{{/if}}

Input articles:
{{#each articles}}
--- Article ---
Title: {{{this.title}}}
Source: {{{this.sourceName}}}
Publication date: {{{this.publicationDate}}}
Region: {{{this.region}}}
Category: {{{this.category}}}
URL: {{{this.url}}}
Content: {{{this.content}}}
---
{{/each}}
`,
});

async function runPrimaryPrompt(input: z.infer<typeof InternalInputSchema>) {
  const { output } = await generateCuratedBriefingPrompt(input);
  if (!output) {
    throw new Error('Generation failed: no output returned by primary model');
  }
  return output;
}

function getErrorMessage(error: any): string {
  return String(error?.originalMessage || error?.message || '').toLowerCase();
}

function is429Error(error: any): boolean {
  const message = getErrorMessage(error);
  return (
    error?.code === 429 ||
    error?.status === 'RESOURCE_EXHAUSTED' ||
    message.includes('429') ||
    message.includes('quota') ||
    message.includes('too many requests') ||
    message.includes('resource_exhausted')
  );
}

function is503Error(error: any): boolean {
  const message = getErrorMessage(error);
  return (
    error?.code === 503 ||
    error?.status === 'UNAVAILABLE' ||
    message.includes('503') ||
    message.includes('service unavailable') ||
    message.includes('high demand') ||
    message.includes('unavailable')
  );
}

const generateCuratedBriefingFlow = ai.defineFlow(
  {
    name: 'generateCuratedBriefingFlow',
    inputSchema: InternalInputSchema,
    outputSchema: InternalOutputSchema,
  },
  async (input) => {
    try {
      return await withAiRetry(() => runPrimaryPrompt(input), {
        retries: 0,
        baseDelayMs: 1500,
      });
    } catch (primaryError: any) {
      console.error('Primary AI prompt failed:', primaryError);

      if (is429Error(primaryError)) {
        mapAiErrorToUserMessage(primaryError);
        throw primaryError;
      }

      if (!is503Error(primaryError)) {
        mapAiErrorToUserMessage(primaryError);
        throw primaryError;
      }

      mapAiErrorToUserMessage(primaryError);
      throw primaryError;
    }
  }
);

export async function generateCuratedBriefing(input: any): Promise<any> {
  return generateCuratedBriefingFlow(input);
}