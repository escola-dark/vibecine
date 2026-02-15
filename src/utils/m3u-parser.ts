import { CatalogState, ContentItem, ContentType, Series } from '@/types/content';
import JSZip from 'jszip';

function generateId(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\[(?:[^\]]*)\]/g, ' ')
    .replace(/\b(4k|uhd|fhd|hd|dublado|dual\s*audio|legendado)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function qualityScore(title: string): number {
  const t = title.toLowerCase();
  if (t.includes('[l]')) return 3;
  if (t.includes('4k') || t.includes('uhd')) return 2;
  return 1;
}

function dedupeItems(items: ContentItem[]): ContentItem[] {
  const map = new Map<string, ContentItem>();

  for (const item of items) {
    const key = item.type === 'series'
      ? `${item.seriesId || normalizeTitle(item.title)}|${item.seasonNumber || 1}|${item.episodeNumber || 0}`
      : `${normalizeTitle(item.title)}|${item.group.toLowerCase()}`;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }

    if (qualityScore(item.title) > qualityScore(existing.title)) {
      map.set(key, item);
    }
  }

  return [...map.values()];
}

function splitExtInfLine(line: string): { metadata: string; displayTitle: string } {
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      return {
        metadata: line.slice(0, i),
        displayTitle: line.slice(i + 1),
      };
    }
  }

  const fallbackComma = line.lastIndexOf(',');
  if (fallbackComma !== -1) {
    return {
      metadata: line.slice(0, fallbackComma),
      displayTitle: line.slice(fallbackComma + 1),
    };
  }

  return {
    metadata: line,
    displayTitle: '',
  };
}

