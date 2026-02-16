import type { CatalogState, ContentItem, Series } from '@/types/content';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const apiKey = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
const posterCache = new Map<string, string | null>();

function sanitizeTitle(title: string): string {
  return title
    .replace(/\[(?:[^\]]*)\]/g, ' ')
    .replace(/\((?:[^)]*)\)/g, ' ')
    .replace(/\bS\d{1,2}\s*E\d{1,3}\b/gi, ' ')
    .replace(/\bT\d{1,2}\s*E\d{1,3}\b/gi, ' ')
    .replace(/\b\d{1,2}x\d{1,3}\b/gi, ' ')
    .replace(/\b(temporada|season|epis[oó]dio|episode)\b/gi, ' ')
    .replace(/\b(4k|uhd|fhd|hd|dublado|dual\s*audio|legendado)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidLogoUrl(value?: string): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

async function fetchPoster(query: string, type: 'movie' | 'tv'): Promise<string | null> {
  if (!apiKey || !query) return null;

  const cacheKey = `${type}:${query.toLowerCase()}`;
  if (posterCache.has(cacheKey)) return posterCache.get(cacheKey) ?? null;

  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    language: 'pt-BR',
    include_adult: 'false',
  });

  const response = await fetch(`${TMDB_API_BASE}/search/${type}?${params.toString()}`);
  if (!response.ok) {
    posterCache.set(cacheKey, null);
    return null;
  }

  const data = await response.json() as { results?: Array<{ poster_path?: string | null }> };
  const posterPath = data.results?.find(result => result.poster_path)?.poster_path;
  const poster = posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : null;
  posterCache.set(cacheKey, poster);
  return poster;
}

async function fetchPosterMap(titles: string[], type: 'movie' | 'tv'): Promise<Map<string, string>> {
  const uniqueTitles = [...new Set(titles.map(sanitizeTitle).filter(Boolean))];
  const posterMap = new Map<string, string>();

  await Promise.all(uniqueTitles.map(async title => {
    try {
      const poster = await fetchPoster(title, type);
      if (poster) posterMap.set(title, poster);
    } catch {
      // Ignore lookup failures and keep the existing catalog image.
    }
  }));

  return posterMap;
}

export function clearTmdbPosterCache(): void {
  posterCache.clear();
}

export function sanitizeCatalogLogos(catalog: CatalogState): CatalogState {
  const movies: ContentItem[] = catalog.movies.map(movie => ({
    ...movie,
    logo: isValidLogoUrl(movie.logo) ? movie.logo : undefined,
  }));

  const series: Series[] = catalog.series.map(serie => {
    const seasons = Object.fromEntries(
      Object.entries(serie.seasons).map(([season, episodes]) => [
        Number(season),
        episodes.map(episode => ({
          ...episode,
          logo: undefined,
        })),
      ]),
    );

    return {
      ...serie,
      logo: isValidLogoUrl(serie.logo) ? serie.logo : undefined,
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
    if (item.type === 'movie') {
      return movieById.get(item.id) ?? { ...item, logo: undefined };
    }
    return seriesEpisodeById.get(item.id) ?? { ...item, logo: undefined };
  });

  return {
    ...catalog,
    movies,
    series,
    allItems,
  };
}

export async function enrichCatalogLogos(catalog: CatalogState): Promise<CatalogState> {
  if (!apiKey) return catalog;

  try {
    const moviePosterMap = await fetchPosterMap(catalog.movies.map(movie => movie.title), 'movie');
    const seriesPosterMap = await fetchPosterMap(catalog.series.map(serie => serie.title), 'tv');

    const movies: ContentItem[] = catalog.movies.map(movie => {
      const poster = moviePosterMap.get(sanitizeTitle(movie.title));
      return poster ? { ...movie, logo: poster } : movie;
    });

    const series: Series[] = catalog.series.map(serie => {
      const poster = seriesPosterMap.get(sanitizeTitle(serie.title));
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
