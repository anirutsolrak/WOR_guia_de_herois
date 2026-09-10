import { supabase } from '../lib/supabase';
import { getHeroSearchIndex } from '../lib/queries';
import { useAsync } from './useAsync';
import type { HeroSearchItem } from '../lib/types';

// Cache no escopo do módulo: são ~161 heróis (~20 KB). Buscar uma vez por sessão
// evita refazer a rede a cada navegação entre páginas.
let cache: Promise<HeroSearchItem[]> | null = null;

export function loadHeroSearchIndex(): Promise<HeroSearchItem[]> {
  if (!cache) {
    cache = getHeroSearchIndex(supabase).catch((e) => {
      cache = null; // uma falha não deve envenenar o cache para sempre
      throw e;
    });
  }
  return cache;
}

export const useHeroSearchIndex = () => useAsync(loadHeroSearchIndex, []);
