import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHeroSearchIndex } from '../hooks/useHeroSearchIndex';
import { searchHeroes, displayName } from '../lib/heroSearch';
import type { HeroSearchItem } from '../lib/types';

export function HeroSearchBar() {
  const { data, error } = useHeroSearchIndex();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(-1);
  const [dismissed, setDismissed] = useState(false);

  // Falha ao carregar o índice degrada para "sem sugestões": a página não quebra.
  const results = useMemo(() => (error ? [] : searchHeroes(data ?? [], q)), [data, error, q]);
  const open = !dismissed && results.length > 0;

  function go(hero: HeroSearchItem) {
    setQ('');
    setActive(-1);
    setDismissed(false);
    navigate(`/heroi/${hero.id}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (dismissed) { setDismissed(false); return; }
      if (!open) return;
      setActive((a) => Math.min(a + 1, results.length - 1));
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hero = results[active] ?? results[0];
      if (hero) go(hero);
    } else if (e.key === 'Escape') {
      setDismissed(true);
      setActive(-1);
    }
  }

  return (
    <div className="relative mt-4 max-w-sm">
      <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface
                      px-3 py-2 text-sm text-muted focus-within:border-accent">
        <span aria-hidden>🔎</span>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="hero-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `hero-opt-${results[active].id}` : undefined}
          aria-label="Buscar herói"
          placeholder="Buscar herói…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(-1); setDismissed(false); }}
          onKeyDown={onKeyDown}
          onFocus={() => setDismissed(false)}
          onBlur={() => setDismissed(true)}
          className="w-full bg-transparent text-fg placeholder:text-subtle focus:outline-none"
        />
      </div>

      {open && (
        <ul
          id="hero-search-listbox"
          role="listbox"
          aria-label="Heróis encontrados"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border-strong
                     bg-surface shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
        >
          {results.map((hero, i) => (
            <li
              key={hero.id}
              id={`hero-opt-${hero.id}`}
              role="option"
              aria-selected={i === active}
              // preventDefault no mousedown evita que o blur feche a lista antes do clique
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(hero)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2
                          ${i === active ? 'bg-surface-2' : ''}`}
            >
              {hero.card_url && (
                <img src={hero.card_url} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
              )}
              <span className="truncate text-sm text-fg">{displayName(hero)}</span>
              {hero.name_pt && hero.name_pt !== hero.name_en && (
                <span className="ml-auto shrink-0 text-xs text-subtle">{hero.name_en}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
