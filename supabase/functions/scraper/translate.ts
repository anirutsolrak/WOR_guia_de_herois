import { translateTerm } from './glossary.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type AutoFn = (en: string) => Promise<string>;

export const passthrough: AutoFn = async (en) => en;

export function makeTranslator(auto: AutoFn): (en: string) => Promise<string> {
  const cache = new Map<string, string>();
  return async (en: string): Promise<string> => {
    if (!en) return en;
    const fixed = translateTerm(en);
    if (fixed !== null) return fixed;
    if (cache.has(en)) return cache.get(en)!;
    const out = await auto(en);
    cache.set(en, out);
    return out;
  };
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface CachedAutoDeps {
  getCached: (en: string) => Promise<string | null>;
  setCached: (en: string, pt: string) => Promise<void>;
  translate: (en: string) => Promise<string>;
}

export function makeCachedAuto(deps: CachedAutoDeps): AutoFn {
  return async (en: string): Promise<string> => {
    if (!en) return en;
    const hit = await deps.getCached(en);
    if (hit !== null) return hit;
    const out = await deps.translate(en);
    await deps.setCached(en, out);
    return out;
  };
}

export async function deeplTranslate(apiKey: string, text: string): Promise<string> {
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ text, target_lang: 'PT-BR', source_lang: 'EN' }),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json.translations[0].text;
}

export async function cacheGet(sb: SupabaseClient, en: string): Promise<string | null> {
  const hash = await sha256Hex(en);
  const { data } = await sb.from('translations').select('target_pt').eq('source_hash', hash).maybeSingle();
  return (data?.target_pt as string | undefined) ?? null;
}

export async function cacheSet(sb: SupabaseClient, en: string, pt: string): Promise<void> {
  const hash = await sha256Hex(en);
  const { error } = await sb.from('translations').upsert({ source_hash: hash, source_en: en, target_pt: pt });
  if (error) throw error;
}
