import { describe, it, expect, vi, beforeEach } from 'vitest';

// O cache de loadHeroSearchIndex vive no escopo do módulo, então cada teste precisa
// de uma instância nova do módulo (vi.resetModules + import dinâmico) para não vazar
// estado de um teste para o outro.
describe('useHeroSearchIndex — cache do módulo', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('duas chamadas a loadHeroSearchIndex resultam em uma única chamada a getHeroSearchIndex', async () => {
    const getHeroSearchIndex = vi.fn().mockResolvedValue([
      { id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: null },
    ]);
    vi.doMock('../lib/queries', () => ({ getHeroSearchIndex }));
    vi.doMock('../lib/supabase', () => ({ supabase: {} }));

    const { loadHeroSearchIndex } = await import('./useHeroSearchIndex');
    await loadHeroSearchIndex();
    await loadHeroSearchIndex();

    expect(getHeroSearchIndex).toHaveBeenCalledTimes(1);
  });

  it('depois de uma chamada rejeitada, a próxima chamada tenta de novo', async () => {
    const getHeroSearchIndex = vi.fn()
      .mockRejectedValueOnce(new Error('falhou'))
      .mockResolvedValueOnce([{ id: 2, name_pt: 'Ludmila', name_en: 'Ludmila', card_url: null }]);
    vi.doMock('../lib/queries', () => ({ getHeroSearchIndex }));
    vi.doMock('../lib/supabase', () => ({ supabase: {} }));

    const { loadHeroSearchIndex } = await import('./useHeroSearchIndex');
    await expect(loadHeroSearchIndex()).rejects.toThrow('falhou');
    const result = await loadHeroSearchIndex();

    expect(result).toEqual([{ id: 2, name_pt: 'Ludmila', name_en: 'Ludmila', card_url: null }]);
    expect(getHeroSearchIndex).toHaveBeenCalledTimes(2);
  });
});
