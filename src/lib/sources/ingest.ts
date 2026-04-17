import { supabase } from '@/lib/db/client';
import { ImportedArticle } from './types';
import crypto from 'crypto';

function buildCanonicalHash(article: ImportedArticle): string {
  const raw = `${article.sourceSlug}|${article.title}|${article.url}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function getSourceBySlug(slug: string) {
  const { data, error } = await supabase
    .from('sources')
    .select('id, name, slug, trust_score')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data;
}

async function articleExists(canonicalHash: string) {
  const { data, error } = await supabase
    .from('articles')
    .select('id')
    .eq('canonical_hash', canonicalHash)
    .limit(1);

  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function ingestArticles(articles: ImportedArticle[]) {
  let inserted = 0;
  let skipped = 0;

  for (const article of articles) {
    const source = await getSourceBySlug(article.sourceSlug);
    const canonicalHash = article.canonicalHash || buildCanonicalHash(article);

    const exists = await articleExists(canonicalHash);
    if (exists) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from('articles').insert({
      source_id: source.id,
      external_id: article.externalId ?? null,
      title: article.title,
      url: article.url,
      publication_date: article.publicationDate,
      language: article.language,
      region: article.region,
      category: article.category,
      content: article.content,
      summary: article.summary ?? null,
      canonical_hash: canonicalHash,
      trust_score: article.trustScore ?? source.trust_score ?? 50,
    });

    if (error) throw error;

    inserted += 1;
  }

  return { inserted, skipped };
}