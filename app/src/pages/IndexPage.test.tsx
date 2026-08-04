import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../hooks/useDungeons', () => ({
  useDungeons: () => ({
    data: [{ id: 30, index: 1, name_pt: 'Raide de Equipamento I', name_en: 'Gear Raid I', icon_url: 'd.png' }],
    loading: false, error: null,
  }),
}));

import { IndexPage } from './IndexPage';

describe('IndexPage', () => {
  it('lista os modos com nome PT', () => {
    render(<MemoryRouter><IndexPage /></MemoryRouter>);
    expect(screen.getByText('Raide de Equipamento I')).toBeInTheDocument();
  });
});
