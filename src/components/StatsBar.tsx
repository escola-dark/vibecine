import { useMemo } from 'react';
import { Film, Tv, Heart, Layers, TrendingUp, Clock } from 'lucide-react';
import { useContent } from '@/contexts/ContentContext';

export function StatsBar() {
  const { catalog, favorites } = useContent();

  const stats = useMemo(() => [
    { label: 'Filmes', value: catalog.movies.length, icon: Film, color: 'text-primary' },
    { label: 'Séries', value: catalog.series.length, icon: Tv, color: 'text-blue-400' },
    { label: 'Categorias', value: catalog.groups.length, icon: Layers, color: 'text-emerald-400' },
    { label: 'Favoritos', value: favorites.size, icon: Heart, color: 'text-pink-400' },
  ], [catalog, favorites]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-6">
      {stats.map(stat => (
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
