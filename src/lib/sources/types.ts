export type ImportedArticle = {
  externalId?: string;
  sourceSlug: string;
  sourceName: string;
  title: string;
  url: string;
  publicationDate: string;
  language: string;
  region: string;
  category: string;
  content: string;
  summary?: string;
  canonicalHash?: string;
  trustScore?: number;
};