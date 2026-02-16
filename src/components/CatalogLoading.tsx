import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface CatalogLoadingProps {
  message?: string;
}

const LOADING_TEXTS = [
  'Atualizando os filmes...',
  'Atualizando as séries...',
] as const;

export function CatalogLoading(_: CatalogLoadingProps) {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTextIndex(prev => (prev + 1) % LOADING_TEXTS.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="px-4 md:px-6 py-8 md:py-12">
      <div className="rounded-2xl border border-border bg-card/70 p-8 md:p-12 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 grid place-items-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
        <h2
          className="text-3xl md:text-4xl font-bold text-foreground"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
        >
          Aguarde
        </h2>
        <p
          key={textIndex}
          className="mt-2 text-sm md:text-base text-muted-foreground animate-in fade-in duration-500"
        >
          {LOADING_TEXTS[textIndex]}
        </p>
      </div>
    </div>
  );
}
