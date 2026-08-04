import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RadarChart, computePolygon } from './RadarChart';

describe('computePolygon', () => {
  it('coloca o primeiro eixo no topo', () => {
    const pts = computePolygon([10, 0, 0, 0], 10, 100).split(' ');
    expect(pts[0]).toBe('50.00,5.00'); // topo: raio 45 a partir do centro 50
  });
});

describe('RadarChart', () => {
  it('renderiza um polígono e os índices dos eixos', () => {
    render(<RadarChart values={[1, 2, 3]} labels={['1', '2', '3']} max={3} size={100} />);
    expect(document.querySelector('polygon')).toBeTruthy();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
