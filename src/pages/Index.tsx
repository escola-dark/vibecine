import { useEffect, useMemo, useState } from 'react';
import { DashboardHero } from '@/components/DashboardHero';
import { ContentRow } from '@/components/ContentRow';
import { StatsBar } from '@/components/StatsBar';
import { useContent } from '@/contexts/ContentContext';
import { CatalogLoading } from '@/components/CatalogLoading';

const SERIES_PRIORITY_TARGETS = [
  ['breaking bad'],
  ['la casa de papel', 'money heist'],
  ['reacher'],
  ['dark'],
  ['ozark'],
  ['stranger things'],
  ['narcos'],
  ['peaky blinders'],
  ['os originais', 'the originals'],
  ['mr robot', 'mr. robot'],
  ['arcanjo renegado'],
] as const;

function normalizeSeriesTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const Index = () => {
  const { catalog, favorites, isBootstrapping, isLoading } = useContent();
  const [tmdbSeriesPosters, setTmdbSeriesPosters] = useState<Record<string, string>>({});

  const homeSeries = useMemo(() => {
    const usedIds = new Set<string>();

    const prioritized = SERIES_PRIORITY_TARGETS
      .map((aliases) => {
        const normalizedAliases = aliases.map(normalizeSeriesTitle);
        return catalog.series.find((series) => {
          if (usedIds.has(series.id)) return false;
          const normalizedTitle = normalizeSeriesTitle(series.title);
          return normalizedAliases.some((alias) => normalizedTitle.includes(alias));
        });
      })
      .filter((series): series is typeof catalog.series[number] => {
        if (!series) return false;
        if (usedIds.has(series.id)) return false;
        usedIds.add(series.id);
        return true;
      });

    const remaining = catalog.series.filter((series) => !usedIds.has(series.id));
    return [...prioritized, ...remaining].slice(0, 20);
  }, [catalog.series]);


  const favoriteSeries = useMemo(
    () => catalog.series.filter(s => favorites.has(s.id)).slice(0, 20),
    [catalog.series, favorites],
  );

  useEffect(() => {
    const tmdbKey = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
    const seriesTargets = [...homeSeries, ...favoriteSeries];
    if (!tmdbKey || seriesTargets.length === 0) return;

    const controller = new AbortController();

    const loadSeriesPosters = async () => {
      // Busca capas apenas das séries da seção principal (não altera cards de filmes).
      const uniqueSeriesToFetch = [...new Map(seriesTargets.map(s => [s.id, s])).values()].slice(0, 40);

      if (uniqueSeriesToFetch.length === 0) return;

      const fetchedPosters = await Promise.all(
        uniqueSeriesToFetch.map(async series => {
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
            return [series.id, posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : ''] as const;
          } catch {
            return [series.id, ''] as const;
          }
        }),
      );

      if (controller.signal.aborted) return;

      setTmdbSeriesPosters(prev => {
        const next = { ...prev };
        fetchedPosters.forEach(([id, poster]) => {
          if (poster) next[id] = poster;
        });
        return next;
      });
    };

    void loadSeriesPosters();

    return () => controller.abort();
  }, [homeSeries, favoriteSeries]);

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
    return [
      ...favMovies.map(m => ({ ...m, type: 'movie' as const })),
      ...favoriteSeries.map(s => ({
        id: s.id,
        title: s.title,
        logo: tmdbSeriesPosters[s.id] || s.logo,
        group: s.group,
        type: 'series' as const,
      })),
    ];
  }, [catalog.movies, favorites, favoriteSeries, tmdbSeriesPosters]);

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
              logo: tmdbSeriesPosters[s.id] || s.logo,
              group: s.group,
              type: 'series' as const,
            }))}
            seeAllTo="/series"
            limit={11}
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
