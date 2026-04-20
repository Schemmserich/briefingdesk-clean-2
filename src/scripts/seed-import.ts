async function importTagesschauFeed(): Promise<ImportedArticle[]> {
  const feedUrl = 'https://www.tagesschau.de/xml/rss2';
  const feed = await parser.parseURL(feedUrl);

  return (feed.items ?? [])
    .filter((item) => isFresh(item.pubDate, 24))
    .slice(0, 12)
    .map((item, index) => ({
      externalId: item.guid ?? `tagesschau-${index}`,
      sourceSlug: 'tagesschau',
      sourceName: 'Tagesschau',
      title: item.title ?? 'Untitled',
      url: item.link ?? 'https://www.tagesschau.de',
      publicationDate: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      language: 'de',
      region: 'Europe',
      category: normalizeCategory(
        Array.isArray(item.categories) ? item.categories[0] : undefined,
        'Politics'
      ),
      content:
        item.contentSnippet ??
        item.content ??
        item.title ??
        'No content available.',
      summary: item.contentSnippet ?? undefined,
      trustScore: 90,
    }));
}