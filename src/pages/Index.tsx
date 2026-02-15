import { useMemo } from 'react';
import { DashboardHero } from '@/components/DashboardHero';
import { ContentRow } from '@/components/ContentRow';
import { StatsBar } from '@/components/StatsBar';
import { useContent } from '@/contexts/ContentContext';
import { CatalogLoading } from '@/components/CatalogLoading';
import { ContentItem } from '@/types/content';

const YEAR_REGEX = /\b(?:19|20)\d{2}\b/g;
const BRACKET_CONTENT_REGEX = /\[(?:[^\]]*)\]/g;
const SERIES_PRIORITY_TARGETS = [
  ['breaking bad'],
  ['stranger things'],
  ['prison break'],
  ['reacher'],
  ['os originais', 'the originals'],
  ['narcos'],
  ['la casa de papel', 'money heist'],
  ['round 6', 'squid game'],
  ['suits'],
  ['origem', 'from'],
] as const;

function hasImage(logo?: string): boolean {
  return typeof logo === 'string' && logo.trim().length > 0;
}

function extractYear(text: string): number | null {
  const matches = text.match(YEAR_REGEX);
  if (!matches?.length) return null;
  return Math.max(...matches.map(Number));
}

function normalizeMovieKey(title: string): string {
  return title
    .toLowerCase()
    .replace(BRACKET_CONTENT_REGEX, ' ')
    .replace(/\b(4k|uhd|fhd|hd|dublado|dual\s*audio|legendado|l)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeSeriesKey(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function movieVariantPriority(title: string): number {
  const t = title.toLowerCase();
  const has4k = /\b(4k|uhd)\b/.test(t);
  const hasLegendado = /\[(?:\s*l\s*)\]|\blegendado\b/.test(t);
  const hasOtherQualityTag = /\b(fhd|hd)\b/.test(t);

  // Priority requested: normal first, then 4K, then other variants.
  if (!hasLegendado && !has4k && !hasOtherQualityTag) return 3;
  if (!hasLegendado && has4k) return 2;
  if (!hasLegendado) return 1;
  return 0;
}

function readWatchedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set<string>();

  const watched = new Set<string>();
  const keyPrefix = 'vibecines_watched_';

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(keyPrefix)) continue;
    if (localStorage.getItem(key) === '1') {
      watched.add(key.slice(keyPrefix.length));
    }
  }

  return watched;
}

