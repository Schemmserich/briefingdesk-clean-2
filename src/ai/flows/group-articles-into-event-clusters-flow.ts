'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  publicationTime: z.string().datetime(),
  region: z.string(),
  category: z.string(),
  url: z.string().url(),
  content: z.string(),
  canonicalHash: z.string(),
  trustScore: z.number(),
});

const EventClusterSchema = z.object({
  id: z.string(),
  title: z.string(),
  overview: z.string(),
  articles: z.array(ArticleSchema),
});

const GroupArticlesIntoEventClustersInputSchema = z.object({
  articles: z.array(ArticleSchema),
});

const GroupArticlesIntoEventClustersOutputSchema = z.array(EventClusterSchema);

export type GroupArticlesIntoEventClustersInput = z.infer<typeof GroupArticlesIntoEventClustersInputSchema>;
export type GroupArticlesIntoEventClustersOutput = z.infer<typeof GroupArticlesIntoEventClustersOutputSchema>;

const groupingPrompt = ai.definePrompt({
  name: 'groupingArticlesPrompt',
  input: { schema: z.object({ articlesJson: z.string() }) },
  output: { schema: GroupArticlesIntoEventClustersOutputSchema },
  prompt: `Group these articles into event clusters. For each, provide a title, overview, and the list of articles.
Articles JSON:
{{{articlesJson}}}`
});

const groupArticlesIntoEventClustersFlow = ai.defineFlow(
  {
    name: 'groupArticlesIntoEventClustersFlow',
    inputSchema: GroupArticlesIntoEventClustersInputSchema,
    outputSchema: GroupArticlesIntoEventClustersOutputSchema,
  },
  async (input) => {
    const articlesJson = JSON.stringify(input.articles, null, 2);
    const { output } = await groupingPrompt({ articlesJson });
    if (!output) throw new Error('Grouping failed');
    return output;
  }
);

export async function groupArticlesIntoEventClusters(input: GroupArticlesIntoEventClustersInput): Promise<GroupArticlesIntoEventClustersOutput> {
  return groupArticlesIntoEventClustersFlow(input);
}
