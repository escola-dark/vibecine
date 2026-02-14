import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ContentCard } from '@/components/ContentCard';
import { ContentRow } from '@/components/ContentRow';
import { useContent } from '@/contexts/ContentContext';
import { useSearchParams } from 'react-router-dom';
import { CatalogLoading } from '@/components/CatalogLoading';

const SeriesPage = () => {
  const { catalog, isBootstrapping, isLoading } = useContent();
  const [params] = useSearchParams();
  const selectedCategory = params.get('cat');
  const [seriesSearch, setSeriesSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const seriesByGroupMap = useMemo(() => {
    const map = new Map<string, typeof catalog.series>();
    catalog.series.forEach(series => {
      if (!map.has(series.group)) map.set(series.group, []);
      map.get(series.group)!.push(series);
    });
    return map;
  }, [catalog.series]);

  const seriesByGroup = useMemo(
    () => [...seriesByGroupMap.entries()].sort((a, b) => b[1].length - a[1].length),
    [seriesByGroupMap]
  );

  const categorySeries = useMemo(() => {
    const baseList = seriesByGroupMap.get(selectedCategory || '') || [];
    const query = seriesSearch.trim().toLowerCase();
    if (!query) return baseList;
    return baseList.filter(series => series.title.toLowerCase().includes(query));
  }, [seriesByGroupMap, selectedCategory, seriesSearch]);

  const filteredGroups = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return seriesByGroup;

    return seriesByGroup
      .map(([group, series]) => [
        group,
        series.filter(item => item.title.toLowerCase().includes(query) || group.toLowerCase().includes(query)),
      ] as const)
      .filter(([, series]) => series.length > 0);
  }, [seriesByGroup, categorySearch]);

  if (isBootstrapping || (isLoading && !catalog.isLoaded)) {
    return <CatalogLoading message="Atualizando catálogo" />;
  }

  return (
    <div className="min-h-screen pt-6 md:pt-8 pb-12">
      <div className="container mx-auto px-4 mb-6">
        <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          Séries
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {selectedCategory ? `Categoria: ${selectedCategory}` : `${catalog.series.length} séries disponíveis`}
        </p>
      </div>

      {selectedCategory ? (
        <div className="container mx-auto px-4">
          <div className="mb-5 max-w-md">
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Pesquisar nesta categoria</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={seriesSearch}
                onChange={e => setSeriesSearch(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Buscar série..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {categorySeries.map(series => (
              <ContentCard key={series.id} id={series.id} title={series.title} logo={series.logo} group={series.group} type="series" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="container mx-auto px-4 mb-2 max-w-xl">
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Pesquisar séries ou categorias</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Ex: drama, ação, netflix..."
              />
            </div>
          </div>

          {filteredGroups.map(([group, series]) => (
            <ContentRow
              key={group}
              title={group}
              items={series.map(item => ({
                id: item.id,
                title: item.title,
                logo: item.logo,
                group: item.group,
                type: 'series' as const,
              }))}
              limit={12}
              seeAllTo={`/series?cat=${encodeURIComponent(group)}`}
              showEndCard
            />
          ))}
        </>
      )}
    </div>
  );
};

export default SeriesPage;
