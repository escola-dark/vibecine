import { useMemo } from 'react';
import { DashboardHero } from '@/components/DashboardHero';
import { ContentRow } from '@/components/ContentRow';
import { StatsBar } from '@/components/StatsBar';
import { HeroBanner } from '@/components/HeroBanner';
import { useContent } from '@/contexts/ContentContext';

const KNOWN_SERIES = [
  'the last of us',
  'house of the dragon',
  'the boys',
  'stranger things',
  'invincible',
  'loki',
  'the bear',
  'bridgerton',
  'wednesday',
  'fallout',
  'reacher',
  'dark',
  'breaking bad',
  'silo',
  'the walking dead',
];

const getYearFromTitle = (title: string) => {
  const match = title.match(/(?:19|20)\d{2}/g);
  if (!match || match.length === 0) return null;
  return Number(match[match.length - 1]);
};

const byNewestYear = (a: { title: string }, b: { title: string }) => {
  const ay = getYearFromTitle(a.title) ?? 0;
  const by = getYearFromTitle(b.title) ?? 0;
  return by - ay;
};

const Index = () => {
  const { catalog, favorites } = useContent();

  const moviesByGroup = useMemo(() => {
    const map = new Map<string, typeof catalog.movies>();
    catalog.movies.forEach((m) => {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [catalog.movies]);

  const movies2025Plus = useMemo(() => {
    return catalog.movies.filter((m) => (getYearFromTitle(m.title) ?? 0) >= 2025).sort(byNewestYear);
  }, [catalog.movies]);

  const trending = useMemo(() => {
    const prioritized = movies2025Plus.length > 0 ? movies2025Plus : [...catalog.movies].sort(byNewestYear);
    return prioritized.slice(0, 20);
  }, [catalog.movies, movies2025Plus]);

  const recentMovies = useMemo(() => {
    const source = movies2025Plus.length > 0 ? movies2025Plus : [...catalog.movies].sort(byNewestYear);
    return source.slice(0, 20);
  }, [catalog.movies, movies2025Plus]);

  const popularSeries = useMemo(() => {
    return [...catalog.series]
      .map((series) => {
        const idx = KNOWN_SERIES.findIndex((name) => series.title.toLowerCase().includes(name));
        return {
          series,
          score: idx === -1 ? 999 : idx,
        };
      })
      .sort((a, b) => a.score - b.score || a.series.title.localeCompare(b.series.title))
      .map((entry) => entry.series)
      .slice(0, 20);
  }, [catalog.series]);

  const favItems = useMemo(() => {
    const favMovies = catalog.movies.filter((m) => favorites.has(m.id)).slice(0, 20);
    const favSeries = catalog.series.filter((s) => favorites.has(s.id)).slice(0, 20);
    return [
      ...favMovies.map((m) => ({ ...m, type: 'movie' as const })),
      ...favSeries.map((s) => ({ id: s.id, title: s.title, logo: s.logo, group: s.group, type: 'series' as const })),
    ];
  }, [catalog, favorites]);

  if (!catalog.isLoaded) {
    return <HeroBanner />;
  }

  return (
    <div className="min-h-screen pb-12">
      <DashboardHero />

      <div className="mt-6 space-y-6">
        <StatsBar />

        <ContentRow title="🔥 Em Alta" items={trending.map((m) => ({ ...m, type: 'movie' as const }))} />

        {popularSeries.length > 0 && (
          <ContentRow
            title="📺 Séries em Alta"
            items={popularSeries.map((s) => ({ id: s.id, title: s.title, logo: s.logo, group: s.group, type: 'series' as const }))}
          />
        )}

        {recentMovies.length > 0 && (
          <ContentRow title="✨ Adicionados Recentemente" items={recentMovies.map((m) => ({ ...m, type: 'movie' as const }))} />
        )}

        {favItems.length > 0 && <ContentRow title="❤️ Seus Favoritos" items={favItems} />}

        {moviesByGroup.slice(0, 10).map(([group, movies]) => (
          <ContentRow key={group} title={group} items={movies.slice(0, 20).map((m) => ({ ...m, type: 'movie' as const }))} />
        ))}
      </div>
    </div>
  );
};

export default Index;
