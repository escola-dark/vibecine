import type { CatalogState, ContentItem, Series } from '@/types/content';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_SEARCH_LANGUAGES = ['pt-BR', 'en-US'] as const;
const YEAR_REGEX = /\b(19\d{2}|20\d{2})\b/g;
const TMDB_CONCURRENCY = 6;

type TMDBType = 'movie' | 'tv';

type TMDBResult = {
  poster_path?: string | null;
  title?: string;
  original_title?: string;
  name?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
};

function getApiKey(): string | undefined {
  return import.meta.env.VITE_TMDB_API_KEY as string | undefined;
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractYear(title: string): string | undefined {
  const matches = [...title.matchAll(YEAR_REGEX)];
  const year = matches.length > 0 ? matches[matches.length - 1][1] : undefined;
  return year && Number(year) >= 1900 && Number(year) <= 2099 ? year : undefined;
}

function sanitizeTitle(title: string, keepYear = false): string {
  const withoutNoise = title
    .replace(/\[(?:[^\]]*)\]/g, ' ')
    .replace(/\((?:[^)]*)\)/g, ' ')
    .replace(/\bS\d{1,2}\s*E\d{1,3}\b/gi, ' ')
    .replace(/\bT\d{1,2}\s*E\d{1,3}\b/gi, ' ')
    .replace(/\b\d{1,2}x\d{1,3}\b/gi, ' ')
    .replace(/\b(temporada|season|epis[oó]dio|episode|ep)\b/gi, ' ')
    .replace(/\b(4k|uhd|fhd|hd|sd|2160p|1080p|720p|x264|x265|h264|h265|webrip|webdl|bluray|brrip|dvdrip|hdrip)\b/gi, ' ')
    .replace(/\b(dublado|dual\s*audio|legendado|multi\s*audio|latino|pt[-\s]?br)\b/gi, ' ')
    .replace(/[_.,]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (keepYear) return withoutNoise;

  const withoutYear = withoutNoise.replace(YEAR_REGEX, ' ').replace(/\s+/g, ' ').trim();
  return withoutYear || withoutNoise;
}

function buildSearchQueries(rawTitle: string): Array<{ query: string; year?: string }> {
  const year = extractYear(rawTitle);
  const queries = new Set<string>();

  const base = sanitizeTitle(rawTitle, true);
  const noYear = sanitizeTitle(rawTitle, false);
  const splitPrefix = sanitizeTitle(rawTitle.split(/\s[-|/]\s/)[0] ?? '', false);

  [base, noYear, splitPrefix].forEach((value) => {
    if (value && value.length >= 2) queries.add(value);
  });

  if (queries.size === 0) return [];

  const withYear = year ? [...queries].map((query) => ({ query, year })) : [];
  const withoutYear = [...queries].map((query) => ({ query }));
  return [...withYear, ...withoutYear];
}

function titleSimilarity(query: string, candidate: string): number {
  const normalizedQuery = normalizeForMatch(query);
  const normalizedCandidate = normalizeForMatch(candidate);
  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedQuery === normalizedCandidate) return 1;
  if (
    normalizedQuery.includes(normalizedCandidate)
    || normalizedCandidate.includes(normalizedQuery)
  ) return 0.9;

  const qTokens = new Set(normalizedQuery.split(' '));
  const cTokens = new Set(normalizedCandidate.split(' '));
  const intersection = [...qTokens].filter((token) => cTokens.has(token)).length;
  const union = new Set([...qTokens, ...cTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function scoreResult(query: string, year: string | undefined, result: TMDBResult, type: TMDBType): number {
  const names = [
    result.title,
    result.original_title,
    result.name,
    result.original_name,
  ].filter(Boolean) as string[];
  if (names.length === 0) return 0;

  const titleScore = Math.max(...names.map((name) => titleSimilarity(query, name)));
  const date = type === 'movie' ? result.release_date : result.first_air_date;
  const resultYear = date?.slice(0, 4);

  let yearScore = 0;
  if (year && resultYear) {
    if (year === resultYear) yearScore = 0.12;
    else if (Math.abs(Number(year) - Number(resultYear)) <= 1) yearScore = 0.05;
    else yearScore = -0.08;
  }

  const popularityScore = Math.min((result.popularity ?? 0) / 1000, 0.03);
  return titleScore + yearScore + popularityScore;
}

async function searchTMDB(
  apiKey: string,
  query: string,
  type: TMDBType,
  language: (typeof TMDB_SEARCH_LANGUAGES)[number],
  year?: string,
): Promise<TMDBResult[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    language,
    include_adult: 'false',
  });

  if (year) {
    params.set(type === 'movie' ? 'year' : 'first_air_date_year', year);
  }

  const response = await fetch(`${TMDB_API_BASE}/search/${type}?${params.toString()}`);
  if (!response.ok) return [];

  const data = await response.json() as { results?: TMDBResult[] };
  return data.results ?? [];
}

