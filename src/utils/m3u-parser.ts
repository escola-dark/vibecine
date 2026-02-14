import { ContentItem, ContentType, Series, CatalogState } from '@/types/content';

function generateId(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function detectType(title: string, group: string): { type: ContentType; seasonNumber?: number; episodeNumber?: number; episodeTitle?: string; seriesTitle?: string } {
  const lower = (group + ' ' + title).toLowerCase();

  // Filter out live TV channels
  const liveKeywords = ['ao vivo', '24h', 'canais', 'tv ao vivo', 'live', 'linear'];
  if (liveKeywords.some(kw => lower.includes(kw))) {
    return { type: 'movie' };
  }

  // Series detection: S01E01, S01 E01, 1x01, T01E01 patterns
  const seriesPatterns = [
    /S(\d{1,2})\s*E(\d{1,3})/i,
    /T(\d{1,2})\s*E(\d{1,3})/i,
    /(\d{1,2})x(\d{1,3})/i,
    /temporada\s*(\d{1,2}).*epis[oó]dio\s*(\d{1,3})/i,
  ];

  for (const pattern of seriesPatterns) {
    const match = title.match(pattern);
    if (match) {
      const seasonNumber = parseInt(match[1]);
      const episodeNumber = parseInt(match[2]);
      // Extract series title (everything before the season/episode pattern)
      const seriesTitle = title.substring(0, title.search(pattern)).replace(/[-–—\s]+$/, '').trim();
      const episodeTitle = title.substring(title.search(pattern) + match[0].length).replace(/^[-–—\s]+/, '').trim();
      return { type: 'series', seasonNumber, episodeNumber, episodeTitle, seriesTitle: seriesTitle || title };
    }
  }

  // Check group for series hints
  if (lower.includes('séri') || lower.includes('serie') || lower.includes('series')) {
    return { type: 'series', seasonNumber: 1, episodeNumber: 1, seriesTitle: title };
  }

  return { type: 'movie' };
}

export function parseM3U(content: string): CatalogState {
  const lines = content.split('\n');
  const items: ContentItem[] = [];
  
  let currentTitle = '';
  let currentLogo = '';
  let currentGroup = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Parse EXTINF line
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupMatch = line.match(/group-title="([^"]*)"/);
      const titleMatch = line.match(/,(.+)$/);

      currentLogo = logoMatch?.[1] || '';
      currentGroup = groupMatch?.[1] || 'Sem Categoria';
      currentTitle = titleMatch?.[1]?.trim() || 'Sem Título';
    } else if (line && !line.startsWith('#') && (line.startsWith('http') || line.startsWith('rtmp'))) {
      // This is a URL line
      const groupLower = currentGroup.toLowerCase();
      
      const titleLower = currentTitle.toLowerCase();
      const combinedLower = groupLower + ' ' + titleLower;

      // Skip live TV channels
      const liveKeywords = ['ao vivo', '24h', 'canais', 'tv ', 'aberto', 'live', 'aberta', 'canal', 'open tv', 'ppv', 'pay per view', '24 horas', 'linear'];
      if (liveKeywords.some(kw => combinedLower.includes(kw))) {
        currentTitle = '';
        currentLogo = '';
        currentGroup = '';
        continue;
      }

      // Skip adult content
      const adultKeywords = ['adult', 'adulto', 'xxx', 'porn', 'erotic', 'erótic', 'sexy', 'sex ', '+18', '18+', 'hentai', 'playboy', 'hustler', 'brazzers', 'bangbros', 'naughty', 'milf', 'lesbian', 'gay ', 'strip', 'onlyfans', 'cam girl', 'nude', 'naked', 'fetish', 'bdsm', 'hardcore', 'softcore', 'xvideos', 'xhamster', 'redtube', 'youporn', 'penthouse', 'vivid', 'hot girls', 'after dark', 'midnight', 'meia-noite', 'proibido'];
      if (adultKeywords.some(kw => combinedLower.includes(kw))) {
        currentTitle = '';
        currentLogo = '';
        currentGroup = '';
        continue;
      }

      const detected = detectType(currentTitle, currentGroup);
      
      const item: ContentItem = {
        id: generateId(currentTitle + line),
        title: currentTitle,
        url: line,
        logo: currentLogo || undefined,
        group: currentGroup,
        type: detected.type,
        seasonNumber: detected.seasonNumber,
        episodeNumber: detected.episodeNumber,
        episodeTitle: detected.episodeTitle,
        seriesId: detected.seriesTitle ? generateId(detected.seriesTitle) : undefined,
      };

      // Override title for series to be the series name
      if (detected.seriesTitle) {
        item.seriesId = generateId(detected.seriesTitle);
      }

      items.push(item);

      currentTitle = '';
      currentLogo = '';
      currentGroup = '';
    }
  }

  // Separate movies and series
  const movies = items.filter(i => i.type === 'movie');
  
  // Group series episodes
  const seriesMap = new Map<string, Series>();
  items.filter(i => i.type === 'series').forEach(item => {
    const sid = item.seriesId || item.id;
    if (!seriesMap.has(sid)) {
      // Extract series name from title
      const seriesTitle = item.title.replace(/S\d{1,2}\s*E\d{1,3}/i, '').replace(/T\d{1,2}\s*E\d{1,3}/i, '').replace(/\d{1,2}x\d{1,3}/i, '').replace(/[-–—\s]+$/, '').trim() || item.title;
      seriesMap.set(sid, {
        id: sid,
        title: seriesTitle,
        logo: item.logo,
        group: item.group,
        type: 'series',
        seasons: {},
      });
    }
    const series = seriesMap.get(sid)!;
    if (!series.logo && item.logo) series.logo = item.logo;
    const season = item.seasonNumber || 1;
    if (!series.seasons[season]) series.seasons[season] = [];
    series.seasons[season].push(item);
  });

  // Sort episodes within each season
  seriesMap.forEach(s => {
    Object.keys(s.seasons).forEach(season => {
      s.seasons[Number(season)].sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
    });
  });

  const groups = [...new Set(items.map(i => i.group))].sort();

  return {
    movies,
    series: Array.from(seriesMap.values()),
    allItems: items,
    groups,
    isLoaded: items.length > 0,
  };
}

export async function fetchAndParseM3U(url: string): Promise<CatalogState> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar lista M3U: ${response.status}`);
  }

  const text = await response.text();
  if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
    throw new Error('Conteúdo inválido: não parece uma lista M3U');
  }

  return parseM3U(text);
}