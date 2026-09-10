import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ heroId: '1' }),
}));
vi.mock('../hooks/useDungeons', () => ({
  useDungeons: () => ({
    data: [
      { id: 30, index: 1, name_pt: 'Raide de Equipamento I', name_en: 'Gear Raid I', icon_url: null },
      { id: 31, index: 2, name_pt: 'Guerra de Guilda', name_en: 'Guild War', icon_url: null },
    ],
    loading: false, error: null,
  }),
}));
vi.mock('../hooks/useHero', () => ({
  useHero: () => ({
    data: {
      id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', big_card_url: 'b.png', star_level: 5, special_pt: 'domina o campo',
      labels: [{ label_pt: 'DPS em Área', label_en: 'AoE DPS' }],
      rates: [{ dungeon_id: 30, rate: 50, rank: 2, total: 40 }],
      gear: [{ slot: { id: 40, name: 'Arma' }, sets: [{ id: 60, name: 'Warlord', desc: 'ATQ +25%' }], main_attrs: [{ attr_id: 303, name: 'ATQ' }], sub_attrs: [] }],
      artifacts: [{ id: 70, name: 'Alabarda', desc: 'Área +15%' }],
      lineups: [{ heroes: [{ id: 2, name: 'Elddr', card_url: 'el.png' }] }],
      videos: [],
      classes: [{ title_en: 'Fighter', title_pt: 'Lutador' }],
      factions: [{ title_en: 'Chaotic', title_pt: 'Caótico' }],
    },
    loading: false, error: null,
  }),
}));
vi.mock('../hooks/useHeroSearchIndex', () => ({
  useHeroSearchIndex: () => ({ data: [], loading: false, error: null }),
}));

import { HeroPage } from './HeroPage';

describe('HeroPage', () => {
  it('renderiza cabeçalho, identidade, radar, gear, artefato, time e descrição', () => {
    render(<MemoryRouter><HeroPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Lu Bu' })).toBeInTheDocument();
    expect(screen.getByText('Caótico')).toBeInTheDocument();
    expect(screen.getByText('Warlord')).toBeInTheDocument();
    expect(screen.getByText('Alabarda')).toBeInTheDocument();
    expect(screen.getByText('Elddr')).toBeInTheDocument();
    expect(screen.getByText('domina o campo')).toBeInTheDocument();
  });

  it('lista a posição do herói por conteúdo, com os sem rank no fim', () => {
    render(<MemoryRouter><HeroPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Conteúdos' })).toBeInTheDocument();
    expect(screen.getByText('#2 de 40')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Raide de Equipamento I/ }))
      .toHaveAttribute('href', '/modo/30');
  });
});
