"use server";

import { ai } from "@/ai/genkit";
import { z } from "genkit";
import { mapAiErrorToUserMessage, withAiRetry } from "@/lib/aiRetry";

const BriefingTypeSchema = z.enum([
  "Ultra Short Update",
  "Short Update",
  "Morning Briefing",
  "Executive Summary",
]);

const ArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  publicationDate: z.string(),
  sourceName: z.string(),
  region: z.string(),
  category: z.string(),
  content: z.string(),
  summary: z.string().optional(),
  sentiment: z.enum(["positive", "negative", "neutral", "mixed"]).optional(),
  canonicalHash: z.string().optional(),
  trustScore: z.number().optional(),
});

const InternalInputSchema = z.object({
  language: z.enum(["en", "de"]),
  timeframe: z.string(),
  categories: z.array(z.string()),
  regions: z.array(z.string()),
  articles: z.array(ArticleSchema),
  briefingType: BriefingTypeSchema,
  includeMarketInsights: z.boolean().optional(),
  includeChangeAnalysis: z.boolean().optional(),
});

const InternalOutputSchema = z.object({
  mainTitle: z.string(),
  overviewParagraph: z.string(),
  briefingType: BriefingTypeSchema,
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
  name: "generateCuratedBriefingPromptV2",
  input: { schema: InternalInputSchema },
  output: { schema: InternalOutputSchema },
  prompt: `You are the senior editor of a professional news intelligence service.

Create a high-signal briefing in {{language}} from ONLY the supplied articles.
The output must be factual, concise, prioritized and free of repetition.

NON-NEGOTIABLE SOURCE RULES
- Use only facts explicitly contained in the supplied articles.
- Never invent events, numbers, quotations, causes, consequences, sources, URLs or dates.
- If reports disagree or an interpretation is uncertain, say so briefly.
- Separate confirmed reporting from analytical inference.
- Write the entire output in {{language}}.

EDITORIAL PRIORITIZATION
- Select the developments with the greatest political, economic, market, technological or societal consequence.
- Treat several articles about the same event as ONE development.
- Prefer the newest meaningful development and use other reports only to add genuinely different facts.
- Do not create one section per source and do not repeat the same event in different sections.
- Give each section a distinct event or consequence.

ANTI-REPETITION RULES
- mainTitle: one concise editorial headline; do not include the output-format name.
- overviewParagraph: synthesize the overall picture; do not copy section titles or retell every section.
- sections: add only new facts, context or consequences not already stated verbatim in the overview.
- whyMarketsCare: explain transmission channels to markets; do not summarize the news again.
- whatChanged: state what is new within the selected window; do not repeat background facts.
- Never repeat the article count, source count, selected filters, timeframe or app instructions in prose.
- Avoid filler such as “several developments were important”, “the situation remains dynamic”, or source-name lists.
- No sentence may appear twice or be closely paraphrased in two fields.

FORMAT CONTRACT FOR "{{briefingType}}"
1. Ultra Short Update
   - overviewParagraph: 1-2 sentences, maximum 65 words.
   - sections: omit entirely.
   - Focus only on the single most important development and, if essential, one consequence.
2. Short Update
   - overviewParagraph: maximum 2 sentences.
   - sections: 1-2 sections, each maximum 2 sentences.
   - Cover only the two most consequential distinct developments.
3. Morning Briefing
   - overviewParagraph: 2-3 sentences setting the agenda.
   - sections: 3-5 prioritized sections, each maximum 3 sentences.
   - Start with what matters most today, then cover clearly distinct developments.
4. Executive Summary
   - overviewParagraph: 3-4 analytical sentences.
   - sections: 4-6 sections, each maximum 4 sentences.
   - Add decision-relevant context, implications and uncertainty without speculation.

OPTIONAL ANALYSIS
{{#if includeMarketInsights}}
- Fill whyMarketsCare with the concrete market transmission mechanism in no more than 3 sentences.
- Discuss rates, growth, margins, commodities, currencies, risk appetite or sector effects only when supported.
{{else}}
- Omit whyMarketsCare.
{{/if}}

{{#if includeChangeAnalysis}}
- Fill whatChanged with only the genuinely new development in this window in no more than 3 sentences.
- Do not claim a change if the supplied articles do not establish one; state the limitation briefly instead.
{{else}}
- Omit whatChanged.
{{/if}}

CONFIDENCE SCORE
- Base confidenceScore on source quality, corroboration, recency and consistency.
- Use 85-100 only for strong multi-source confirmation, 65-84 for solid reporting with limited uncertainty,
  45-64 for thin or partly conflicting evidence, and below 45 only for materially weak evidence.

Context:
- Focus timeframe: {{timeframe}}
- Prioritized categories: {{#each categories}}{{{this}}}; {{/each}}
- Prioritized regions: {{#each regions}}{{{this}}}; {{/each}}

Input articles:
{{#each articles}}
--- Article ---
Title: {{{this.title}}}
Source: {{{this.sourceName}}}
Publication date: {{{this.publicationDate}}}
Region: {{{this.region}}}
Category: {{{this.category}}}
Trust score: {{{this.trustScore}}}
URL: {{{this.url}}}
Summary: {{{this.summary}}}
Content: {{{this.content}}}
---
{{/each}}
`,
});

async function runPrimaryPrompt(input: z.infer<typeof InternalInputSchema>) {
  const { output } = await generateCuratedBriefingPrompt(input);
  if (!output) {
    throw new Error("Generation failed: no output returned by primary model");
  }
  return output;
}

export async function generateCuratedBriefing(
  input: z.infer<typeof InternalInputSchema>
): Promise<z.infer<typeof InternalOutputSchema>> {
  try {
    return await withAiRetry(() => runPrimaryPrompt(input), {
      retries: 1,
      baseDelayMs: 1200,
    });
  } catch (error) {
    console.error("AI briefing generation failed:", error);
    mapAiErrorToUserMessage(error);
  }
}
