import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GearSlotView } from './GearSlot';

const slot = {
  slot: { id: 40, name: 'Arma', icon_url: 'w.png' },
  sets: [{ id: 60, name: 'Warlord', desc: 'ATQ +25%', icon_url: 's.png', equipment_icon: 'e.png' }],
  main_attrs: [{ attr_id: 303, name: 'ATQ', icon_url: 'a.png' }],
  sub_attrs: [{ attr_id: 304, name: 'Bônus de ATQ', icon_url: 'b.png' }],
};

describe('GearSlotView', () => {
  it('mostra nome do slot, set e atributos', () => {
    render(<GearSlotView slot={slot} />);
    expect(screen.getByText('Arma')).toBeInTheDocument();
    expect(screen.getByText('Warlord')).toBeInTheDocument();
    expect(screen.getByText('ATQ')).toBeInTheDocument();
    expect(screen.getByText('Bônus de ATQ')).toBeInTheDocument();
  });
});
