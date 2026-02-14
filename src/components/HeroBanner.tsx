import heroBg from '@/assets/hero-bg.jpg';
import { Play, Upload } from 'lucide-react';
import { useContent } from '@/contexts/ContentContext';
import { useState } from 'react';
import { ImportModal } from './ImportModal';

export function HeroBanner() {
  const { catalog } = useContent();
  const [importOpen, setImportOpen] = useState(false);

  if (!catalog.isLoaded) {
    return (
      <div
        className="relative h-[85vh] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-background/70" />
        <div className="relative z-10 text-center max-w-2xl mx-auto px-4">
          <h1 className="text-6xl md:text-8xl font-bold tracking-wider text-primary mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            VIBECINES
          </h1>
          <p className="text-lg text-foreground/70 mb-8">
            Seu cinema pessoal. Importe sua lista M3U e explore filmes e séries em uma experiência premium.
          </p>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all shadow-glow"
          >
            <Upload className="w-5 h-5" />
            Importar Lista M3U
          </button>
        </div>
        <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      </div>
    );
  }

  // Show a random featured movie
  const featured = catalog.movies.length > 0
    ? catalog.movies[Math.floor(Math.random() * Math.min(catalog.movies.length, 20))]
    : null;

  if (!featured) return null;

  return (
    <div className="relative h-[70vh] flex items-end">
      {featured.logo ? (
        <img src={featured.logo} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
      
      <div className="relative z-10 container mx-auto px-4 pb-16 max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-bold mb-3 text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          {featured.title}
        </h1>
        <p className="text-muted-foreground text-sm mb-4">{featured.group}</p>
        <a
          href={`/watch/${featured.id}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-glow"
        >
          <Play className="w-5 h-5 fill-current" />
          Assistir
        </a>
      </div>
    </div>
  );
}
