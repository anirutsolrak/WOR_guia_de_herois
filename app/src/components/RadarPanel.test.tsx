import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RadarPanel } from './RadarPanel';

const dungeons = [
  { id: 30, index: 1, name_pt: 'Raide de Equipamento I', name_en: 'Gear Raid I', icon_url: null },
  { id: 31, index: 2, name_pt: 'Guerra de Guilda', name_en: 'Guild War', icon_url: null },
];
const rates = [{ dungeon_id: 30, rate: 50 }, { dungeon_id: 31, rate: 10 }];

describe('RadarPanel', () => {
  it('renderiza o radar e a legenda com os nomes dos modos', () => {
    render(<RadarPanel rates={rates} dungeons={dungeons} />);
    expect(document.querySelector('polygon')).toBeTruthy();
    expect(screen.getByText('Raide de Equipamento I')).toBeInTheDocument();
    expect(screen.getByText('Guerra de Guilda')).toBeInTheDocument();
  });
});
