import { ContentCard } from '@/components/ContentCard';
import { useContent } from '@/contexts/ContentContext';
import { Heart } from 'lucide-react';

const FavoritesPage = () => {
  const { catalog, favorites } = useContent();

  const favMovies = catalog.movies.filter(m => favorites.has(m.id));
  const favSeries = catalog.series.filter(s => favorites.has(s.id));

  return (
    <div className="min-h-screen pt-6 md:pt-8 pb-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-foreground mb-8" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          <Heart className="inline w-8 h-8 text-primary mr-2 fill-primary" />
          Meus Favoritos
        </h1>

        {favMovies.length === 0 && favSeries.length === 0 ? (
          <p className="text-center text-muted-foreground mt-20">Nenhum favorito ainda. Explore o catálogo!</p>
        ) : (
          <>
            {favMovies.length > 0 && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Filmes</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {favMovies.map(m => (
                    <ContentCard key={m.id} id={m.id} title={m.title} logo={m.logo} group={m.group} type="movie" />
                  ))}
                </div>
              </div>
            )}
            {favSeries.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Séries</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {favSeries.map(s => (
                    <ContentCard key={s.id} id={s.id} title={s.title} logo={s.logo} group={s.group} type="series" />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
