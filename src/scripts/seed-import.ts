import Parser from 'rss-parser';
import { ingestArticles } from '@/lib/sources/ingest';
import { ImportedArticle } from '@/lib/sources/types';

const parser = new Parser();

function isFresh(pubDate?: string, maxHours = 24): boolean {
  if (!pubDate) return false;
  const published = new Date(pubDate).getTime();
  if (Number.isNaN(published)) return false;

  const cutoff = Date.now() - maxHours * 60 * 60 * 1000;
  return published >= cutoff;
}

async function importWorldFeed(): Promise<ImportedArticle[]> {
  const feedUrl = 'https://feeds.bbci.co.uk/news/world/rss.xml';
  const feed = await parser.parseURL(feedUrl);

  return (feed.items ?? [])
    .filter((item) => isFresh(item.pubDate, 24))
    .slice(0, 10)
    .map((item, index) => ({
      externalId: item.guid ?? `world-${index}`,
      sourceSlug: 'bbc',
      sourceName: 'BBC',
      title: item.title ?? 'Untitled',
      url: item.link ?? 'https://example.com',
      publicationDate: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      language: 'en',
      region: 'Global',
      category: 'Politics',
      content:
        item.contentSnippet ??
        item.content ??
        item.title ??
        'No content available.',
      summary: item.contentSnippet ?? undefined,
      trustScore: 95,
    }));
}

async function importBusinessFeed(): Promise<ImportedArticle[]> {
  const feedUrl = 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml';
  const feed = await parser.parseURL(feedUrl);

  return (feed.items ?? [])
    .filter((item) => isFresh(item.pubDate, 24))
    .slice(0, 10)
    .map((item, index) => ({
      externalId: item.guid ?? `business-${index}`,
      sourceSlug: 'nyt',
      sourceName: 'New York Times',
      title: item.title ?? 'Untitled',
      url: item.link ?? 'https://example.com',
      publicationDate: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      language: 'de',
      region: 'Europe',
      category: 'Economy',
      content:
        item.contentSnippet ??
        item.content ??
        item.title ??
        'No content available.',
      summary: item.contentSnippet ?? undefined,
      trustScore: 89,
    }));
}

async function main() {
  try {
    console.log('Starting article import...');

    const worldArticles = await importWorldFeed();
    const businessArticles = await importBusinessFeed();

    const allArticles = [...worldArticles, ...businessArticles];

    console.log('Fresh articles found:', allArticles.length);

    const result = await ingestArticles(allArticles);

    console.log('Import finished successfully.');
    console.log('Inserted:', result.inserted);
    console.log('Skipped duplicates:', result.skipped);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();