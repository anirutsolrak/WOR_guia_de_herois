import { translateTerm } from './glossary.ts';

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
