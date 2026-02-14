import { useState } from 'react';
import { Search } from 'lucide-react';
import { ContentCard } from '@/components/ContentCard';
import { useContent } from '@/contexts/ContentContext';

const SearchPage = () => {
  const { searchContent } = useContent();
  const [query, setQuery] = useState('');
  const results = query.length >= 2 ? searchContent(query) : { movies: [], series: [] };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="relative max-w-xl mx-auto mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar filmes e séries..."
            autoFocus
            className="w-full rounded-xl bg-secondary border border-border pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
          />
        </div>

        {query.length >= 2 && (
          <>
            {results.movies.length > 0 && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  Filmes ({results.movies.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {results.movies.slice(0, 30).map(m => (
                    <ContentCard key={m.id} id={m.id} title={m.title} logo={m.logo} group={m.group} type="movie" />
                  ))}
                </div>
              </div>
            )}
            {results.series.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  Séries ({results.series.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {results.series.slice(0, 30).map(s => (
                    <ContentCard key={s.id} id={s.id} title={s.title} logo={s.logo} group={s.group} type="series" />
                  ))}
                </div>
              </div>
            )}
            {results.movies.length === 0 && results.series.length === 0 && (
              <p className="text-center text-muted-foreground mt-20">Nenhum resultado encontrado para "{query}"</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
