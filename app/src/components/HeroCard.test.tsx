import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroCard } from './HeroCard';

const hero = { id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'c.png' };

describe('HeroCard', () => {
  it('mostra nome e imagem', () => {
    render(<HeroCard hero={hero} />);
    expect(screen.getByText('Lu Bu')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'c.png');
  });
  it('mostra a taxa quando fornecida', () => {
    render(<HeroCard hero={hero} rate={50} />);
    expect(screen.getByText('50.0')).toBeInTheDocument();
  });
  it('usa name_en quando name_pt e nulo', () => {
    render(<HeroCard hero={{ ...hero, name_pt: null }} />);
    expect(screen.getByText('Lu Bu')).toBeInTheDocument();
  });
});
