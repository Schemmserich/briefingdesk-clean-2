'use server';
/**
 * @fileOverview A Genkit flow for generating various types of curated news briefings
 *               based on user-defined criteria and a list of articles.
 *
 * - generateCuratedBriefing - A function that handles the briefing generation process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// --- Internal Data Models (Not exported to avoid "use server" constraints) ---

const ArticleSchema = z.object({
  id: z.string().describe('Unique identifier for the article.'),
  title: z.string().describe('Title of the article.'),
  url: z.string().url().describe('URL to the original article.'),
  publicationDate: z.string().datetime().describe('ISO 8601 formatted publication date and time of the article.'),
  sourceName: z.string().describe('Name of the news source (e.g., "The Guardian", "NYT").'),
  region: z.string().describe('Geographic region the article primarily covers (e.g., "Global", "Europe", "North America").'),
  category: z.string().describe('Category of the article (e.g., "Politics", "Economy", "Technology").'),
  content: z.string().describe('The full content of the article.'),
  summary: z.string().optional().describe('An optional pre-summarized version of the article content.'),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional().describe('Overall sentiment of the article.'),
  canonicalHash: z.string().optional().describe('A hash used for duplicate detection.'),
  trustScore: z.number().min(0).max(100).optional().describe('Trust score of the source (0-100).'),
});

const SupportingSourceSchema = z.object({
  title: z.string().describe('Title of the supporting article.'),
  url: z.string().url().describe('URL to the supporting article.'),
  sourceName: z.string().describe('Name of the news source.'),
  publicationDate: z.string().datetime().describe('Publication date of the supporting article.'),
});

const EventClusterSchema = z.object({
  title: z.string().describe('A concise title for the event cluster.'),
  summary: z.string().describe('A summary of the clustered event, integrating information from multiple sources.'),
  supportingSources: z.array(SupportingSourceSchema).describe('List of articles that support this event cluster.'),
});

const GenerateCuratedBriefingInputSchema = z.object({
  language: z.enum(['en', 'de']).describe('The desired language for the briefing output.'),
  timeframe: z.string().describe('The timeframe for which the briefing should be generated (e.g., "last 24 hours", "today", "this week").'),
  categories: z.array(z.string()).describe('A list of news categories to include in the briefing (e.g., "Politics", "Economy", "Technology").'),
  regions: z.array(z.string()).describe('A list of geographic regions to focus on (e.g., "Global", "Europe", "North America").'),
  articles: z.array(ArticleSchema).describe('A list of pre-processed and filtered articles to be used for generating the briefing.'),
  briefingType: z.enum(['Ultra Short Update', 'Short Update', 'Morning Briefing', 'Executive Summary']).describe('The desired type of briefing, dictating its length and detail.'),
  includeMarketInsights: z.boolean().optional().describe('If true, include a "Why markets care" section.'),
  includeChangeAnalysis: z.boolean().optional().describe('If true, include a "What changed in this window" section.'),
});

const BriefingResultOutputSchema = z.object({
  mainTitle: z.string().describe('The main title of the briefing.'),
  overviewParagraph: z.string().describe('A concise overview paragraph summarizing the most important events.'),
  briefingType: z.enum(['Ultra Short Update', 'Short Update', 'Morning Briefing', 'Executive Summary']).describe('The type of briefing generated.'),
  confidenceScore: z.number().min(0).max(100).describe('A score (0-100) indicating the AI\'s confidence in the summary accuracy and source quality, based on article trust scores and corroboration.'),
  sections: z.array(z.object({
    title: z.string().describe('Title of the section (e.g., "Key Political Developments").'),
    content: z.string().describe('Content of the section, summarizing events within that category.'),
  })).optional().describe('Detailed sections, typically by category, for more in-depth briefings.'),
  eventClusters: z.array(EventClusterSchema).optional().describe('Groups of related articles forming distinct event clusters.'),
  whyMarketsCare: z.string().optional().describe('An optional analytical section explaining the potential impact of the reported news on global or specific markets.'),
  whatChanged: z.string().optional().describe('An optional analytical section highlighting key developments or shifts compared to previous reporting.'),
});

// --- Exports Types ---
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
  prompt: `You are an expert news analyst and briefing generator for a professional audience. Your task is to create a comprehensive and concise news briefing based on the provided articles and user criteria.

Strictly adhere to the following rules:
- **Summaries must be original and highly concise.** Never reproduce full copyrighted articles or long excerpts. Condense information significantly.
- **Clearly distinguish between factual reporting and analysis/opinion.** If an article presents opinion, state that it is an opinion or analysis from the source.
- **Explicitly mark any uncertainty** in the reporting using phrases like "reportedly," "it is unclear if," "sources suggest," or similar.
- **Only use information from the provided articles.** Do not invent information, speculate, or bring in outside knowledge.
- **Maintain a neutral and objective tone** unless explicitly reporting on sentiment expressed by a source.
- **The language for the entire briefing output MUST be in: "{{{language}}}"**.
- **The main title of the briefing should be in the target language.** Source article titles within event clusters (if any) should remain in their original language.
- Focus the briefing on events within the timeframe: "{{{timeframe}}}".
- Prioritize content related to categories: {{{categories}}} and regions: {{{regions}}}.

The desired briefing type is: "{{{briefingType}}}". Follow the instructions below based on this type:

1.  **"Ultra Short Update"**:
    - Provide only a \`mainTitle\` and an \`overviewParagraph\`.
    - The \`overviewParagraph\` must be extremely condensed, covering only the most critical global events from the articles.
    - Omit \`sections\`, \`eventClusters\`, \`whyMarketsCare\`, and \`whatChanged\`.

2.  **"Short Update"**:
    - Provide a \`mainTitle\` and a concise \`overviewParagraph\`.
    - The \`overviewParagraph\` should summarize key events across major themes/categories.
    - Include 1-2 very brief \`sections\` if distinct categories are present.
    - Omit \`eventClusters\`.
    - \`whyMarketsCare\` and \`whatChanged\` should only be included if \`includeMarketInsights\` or \`includeChangeAnalysis\` are true AND the information is absolutely crucial and very brief.

3.  **"Morning Briefing"**:
    - Provide a \`mainTitle\` and a comprehensive \`overviewParagraph\`.
    - Include well-structured \`sections\` by category.
    - \`eventClusters\` may be present for major, multi-source events.
    - \`whyMarketsCare\` and \`whatChanged\` should be concisely included if \`includeMarketInsights\` or \`includeChangeAnalysis\` are true.

4.  **"Executive Summary"**:
    - Provide a \`mainTitle\` and a detailed, analytical \`overviewParagraph\`.
    - Include well-structured \`sections\` by category.
    - Include detailed \`eventClusters\` where appropriate, integrating information from multiple sources per cluster.
    - If \`includeMarketInsights\` is true, generate a "Why markets care" section explaining market impact.
    - If \`includeChangeAnalysis\` is true, generate a "What changed in this window" section highlighting key developments.

{{#if includeMarketInsights}}
**Instruction for "Why markets care":** This section should explain the potential impact of the reported news on global or specific markets.
{{/if}}

{{#if includeChangeAnalysis}}
**Instruction for "What changed in this window":** This section should highlight key developments or shifts compared to previous reporting, indicating how the situation has evolved within the given timeframe.
{{/if}}

Output Structure:
Provide a single JSON object conforming STRICTLY to the \`BriefingResultOutputSchema\`. Ensure all string fields are properly quoted and valid JSON.
Estimate a \`confidenceScore\` from 0-100 based on the consistency and perceived trustworthiness of the sources provided. Higher scores for multiple confirming high-trust sources. If trust scores are not provided, assume average trust.

Here are the articles to process:

{{#each articles}}
--- Article (ID: {{this.id}}, Source: {{this.sourceName}}, Published: {{this.publicationDate}}, Region: {{this.region}}, Category: {{this.category}}, Trust Score: {{this.trustScore}}) ---
Title: {{this.title}}
Content:
{{{this.content}}}
---
{{/each}}

Generate the BriefingResult JSON object:
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

// --- Wrapper Function for External Calls ---

export async function generateCuratedBriefing(
  input: GenerateCuratedBriefingInput
): Promise<BriefingResultOutput> {
  return generateCuratedBriefingFlow(input);
}
