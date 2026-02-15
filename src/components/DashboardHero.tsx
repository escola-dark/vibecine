import { useMemo, useState, useEffect } from 'react';
import heroBg from '@/assets/hero-bg.jpg';
import { Play, Info, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '@/contexts/ContentContext';
import { ContentItem } from '@/types/content';

export function DashboardHero() {
  const { catalog, toggleFavorite, isFavorite } = useContent();
  const navigate = useNavigate();

  // Pick 5 featured items for slideshow
  const featured = useMemo(() => {
    const pool = catalog.movies.filter(m => m.logo).slice(0, 50);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(5, shuffled.length));
  }, [catalog.movies]);

  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % featured.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [featured.length]);

  const current = featured[currentIdx];

  if (!current) {
    // Fallback if no movies with logos
    const fallback = catalog.movies[0];
    if (!fallback) return null;
    return <FallbackHero item={fallback} />;
  }

  const fav = isFavorite(current.id);

  return (
    <div className="relative h-[55vh] md:h-[65vh] overflow-hidden rounded-b-2xl">
      {/* Background image */}
      {featured.map((item, idx) => (
        <div
          key={item.id}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: idx === currentIdx ? 1 : 0 }}
        >
          <img
            src={item.logo || heroBg}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ))}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
        <div className="max-w-xl">
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary mb-3">
            Em Destaque
          </span>
          <h1
            className="text-3xl md:text-5xl font-bold text-foreground mb-2 leading-tight"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.03em' }}
          >
            {current.title}
          </h1>
          <p className="text-sm text-muted-foreground mb-5">{current.group}</p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/watch/${current.id}`)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-glow"
            >
              <Play className="w-4 h-4 fill-current" />
              Assistir Agora
            </button>
            <button
              onClick={() => toggleFavorite(current.id)}
              className="p-2.5 rounded-lg border border-border bg-card/50 backdrop-blur-sm text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Heart className={`w-4 h-4 ${fav ? 'fill-primary text-primary' : ''}`} />
            </button>
          </div>
        </div>

        {/* Slide indicators */}
        {featured.length > 1 && (
          <div className="flex items-center gap-3 mt-6">
            <button onClick={() => setCurrentIdx(prev => (prev - 1 + featured.length) % featured.length)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1.5">
              {featured.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    idx === currentIdx ? 'w-8 bg-primary' : 'w-3 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <button onClick={() => setCurrentIdx(prev => (prev + 1) % featured.length)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FallbackHero({ item }: { item: ContentItem }) {
  const navigate = useNavigate();
  return (
    <div className="relative h-[45vh] overflow-hidden rounded-b-2xl" style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/30" />
      <div className="absolute bottom-0 left-0 p-6 md:p-10 max-w-xl">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          {item.title}
        </h1>
        <button onClick={() => navigate(`/watch/${item.id}`)} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-glow">
          <Play className="w-4 h-4 fill-current" />
          Assistir
        </button>
      </div>
    </div>
  );
}