async function fetchPoster(rawTitle: string, type: TMDBType, apiKey: string): Promise<string | null> {
  const queryPlan = buildSearchQueries(rawTitle);
  if (queryPlan.length === 0) return null;
  let fallbackPoster: string | null = null;
  let fallbackScore = 0;

  for (const language of TMDB_SEARCH_LANGUAGES) {
    for (const item of queryPlan) {
      const results = await searchTMDB(apiKey, item.query, type, language, item.year);
      const best = results
        .filter((result) => !!result.poster_path)
        .sort((a, b) => scoreResult(item.query, item.year, b, type) - scoreResult(item.query, item.year, a, type))[0];

      const bestScore = best ? scoreResult(item.query, item.year, best, type) : 0;
      if (best?.poster_path && bestScore >= 0.58) {
        return `${TMDB_IMAGE_BASE}${best.poster_path}`;
      }

      if (best?.poster_path && bestScore > fallbackScore) {
        fallbackScore = bestScore;
        fallbackPoster = `${TMDB_IMAGE_BASE}${best.poster_path}`;
      }
    }
  }

  return fallbackScore >= 0.34 ? fallbackPoster : null;
}

async function runWithConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  if (items.length === 0) return;

  let current = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (current < items.length) {
      const index = current;
      current += 1;
      await worker(items[index]);
    }
  });

  await Promise.all(runners);
}

function titleLookupKey(title: string): string {
  const sanitized = sanitizeTitle(title, false) || sanitizeTitle(title, true) || title;
  return normalizeForMatch(sanitized);
}

async function fetchPosterMap(titles: string[], type: TMDBType, apiKey: string): Promise<Map<string, string>> {
  const uniqueByKey = new Map<string, string>();

  titles.forEach((title) => {
    const key = titleLookupKey(title);
    if (!key || uniqueByKey.has(key)) return;
    uniqueByKey.set(key, title);
  });

  const posterMap = new Map<string, string>();
  const queue = [...uniqueByKey.entries()];

  await runWithConcurrency(queue, async ([key, rawTitle]) => {
    try {
      const poster = await fetchPoster(rawTitle, type, apiKey);
      if (poster) posterMap.set(key, poster);
    } catch {
      // Keep existing logo if TMDB lookup fails.
    }
  }, TMDB_CONCURRENCY);

  return posterMap;
}

export async function enrichCatalogLogosWithTMDB(catalog: CatalogState): Promise<CatalogState> {
  const apiKey = getApiKey();
  if (!apiKey) return catalog;

  try {
    const moviePosterMap = await fetchPosterMap(catalog.movies.map(movie => movie.title), 'movie', apiKey);
    const seriesPosterMap = await fetchPosterMap(catalog.series.map(serie => serie.title), 'tv', apiKey);

    const movies: ContentItem[] = catalog.movies.map(movie => {
      const poster = moviePosterMap.get(titleLookupKey(movie.title));
      return poster ? { ...movie, logo: poster } : movie;
    });

    const series: Series[] = catalog.series.map(serie => {
      const poster = seriesPosterMap.get(titleLookupKey(serie.title));
      if (!poster) return serie;

      const seasons = Object.fromEntries(
        Object.entries(serie.seasons).map(([season, episodes]) => [
          Number(season),
          episodes.map(episode => ({ ...episode, logo: poster })),
        ]),
      );

      return {
        ...serie,
        logo: poster,
        seasons,
      };
    });

    const movieById = new Map(movies.map(movie => [movie.id, movie]));
    const seriesEpisodeById = new Map<string, ContentItem>();
    for (const serie of series) {
      Object.values(serie.seasons).forEach(episodes => {
        episodes.forEach(episode => {
          seriesEpisodeById.set(episode.id, episode);
        });
      });
    }

    const allItems = catalog.allItems.map(item => {
      if (item.type === 'movie') return movieById.get(item.id) ?? item;
      return seriesEpisodeById.get(item.id) ?? item;
    });

    return {
      ...catalog,
      movies,
      series,
      allItems,
    };
  } catch {
    return catalog;
  }
}
