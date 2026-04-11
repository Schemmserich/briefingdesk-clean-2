'use server';
/**
 * @fileOverview A Genkit flow for generating various types of curated news briefings.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { BriefingResultOutput, GenerateCuratedBriefingInput } from '@/lib/types';

// Internal schemas - NOT exported to comply with Next.js 'use server' restrictions
const ArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  publicationDate: z.string().datetime(),
  sourceName: z.string(),
  region: z.string(),
  category: z.string(),
  content: z.string(),
  summary: z.string().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional(),
  canonicalHash: z.string().optional(),
  trustScore: z.number().min(0).max(100).optional(),
});

const SupportingSourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  sourceName: z.string(),
  publicationDate: z.string().datetime(),
});

const EventClusterSchema = z.object({
  title: z.string(),
  summary: z.string(),
  supportingSources: z.array(SupportingSourceSchema),
});

const InternalInputSchema = z.object({
  language: z.enum(['en', 'de']),
  timeframe: z.string(),
  categories: z.array(z.string()),
  regions: z.array(z.string()),
  articles: z.array(ArticleSchema),
  briefingType: z.enum(['Ultra Short Update', 'Short Update', 'Morning Briefing', 'Executive Summary']),
  includeMarketInsights: z.boolean().optional(),
  includeChangeAnalysis: z.boolean().optional(),
});

const InternalOutputSchema = z.object({
  mainTitle: z.string(),
  overviewParagraph: z.string(),
  briefingType: z.enum(['Ultra Short Update', 'Short Update', 'Morning Briefing', 'Executive Summary']),
  confidenceScore: z.number().min(0).max(100),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })).optional(),
  eventClusters: z.array(EventClusterSchema).optional(),
  whyMarketsCare: z.string().optional(),
  whatChanged: z.string().optional(),
});

const generateCuratedBriefingPrompt = ai.definePrompt({
  name: 'generateCuratedBriefingPrompt',
  input: { schema: InternalInputSchema },
  output: { schema: InternalOutputSchema },
  prompt: `You are an expert news analyst and briefing generator for a professional audience. Create a comprehensive and concise news briefing in "{{language}}".

Strictly adhere to these rules:
- **Summaries must be original and highly concise.** Never reproduce full copyrighted articles or long excerpts.
- **Clearly distinguish factual reporting from analysis.**
- **The language for the entire briefing output MUST be in: "{{language}}"**.
- Focus on timeframe: "{{timeframe}}".
- Prioritize categories: {{#each categories}}{{{this}}}, {{/each}} and regions: {{#each regions}}{{{this}}}, {{/each}}.

Desired briefing type: "{{briefingType}}".
Instructions:
1. **"Ultra Short Update"**: Only \`mainTitle\` and \`overviewParagraph\`.
2. **"Short Update"**: \`mainTitle\`, \`overviewParagraph\`, and 1-2 brief \`sections\`.
3. **"Morning Briefing"**: \`mainTitle\`, \`overviewParagraph\`, \`sections\`, and \`eventClusters\`.
4. **"Executive Summary"**: Detailed \`mainTitle\`, analytical \`overviewParagraph\`, deep \`sections\`, and \`eventClusters\`.

{{#if includeMarketInsights}}Instruction: Generate a "Why markets care" analysis in "{{language}}".{{/if}}
{{#if includeChangeAnalysis}}Instruction: Highlight "What changed in this window" in "{{language}}".{{/if}}

Articles:
{{#each articles}}
--- Article ({{{this.sourceName}}}) ---
Title: {{{this.title}}}
Content: {{{this.content}}}
---
{{/each}}`
});

const generateCuratedBriefingFlow = ai.defineFlow(
  {
    name: 'generateCuratedBriefingFlow',
    inputSchema: InternalInputSchema,
    outputSchema: InternalOutputSchema,
  },
  async (input) => {
    const { output } = await generateCuratedBriefingPrompt(input);
    if (!output) throw new Error('Generation failed');
    return output;
  }
);

export async function generateCuratedBriefing(input: any): Promise<any> {
  return generateCuratedBriefingFlow(input);
}
