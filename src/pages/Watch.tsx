import { useParams, useNavigate } from 'react-router-dom';
import { useContent } from '@/contexts/ContentContext';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ArrowLeft } from 'lucide-react';

const WatchPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getMovieById, catalog } = useContent();

  const item = id ? getMovieById(id) || catalog.allItems.find((i) => i.id === id) : undefined;

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
    <div className="min-h-screen bg-black md:bg-background flex items-center justify-center px-0 md:px-4 py-4 md:py-8">
      <div className="w-full max-w-6xl">
        <VideoPlayer url={item.url} title={item.title} contentId={item.id} />

        <div className="px-4 py-4 md:px-6 md:py-6 bg-black md:bg-card/70 border-t md:border border-border/40 text-foreground">
          <h1 className="text-base md:text-xl font-semibold line-clamp-2">{item.title}</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Toque no vídeo para exibir os controles. Em dispositivos móveis, use tela cheia para melhor experiência.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
