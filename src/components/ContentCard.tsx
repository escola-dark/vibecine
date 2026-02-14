import { Heart, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '@/contexts/ContentContext';

interface ContentCardProps {
  id: string;
  title: string;
  logo?: string;
  group?: string;
  type: 'movie' | 'series';
}

export function ContentCard({ id, title, logo, group, type }: ContentCardProps) {
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useContent();
  const fav = isFavorite(id);

  const handleClick = () => {
    if (type === 'movie') {
      navigate(`/watch/${id}`);
    } else {
      navigate(`/series/${id}`);
    }
  };

  return (
    <div
      className="group relative flex-shrink-0 w-[160px] md:w-[200px] cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary shadow-card transition-transform duration-300 group-hover:scale-105 group-hover:shadow-glow">
        {logo ? (
          <img src={logo} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted p-3">
            <span className="text-center text-xs text-muted-foreground font-medium line-clamp-3">
              {title}
            </span>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <div className="p-2 rounded-full bg-primary text-primary-foreground">
            <Play className="w-5 h-5 fill-current" />
          </div>
        </div>

        {/* Favorite button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(id); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-primary text-primary' : 'text-foreground'}`} />
        </button>
      </div>
      
      <p className="mt-2 text-xs text-foreground/80 font-medium line-clamp-2">{title}</p>
      {group && <p className="text-[10px] text-muted-foreground">{group}</p>}
    </div>
  );
}
