import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RateBar } from './RateBar';

describe('RateBar', () => {
  it('mostra o valor formatado', () => {
    render(<RateBar value={50} />);
    expect(screen.getByText('50.0')).toBeInTheDocument();
  });
  it('largura proporcional a value/max', () => {
    render(<RateBar value={25} max={50} />);
    expect(screen.getByTestId('ratebar-fill')).toHaveStyle({ width: '50%' });
  });
});
