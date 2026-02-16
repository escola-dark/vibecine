import type { CatalogState, ContentItem, Series } from '@/types/content';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const apiKey = import.meta.env.VITE_TMDB_API_KEY as string | undefined;

type TMDBMediaType = 'movie' | 'tv';

interface TMDBResult {
  poster_path?: string | null;
  name?: string;
  original_name?: string;
  title?: string;
  original_title?: string;
}

function sanitizeTitle(title: string): string {
  return title
    .replace(/\[(?:[^\]]*)\]/g, ' ')
    .replace(/\((?:[^)]*)\)/g, ' ')
    .replace(/\bS\d{1,2}\s*E\d{1,3}\b/gi, ' ')
    .replace(/\bT\d{1,2}\s*E\d{1,3}\b/gi, ' ')
    .replace(/\b\d{1,2}x\d{1,3}\b/gi, ' ')
    .replace(/\b(temporada|season|epis[oó]dio|episode)\b/gi, ' ')
    .replace(/\b(4k|uhd|fhd|hd|dublado|dual\s*audio|legendado)\b/gi, ' ')
    .replace(/\b(complete|completo|dublado|legendado|dual)\b/gi, ' ')
    .replace(/[\-–—|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getQueryCandidates(title: string): string[] {
  const base = sanitizeTitle(title);
  const withoutYear = base.replace(/\b(19|20)\d{2}\b/g, ' ').replace(/\s+/g, ' ').trim();
  const firstChunk = withoutYear.split(/[:\-|]/)[0]?.trim() || withoutYear;

  return [...new Set([title.trim(), base, withoutYear, firstChunk].filter(Boolean))];
}

function pickBestPoster(query: string, results: TMDBResult[]): string | null {
  if (results.length === 0) return null;

  const q = normalizeForCompare(query);

  const scored = results
    .map(result => {
      const labels = [result.name, result.original_name, result.title, result.original_title]
        .filter(Boolean)
        .map(v => normalizeForCompare(v as string));

      let score = 0;
      for (const label of labels) {
        if (!label) continue;
        if (label === q) score += 100;
        else if (label.startsWith(`${q} `) || label.endsWith(` ${q}`)) score += 60;
        else if (label.includes(q) || q.includes(label)) score += 30;
      }

      if (result.poster_path) score += 10;
      return { score, poster: result.poster_path };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored.find(item => item.poster)?.poster;
  return best ? `${TMDB_IMAGE_BASE}${best}` : null;
}

async function fetchPosterByQuery(query: string, type: TMDBMediaType, language: 'pt-BR' | 'en-US'): Promise<string | null> {
  if (!apiKey || !query) return null;

  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    language,
    include_adult: 'false',
  });

  const response = await fetch(`${TMDB_API_BASE}/search/${type}?${params.toString()}`);
  if (!response.ok) return null;

  const data = await response.json() as { results?: TMDBResult[] };
  return pickBestPoster(query, data.results ?? []);
}

async function fetchPoster(title: string, type: TMDBMediaType): Promise<string | null> {
  const queries = getQueryCandidates(title);

  for (const query of queries) {
    const posterPt = await fetchPosterByQuery(query, type, 'pt-BR');
    if (posterPt) return posterPt;

    const posterEn = await fetchPosterByQuery(query, type, 'en-US');
    if (posterEn) return posterEn;
  }

  return null;
}

async function fetchPosterMap(titles: string[], type: TMDBMediaType): Promise<Map<string, string>> {
  const uniqueTitles = [...new Set(titles.map(sanitizeTitle).filter(Boolean))];
  const posterMap = new Map<string, string>();

  await Promise.all(uniqueTitles.map(async title => {
    try {
      const poster = await fetchPoster(title, type);
      if (poster) posterMap.set(title, poster);
    } catch {
      // Ignore poster lookup failures and keep current logo from M3U
    }
  }));

  return posterMap;
}

export async function enrichCatalogLogosWithTMDB(catalog: CatalogState): Promise<CatalogState> {
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
