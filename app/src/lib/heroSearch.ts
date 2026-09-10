import type { HeroSearchItem } from './types';

/** Minúsculas e sem diacríticos, para que "Zéfiro" e "zefiro" casem. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function displayName(h: HeroSearchItem): string {
  return h.name_pt ?? h.name_en;
}

export function searchHeroes(items: HeroSearchItem[], q: string, limit = 8): HeroSearchItem[] {
  const nq = normalize(q.trim());
  if (!nq) return [];

  const hits = [];
  for (const item of items) {
    const pt = item.name_pt ? normalize(item.name_pt) : '';
    const en = normalize(item.name_en);
    if (!pt.includes(nq) && !en.includes(nq)) continue;
    hits.push({
      item,
      prefix: pt.startsWith(nq) || en.startsWith(nq),
      sortKey: normalize(displayName(item)),
    });
  }

  hits.sort((a, b) =>
    a.prefix === b.prefix ? a.sortKey.localeCompare(b.sortKey) : a.prefix ? -1 : 1,
  );
  return hits.slice(0, limit).map((h) => h.item);
}
