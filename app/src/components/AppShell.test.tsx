import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppShell } from './AppShell';
import { SectionHeader } from './SectionHeader';

describe('AppShell', () => {
  it('mostra marca, título, subtítulo e conteúdo', () => {
    render(
      <AppShell title="Melhores heróis por conteúdo" subtitle="Escolha um modo">
        <div>corpo</div>
      </AppShell>,
    );
    expect(screen.getByText('WoR Guia')).toBeInTheDocument();
    expect(screen.getByText('Melhores heróis por conteúdo')).toBeInTheDocument();
    expect(screen.getByText('Escolha um modo')).toBeInTheDocument();
    expect(screen.getByText('corpo')).toBeInTheDocument();
  });

  it('mostra busca só quando onSearch é passado e emite o valor', () => {
    const onSearch = vi.fn();
    const { rerender } = render(<AppShell title="T"><div /></AppShell>);
    expect(screen.queryByRole('textbox')).toBeNull();

    rerender(<AppShell title="T" search="" onSearch={onSearch}><div /></AppShell>);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'lu' } });
    expect(onSearch).toHaveBeenCalledWith('lu');
  });

  it('mostra o banner de fundo quando passado', () => {
    render(<AppShell title="T" banner="b.png"><div /></AppShell>);
    expect(screen.getByTestId('shell-banner')).toHaveAttribute('src', 'b.png');
  });
  it('sem banner, não renderiza a imagem de fundo', () => {
    render(<AppShell title="T"><div /></AppShell>);
    expect(screen.queryByTestId('shell-banner')).toBeNull();
  });
});

describe('SectionHeader', () => {
  it('renderiza o label', () => {
    render(<SectionHeader label="Guilda" />);
    expect(screen.getByText('Guilda')).toBeInTheDocument();
  });
});
