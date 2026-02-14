import { useMemo } from 'react';
import { DashboardHero } from '@/components/DashboardHero';
import { ContentRow } from '@/components/ContentRow';
import { StatsBar } from '@/components/StatsBar';
import { HeroBanner } from '@/components/HeroBanner';
import { useContent } from '@/contexts/ContentContext';

const Index = () => {
  const { catalog, favorites } = useContent();

  // All hooks must be called before conditional returns
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

  if (!catalog.isLoaded) {
    return <HeroBanner />;
  }

  return (
    <div className="min-h-screen pb-12">
      <DashboardHero />

      <div className="mt-6 space-y-6">
        <StatsBar />

        <ContentRow
          title="🔥 Em Alta"
          items={trending.map(m => ({ ...m, type: 'movie' as const }))}
        />

        {catalog.series.length > 0 && (
          <ContentRow
            title="📺 Séries"
            items={catalog.series.slice(0, 20).map(s => ({ id: s.id, title: s.title, logo: s.logo, group: s.group, type: 'series' as const }))}
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
          />
        )}

        {moviesByGroup.slice(0, 10).map(([group, movies]) => (
          <ContentRow
            key={group}
            title={group}
            items={movies.slice(0, 20).map(m => ({ ...m, type: 'movie' as const }))}
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
