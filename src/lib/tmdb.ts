import { CatalogState, Series } from '@/types/content';

const TMDB_API_KEY = (import.meta.env.VITE_TMDB_API_KEY || '').trim();
const TMDB_IMAGE_BASE = (import.meta.env.VITE_TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p/w500').replace(/\/+$/, '');
const TMDB_LANGUAGE = (import.meta.env.VITE_TMDB_LANGUAGE || 'pt-BR').trim();
const TMDB_MAX_CONCURRENCY = 5;

const posterCache = new Map<string, string | null>();

function normalizeLookupTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(temporada|season)\s*\d+\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isLogoUsable(logo?: string): boolean {
  if (!logo) return false;
  const value = logo.trim();
  if (!value) return false;
  if (!/^https?:\/\//i.test(value)) return false;
  if (/(?:tvg-name|tvg-logo|group-title)\s*=/i.test(value)) return false;
  return true;
}

async function fetchTmdbSeriesPoster(title: string): Promise<string | null> {
  if (!TMDB_API_KEY) return null;

  const query = normalizeLookupTitle(title);
  if (!query) return null;

  if (posterCache.has(query)) {
    return posterCache.get(query) ?? null;
  }

  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      query,
      include_adult: 'false',
      language: TMDB_LANGUAGE,
      page: '1',
    });

    const response = await fetch(`https://api.themoviedb.org/3/search/tv?${params.toString()}`);
    if (!response.ok) {
      posterCache.set(query, null);
      return null;
    }

    const payload = await response.json() as {
      results?: Array<{
        name?: string;
        original_name?: string;
        poster_path?: string | null;
        popularity?: number;
        vote_count?: number;
      }>;
    };

    const results = Array.isArray(payload.results) ? payload.results : [];
    const best = results
      .filter((item) => typeof item.poster_path === 'string' && item.poster_path.length > 0)
      .map((item) => {
        const candidateTitle = normalizeLookupTitle(`${item.name || item.original_name || ''}`);
        const sameTitle = candidateTitle === query;
        const closeTitle = !sameTitle && (candidateTitle.includes(query) || query.includes(candidateTitle));
        const popularity = item.popularity || 0;
        const votes = Math.min(300, item.vote_count || 0);
        const score = popularity + votes + (sameTitle ? 1000 : 0) + (closeTitle ? 250 : 0);
        return { item, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.item;

    const resolved = best?.poster_path ? `${TMDB_IMAGE_BASE}${best.poster_path}` : null;
    posterCache.set(query, resolved);
    return resolved;
  } catch {
    posterCache.set(query, null);
    return null;
  }
}

async function enrichSeriesLogo(series: Series): Promise<Series> {
  if (isLogoUsable(series.logo)) return series;

  const resolvedLogo = await fetchTmdbSeriesPoster(series.title);
  if (!resolvedLogo) return series;

  return {
    ...series,
    logo: resolvedLogo,
  };
}

async function enrichSeriesWithConcurrency(seriesList: Series[]): Promise<Series[]> {
  if (seriesList.length === 0) return [];

  const output: Series[] = [...seriesList];
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= seriesList.length) return;
      output[idx] = await enrichSeriesLogo(seriesList[idx]);
    }
  }

  const workers = Array.from(
    { length: Math.min(TMDB_MAX_CONCURRENCY, seriesList.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return output;
}

export async function enrichCatalogSeriesLogos(catalog: CatalogState): Promise<CatalogState> {
  if (!TMDB_API_KEY || catalog.series.length === 0) return catalog;

  const enrichedSeries = await enrichSeriesWithConcurrency(catalog.series);
  const logoBySeriesId = new Map(enrichedSeries.map((series) => [series.id, series.logo]));

  const enrichedItems = catalog.allItems.map((item) => {
    if (item.type !== 'series') return item;
    if (isLogoUsable(item.logo)) return item;
    if (!item.seriesId) return item;
    const seriesLogo = logoBySeriesId.get(item.seriesId);
    if (!seriesLogo) return item;
    return { ...item, logo: seriesLogo };
  });

  return {
    ...catalog,
    series: enrichedSeries,
    allItems: enrichedItems,
  };
}
