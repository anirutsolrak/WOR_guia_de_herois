import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroIdentity } from './HeroIdentity';
import type { HeroDetail } from '../lib/types';

const hero: HeroDetail = {
  id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', big_card_url: 'b.png', star_level: 5, special_pt: 'domina',
  labels: [{ label_pt: 'DPS em Área', label_en: 'AoE DPS' }],
  rates: [], gear: [], artifacts: [], lineups: [], videos: [],
  classes: [{ title_en: 'Fighter', title_pt: 'Lutador' }],
  factions: [{ title_en: 'Chaotic', title_pt: 'Caótico' }],
};

describe('HeroIdentity', () => {
  it('renderiza retrato, estrelas, chips de classe/facção e label', () => {
    render(<HeroIdentity hero={hero} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'b.png');
    expect(screen.getByLabelText('5 estrelas')).toBeInTheDocument();
    expect(screen.getByText('Lutador')).toBeInTheDocument();
    expect(screen.getByText('Caótico')).toBeInTheDocument();
    expect(screen.getByText('DPS em Área')).toBeInTheDocument();
  });
});
