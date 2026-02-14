import { DashboardHero } from '@/components/DashboardHero';
import { ContentRow } from '@/components/ContentRow';
import { StatsBar } from '@/components/StatsBar';
import { useContent } from '@/contexts/ContentContext';
import { CatalogLoading } from '@/components/CatalogLoading';


const Index = () => {
  const { catalog, favorites, isBootstrapping, isLoading } = useContent();

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
            items={catalog.series.slice(0, 20).map(s => ({ id: s.id, title: s.title, logo: s.logo, group: s.group, type: 'series' as const }))}
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
