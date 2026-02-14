import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CatalogState, ContentItem, Series } from '@/types/content';
import { fetchAndParseM3U, parseM3U } from '@/utils/m3u-parser';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

interface ContentContextType {
  catalog: CatalogState;
  isLoading: boolean;
  error: string | null;
  loadFromUrl: (url: string, persistShared?: boolean) => Promise<boolean>;
  loadFromText: (text: string) => void;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  searchContent: (query: string) => { movies: ContentItem[]; series: Series[] };
  getMovieById: (id: string) => ContentItem | undefined;
  getSeriesById: (id: string) => Series | undefined;
  m3uUrl: string | null;
}

const ContentContext = createContext<ContentContextType | null>(null);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const [catalog, setCatalog] = useState<CatalogState>({
    movies: [],
    series: [],
    allItems: [],
    groups: [],
    isLoaded: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('vibecines_favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [m3uUrl, setM3uUrl] = useState<string | null>(() => localStorage.getItem('vibecines_m3u_url'));

  useEffect(() => {
    localStorage.setItem('vibecines_favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  // Auto-load last URL saved on this device
  useEffect(() => {
    if (m3uUrl && !catalog.isLoaded) {
      void loadFromUrl(m3uUrl);
    }
  }, []);

  // Keep catalog synced with shared admin M3U URL
  useEffect(() => {
    const configRef = doc(db, 'appConfig', 'catalog');
    const unsubscribe = onSnapshot(configRef, snapshot => {
      const data = snapshot.data();
      const sharedUrl = (data?.m3uUrl as string | undefined)?.trim();
      if (!sharedUrl) return;
      if (sharedUrl === m3uUrl && catalog.isLoaded) return;
      void loadFromUrl(sharedUrl, false);
    });

    return () => unsubscribe();
  }, [m3uUrl, catalog.isLoaded]);

  const loadFromUrl = useCallback(async (url: string, persistShared = false) => {
    if (persistShared && !isAdmin) {
      setError('Somente o administrador pode atualizar a lista M3U.');
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAndParseM3U(url);
      if (!result.isLoaded) {
        setError('A lista M3U não possui conteúdos compatíveis para o catálogo.');
        return false;
      }

      setCatalog(result);
      setM3uUrl(url);
      localStorage.setItem('vibecines_m3u_url', url);

      if (persistShared) {
        await setDoc(doc(db, 'appConfig', 'catalog'), {
          m3uUrl: url,
          updatedAt: Date.now(),
        }, { merge: true });
      }

      return true;
    } catch {
      setError('Erro ao carregar a lista M3U. Verifique a URL e tente novamente.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const loadFromText = useCallback((text: string) => {
    const result = parseM3U(text);
    setCatalog(result);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const searchContent = useCallback((query: string) => {
    const q = query.toLowerCase();
    return {
      movies: catalog.movies.filter(m => m.title.toLowerCase().includes(q) || m.group.toLowerCase().includes(q)),
      series: catalog.series.filter(s => s.title.toLowerCase().includes(q) || s.group.toLowerCase().includes(q)),
    };
  }, [catalog]);

  const getMovieById = useCallback((id: string) => catalog.movies.find(m => m.id === id), [catalog]);
  const getSeriesById = useCallback((id: string) => catalog.series.find(s => s.id === id), [catalog]);

  return (
    <ContentContext.Provider value={{
      catalog, isLoading, error, loadFromUrl, loadFromText,
      favorites, toggleFavorite, isFavorite, searchContent,
      getMovieById, getSeriesById, m3uUrl,
    }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used within ContentProvider');
  return ctx;
}