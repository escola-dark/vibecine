import { Loader2 } from 'lucide-react';

interface CatalogLoadingProps {
  message?: string;
}

export function CatalogLoading({ message = 'Atualizando catálogo' }: CatalogLoadingProps) {
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
          {message}
        </h2>
        <p className="mt-2 text-sm md:text-base text-muted-foreground">
          Atualizando os filmes & séries...
        </p>
      </div>
    </div>
  );
}