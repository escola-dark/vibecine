import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '@/contexts/ContentContext';
import { Loader2, Link as LinkIcon } from 'lucide-react';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportModal({ open, onClose }: ImportModalProps) {
  const { loadFromUrl, isLoading, m3uUrl, error } = useContent();
  const navigate = useNavigate();
  const [url, setUrl] = useState(m3uUrl || '');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    const success = await loadFromUrl(url.trim());
    if (!success) return;
    onClose();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 rounded-xl bg-card border border-border p-6 shadow-card"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          Importar Lista M3U
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Cole a URL da sua lista M3U para carregar filmes e séries.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://exemplo.com/lista.m3u"
              className="w-full rounded-lg bg-secondary border border-border pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                'Importar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
