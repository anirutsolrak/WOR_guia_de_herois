import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LineupRow } from './LineupRow';

describe('LineupRow', () => {
  it('mostra os herois do time', () => {
    render(<LineupRow lineup={{ heroes: [{ id: 2, name: 'Elddr', card_url: 'el.png' }] }} />);
    expect(screen.getByText('Elddr')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'el.png');
  });
});