function parseExtInfAttributes(metadata: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([\w-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(metadata)) !== null) {
    attrs[match[1].toLowerCase()] = match[2].trim();
  }

  return attrs;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAttribute(metadata: string, attrs: Record<string, string>, key: string): string {
  const direct = attrs[key];
  if (direct) return direct;

  const looseRegex = new RegExp(`${escapeRegex(key)}="([^,]*)`, 'i');
  const looseMatch = metadata.match(looseRegex);
  return looseMatch?.[1]?.trim() || '';
}

function sanitizeExtInfText(value: string): string {
  return value
    .replace(/(?:\s|")*(?:tvg-[\w-]+|group-title)\s*=\s*"[^"]*"?.*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s"']+|[\s"']+$/g, '')
    .trim();
}

function isPollutedWithAttributes(value: string): boolean {
  return /\b(?:tvg-name|tvg-logo|group-title)\s*=/i.test(value);
}

function resolvePreferredTitle(rawDisplayTitle: string, parsedDisplayTitle: string, tvgName: string): string {
  if (!parsedDisplayTitle) return tvgName;
  if (isPollutedWithAttributes(rawDisplayTitle) && tvgName) return tvgName;
  return parsedDisplayTitle;
}

function detectType(title: string, group: string): {
  type: ContentType;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  seriesTitle?: string;
} {
  const lower = `${group} ${title}`.toLowerCase();

  const liveKeywords = ['ao vivo', '24h', 'canais', 'tv ao vivo', 'live', 'linear'];
  if (liveKeywords.some((kw) => lower.includes(kw))) {
    return { type: 'movie' };
  }

  const seriesPatterns = [
    /S(\d{1,2})\s*E(\d{1,3})/i,
    /T(\d{1,2})\s*E(\d{1,3})/i,
    /(\d{1,2})x(\d{1,3})/i,
    /temporada\s*(\d{1,2}).*epis[o\u00F3]dio\s*(\d{1,3})/i,
  ];

  for (const pattern of seriesPatterns) {
    const match = title.match(pattern);
    if (!match) continue;

    const seasonNumber = parseInt(match[1], 10);
    const episodeNumber = parseInt(match[2], 10);
    const markerIndex = title.search(pattern);
    const seriesTitle = title.substring(0, markerIndex).replace(/[-\u2013\u2014\s]+$/, '').trim();
    const episodeTitle = title.substring(markerIndex + match[0].length).replace(/^[-\u2013\u2014\s]+/, '').trim();

    return {
      type: 'series',
      seasonNumber,
      episodeNumber,
      episodeTitle,
      seriesTitle: seriesTitle || title,
    };
  }

  if (lower.includes('s\u00E9ri') || lower.includes('serie') || lower.includes('series')) {
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

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const { metadata, displayTitle } = splitExtInfLine(line);
      const attrs = parseExtInfAttributes(metadata);

      const rawDisplayTitle = displayTitle.trim();
      const parsedDisplayTitle = sanitizeExtInfText(rawDisplayTitle);
      const parsedTvgName = sanitizeExtInfText(extractAttribute(metadata, attrs, 'tvg-name'));

      currentTitle = resolvePreferredTitle(rawDisplayTitle, parsedDisplayTitle, parsedTvgName) || 'Sem T\u00EDtulo';
      currentLogo = sanitizeExtInfText(extractAttribute(metadata, attrs, 'tvg-logo'));
      currentGroup = sanitizeExtInfText(extractAttribute(metadata, attrs, 'group-title')) || 'Sem Categoria';
      continue;
    }

    if (!line || line.startsWith('#') || (!line.startsWith('http') && !line.startsWith('rtmp'))) {
      continue;
    }

    const groupLower = currentGroup.toLowerCase();
    const titleLower = currentTitle.toLowerCase();
    const combinedLower = `${groupLower} ${titleLower}`;

    const liveKeywords = ['ao vivo', '24h', 'canais', 'tv ', 'aberto', 'live', 'aberta', 'canal', 'open tv', 'ppv', 'pay per view', '24 horas', 'linear'];
    if (liveKeywords.some((kw) => combinedLower.includes(kw))) {
      currentTitle = '';
      currentLogo = '';
      currentGroup = '';
      continue;
    }

    const adultKeywords = ['adult', 'adulto', 'xxx', 'porn', 'erotic', 'erotico', 'er\u00F3tico', 'sexy', 'sex ', '+18', '18+', 'hentai', 'playboy', 'hustler', 'brazzers', 'bangbros', 'naughty', 'milf', 'lesbian', 'gay ', 'strip', 'onlyfans', 'cam girl', 'nude', 'naked', 'fetish', 'bdsm', 'hardcore', 'softcore', 'xvideos', 'xhamster', 'redtube', 'youporn', 'penthouse', 'vivid', 'hot girls', 'after dark', 'midnight', 'meia-noite', 'proibido'];
    if (adultKeywords.some((kw) => combinedLower.includes(kw))) {
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

    if (detected.seriesTitle) {
      item.seriesId = generateId(detected.seriesTitle);
    }

    items.push(item);

    currentTitle = '';
    currentLogo = '';
    currentGroup = '';
  }

  const uniqueItems = dedupeItems(items);
  const movies = uniqueItems.filter((i) => i.type === 'movie');

  const seriesMap = new Map<string, Series>();
  uniqueItems.filter((i) => i.type === 'series').forEach((item) => {
    const sid = item.seriesId || item.id;
    if (!seriesMap.has(sid)) {
      const seriesTitle = item.title
        .replace(/S\d{1,2}\s*E\d{1,3}/i, '')
        .replace(/T\d{1,2}\s*E\d{1,3}/i, '')
        .replace(/\d{1,2}x\d{1,3}/i, '')
        .replace(/[-\u2013\u2014\s]+$/, '')
        .trim() || item.title;

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

  seriesMap.forEach((series) => {
    Object.keys(series.seasons).forEach((season) => {
      series.seasons[Number(season)].sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
    });
  });

  const groups = [...new Set(uniqueItems.map((i) => i.group))].sort();

  return {
    movies,
    series: Array.from(seriesMap.values()),
    allItems: uniqueItems,
    groups,
    isLoaded: uniqueItems.length > 0,
  };
}

export async function fetchAndParseM3U(url: string): Promise<CatalogState> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar lista M3U: ${response.status}`);
  }

  const text = await response.text();
  if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
    throw new Error('Conte\u00FAdo inv\u00E1lido: n\u00E3o parece uma lista M3U');
  }

  return parseM3U(text);
}

export async function extractM3UTextFromZipBuffer(zipData: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(zipData);
  const entry = Object.values(zip.files).find((file) => !file.dir && /\.m3u8?$/i.test(file.name));

  if (!entry) {
    throw new Error('ZIP inv\u00E1lido: nenhum arquivo .m3u/.m3u8 encontrado');
  }

  const text = await entry.async('string');
  if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
    throw new Error('Conte\u00FAdo M3U inv\u00E1lido dentro do ZIP');
  }

  return text;
}

export async function parseM3UFromZipBuffer(zipData: ArrayBuffer): Promise<CatalogState> {
  const text = await extractM3UTextFromZipBuffer(zipData);
  return parseM3U(text);
}

export async function fetchAndParseM3UZip(url: string): Promise<CatalogState> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar ZIP M3U: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return parseM3UFromZipBuffer(buffer);
}
