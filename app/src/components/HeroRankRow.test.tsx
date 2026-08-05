import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { HeroRankRow } from './HeroRankRow';

const item = {
  id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'c.png', rate: 50,
  factions: [{ title_en: 'Chaotic', title_pt: 'Caótico' }],
};

describe('HeroRankRow', () => {
  it('renderiza rank, nome, chip de facção, valor e link para o herói', () => {
    render(<MemoryRouter><HeroRankRow item={item} rank={1} maxRate={50} /></MemoryRouter>);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Lu Bu')).toBeInTheDocument();
    expect(screen.getByText('Caótico')).toBeInTheDocument();
    expect(screen.getByText('50.0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lu Bu/i })).toHaveAttribute('href', '/heroi/1');
  });
  it('usa name_en quando name_pt é nulo', () => {
    render(<MemoryRouter><HeroRankRow item={{ ...item, name_pt: null }} rank={2} maxRate={50} /></MemoryRouter>);
    expect(screen.getByText('Lu Bu')).toBeInTheDocument();
  });
});
