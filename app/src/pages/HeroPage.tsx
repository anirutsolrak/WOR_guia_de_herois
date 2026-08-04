import { Link, useParams } from 'react-router-dom';
import { useHero } from '../hooks/useHero';
import { useDungeons } from '../hooks/useDungeons';
import { RadarChart } from '../components/RadarChart';
import { GearSlotView } from '../components/GearSlot';
import { LineupRow } from '../components/LineupRow';

export function HeroPage() {
  const { heroId } = useParams();
  const { data: hero, loading, error } = useHero(Number(heroId));
  const { data: dungeons } = useDungeons();
  if (loading) return <p>Carregando…</p>;
  if (error || !hero) return <p>Erro ao carregar herói.</p>;

  const ordered = (dungeons ?? []).slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const rateMap = new Map(hero.rates.map((r) => [r.dungeon_id, r.rate]));
  const values = ordered.map((d) => rateMap.get(d.id) ?? 0);
  const labels = ordered.map((d) => String(d.index ?? ''));
  const maxRate = Math.max(50, ...values);

  return (
    <main className="hero-page">
      <Link to="/">← Modos</Link>
      <header className="hero-header">
        {hero.big_card_url && <img className="hero-big" src={hero.big_card_url} alt={hero.name_pt ?? hero.name_en} />}
        <div>
          <h1>{hero.name_pt ?? hero.name_en}</h1>
          <div className="stars">{'★'.repeat(hero.star_level ?? 0)}</div>
          <div className="labels">{hero.labels.map((l, i) => <span key={i} className="label">{l.label_pt ?? l.label_en}</span>)}</div>
        </div>
      </header>

      {values.length > 0 && (
        <section><h2>Conteúdos Ideais</h2>
          <RadarChart values={values} labels={labels} max={maxRate} /></section>
      )}

      <section><h2>Equipamento (Recomendado pelo Sistema)</h2>
        {hero.gear.map((g) => <GearSlotView key={g.slot.id} slot={g} />)}</section>

      <section><h2>Artefatos</h2>
        <ul className="artifact-list">
          {hero.artifacts.map((a) => (
            <li key={a.id}>{a.icon_url && <img src={a.icon_url} alt="" />}<span>{a.name}</span><span className="desc">{a.desc}</span></li>
          ))}
        </ul></section>

      <section><h2>Times Recomendados</h2>
        {hero.lineups.map((l, i) => <LineupRow key={i} lineup={l} />)}</section>

      <section><h2>Descrição</h2><p>{hero.special_pt}</p></section>

      {hero.videos.length > 0 && (
        <section><h2>Vídeos</h2><p>{hero.videos.length} guia(s) disponível(is)</p></section>
      )}
    </main>
  );
}
