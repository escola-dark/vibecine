import { useParams, useNavigate } from 'react-router-dom';
import { useContent } from '@/contexts/ContentContext';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ArrowLeft } from 'lucide-react';

const WatchPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getMovieById, catalog } = useContent();

  // Find in all items
  const item = id ? (getMovieById(id) || catalog.allItems.find(i => i.id === id)) : undefined;
  const playlist = item?.type === 'series' && item.seriesId
    ? catalog.series
      .find(s => s.id === item.seriesId)
      ?.seasons
    : undefined;

  const orderedEpisodes = playlist
    ? Object.keys(playlist)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap(season => [...playlist[season]].sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0)))
    : [];

  const currentIndex = orderedEpisodes.findIndex(ep => ep.id === item?.id);

  const handleEpisodeEnd = () => {
    if (currentIndex === -1) return;
    const next = orderedEpisodes[currentIndex + 1];
    if (next) {
      navigate(`/watch/${next.id}`);
    }
  };

  const hasNextEpisode = currentIndex !== -1 && !!orderedEpisodes[currentIndex + 1];

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Conteúdo não encontrado</p>
          <button onClick={() => navigate('/')} className="text-primary hover:underline flex items-center gap-1 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <VideoPlayer
        url={item.url}
        title={item.title}
        contentId={item.id}
        isSeries={item.type === 'series'}
        hasNextEpisode={hasNextEpisode}
        onEnded={item.type === 'series' ? handleEpisodeEnd : undefined}
      />
    </div>
  );
};

export default WatchPage;