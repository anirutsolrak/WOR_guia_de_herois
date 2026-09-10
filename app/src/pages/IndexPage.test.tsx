import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../hooks/useDungeons', () => ({
  useDungeons: () => ({
    data: [
      { id: 1, index: 1, name_pt: 'Guerra de Guilda', name_en: 'Guild War', icon_url: 'a.png' },
      { id: 2, index: 2, name_pt: 'Raide de Equipamento I', name_en: 'Gear Raid I', icon_url: 'b.png' },
      { id: 3, index: 3, name_pt: 'Arena AoE', name_en: 'Arena AoE DPS Challenge', icon_url: 'c.png' },
    ],
    loading: false, error: null,
  }),
}));
vi.mock('../hooks/useHeroSearchIndex', () => ({
  useHeroSearchIndex: () => ({ data: [], loading: false, error: null }),
}));

import { IndexPage } from './IndexPage';

const renderPage = () => render(<MemoryRouter><IndexPage /></MemoryRouter>);

describe('IndexPage', () => {
  it('agrupa os modos nas seções por categoria', () => {
    renderPage();
    expect(screen.getByText('Arena')).toBeInTheDocument();
    expect(screen.getByText('Gear')).toBeInTheDocument();
    expect(screen.getByText('Guilda')).toBeInTheDocument();
    expect(screen.getByText('Guerra de Guilda')).toBeInTheDocument();
    expect(screen.getByText('Raide de Equipamento I')).toBeInTheDocument();
  });

  it('a busca filtra os cards', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Filtrar modo'), { target: { value: 'guilda' } });
    expect(screen.getByText('Guerra de Guilda')).toBeInTheDocument();
    expect(screen.queryByText('Raide de Equipamento I')).toBeNull();
    expect(screen.queryByText('Gear')).toBeNull(); // seção Gear some quando vazia
  });
});
