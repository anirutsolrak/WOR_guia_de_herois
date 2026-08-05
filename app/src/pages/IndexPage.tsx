import { useMemo, useState } from 'react';
import { useDungeons } from '../hooks/useDungeons';
import { AppShell } from '../components/AppShell';
import { SectionHeader } from '../components/SectionHeader';
import { ModeCard } from '../components/ModeCard';
import { CATEGORY_ORDER, categorize, type CategoryKey } from '../lib/categories';
import type { Dungeon } from '../lib/types';

export function IndexPage() {
  const { data, loading, error } = useDungeons();
  const [q, setQ] = useState('');

  const grouped = useMemo(() => {
    const map = new Map<CategoryKey, Dungeon[]>();
    const query = q.trim().toLowerCase();
    for (const d of data ?? []) {
      const name = (d.name_pt ?? d.name_en).toLowerCase();
      if (query && !name.includes(query)) continue;
      const key = categorize(d.name_en);
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return map;
  }, [data, q]);

  return (
    <AppShell
      title="Melhores heróis por conteúdo"
      subtitle="Escolha um modo e veja o ranking"
      search={q}
      onSearch={setQ}
    >
      {loading && <p className="text-muted">Carregando…</p>}
      {error && <p className="text-muted">Erro ao carregar modos.</p>}
      <div className="space-y-8">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat.key) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={cat.key}>
              <SectionHeader label={cat.label} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((d) => <ModeCard key={d.id} dungeon={d} />)}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
