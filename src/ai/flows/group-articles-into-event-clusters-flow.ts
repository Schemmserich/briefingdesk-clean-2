'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/**
 * @fileOverview A Genkit flow for grouping related articles into event clusters.
 *
 * - groupArticlesIntoEventClusters - A function that handles the grouping of articles into event clusters.
 */

const ArticleSchema = z.object({
  id: z.string().describe('Unique identifier for the article.'),
  title: z.string().describe('The title of the article.'),
  source: z.string().describe('The name of the news publication.'),
  publicationTime: z.string().datetime().describe('The UTC publication timestamp in ISO format.'),
  region: z.string().describe('The geographical region the article is primarily about.'),
  category: z.string().describe('The main category of the article (e.g., Politics, Finance).'),
  url: z.string().url().describe('The URL to the original article.'),
  content: z.string().describe('The full text content of the article.'),
  canonicalHash: z.string().describe('A hash used to identify duplicate articles.'),
  trustScore: z.number().min(0).max(100).describe('A trust score for the source (0-100).'),
});

const EventClusterSchema = z.object({
  id: z.string().describe('A unique identifier for the event cluster.'),
  title: z.string().describe('A concise, descriptive title for the event cluster.'),
  overview: z
    .string()
    .describe(
      'A brief summary of the event, consolidating key information from all articles in this cluster.'
    ),
  articles: z.array(ArticleSchema).describe('The list of articles belonging to this cluster.'),
});

const GroupArticlesIntoEventClustersInputSchema = z.object({
  articles: z.array(ArticleSchema).describe('An array of articles to be grouped into event clusters.'),
});

const GroupArticlesIntoEventClustersOutputSchema = z.array(EventClusterSchema).describe('An array of event clusters, each containing related articles.');

export type Article = z.infer<typeof ArticleSchema>;
export type EventCluster = z.infer<typeof EventClusterSchema>;
export type GroupArticlesIntoEventClustersInput = z.infer<typeof GroupArticlesIntoEventClustersInputSchema>;
export type GroupArticlesIntoEventClustersOutput = z.infer<typeof GroupArticlesIntoEventClustersOutputSchema>;

const groupingPrompt = ai.definePrompt({
  name: 'groupingArticlesPrompt',
  input: {
    schema: z.object({ articlesJson: z.string().describe('A JSON string representing an array of articles.') }),
  },
  output: {
    schema: GroupArticlesIntoEventClustersOutputSchema,
  },
  prompt: `You are an expert news analyst tasked with grouping related articles into distinct event clusters.
Your goal is to identify unique ongoing news stories or events and group all relevant articles under that event.

For each event cluster, provide:
- A unique 'id' for the cluster.
- A concise, descriptive 'title' that summarizes the main event.
- A brief 'overview' paragraph that synthesizes the key information from all articles in that cluster.
- An array of the original 'articles' that belong to this cluster. Each article object in this array must be one of the provided articles, including all its original fields.

Ensure that:
1. Each article from the provided list is assigned to exactly one event cluster. Do not omit any articles.
2. Event clusters represent distinct, coherent news stories.
3. The 'overview' consolidates information and provides context.

Here are the articles in JSON format:
{{{articlesJson}}}`,
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

    if (!output) {
      throw new Error('Failed to group articles into event clusters: No output from prompt.');
    }

    return output;
  }
);

export async function groupArticlesIntoEventClusters(
  input: GroupArticlesIntoEventClustersInput
): Promise<GroupArticlesIntoEventClustersOutput> {
  return groupArticlesIntoEventClustersFlow(input);
}
