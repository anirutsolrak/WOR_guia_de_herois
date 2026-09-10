import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const { heroesMock } = vi.hoisted(() => ({ heroesMock: vi.fn() }));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ dungeonId: '30' }),
}));
vi.mock('../hooks/useDungeons', () => ({
  useDungeons: () => ({
    data: [{ id: 30, index: 12, name_pt: 'Guerra de Guilda', name_en: 'Guild War', icon_url: 'b.png' }],
    loading: false, error: null,
  }),
}));
vi.mock('../hooks/useHeroesByDungeon', () => ({
  useHeroesByDungeon: () => heroesMock(),
}));
vi.mock('../hooks/useHeroSearchIndex', () => ({
  useHeroSearchIndex: () => ({ data: [], loading: false, error: null }),
}));

import { ModePage } from './ModePage';

const renderPage = () => render(<MemoryRouter><ModePage /></MemoryRouter>);

describe('ModePage', () => {
  it('mostra o nome do modo no header e as linhas do ranking', () => {
    heroesMock.mockReturnValue({
      data: [{ id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'c.png', rate: 50, factions: [{ title_en: 'Chaotic', title_pt: 'Caótico' }] }],
      loading: false, error: null,
    });
    renderPage();
    expect(screen.getByRole('heading', { name: 'Guerra de Guilda' })).toBeInTheDocument();
    expect(screen.getByText('Lu Bu')).toBeInTheDocument();
    expect(screen.getByText('Caótico')).toBeInTheDocument();
  });
  it('mostra estado vazio quando não há heróis', () => {
    heroesMock.mockReturnValue({ data: [], loading: false, error: null });
    renderPage();
    expect(screen.getByText(/Nenhum herói ranqueado/i)).toBeInTheDocument();
  });
});
