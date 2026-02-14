import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Heart, Film, Tv, Menu, X, Upload } from 'lucide-react';
import { useState } from 'react';
import { useContent } from '@/contexts/ContentContext';
import { ImportModal } from './ImportModal';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { catalog } = useContent();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Início', icon: Film },
    { to: '/movies', label: 'Filmes', icon: Film },
    { to: '/series', label: 'Séries', icon: Tv },
    { to: '/favorites', label: 'Favoritos', icon: Heart },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background/95 to-background/0 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-3xl font-bold tracking-wider text-primary">
              VIBECINES
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {catalog.isLoaded && navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === item.to ? 'text-primary' : 'text-foreground/70'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {catalog.isLoaded && (
              <button
                onClick={() => navigate('/search')}
                className="p-2 rounded-full text-foreground/70 hover:text-primary transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setImportOpen(true)}
              className="p-2 rounded-full text-foreground/70 hover:text-primary transition-colors"
              title="Importar lista M3U"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 md:hidden text-foreground/70"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-md border-t border-border px-4 pb-4">
            {catalog.isLoaded && navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 py-3 text-sm font-medium transition-colors ${
                  location.pathname === item.to ? 'text-primary' : 'text-foreground/70'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
