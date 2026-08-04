import { supabase } from '../lib/supabase';
import { getHeroesByDungeon } from '../lib/queries';
import { useAsync } from './useAsync';
export const useHeroesByDungeon = (id: number) => useAsync(() => getHeroesByDungeon(supabase, id), [id]);
