import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ModeCard } from './ModeCard';

const dungeon = { id: 30, index: 12, name_pt: 'Guerra de Guilda', name_en: 'Guild War', icon_url: 'gw.png' };

describe('ModeCard', () => {
  it('linka para /modo/:id e mostra nome PT + imagem', () => {
    const { container } = render(<MemoryRouter><ModeCard dungeon={dungeon} /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /Guerra de Guilda/i });
    expect(link).toHaveAttribute('href', '/modo/30');
    expect(container.querySelector('img')).toHaveAttribute('src', 'gw.png');
    expect(screen.getByText('Guerra de Guilda')).toBeInTheDocument();
  });
  it('usa name_en quando name_pt é nulo', () => {
    render(<MemoryRouter><ModeCard dungeon={{ ...dungeon, name_pt: null }} /></MemoryRouter>);
    expect(screen.getByText('Guild War')).toBeInTheDocument();
  });
});
