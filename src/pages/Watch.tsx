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
      <VideoPlayer url={item.url} title={item.title} contentId={item.id} />
    </div>
  );
};

export default WatchPage;
