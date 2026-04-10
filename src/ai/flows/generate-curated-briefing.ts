'use server';
/**
 * @fileOverview A Genkit flow for generating various types of curated news briefings
 *               based on user-defined criteria and a list of articles.
 *
 * - generateCuratedBriefing - A function that handles the briefing generation process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// --- Internal Data Models ---

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

const GenerateCuratedBriefingInputSchema = z.object({
  language: z.enum(['en', 'de']),
  timeframe: z.string(),
  categories: z.array(z.string()),
  regions: z.array(z.string()),
  articles: z.array(ArticleSchema),
  briefingType: z.enum(['Ultra Short Update', 'Short Update', 'Morning Briefing', 'Executive Summary']),
  includeMarketInsights: z.boolean().optional(),
  includeChangeAnalysis: z.boolean().optional(),
});

const BriefingResultOutputSchema = z.object({
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

export type Article = z.infer<typeof ArticleSchema>;
export type SupportingSource = z.infer<typeof SupportingSourceSchema>;
export type EventCluster = z.infer<typeof EventClusterSchema>;
export type GenerateCuratedBriefingInput = z.infer<typeof GenerateCuratedBriefingInputSchema>;
export type BriefingResultOutput = z.infer<typeof BriefingResultOutputSchema>;

// --- Genkit Prompt Definition ---

const generateCuratedBriefingPrompt = ai.definePrompt({
  name: 'generateCuratedBriefingPrompt',
  input: { schema: GenerateCuratedBriefingInputSchema },
  output: { schema: BriefingResultOutputSchema },
  prompt: `You are an expert news analyst and briefing generator. Your task is to create a professional news briefing in the language: \"{{{language}}}\".

IMPORTANT: You will receive articles in different languages (e.g., English, German). You MUST translate ALL relevant information into \"{{{language}}}\" for the final briefing.

Strictly adhere to the following rules:
- **Language**: The entire briefing (titles, summaries, analysis) MUST be in \"{{{language}}}\".
- **Source Translation**: If an article is in German but the output is English, translate it. If it is in English but the output is German, translate it.
- **Conciseness**: Summaries must be original and highly condensed.
- **Accuracy**: Only use information from the provided articles.
- **Relevance**: Prioritize content related to categories: {{{categories}}} and regions: {{{regions}}}.
- **Context**: Focus on events within the timeframe: \"{{{timeframe}}}\".

The desired briefing type is: \"{{{briefingType}}}\". Follow these structural requirements:

1.  **\"Ultra Short Update\"**: Only \`mainTitle\` and \`overviewParagraph\`.
2.  **\"Short Update\"**: \`mainTitle\`, \`overviewParagraph\`, and 1-2 brief \`sections\`.
3.  **\"Morning Briefing\"**: \`mainTitle\`, \`overviewParagraph\`, structured \`sections\` by category, and \`eventClusters\`.
4.  **\"Executive Summary\"**: Detailed \`mainTitle\`, analytical \`overviewParagraph\`, deep \`sections\`, and comprehensive \`eventClusters\`.

{{#if includeMarketInsights}}
**Instruction for \"Why markets care\":** Explain the financial/economic impact of this news in \"{{{language}}}\".
{{/if}}

{{#if includeChangeAnalysis}}
**Instruction for \"What changed in this window\":** Highlight developments or shifts compared to previous status in \"{{{language}}}\".
{{/if}}

Output Structure:
Provide a single JSON object. Ensure all string fields are valid JSON.

Here are the articles to process:

{{#each articles}}
--- Article (ID: {{this.id}}, Source: {{this.sourceName}}, Region: {{this.region}}, Category: {{this.category}}) ---
Title: {{this.title}}
Content:
{{{this.content}}}
---
{{/each}}

Generate the BriefingResult JSON object in \"{{{language}}}\":
`
});

// --- Genkit Flow Definition ---

const generateCuratedBriefingFlow = ai.defineFlow(
  {
    name: 'generateCuratedBriefingFlow',
    inputSchema: GenerateCuratedBriefingInputSchema,
    outputSchema: BriefingResultOutputSchema,
  },
  async (input) => {
    const { output } = await generateCuratedBriefingPrompt(input);

    if (!output) {
      throw new Error('Failed to generate briefing output.');
    }

    return output;
  }
);

export async function generateCuratedBriefing(
  input: GenerateCuratedBriefingInput
): Promise<BriefingResultOutput> {
  return generateCuratedBriefingFlow(input);
}
