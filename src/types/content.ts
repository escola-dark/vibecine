export type ContentType = 'movie' | 'series';

export interface ContentItem {
  id: string;
  title: string;
  url: string;
  logo?: string;
  group: string;
  type: ContentType;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  seriesId?: string;
}

export interface Series {
  id: string;
  title: string;
  logo?: string;
  group: string;
  type: 'series';
  seasons: Record<number, ContentItem[]>;
}

export interface CatalogState {
  movies: ContentItem[];
  series: Series[];
  allItems: ContentItem[];
  groups: string[];
  isLoaded: boolean;
}
