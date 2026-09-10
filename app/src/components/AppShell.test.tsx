import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AppShell } from './AppShell';
import { SectionHeader } from './SectionHeader';

vi.mock('../hooks/useHeroSearchIndex', () => ({
  useHeroSearchIndex: () => ({
    data: [{ id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'lu.png' }],
    loading: false, error: null,
  }),
}));

describe('AppShell', () => {
  it('mostra marca, título, subtítulo e conteúdo', () => {
    render(
      <MemoryRouter>
        <AppShell title="Melhores heróis por conteúdo" subtitle="Escolha um modo">
          <div>corpo</div>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByText('WoR Guia')).toBeInTheDocument();
    expect(screen.getByText('Melhores heróis por conteúdo')).toBeInTheDocument();
    expect(screen.getByText('Escolha um modo')).toBeInTheDocument();
    expect(screen.getByText('corpo')).toBeInTheDocument();
  });

  it('mostra sempre a busca de heróis', () => {
    render(<MemoryRouter><AppShell title="T"><div /></AppShell></MemoryRouter>);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-label', 'Buscar herói');
    fireEvent.change(input, { target: { value: 'lu' } });
    expect(screen.getByRole('option')).toHaveTextContent('Lu Bu');
  });

  it('mostra o banner de fundo quando passado', () => {
    render(<MemoryRouter><AppShell title="T" banner="b.png"><div /></AppShell></MemoryRouter>);
    expect(screen.getByTestId('shell-banner')).toHaveAttribute('src', 'b.png');
  });
  it('sem banner, não renderiza a imagem de fundo', () => {
    render(<MemoryRouter><AppShell title="T"><div /></AppShell></MemoryRouter>);
    expect(screen.queryByTestId('shell-banner')).toBeNull();
  });
});

describe('SectionHeader', () => {
  it('renderiza o label', () => {
    render(<SectionHeader label="Guilda" />);
    expect(screen.getByText('Guilda')).toBeInTheDocument();
  });
});
