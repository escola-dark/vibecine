import { useMemo } from 'react';
import { ContentCard } from '@/components/ContentCard';
import { useContent } from '@/contexts/ContentContext';

const KNOWN_SERIES = [
  'the last of us',
  'house of the dragon',
  'the boys',
  'stranger things',
  'invincible',
  'loki',
  'the bear',
  'bridgerton',
  'wednesday',
  'fallout',
  'reacher',
  'dark',
  'breaking bad',
  'silo',
  'the walking dead',
];

const SeriesPage = () => {
  const { catalog } = useContent();

  const sortedSeries = useMemo(() => {
    return [...catalog.series]
      .map((series) => {
        const idx = KNOWN_SERIES.findIndex((name) => series.title.toLowerCase().includes(name));
        return {
          series,
          score: idx === -1 ? 999 : idx,
        };
      })
      .sort((a, b) => a.score - b.score || a.series.title.localeCompare(b.series.title))
      .map((entry) => entry.series);
  }, [catalog.series]);

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 mb-8">
        <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          Séries
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{catalog.series.length} séries disponíveis</p>
      </div>
      <div className="container mx-auto px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {sortedSeries.map((s) => (
          <ContentCard key={s.id} id={s.id} title={s.title} logo={s.logo} group={s.group} type="series" />
        ))}
      </div>
    </div>
  );
};

export default SeriesPage;
