'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAnalyticalBriefingSectionsInputSchema = z.object({
  briefingContent: z.string(),
  includeWhyMarketsCare: z.boolean().default(false),
  includeWhatChangedInThisWindow: z.boolean().default(false),
  language: z.string(),
});

const GenerateAnalyticalBriefingSectionsOutputSchema = z.object({
  whyMarketsCare: z.string().nullable(),
  whatChangedInThisWindow: z.string().nullable(),
});

export type GenerateAnalyticalBriefingSectionsInput = z.infer<typeof GenerateAnalyticalBriefingSectionsInputSchema>;
export type GenerateAnalyticalBriefingSectionsOutput = z.infer<typeof GenerateAnalyticalBriefingSectionsOutputSchema>;

const whyMarketsCarePrompt = ai.definePrompt({
  name: 'whyMarketsCarePrompt',
  input: { schema: z.object({ briefingContent: z.string(), language: z.string() }) },
  output: { schema: z.string() },
  prompt: `Explain in {{language}} why financial markets care about this:
{{{briefingContent}}}`
});

const whatChangedInThisWindowPrompt = ai.definePrompt({
  name: 'whatChangedInThisWindowPrompt',
  input: { schema: z.object({ briefingContent: z.string(), language: z.string() }) },
  output: { schema: z.string() },
  prompt: `Explain in {{language}} what changed in this window:
{{{briefingContent}}}`
});

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

    return { whyMarketsCare, whatChangedInThisWindow };
  }
);

export async function generateAnalyticalBriefingSections(input: GenerateAnalyticalBriefingSectionsInput): Promise<GenerateAnalyticalBriefingSectionsOutput> {
  return generateAnalyticalBriefingSectionsFlow(input);
}
