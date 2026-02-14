import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Film, Tv, Heart, Search, Upload, LogOut,
  ChevronLeft, ChevronRight, Layers
} from 'lucide-react';
import { useContent } from '@/contexts/ContentContext';
import { ImportModal } from './ImportModal';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const mainNav = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/movies', label: 'Filmes', icon: Film },
  { to: '/series', label: 'Séries', icon: Tv },
  { to: '/favorites', label: 'Favoritos', icon: Heart },
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { catalog } = useContent();
  const [collapsed, setCollapsed] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { logout, isAdmin } = useAuth();

  useEffect(() => {
    if (location.pathname.startsWith('/search')) {
      setCollapsed(true);
    }
  }, [location.pathname]);

  // Get unique groups/categories
  const movieGroups = useMemo(() => {
    const groups = new Map<string, number>();
    catalog.movies.forEach(m => {
      groups.set(m.group, (groups.get(m.group) || 0) + 1);
    });
    return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [catalog.movies]);

  const seriesGroups = useMemo(() => {
    const groups = new Map<string, number>();
    catalog.series.forEach(s => {
      groups.set(s.group, (groups.get(s.group) || 0) + 1);
    });
    return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [catalog.series]);

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-card/95 backdrop-blur-md border-r border-border transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 flex-shrink-0">
          {!collapsed && (
            <Link to="/" className="text-2xl font-bold tracking-wider text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              VIBECINES
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Search button */}
        {catalog.isLoaded && (
          <div className="px-3 mb-2">
            <button
              onClick={() => navigate('/search')}
              className={cn(
                "flex items-center gap-3 w-full rounded-lg bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors",
                collapsed ? "p-2.5 justify-center" : "px-3 py-2.5"
              )}
            >
              <Search className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="text-sm">Buscar...</span>}
            </button>
          </div>
        )}

        {/* Main nav */}
        <nav className="px-3 space-y-1 flex-shrink-0">
          {mainNav.map(item => {
            const active = location.pathname === item.to;
            if (!catalog.isLoaded && item.to !== '/') return null;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg transition-all duration-200",
                  collapsed ? "p-2.5 justify-center" : "px-3 py-2.5",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Category sections */}
        {catalog.isLoaded && !collapsed && (
          <div className="flex-1 overflow-y-auto mt-4 scrollbar-hide">
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
        )}

        {/* Bottom actions */}
        <div className="px-3 py-3 mt-auto border-t border-border flex-shrink-0">
          {isAdmin && (
            <button
              onClick={() => setImportOpen(true)}
              className={cn(
                "flex items-center gap-3 w-full rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors",
                collapsed ? "p-2.5 justify-center" : "px-3 py-2.5"
              )}
              title="Importar lista M3U"
            >
              <Upload className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Importar M3U</span>}
            </button>
          )}

          <button
            onClick={() => void logout()}
            className={cn(
              "mt-2 flex items-center gap-3 w-full rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
              collapsed ? "p-2.5 justify-center" : "px-3 py-2.5"
            )}
            title="Sair"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sair</span>}
          </button>

          {/* Stats */}
          {catalog.isLoaded && !collapsed && (
            <div className="mt-3 px-3 space-y-1">
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
          )}
        </div>
      </aside>

      {isAdmin && <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />}
    </>
  );
}