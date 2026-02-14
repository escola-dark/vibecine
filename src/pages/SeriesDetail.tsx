import { useParams, useNavigate } from 'react-router-dom';
import { useContent } from '@/contexts/ContentContext';
import { ArrowLeft, Heart, Play } from 'lucide-react';
import { useState } from 'react';

const SeriesDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSeriesById, toggleFavorite, isFavorite } = useContent();

  const series = id ? getSeriesById(id) : undefined;
  const seasons = series ? Object.keys(series.seasons).map(Number).sort((a, b) => a - b) : [];
  const [activeSeason, setActiveSeason] = useState(seasons[0] || 1);

  if (!series) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Série não encontrada</p>
          <button onClick={() => navigate('/')} className="text-primary hover:underline flex items-center gap-1 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  const episodes = series.seasons[activeSeason] || [];
  const fav = isFavorite(series.id);

  return (
    <div className="min-h-screen pt-20 pb-12">
      {/* Hero */}
      <div className="relative h-[40vh] flex items-end">
        {series.logo ? (
          <img src={series.logo} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 pb-8">
          <button onClick={() => navigate(-1)} className="text-foreground/70 hover:text-foreground mb-4 flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {series.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{series.group} · {seasons.length} temporada{seasons.length > 1 ? 's' : ''}</p>
          <button
            onClick={() => toggleFavorite(series.id)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:border-primary transition-colors"
          >
            <Heart className={`w-4 h-4 ${fav ? 'fill-primary text-primary' : ''}`} />
            {fav ? 'Nos Favoritos' : 'Favoritar'}
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        {/* Season tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {seasons.map(s => (
            <button
              key={s}
              onClick={() => setActiveSeason(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSeason === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground/70 hover:text-foreground'
              }`}
            >
              Temporada {s}
            </button>
          ))}
        </div>

        {/* Episodes */}
        <div className="space-y-2">
          {episodes.map((ep, idx) => (
            <button
              key={ep.id}
              onClick={() => navigate(`/watch/${ep.id}`)}
              className="w-full flex items-center gap-4 p-4 rounded-lg bg-card hover:bg-secondary transition-colors text-left group"
            >
              <span className="text-2xl font-bold text-muted-foreground w-8 text-center">{ep.episodeNumber || idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {ep.episodeTitle || ep.title}
                </p>
              </div>
              <Play className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeriesDetailPage;
