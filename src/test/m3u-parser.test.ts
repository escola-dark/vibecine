import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAndParseM3U, parseM3U } from '@/utils/m3u-parser';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseM3U', () => {
  it('separa filmes e séries a partir de padrões de episódio', () => {
    const m3u = `#EXTM3U
#EXTINF:-1 tvg-logo="movie-logo.jpg" group-title="Filmes",Filme A
http://example.com/movie-a.m3u8
#EXTINF:-1 tvg-logo="series-logo.jpg" group-title="Séries",Minha Série S01E02 - Episódio 2
http://example.com/show-s01e02.m3u8`;

    const catalog = parseM3U(m3u);

    expect(catalog.isLoaded).toBe(true);
    expect(catalog.movies).toHaveLength(1);
    expect(catalog.series).toHaveLength(1);
    expect(catalog.series[0].seasons[1]).toHaveLength(1);
    expect(catalog.series[0].seasons[1][0].episodeNumber).toBe(2);
  });
});

describe('fetchAndParseM3U', () => {
  it('lança erro quando a resposta HTTP falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '',
    }));

    await expect(fetchAndParseM3U('https://example.com/lista.m3u')).rejects.toThrow('Falha ao baixar lista M3U: 404');
  });

  it('lança erro quando o conteúdo não parece M3U', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<html>not found</html>',
    }));

    await expect(fetchAndParseM3U('https://example.com/lista.m3u')).rejects.toThrow('Conteúdo inválido');
  });
});
