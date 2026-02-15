import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { fetchAndParseM3U, parseM3U, parseM3UFromZipBuffer } from '@/utils/m3u-parser';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseM3U', () => {
  it('separa filmes e s\u00E9ries a partir de padr\u00F5es de epis\u00F3dio', () => {
    const m3u = `#EXTM3U
#EXTINF:-1 tvg-logo="movie-logo.jpg" group-title="Filmes",Filme A
http://example.com/movie-a.m3u8
#EXTINF:-1 tvg-logo="series-logo.jpg" group-title="S\u00E9ries",Minha S\u00E9rie S01E02 - Epis\u00F3dio 2
http://example.com/show-s01e02.m3u8`;

    const catalog = parseM3U(m3u);

    expect(catalog.isLoaded).toBe(true);
    expect(catalog.movies).toHaveLength(1);
    expect(catalog.series).toHaveLength(1);
    expect(catalog.series[0].seasons[1]).toHaveLength(1);
    expect(catalog.series[0].seasons[1][0].episodeNumber).toBe(2);
  });

  it('corrige titulos com virgula no tvg-name e remove residuos de atributos do nome', () => {
    const m3u = `#EXTM3U
#EXTINF:-1 tvg-name="Peaky Blinders: Sangue, Apostas e Navalhas S01E01" tvg-logo="https://image.tmdb.org/t/p/w1280/ra2.jpg" group-title="Netflix",Peaky Blinders: Sangue, Apostas e Navalhas S01E01
http://244a.cc:80/series/KfTTMQ/UBNX3V/187421.mp4
#EXTINF:-1 tvg-name="Big Pai Big Filho 2 (2020)" tvg-logo="https://image.tmdb.org/t/p/w600/poster.jpg" group-title="Amazon Prime Video",Big Pai Big Filho 2 (2020)"tvg-logo="https://image.tmdb.org/t/p/w600/poster.jpg" group-title="Amazon Prime Video"
http://244a.cc:80/movie/KfTTMQ/UBNX3V/324.mp4`;

    const catalog = parseM3U(m3u);

    expect(catalog.series).toHaveLength(1);
    expect(catalog.series[0].title).toBe('Peaky Blinders: Sangue, Apostas e Navalhas');

    expect(catalog.movies).toHaveLength(1);
    expect(catalog.movies[0].title).toBe('Big Pai Big Filho 2 (2020)');
    expect(catalog.movies[0].title.toLowerCase()).not.toContain('tvg-logo');
    expect(catalog.movies[0].group).toBe('Amazon Prime Video');
  });
});

describe('fetchAndParseM3U', () => {
  it('lan\u00E7a erro quando a resposta HTTP falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '',
    }));

    await expect(fetchAndParseM3U('https://example.com/lista.m3u')).rejects.toThrow('Falha ao baixar lista M3U: 404');
  });

  it('lan\u00E7a erro quando o conte\u00FAdo n\u00E3o parece M3U', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<html>not found</html>',
    }));

    await expect(fetchAndParseM3U('https://example.com/lista.m3u_plus')).rejects.toThrow('Conte\u00FAdo inv\u00E1lido');
  });
});

describe('parseM3UFromZipBuffer', () => {
  it('extrai o primeiro arquivo m3u dentro do zip', async () => {
    const zip = new JSZip();
    zip.file('lista/playlist.m3u', '#EXTM3U\n#EXTINF:-1 group-title="Filmes",Filme Zip\nhttp://example.com/zip.m3u8');
    const buffer = await zip.generateAsync({ type: 'arraybuffer' });

    const catalog = await parseM3UFromZipBuffer(buffer);
    expect(catalog.movies).toHaveLength(1);
    expect(catalog.movies[0].title).toContain('Filme Zip');
  });
});
