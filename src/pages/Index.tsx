import { useEffect, useMemo, useState } from 'react';
import { DashboardHero } from '@/components/DashboardHero';
import { ContentRow } from '@/components/ContentRow';
import { StatsBar } from '@/components/StatsBar';
import { useContent } from '@/contexts/ContentContext';
import { CatalogLoading } from '@/components/CatalogLoading';

const TMDB_SERIES_CACHE_KEY = 'vibecines_tmdb_series_posters_v1';

async function runConcurrently<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (index < tasks.length) {
      const taskIndex = index;
      index += 1;
      results[taskIndex] = await tasks[taskIndex]();
    }
  });

  await Promise.all(workers);
  return results;
}

const Index = () => {
  const { catalog, favorites, isBootstrapping, isLoading } = useContent();
  const [tmdbSeriesPosters, setTmdbSeriesPosters] = useState<Record<string, string>>({});

  const homeSeries = useMemo(() => catalog.series.slice(0, 20), [catalog.series]);

  useEffect(() => {
    const tmdbKey = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
    if (!tmdbKey || homeSeries.length === 0) return;

    const controller = new AbortController();

    const loadSeriesPosters = async () => {
      let cachedPosters: Record<string, string> = {};
      try {
        const raw = localStorage.getItem(TMDB_SERIES_CACHE_KEY);
        if (raw) cachedPosters = JSON.parse(raw) as Record<string, string>;
      } catch {
        cachedPosters = {};
      }

      if (Object.keys(cachedPosters).length > 0) {
        setTmdbSeriesPosters(prev => ({ ...cachedPosters, ...prev }));
      }

      // Busca capas de todas as séries da seção principal para padronizar exibição somente via API.
      const seriesToFetch = homeSeries.slice(0, 20);
      const seriesMissingInCache = seriesToFetch.filter(series => !cachedPosters[series.id]);

      if (seriesMissingInCache.length === 0) return;

      const tasks = seriesMissingInCache.map(series => async () => {
          const normalizedTitle = series.title.replace(/\b(s\d{1,2}e\d{1,3}|t\d{1,2}e\d{1,3}|\d{1,2}x\d{1,3})\b/gi, '').trim();
          const params = new URLSearchParams({
            api_key: tmdbKey,
            language: 'pt-BR',
            query: normalizedTitle || series.title,
          });

          try {
            const response = await fetch(`https://api.themoviedb.org/3/search/tv?${params.toString()}`, {
              signal: controller.signal,
            });

            if (!response.ok) return [series.id, ''] as const;

            const payload = await response.json() as { results?: Array<{ poster_path?: string | null }> };
            const posterPath = payload.results?.[0]?.poster_path;
            if (posterPath) {
              return [series.id, `https://image.tmdb.org/t/p/w500${posterPath}`] as const;
            }

            // Fallback sem language para aumentar chance de encontrar capa.
            const fallbackParams = new URLSearchParams({
              api_key: tmdbKey,
              query: normalizedTitle || series.title,
            });
            const fallbackResponse = await fetch(`https://api.themoviedb.org/3/search/tv?${fallbackParams.toString()}`, {
              signal: controller.signal,
            });
            if (!fallbackResponse.ok) return [series.id, ''] as const;
            const fallbackPayload = await fallbackResponse.json() as { results?: Array<{ poster_path?: string | null }> };
            const fallbackPosterPath = fallbackPayload.results?.[0]?.poster_path;
            return [series.id, fallbackPosterPath ? `https://image.tmdb.org/t/p/w500${fallbackPosterPath}` : ''] as const;
          } catch {
            return [series.id, ''] as const;
          }
        });

      const fetchedPosters = await runConcurrently(tasks, 4);

      if (controller.signal.aborted) return;

      setTmdbSeriesPosters(prev => {
        const next = { ...prev };
        fetchedPosters.forEach(([id, poster]) => {
          if (poster) next[id] = poster;
        });

        try {
          localStorage.setItem(TMDB_SERIES_CACHE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota/read-only failures.
        }

        return next;
      });
    };

    void loadSeriesPosters();

    return () => controller.abort();
  }, [homeSeries]);

  const moviesByGroup = useMemo(() => {
    const map = new Map<string, typeof catalog.movies>();
    catalog.movies.forEach(m => {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [catalog.movies]);

  const trending = useMemo(() => {
    return [...catalog.movies].sort(() => Math.random() - 0.5).slice(0, 20);
  }, [catalog.movies]);

  const recentMovies = useMemo(() => catalog.movies.slice(-20).reverse(), [catalog.movies]);

  const favItems = useMemo(() => {
    const favMovies = catalog.movies.filter(m => favorites.has(m.id)).slice(0, 20);
    const favSeries = catalog.series.filter(s => favorites.has(s.id)).slice(0, 20);
    return [
      ...favMovies.map(m => ({ ...m, type: 'movie' as const })),
      ...favSeries.map(s => ({ id: s.id, title: s.title, logo: s.logo, group: s.group, type: 'series' as const })),
    ];
  }, [catalog, favorites]);

  if (isBootstrapping || (isLoading && !catalog.isLoaded)) {
    return <CatalogLoading message="Atualizando catálogo" />;
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
              Faça a importação da sua lista M3U pelo menu para começar a preencher o catálogo.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 md:mt-6 space-y-5 md:space-y-6">
        {catalog.isLoaded && <StatsBar />}

        <ContentRow
          title="🔥 Em Alta"
          items={trending.map(m => ({ ...m, type: 'movie' as const }))}
        />

        {catalog.series.length > 0 && (
          <ContentRow
            title="📺 Séries"
            items={homeSeries.map(s => ({
              id: s.id,
              title: s.title,
              logo: tmdbSeriesPosters[s.id],
              group: s.group,
              type: 'series' as const,
            }))}
            seeAllTo="/series"
            limit={10}
            showEndCard
          />
        )}

        {recentMovies.length > 0 && (
          <ContentRow
            title="✨ Adicionados Recentemente"
            items={recentMovies.map(m => ({ ...m, type: 'movie' as const }))}
          />
        )}

        {favItems.length > 0 && (
          <ContentRow
            title="❤️ Seus Favoritos"
            items={favItems}
            limit={10}
            seeAllTo="/favorites"
            showEndCard
          />
        )}

        {moviesByGroup.slice(0, 10).map(([group, movies]) => (
          <ContentRow
            key={group}
            title={group}
            items={movies.slice(0, 20).map(m => ({ ...m, type: 'movie' as const }))}
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