const Index = () => {
  const { catalog, favorites, isBootstrapping, isLoading } = useContent();

  const visibleMovies = useMemo(
    () => catalog.movies.filter((movie) => hasImage(movie.logo)),
    [catalog.movies],
  );

  const visibleSeries = useMemo(
    () => catalog.series.filter((series) => hasImage(series.logo)),
    [catalog.series],
  );

  const uniqueMovies = useMemo(() => {
    const watchedIds = readWatchedIds();
    const map = new Map<string, ContentItem>();

    const scoreMovie = (movie: ContentItem) => {
      const year = extractYear(`${movie.title} ${movie.group}`) ?? 0;
      const variantBoost = movieVariantPriority(movie.title) * 1000;
      const watchedBoost = watchedIds.has(movie.id) ? 250 : 0;
      const favoriteBoost = favorites.has(movie.id) ? 180 : 0;
      const recencyBoost = year >= 2015 ? Math.min(50, year - 2015) : 0;
      const visualBoost = movie.logo ? 20 : 0;
      return variantBoost + watchedBoost + favoriteBoost + recencyBoost + visualBoost;
    };

    visibleMovies.forEach((movie) => {
      const key = normalizeMovieKey(movie.title) || movie.id;
      const current = map.get(key);
      if (!current || scoreMovie(movie) > scoreMovie(current)) {
        map.set(key, movie);
      }
    });

    return [...map.values()];
  }, [favorites, visibleMovies]);

  const moviesByGroup = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    uniqueMovies.forEach((m) => {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [uniqueMovies]);

  const trendingCandidates = useMemo(() => {
    const watchedIds = readWatchedIds();

    const from2015 = uniqueMovies.filter((movie) => {
      const year = extractYear(`${movie.title} ${movie.group}`);
      return year !== null && year >= 2015;
    });

    const source = from2015.length > 0 ? from2015 : uniqueMovies;

    return [...source]
      .map((movie) => {
        const year = extractYear(`${movie.title} ${movie.group}`) ?? 0;
        const watchedBoost = watchedIds.has(movie.id) ? 120 : 0;
        const favoriteBoost = favorites.has(movie.id) ? 80 : 0;
        const recencyBoost = year >= 2015 ? Math.min(40, (year - 2015) * 2) : 0;
        const visualBoost = movie.logo ? 10 : 0;

        return {
          movie,
          year,
          score: watchedBoost + favoriteBoost + recencyBoost + visualBoost,
        };
      })
      .sort((a, b) => b.score - a.score || b.year - a.year || a.movie.title.localeCompare(b.movie.title, 'pt-BR'))
      .map(({ movie }) => movie);
  }, [favorites, uniqueMovies]);

  const recentCandidates = useMemo(() => {
    const uniqueById = new Set(uniqueMovies.map((movie) => movie.id));
    return [...visibleMovies].reverse().filter((movie) => uniqueById.has(movie.id));
  }, [uniqueMovies, visibleMovies]);

  const prioritizedSeries = useMemo(() => {
    const watchedIds = readWatchedIds();
    const usedSeriesIds = new Set<string>();

    const preferredSeries = SERIES_PRIORITY_TARGETS
      .map((aliases) => {
        const normalizedAliases = aliases.map((alias) => normalizeSeriesKey(alias));
        return visibleSeries.find((series) => {
          if (usedSeriesIds.has(series.id)) return false;
          const normalizedTitle = normalizeSeriesKey(series.title);
          return normalizedAliases.some((alias) => normalizedTitle.includes(alias));
        });
      })
      .filter((series): series is typeof catalog.series[number] => {
        if (!series) return false;
        if (usedSeriesIds.has(series.id)) return false;
        usedSeriesIds.add(series.id);
        return true;
      });

    const rankedSeries = [...visibleSeries]
      .map((series) => {
        const episodes = Object.values(series.seasons).flat();
        const watchedEpisodes = episodes.filter((ep) => watchedIds.has(ep.id)).length;
        const favoriteBoost = favorites.has(series.id) ? 70 : 0;
        const watchBoost = watchedEpisodes * 100;
        const depthBoost = Math.min(40, episodes.length);
        const visualBoost = series.logo ? 10 : 0;
        const year = extractYear(`${series.title} ${series.group}`) ?? 0;
        const recencyBoost = year >= 2015 ? Math.min(20, year - 2015) : 0;

        return {
          series,
          score: watchBoost + favoriteBoost + depthBoost + visualBoost + recencyBoost,
          watchedEpisodes,
        };
      })
      .sort((a, b) => b.score - a.score || b.watchedEpisodes - a.watchedEpisodes || a.series.title.localeCompare(b.series.title, 'pt-BR'))
      .filter(({ series }) => !usedSeriesIds.has(series.id))
      .map(({ series }) => series);

    return [...preferredSeries, ...rankedSeries].slice(0, 20);
  }, [favorites, visibleSeries]);

  const { trending, recentMovies, favoriteMovies, moviesByGroupWithoutRepeats } = useMemo(() => {
    const usedMovieIds = new Set<string>();

    const takeUnique = (movies: ContentItem[], limit: number) => {
      const selected: ContentItem[] = [];
      for (const movie of movies) {
        if (usedMovieIds.has(movie.id)) continue;
        usedMovieIds.add(movie.id);
        selected.push(movie);
        if (selected.length >= limit) break;
      }
      return selected;
    };

    const trendingList = takeUnique(trendingCandidates, 20);
    const recentList = takeUnique(recentCandidates, 20);
    const favoriteList = takeUnique(uniqueMovies.filter((movie) => favorites.has(movie.id)), 20);
    const grouped = moviesByGroup
      .map(([group, movies]) => [group, takeUnique(movies, 20)] as const)
      .filter(([, movies]) => movies.length > 0);

    return {
      trending: trendingList,
      recentMovies: recentList,
      favoriteMovies: favoriteList,
      moviesByGroupWithoutRepeats: grouped,
    };
  }, [favorites, moviesByGroup, recentCandidates, trendingCandidates, uniqueMovies]);

  const favItems = useMemo(() => {
    const favSeries = visibleSeries.filter((s) => favorites.has(s.id)).slice(0, 20);
    return [
      ...favoriteMovies.map((m) => ({ ...m, type: 'movie' as const })),
      ...favSeries.map((s) => ({ id: s.id, title: s.title, logo: s.logo, group: s.group, type: 'series' as const })),
    ];
  }, [favoriteMovies, favorites, visibleSeries]);

  if (isBootstrapping || (isLoading && !catalog.isLoaded)) {
    return <CatalogLoading message={'Atualizando cat\u00E1logo'} />;
  }

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-b from-background via-background to-background/95">
      {catalog.isLoaded ? (
        <DashboardHero />
      ) : (
        <div className="px-4 md:px-6 pt-3">
          <div className="rounded-2xl border border-border bg-card/60 p-6 md:p-8">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              {'Fa\u00E7a a importa\u00E7\u00E3o da sua lista M3U pelo menu para come\u00E7ar a preencher o cat\u00E1logo.'}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 md:mt-6 space-y-5 md:space-y-6 lg:pl-6">
        {catalog.isLoaded && <StatsBar />}

        <ContentRow
          title={'\uD83D\uDD25 Em Alta'}
          items={trending.map((m) => ({ ...m, type: 'movie' as const }))}
        />

        {prioritizedSeries.length > 0 && (
          <ContentRow
            title={'\uD83D\uDCFA S\u00E9ries'}
            items={prioritizedSeries.map((s) => ({ id: s.id, title: s.title, logo: s.logo, group: s.group, type: 'series' as const }))}
            seeAllTo="/series"
            limit={10}
            showEndCard
          />
        )}

        {recentMovies.length > 0 && (
          <ContentRow
            title={'\u2728 Adicionados Recentemente'}
            items={recentMovies.map((m) => ({ ...m, type: 'movie' as const }))}
          />
        )}

        {favItems.length > 0 && (
          <ContentRow
            title={'\u2764\uFE0F Seus Favoritos'}
            items={favItems}
            limit={10}
            seeAllTo="/favorites"
            showEndCard
          />
        )}

        {moviesByGroupWithoutRepeats.slice(0, 10).map(([group, movies]) => (
          <ContentRow
            key={group}
            title={group}
            items={movies.slice(0, 20).map((m) => ({ ...m, type: 'movie' as const }))}
            seeAllTo={`/movies?cat=${encodeURIComponent(group)}`}
            limit={12}
            showEndCard
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
