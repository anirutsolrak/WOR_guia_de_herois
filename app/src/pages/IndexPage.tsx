import { Link } from 'react-router-dom';
import { useDungeons } from '../hooks/useDungeons';

export function IndexPage() {
  const { data, loading, error } = useDungeons();
  if (loading) return <p>Carregando…</p>;
  if (error) return <p>Erro ao carregar modos.</p>;
  return (
    <main className="index-page">
      <h1>Modos</h1>
      <div className="mode-grid">
        {(data ?? []).map((d) => (
          <Link key={d.id} to={`/modo/${d.id}`} className="mode-tile">
            {d.icon_url && <img src={d.icon_url} alt="" loading="lazy" />}
            <span>{d.name_pt ?? d.name_en}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
