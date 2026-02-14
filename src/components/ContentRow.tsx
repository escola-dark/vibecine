import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { ContentCard } from './ContentCard';
import { Link } from 'react-router-dom';

interface ContentRowProps {
  title: string;
  items: Array<{ id: string; title: string; logo?: string; group?: string; type: 'movie' | 'series' }>;
  seeAllTo?: string;
  limit?: number;
  showEndCard?: boolean;
}

export function ContentRow({ title, items, seeAllTo, limit = 12, showEndCard = false }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleItems = items.slice(0, limit);

  if (visibleItems.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const currentY = window.scrollY;
    const amount = scrollRef.current.clientWidth * 0.85;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    requestAnimationFrame(() => {
      if (window.scrollY !== currentY) {
        window.scrollTo({ top: currentY, behavior: 'auto' });
      }
    });
  };

  const onArrowClick = (e: React.MouseEvent<HTMLButtonElement>, direction: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    scroll(direction);
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between px-4 mb-3 gap-3">
        {seeAllTo ? (
          <Link
            to={seeAllTo}
            className="text-3xl md:text-4xl font-bold text-foreground hover:text-primary transition-colors"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
          >
            {title}
          </Link>
        ) : (
          <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
            {title}
          </h2>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => onArrowClick(e, 'left')}
            className="p-2 rounded-full bg-secondary/70 text-foreground hover:text-primary"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => onArrowClick(e, 'right')}
            className="p-2 rounded-full bg-secondary/70 text-foreground hover:text-primary"
            aria-label="Próximo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="px-4 flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
      >
        {visibleItems.map(item => (
          <div key={item.id} className="snap-start flex-shrink-0 w-[42%] sm:w-[30%] md:w-[24%] lg:w-[18%] xl:w-[15%]">
            <ContentCard {...item} />
          </div>
        ))}

        {showEndCard && seeAllTo && (
          <Link
            to={seeAllTo}
            className="snap-start flex-shrink-0 w-[42%] sm:w-[30%] md:w-[24%] lg:w-[18%] xl:w-[15%] rounded-xl border border-primary/40 bg-primary/10 grid place-items-center text-center p-4 hover:bg-primary/20 transition-colors"
          >
            <span className="text-sm font-semibold text-primary">Ver tudo</span>
          </Link>
        )}
      </div>
    </section>
  );
}