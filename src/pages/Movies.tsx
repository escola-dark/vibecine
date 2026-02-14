import { ContentRow } from '@/components/ContentRow';
import { ContentCard } from '@/components/ContentCard';
import { useContent } from '@/contexts/ContentContext';

const MoviesPage = () => {
  const { catalog } = useContent();

  const moviesByGroup = new Map<string, typeof catalog.movies>();
  catalog.movies.forEach(m => {
    if (!moviesByGroup.has(m.group)) moviesByGroup.set(m.group, []);
    moviesByGroup.get(m.group)!.push(m);
  });

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 mb-8">
        <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          Filmes
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{catalog.movies.length} filmes disponíveis</p>
      </div>
      {[...moviesByGroup.entries()].map(([group, movies]) => (
        <ContentRow
          key={group}
          title={group}
          items={movies.map(m => ({ ...m, type: 'movie' as const }))}
        />
      ))}
    </div>
  );
};

export default MoviesPage;
