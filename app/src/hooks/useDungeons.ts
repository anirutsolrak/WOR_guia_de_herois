import { supabase } from '../lib/supabase';
import { getDungeons } from '../lib/queries';
import { useAsync } from './useAsync';
export const useDungeons = () => useAsync(() => getDungeons(supabase), []);
