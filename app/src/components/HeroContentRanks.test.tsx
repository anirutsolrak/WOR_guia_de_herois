import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { HeroContentRanks } from './HeroContentRanks';
import type { Dungeon, DungeonRate } from '../lib/types';

const dungeons: Dungeon[] = [
  { id: 10, index: 1, name_pt: 'Arena de Honra', name_en: 'Honor Arena', icon_url: 'a.png' },
  { id: 20, index: 2, name_pt: 'Raide de Equipamento I', name_en: 'Gear Raid I', icon_url: 'b.png' },
  { id: 30, index: 3, name_pt: null, name_en: 'Guild War', icon_url: null },
];

const rates: DungeonRate[] = [
  { dungeon_id: 20, rate: 98.4, rank: 1, total: 57 },
  { dungeon_id: 10, rate: 91.2, rank: 4, total: 60 },
];

const renderRanks = () =>
  render(<MemoryRouter><HeroContentRanks rates={rates} dungeons={dungeons} /></MemoryRouter>);

describe('HeroContentRanks', () => {
  it('ordena por melhor posição, não pela ordem dos modos', () => {
    renderRanks();
    const linhas = screen.getAllByRole('link').map((l) => l.textContent ?? '');
    expect(linhas[0]).toContain('Raide de Equipamento I');
    expect(linhas[1]).toContain('Arena de Honra');
  });

  it('mostra a posição e o total de ranqueados', () => {
    renderRanks();
    expect(screen.getByText('#1 de 57')).toBeInTheDocument();
    expect(screen.getByText('#4 de 60')).toBeInTheDocument();
  });

  it('modo sem rank aparece por último, com travessão e usando name_en', () => {
    renderRanks();
    const linhas = screen.getAllByRole('link').map((l) => l.textContent ?? '');
    expect(linhas[2]).toContain('Guild War');
    expect(linhas[2]).toContain('—');
  });

  it('cada linha linka para a página do modo', () => {
    renderRanks();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/modo/20');
  });

  it('herói sem nenhum rank mostra os três modos esmaecidos', () => {
    render(<MemoryRouter><HeroContentRanks rates={[]} dungeons={dungeons} /></MemoryRouter>);
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getAllByText('—')).toHaveLength(3);
  });
});
