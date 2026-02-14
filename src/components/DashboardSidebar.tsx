import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Layers, Tv } from 'lucide-react';
import { useContent } from '@/contexts/ContentContext';

export function DashboardSidebar() {
  const navigate = useNavigate();
  const { catalog } = useContent();

  const movieGroups = useMemo(() => {
    const groups = new Map<string, number>();
    catalog.movies.forEach((m) => {
      groups.set(m.group, (groups.get(m.group) || 0) + 1);
    });
    return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [catalog.movies]);

  const seriesGroups = useMemo(() => {
    const groups = new Map<string, number>();
    catalog.series.forEach((s) => {
      groups.set(s.group, (groups.get(s.group) || 0) + 1);
    });
    return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [catalog.series]);

  if (!catalog.isLoaded) return null;

  return (
    <aside className="hidden lg:flex fixed left-0 top-20 bottom-0 z-40 w-[240px] flex-col bg-card/95 backdrop-blur-md border-r border-border">
      <div className="h-12 px-4 flex items-center border-b border-border">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Categorias</h2>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 scrollbar-hide">
        {movieGroups.length > 0 && (
          <div className="px-3 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-2">
              Categorias de Filmes
            </p>
            {movieGroups.map(([group, count]) => (
              <button
                key={group}
                onClick={() => navigate(`/movies?cat=${encodeURIComponent(group)}`)}
                className="flex items-center justify-between gap-2 w-full px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <span className="truncate">{group}</span>
                <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{count}</span>
              </button>
            ))}
          </div>
        )}

        {seriesGroups.length > 0 && (
          <div className="px-3 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-2">
              Categorias de Séries
            </p>
            {seriesGroups.map(([group, count]) => (
              <button
                key={group}
                onClick={() => navigate(`/series?cat=${encodeURIComponent(group)}`)}
                className="flex items-center justify-between gap-2 w-full px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <span className="truncate">{group}</span>
                <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-3 border-t border-border space-y-1">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
          <Film className="w-3 h-3" />
          <span>{catalog.movies.length} filmes</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
          <Tv className="w-3 h-3" />
          <span>{catalog.series.length} séries</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
          <Layers className="w-3 h-3" />
          <span>{catalog.groups.length} categorias</span>
        </div>
      </div>
    </aside>
  );
}