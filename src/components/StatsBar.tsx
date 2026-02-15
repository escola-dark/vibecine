import { useMemo } from 'react';
import { Film, Tv, Heart, Layers } from 'lucide-react';
import { useContent } from '@/contexts/ContentContext';

function hasImage(logo?: string): boolean {
  return typeof logo === 'string' && logo.trim().length > 0;
}

export function StatsBar() {
  const { catalog, favorites } = useContent();

  const visibleMovies = useMemo(
    () => catalog.movies.filter((movie) => hasImage(movie.logo)),
    [catalog.movies],
  );

  const visibleSeries = useMemo(
    () => catalog.series.filter((series) => hasImage(series.logo)),
    [catalog.series],
  );

  const visibleIds = useMemo(
    () => new Set([...visibleMovies.map((movie) => movie.id), ...visibleSeries.map((series) => series.id)]),
    [visibleMovies, visibleSeries],
  );

  const visibleGroups = useMemo(
    () => new Set([...visibleMovies.map((movie) => movie.group), ...visibleSeries.map((series) => series.group)]),
    [visibleMovies, visibleSeries],
  );

  const stats = useMemo(() => [
    { label: 'Favoritos', value: [...favorites].filter((id) => visibleIds.has(id)).length, icon: Heart, color: 'text-pink-400' },
    { label: 'Filmes', value: visibleMovies.length, icon: Film, color: 'text-primary' },
    { label: 'S\u00E9ries', value: visibleSeries.length, icon: Tv, color: 'text-blue-400' },
    { label: 'Categorias', value: visibleGroups.size, icon: Layers, color: 'text-emerald-400' },
  ], [favorites, visibleGroups.size, visibleIds, visibleMovies.length, visibleSeries.length]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-6">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50">
          <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
            <stat.icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">{stat.value.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
