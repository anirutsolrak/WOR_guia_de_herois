import { supabase } from '../lib/supabase';
import { getHeroDetail } from '../lib/queries';
import { useAsync } from './useAsync';
export const useHero = (id: number) => useAsync(() => getHeroDetail(supabase, id), [id]);
