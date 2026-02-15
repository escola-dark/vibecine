import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Film, Home, Menu, Search, Shield, Tv, Upload, User, X, LogOut } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useContent } from '@/contexts/ContentContext';
import { ImportModal } from './ImportModal';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { catalog } = useContent();
  const { isAdmin, logout, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Início', icon: Home },
    { to: '/movies', label: 'Filmes', icon: Film },
    { to: '/series', label: 'Séries', icon: Tv },
  ];

  const movieGroups = useMemo(() => {
    const groups = [...new Set(catalog.movies.map((m) => m.group))];
    return groups.slice(0, 18);
  }, [catalog.movies]);

  const seriesGroups = useMemo(() => {
    const groups = [...new Set(catalog.series.map((s) => s.group))];
    return groups.slice(0, 12);
  }, [catalog.series]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-[1800px] px-3 md:px-6 h-16 md:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-foreground hover:bg-secondary"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/90 grid place-items-center">
                <Film className="w-5 h-5 text-primary-foreground" />
              </div>
              <span
                className="text-2xl md:text-4xl font-bold tracking-tight text-primary"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                VibeCines
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xl font-medium flex items-center gap-2 transition-colors',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-foreground/70 hover:text-foreground hover:bg-secondary/70',
                  )}
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3 min-w-[420px] justify-end">
            <button
              onClick={() => navigate('/search')}
              className="w-[320px] rounded-xl border border-border bg-secondary/30 px-4 py-2 flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Search className="w-5 h-5" />
              <span>Buscar...</span>
            </button>

            <button className="p-2 rounded-full text-foreground/80 hover:bg-secondary">
              <Bell className="w-5 h-5" />
            </button>

            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="px-4 py-2 rounded-xl border border-border bg-secondary/40 text-foreground flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              {isAdmin ? 'Admin' : 'Usuário'}
            </button>
          </div>

          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg text-foreground hover:bg-secondary"
            aria-label="Perfil"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setMenuOpen(false)}>
          <aside
            className="w-[86vw] max-w-sm h-full bg-card border-r border-border p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-semibold">Menu</p>
              <button onClick={() => setMenuOpen(false)} className="p-2 rounded-lg hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-5">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Categorias de Filmes</p>
              <div className="space-y-1">
                {movieGroups.map((group) => (
                  <Link
                    key={group}
                    to={`/movies?cat=${encodeURIComponent(group)}`}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    {group}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Categorias de Séries</p>
              <div className="space-y-1">
                {seriesGroups.map((group) => (
                  <Link
                    key={group}
                    to={`/series?cat=${encodeURIComponent(group)}`}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    {group}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {profileOpen && (
        <div className="fixed inset-0 z-[75]" onClick={() => setProfileOpen(false)}>
          <div
            className="absolute right-3 md:right-6 top-16 md:top-20 w-56 rounded-xl border border-border bg-card p-2 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm font-medium">{isAdmin ? 'Admin' : 'Usuário'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || 'Logado'}</p>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setImportOpen(true);
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary"
              >
                <Upload className="w-4 h-4" />
                Upload da lista
              </button>
            )}

            <button
              onClick={() => {
                setProfileOpen(false);
                void logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}

      {isAdmin && <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />}
    </>
  );
}