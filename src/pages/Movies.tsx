import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ContentRow } from '@/components/ContentRow';
import { ContentCard } from '@/components/ContentCard';
import { useContent } from '@/contexts/ContentContext';
import { useSearchParams } from 'react-router-dom';
import { CatalogLoading } from '@/components/CatalogLoading';

const MoviesPage = () => {
  const { catalog, isBootstrapping, isLoading } = useContent();
  const [params] = useSearchParams();
  const selectedCategory = params.get('cat');
  const [movieSearch, setMovieSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const moviesByGroupMap = useMemo(() => {
    const map = new Map<string, typeof catalog.movies>();
    catalog.movies.forEach(movie => {
      if (!map.has(movie.group)) map.set(movie.group, []);
      map.get(movie.group)!.push(movie);
    });
    return map;
  }, [catalog.movies]);

  const moviesByGroup = useMemo(
    () => [...moviesByGroupMap.entries()].sort((a, b) => b[1].length - a[1].length),
    [moviesByGroupMap]
  );

  const categoryMovies = useMemo(() => {
    const baseList = moviesByGroupMap.get(selectedCategory || '') || [];
    const query = movieSearch.trim().toLowerCase();
    if (!query) return baseList;
    return baseList.filter(movie => movie.title.toLowerCase().includes(query));
  }, [moviesByGroupMap, selectedCategory, movieSearch]);

  const filteredGroups = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return moviesByGroup;

    return moviesByGroup
      .map(([group, movies]) => [
        group,
        movies.filter(movie => movie.title.toLowerCase().includes(query) || group.toLowerCase().includes(query)),
      ] as const)
      .filter(([, movies]) => movies.length > 0);
  }, [moviesByGroup, categorySearch]);

  if (isBootstrapping || (isLoading && !catalog.isLoaded)) {
    return <CatalogLoading message="Atualizando catálogo" />;
  }

  return (
    <div className="min-h-screen pt-6 md:pt-8 pb-12">
      <div className="container mx-auto px-4 mb-6">
        <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          Filmes
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {selectedCategory ? `Categoria: ${selectedCategory}` : `${catalog.movies.length} filmes disponíveis`}
        </p>
      </div>

      {selectedCategory ? (
        <div className="container mx-auto px-4">
          <div className="mb-5 max-w-md">
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Pesquisar nesta categoria</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={movieSearch}
                onChange={e => setMovieSearch(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Buscar filme..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {categoryMovies.map(movie => (
              <ContentCard key={movie.id} id={movie.id} title={movie.title} logo={movie.logo} group={movie.group} type="movie" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="container mx-auto px-4 mb-2 max-w-xl">
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Pesquisar filmes ou categorias</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Ex: ação, amazon, vingadores..."
              />
            </div>
          </div>

          {filteredGroups.map(([group, movies]) => (
            <ContentRow
              key={group}
              title={group}
              items={movies.map(movie => ({ ...movie, type: 'movie' as const }))}
              limit={12}
              seeAllTo={`/movies?cat=${encodeURIComponent(group)}`}
              showEndCard
            />
          ))}
        </>
      )}
    </div>
  );
};

export default MoviesPage;