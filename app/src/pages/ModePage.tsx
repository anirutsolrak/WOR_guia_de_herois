import { Link, useParams } from 'react-router-dom';
import { useHeroesByDungeon } from '../hooks/useHeroesByDungeon';
import { HeroCard } from '../components/HeroCard';

export function ModePage() {
  const { dungeonId } = useParams();
  const id = Number(dungeonId);
  const { data, loading, error } = useHeroesByDungeon(id);
  if (loading) return <p>Carregando…</p>;
  if (error) return <p>Erro ao carregar heróis.</p>;
  return (
    <main className="mode-page">
      <Link to="/">← Modos</Link>
      <div className="hero-list">
        {(data ?? []).map((h) => (
          <Link key={h.id} to={`/heroi/${h.id}`} className="hero-list-item">
            <HeroCard hero={h} rate={h.rate} />
          </Link>
        ))}
      </div>
    </main>
  );
}
