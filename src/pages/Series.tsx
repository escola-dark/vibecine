import { ContentCard } from '@/components/ContentCard';
import { useContent } from '@/contexts/ContentContext';

const SeriesPage = () => {
  const { catalog } = useContent();

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 mb-8">
        <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          Séries
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{catalog.series.length} séries disponíveis</p>
      </div>
      <div className="container mx-auto px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {catalog.series.map(s => (
          <ContentCard key={s.id} id={s.id} title={s.title} logo={s.logo} group={s.group} type="series" />
        ))}
      </div>
    </div>
  );
};

export default SeriesPage;
