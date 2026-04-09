'use server';
/**
 * @fileOverview A Genkit flow for generating optional analytical sections ('Why markets care', 'What changed in this window') for a news briefing.
 *
 * - generateAnalyticalBriefingSections - A function that handles the generation of analytical briefing sections.
 * - GenerateAnalyticalBriefingSectionsInput - The input type for the generateAnalyticalBriefingSections function.
 * - GenerateAnalyticalBriefingSectionsOutput - The return type for the generateAnalyticalBriefingSections function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAnalyticalBriefingSectionsInputSchema = z.object({
  briefingContent: z.string().describe('The primary content of the news briefing for analysis.'),
  includeWhyMarketsCare: z.boolean().default(false).describe('Whether to generate the "Why markets care" section.'),
  includeWhatChangedInThisWindow: z.boolean().default(false).describe('Whether to generate the "What changed in this window" section.'),
  language: z.string().describe('The language for the generated analytical sections (e.g., "en", "de").'),
});
export type GenerateAnalyticalBriefingSectionsInput = z.infer<typeof GenerateAnalyticalBriefingSectionsInputSchema>;

const GenerateAnalyticalBriefingSectionsOutputSchema = z.object({
  whyMarketsCare: z.string().nullable().describe('The generated "Why markets care" analysis, or null if not requested.'),
  whatChangedInThisWindow: z.string().nullable().describe('The generated "What changed in this window" analysis, or null if not requested.'),
});
export type GenerateAnalyticalBriefingSectionsOutput = z.infer<typeof GenerateAnalyticalBriefingSectionsOutputSchema>;

const whyMarketsCarePrompt = ai.definePrompt({
  name: 'whyMarketsCarePrompt',
  input: { schema: z.object({ briefingContent: z.string(), language: z.string() }) },
  output: { schema: z.string() },
  prompt: `As an expert financial analyst, analyze the following news briefing content and explain, in {{language}} language, why financial markets might care about this news. Focus on potential economic impacts, investor sentiment, and relevant industry sectors. Provide a concise, clear analysis.

News Briefing Content:
"""
{{{briefingContent}}}
"""`,
});

const whatChangedInThisWindowPrompt = ai.definePrompt({
  name: 'whatChangedInThisWindowPrompt',
  input: { schema: z.object({ briefingContent: z.string(), language: z.string() }) },
  output: { schema: z.string() },
  prompt: `As a keen observer of current affairs, analyze the following news briefing content and identify the most significant changes or key developments that occurred within the scope of this news, in {{language}} language. Highlight what is new, different, or has evolved based on the provided information.

News Briefing Content:
"""
{{{briefingContent}}}
"""`,
});

export async function generateAnalyticalBriefingSections(input: GenerateAnalyticalBriefingSectionsInput): Promise<GenerateAnalyticalBriefingSectionsOutput> {
  return generateAnalyticalBriefingSectionsFlow(input);
}

const generateAnalyticalBriefingSectionsFlow = ai.defineFlow(
  {
    name: 'generateAnalyticalBriefingSectionsFlow',
    inputSchema: GenerateAnalyticalBriefingSectionsInputSchema,
    outputSchema: GenerateAnalyticalBriefingSectionsOutputSchema,
  },
  async (input) => {
    let whyMarketsCare: string | null = null;
    let whatChangedInThisWindow: string | null = null;

    if (input.includeWhyMarketsCare) {
      const { output } = await whyMarketsCarePrompt({ briefingContent: input.briefingContent, language: input.language });
      whyMarketsCare = output!;
    }

    if (input.includeWhatChangedInThisWindow) {
      const { output } = await whatChangedInThisWindowPrompt({ briefingContent: input.briefingContent, language: input.language });
      whatChangedInThisWindow = output!;
    }

    return {
      whyMarketsCare,
      whatChangedInThisWindow,
    };
  }
);
