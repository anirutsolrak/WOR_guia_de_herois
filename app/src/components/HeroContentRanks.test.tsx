import { render, screen, fireEvent } from '@testing-library/react';
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
    fireEvent.click(screen.getByRole('button', { name: 'Ver 1 conteúdo sem rank' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Ver 3 conteúdos sem rank' }));
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('modo com rate abaixo de 1 vai para o grupo sem rank, mesmo tendo entrada', () => {
    const ratesComRuido: DungeonRate[] = [
      { dungeon_id: 20, rate: 98.4, rank: 1, total: 57 },
      { dungeon_id: 10, rate: 0.39, rank: 67, total: 160 },
    ];
    render(<MemoryRouter><HeroContentRanks rates={ratesComRuido} dungeons={dungeons} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Ver 2 conteúdos sem rank' }));
    const linhas = screen.getAllByRole('link').map((l) => l.textContent ?? '');
    expect(linhas[1]).toContain('Arena de Honra');
    expect(linhas[1]).toContain('—');
    expect(linhas[2]).toContain('Guild War');
    expect(linhas[2]).toContain('—');
  });

  it('modo com rate exatamente 1 continua ranqueado (limite inclusivo)', () => {
    const ratesNoLimite: DungeonRate[] = [
      { dungeon_id: 20, rate: 98.4, rank: 1, total: 57 },
      { dungeon_id: 10, rate: 1, rank: 4, total: 60 },
    ];
    render(<MemoryRouter><HeroContentRanks rates={ratesNoLimite} dungeons={dungeons} /></MemoryRouter>);
    expect(screen.getByText('#4 de 60')).toBeInTheDocument();
    const linhas = screen.getAllByRole('link').map((l) => l.textContent ?? '');
    expect(linhas[1]).toContain('Arena de Honra');
    expect(linhas[1]).not.toContain('—');
  });

  it('largura da barra reflete o percentil do rank, não o rate', () => {
    const ratesPercentil: DungeonRate[] = [
      { dungeon_id: 20, rate: 5, rank: 1, total: 100 },
      { dungeon_id: 10, rate: 95, rank: 51, total: 100 },
    ];
    render(<MemoryRouter><HeroContentRanks rates={ratesPercentil} dungeons={dungeons} /></MemoryRouter>);
    expect(screen.getByTestId('rank-bar-20')).toHaveStyle({ width: '100%' });
    expect(screen.getByTestId('rank-bar-10')).toHaveStyle({ width: '50%' });
  });

  it('por padrão os modos sem rank ficam ocultos atrás de um botão com a contagem', () => {
    renderRanks();
    expect(screen.queryByText('Guild War')).not.toBeInTheDocument();
    const botao = screen.getByRole('button', { name: 'Ver 1 conteúdo sem rank' });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicar no botão revela os modos sem rank; clicar de novo esconde', () => {
    renderRanks();
    const botao = screen.getByRole('button', { name: 'Ver 1 conteúdo sem rank' });
    fireEvent.click(botao);
    expect(screen.getByText('Guild War')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar conteúdos sem rank' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar conteúdos sem rank' }));
    expect(screen.queryByText('Guild War')).not.toBeInTheDocument();
  });

  it('com todos os modos ranqueados, nenhum botão de alternar é renderizado', () => {
    const ratesTodosRanqueados: DungeonRate[] = [
      { dungeon_id: 20, rate: 98.4, rank: 1, total: 57 },
      { dungeon_id: 10, rate: 91.2, rank: 2, total: 57 },
      { dungeon_id: 30, rate: 80.1, rank: 3, total: 57 },
    ];
    render(<MemoryRouter><HeroContentRanks rates={ratesTodosRanqueados} dungeons={dungeons} /></MemoryRouter>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
