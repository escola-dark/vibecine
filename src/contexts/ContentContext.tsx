import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CatalogState, ContentItem, Series } from '@/types/content';
import { extractM3UTextFromZipBuffer, fetchAndParseM3U, fetchAndParseM3UZip, parseM3U } from '@/utils/m3u-parser';
import { enrichCatalogLogosWithTMDB } from '@/utils/tmdb';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

interface ContentContextType {
  catalog: CatalogState;
  isLoading: boolean;
  isBootstrapping: boolean;
  error: string | null;
  loadFromUrl: (url: string, persistShared?: boolean) => Promise<boolean>;
  loadFromText: (text: string, persistShared?: boolean) => Promise<boolean>;
  loadFromZipBuffer: (zipBuffer: ArrayBuffer, persistShared?: boolean) => Promise<boolean>;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  searchContent: (query: string) => { movies: ContentItem[]; series: Series[] };
  getMovieById: (id: string) => ContentItem | undefined;
  getSeriesById: (id: string) => Series | undefined;
  m3uUrl: string | null;
}

const ContentContext = createContext<ContentContextType | null>(null);
const LOCAL_PLAYLIST_PATHS = ['/playlist.zip', '/assets/playlist.zip', '/playlist.m3u', '/assets/playlist.m3u'];

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
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('vibecines_favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [m3uUrl, setM3uUrl] = useState<string | null>(() => localStorage.getItem('vibecines_m3u_url'));

  useEffect(() => {
    localStorage.setItem('vibecines_favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  const applyCatalog = useCallback((nextCatalog: CatalogState) => {
    setCatalog(nextCatalog);

    const logos = [
      ...nextCatalog.movies.map(item => item.logo).filter(Boolean),
      ...nextCatalog.series.map(item => item.logo).filter(Boolean),
    ].slice(0, 80) as string[];

    logos.forEach(src => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    });
  }, []);

  // Keep catalog synced with shared admin M3U URL
  useEffect(() => {
    const configRef = doc(db, 'appConfig', 'catalog');
    const unsubscribe = onSnapshot(configRef, snapshot => {
      const data = snapshot.data();
      const sharedText = (data?.m3uContent as string | undefined)?.trim();
      const sharedUrl = (data?.m3uUrl as string | undefined)?.trim();
      if (sharedText) {
        void loadFromText(sharedText, false);
        return;
      }
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
      const result = /\.zip(\?.*)?$/i.test(url)
        ? await fetchAndParseM3UZip(url)
        : await fetchAndParseM3U(url);
      if (!result.isLoaded) {
        setError('A lista M3U não possui conteúdos compatíveis para o catálogo.');
        return false;
      }

      const enrichedCatalog = await enrichCatalogLogosWithTMDB(result);
      applyCatalog(enrichedCatalog);
      setM3uUrl(url);
      localStorage.setItem('vibecines_m3u_url', url);

      if (persistShared) {
        await setDoc(doc(db, 'appConfig', 'catalog'), {
          m3uUrl: url,
          m3uContent: null,
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
  }, [isAdmin, applyCatalog]);

  const loadFromText = useCallback(async (text: string, persistShared = false) => {
    if (persistShared && !isAdmin) {
      setError('Somente o administrador pode atualizar a lista M3U.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = parseM3U(text);
      if (!result.isLoaded) {
        setError('O arquivo M3U não possui conteúdos compatíveis para o catálogo.');
        return false;
      }

      const enrichedCatalog = await enrichCatalogLogosWithTMDB(result);
      applyCatalog(enrichedCatalog);

      if (persistShared) {
        await setDoc(doc(db, 'appConfig', 'catalog'), {
          m3uContent: text,
          m3uUrl: null,
          updatedAt: Date.now(),
        }, { merge: true });
      }

      return true;
    } catch {
      setError('Erro ao carregar o arquivo M3U. Verifique o conteúdo e tente novamente.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, applyCatalog]);

  const loadFromZipBuffer = useCallback(async (zipBuffer: ArrayBuffer, persistShared = false) => {
    if (persistShared && !isAdmin) {
      setError('Somente o administrador pode atualizar a lista M3U.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const text = await extractM3UTextFromZipBuffer(zipBuffer);
      const result = parseM3U(text);
      if (!result.isLoaded) {
        setError('O arquivo ZIP não possui conteúdos compatíveis para o catálogo.');
        return false;
      }

      const enrichedCatalog = await enrichCatalogLogosWithTMDB(result);
      applyCatalog(enrichedCatalog);

      if (persistShared) {
        await setDoc(doc(db, 'appConfig', 'catalog'), {
          m3uContent: text,
          m3uUrl: null,
          updatedAt: Date.now(),
        }, { merge: true });
      }

      return true;
    } catch {
      setError('Erro ao carregar o arquivo ZIP M3U. Verifique o conteúdo e tente novamente.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, applyCatalog]);

  const loadFromLocalPlaylist = useCallback(async () => {
    for (const path of LOCAL_PLAYLIST_PATHS) {
      const ok = await loadFromUrl(path, false);
      if (ok) return true;
    }
    return false;
  }, [loadFromUrl]);

  // Auto-load last URL saved on this device or local bundled playlist
  useEffect(() => {
    let active = true;

    const bootstrapCatalog = async () => {
      if (catalog.isLoaded) {
        if (active) setIsBootstrapping(false);
        return;
      }

      if (m3uUrl) {
        await loadFromUrl(m3uUrl);
      } else {
        await loadFromLocalPlaylist();
      }

      if (active) setIsBootstrapping(false);
    };

    void bootstrapCatalog();

    return () => {
      active = false;
    };
  }, [catalog.isLoaded, m3uUrl, loadFromLocalPlaylist, loadFromUrl]);

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
      catalog, isLoading, isBootstrapping, error, loadFromUrl, loadFromText, loadFromZipBuffer,
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