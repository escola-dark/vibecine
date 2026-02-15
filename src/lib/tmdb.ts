import axios, { AxiosInstance } from 'axios';
import { CatalogState, ContentItem, Series } from '@/types/content';

type TmdbSearchResult = {
  poster_path?: string | null;
  popularity?: number;
  vote_count?: number;
  name?: string;
  original_name?: string;
  title?: string;
  original_title?: string;
};

type MediaType = 'movie' | 'tv';

const TMDB_API_KEY = (import.meta.env.VITE_TMDB_API_KEY || '').trim();
const TMDB_READ_ACCESS_TOKEN = (import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN || '').trim();
const TMDB_IMAGE_BASE = (import.meta.env.VITE_TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p/w500').replace(/\/+$/, '');
const TMDB_LANGUAGE = (import.meta.env.VITE_TMDB_LANGUAGE || 'pt-BR').trim();
const TMDB_MAX_CONCURRENCY = 5;

const posterCache = new Map<string, string | null>();

let authVerified: boolean | null = null;
let authInFlight: Promise<boolean> | null = null;

const tmdbClient: AxiosInstance = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: 15000,
  headers: TMDB_READ_ACCESS_TOKEN
    ? { Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}` }
    : undefined,
});

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

function isLogoUrlValid(logo?: string): boolean {
  if (!logo) return false;
  const value = logo.trim();
  if (!value) return false;
  if (!/^https?:\/\//i.test(value)) return false;
  if (/(?:tvg-name|tvg-logo|group-title)\s*=/i.test(value)) return false;
  return true;
}

function isTmdbImageUrl(logo?: string): boolean {
  if (!logo) return false;
  return /^https?:\/\/image\.tmdb\.org\//i.test(logo.trim());
}

function hasPreferredTmdbLogo(logo?: string): boolean {
  return isLogoUrlValid(logo) && isTmdbImageUrl(logo);
}

function candidateTitle(result: TmdbSearchResult, mediaType: MediaType): string {
  if (mediaType === 'tv') {
    return `${result.name || result.original_name || ''}`;
  }
  return `${result.title || result.original_title || ''}`;
}

function scoreResult(result: TmdbSearchResult, query: string, mediaType: MediaType): number {
  const candidate = normalizeLookupTitle(candidateTitle(result, mediaType));
  const sameTitle = candidate === query;
  const closeTitle = !sameTitle && (candidate.includes(query) || query.includes(candidate));
  const popularity = result.popularity || 0;
  const votes = Math.min(300, result.vote_count || 0);

  return popularity + votes + (sameTitle ? 1000 : 0) + (closeTitle ? 250 : 0);
}

async function verifyTmdbAuthentication(): Promise<boolean> {
  if (authVerified !== null) return authVerified;
  if (authInFlight) return authInFlight;

  if (!TMDB_READ_ACCESS_TOKEN && !TMDB_API_KEY) {
    authVerified = false;
    return false;
  }

  authInFlight = (async () => {
    try {
      if (TMDB_READ_ACCESS_TOKEN) {
        const response = await tmdbClient.get('/authentication');
        authVerified = Boolean(response.data?.success);
        return authVerified;
      }

      const response = await tmdbClient.get('/configuration', {
        params: { api_key: TMDB_API_KEY },
      });
      authVerified = Boolean(response.data?.images);
      return authVerified;
    } catch {
      authVerified = false;
      return false;
    } finally {
      authInFlight = null;
    }
  })();

  return authInFlight;
}

async function searchPoster(query: string, mediaType: MediaType): Promise<string | null> {
  const normalizedQuery = normalizeLookupTitle(query);
  if (!normalizedQuery) return null;

  const cacheKey = `${mediaType}:${normalizedQuery}`;
  if (posterCache.has(cacheKey)) {
    return posterCache.get(cacheKey) ?? null;
  }

  const isAuthValid = await verifyTmdbAuthentication();
  if (!isAuthValid) {
    posterCache.set(cacheKey, null);
    return null;
  }

  try {
    const params: Record<string, string | number | boolean> = {
      query: normalizedQuery,
      include_adult: false,
      language: TMDB_LANGUAGE,
      page: 1,
    };

    if (!TMDB_READ_ACCESS_TOKEN && TMDB_API_KEY) {
      params.api_key = TMDB_API_KEY;
    }

    const response = await tmdbClient.get(`/search/${mediaType}`, { params });
    const results = Array.isArray(response.data?.results)
      ? (response.data.results as TmdbSearchResult[])
      : [];

    const best = results
      .filter((result) => typeof result.poster_path === 'string' && result.poster_path.length > 0)
      .map((result) => ({
        result,
        score: scoreResult(result, normalizedQuery, mediaType),
      }))
      .sort((a, b) => b.score - a.score)[0]?.result;

    const resolved = best?.poster_path ? `${TMDB_IMAGE_BASE}${best.poster_path}` : null;
    posterCache.set(cacheKey, resolved);
    return resolved;
  } catch {
    posterCache.set(cacheKey, null);
    return null;
  }
}

async function enrichMovieLogo(movie: ContentItem): Promise<ContentItem> {
  if (hasPreferredTmdbLogo(movie.logo)) return movie;

  const resolvedLogo = await searchPoster(movie.title, 'movie');
  if (!resolvedLogo) {
    return {
      ...movie,
      logo: undefined,
    };
  }

  return {
    ...movie,
    logo: resolvedLogo,
  };
}

async function enrichSeriesLogo(series: Series): Promise<Series> {
  if (hasPreferredTmdbLogo(series.logo)) return series;

  const resolvedLogo = await searchPoster(series.title, 'tv');
  if (!resolvedLogo) {
    return {
      ...series,
      logo: undefined,
    };
  }

  return {
    ...series,
    logo: resolvedLogo,
  };
}

async function enrichWithConcurrency<T>(items: T[], enrichItem: (item: T) => Promise<T>): Promise<T[]> {
  if (items.length === 0) return [];

  const output: T[] = [...items];
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= items.length) return;
      output[idx] = await enrichItem(items[idx]);
    }
  }

  const workers = Array.from(
    { length: Math.min(TMDB_MAX_CONCURRENCY, items.length) },
    () => worker(),
  );

  await Promise.all(workers);
  return output;
}

export async function enrichCatalogLogos(catalog: CatalogState): Promise<CatalogState> {
  const hasCredentials = Boolean(TMDB_READ_ACCESS_TOKEN || TMDB_API_KEY);
  if (!hasCredentials || (catalog.series.length === 0 && catalog.movies.length === 0)) {
    return catalog;
  }

  const seriesNeedingEnrichment = catalog.series.some((series) => !hasPreferredTmdbLogo(series.logo));
  const moviesNeedingEnrichment = catalog.movies.some((movie) => !hasPreferredTmdbLogo(movie.logo));

  if (!seriesNeedingEnrichment && !moviesNeedingEnrichment) {
    return catalog;
  }

  const [enrichedMovies, enrichedSeries] = await Promise.all([
    moviesNeedingEnrichment ? enrichWithConcurrency(catalog.movies, enrichMovieLogo) : Promise.resolve(catalog.movies),
    seriesNeedingEnrichment ? enrichWithConcurrency(catalog.series, enrichSeriesLogo) : Promise.resolve(catalog.series),
  ]);

  const movieLogoById = new Map(enrichedMovies.map((movie) => [movie.id, movie.logo]));
  const seriesLogoById = new Map(enrichedSeries.map((series) => [series.id, series.logo]));

  const enrichedItems = catalog.allItems.map((item) => {
    if (item.type === 'movie') {
      if (hasPreferredTmdbLogo(item.logo)) return item;
      const movieLogo = movieLogoById.get(item.id);
      return {
        ...item,
        logo: movieLogo || undefined,
      };
    }

    if (hasPreferredTmdbLogo(item.logo)) return item;
    if (!item.seriesId) return item;

    const seriesLogo = seriesLogoById.get(item.seriesId);
    return {
      ...item,
      logo: seriesLogo || undefined,
    };
  });

  return {
    ...catalog,
    movies: enrichedMovies,
    series: enrichedSeries,
    allItems: enrichedItems,
  };
}

export function sanitizeCatalogLogos(catalog: CatalogState): CatalogState {
  const sanitizedMovies = catalog.movies.map((movie) => ({
    ...movie,
    logo: hasPreferredTmdbLogo(movie.logo) ? movie.logo : undefined,
  }));

  const movieLogoById = new Map(sanitizedMovies.map((movie) => [movie.id, movie.logo]));

  const sanitizedSeries = catalog.series.map((series) => ({
    ...series,
    logo: hasPreferredTmdbLogo(series.logo) ? series.logo : undefined,
  }));

  const seriesLogoById = new Map(sanitizedSeries.map((series) => [series.id, series.logo]));

  const sanitizedItems = catalog.allItems.map((item) => {
    if (item.type === 'movie') {
      return {
        ...item,
        logo: movieLogoById.get(item.id),
      };
    }

    if (!item.seriesId) {
      return {
        ...item,
        logo: hasPreferredTmdbLogo(item.logo) ? item.logo : undefined,
      };
    }

    return {
      ...item,
      logo: seriesLogoById.get(item.seriesId),
    };
  });

  return {
    ...catalog,
    movies: sanitizedMovies,
    series: sanitizedSeries,
    allItems: sanitizedItems,
  };
}
