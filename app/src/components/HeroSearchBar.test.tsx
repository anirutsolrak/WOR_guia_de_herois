import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../hooks/useHeroSearchIndex', () => ({
  useHeroSearchIndex: () => ({
    data: [
      { id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'lu.png' },
      { id: 3, name_pt: 'Ludmila', name_en: 'Ludmila', card_url: 'ld.png' },
      { id: 2, name_pt: 'Zéfiro', name_en: 'Zephyr', card_url: 'ze.png' },
    ],
    loading: false, error: null,
  }),
}));

import { HeroSearchBar } from './HeroSearchBar';

function Probe() {
  return <span data-testid="rota">{useLocation().pathname}</span>;
}

function renderBar() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <HeroSearchBar />
      <Probe />
    </MemoryRouter>,
  );
  return screen.getByRole('combobox');
}

describe('HeroSearchBar', () => {
  it('sem termo digitado, não mostra o listbox', () => {
    const input = renderBar();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('digitar filtra e abre o listbox', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Lu Bu', 'Ludmila']);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('acha por name_en mesmo com o PT diferente, e mostra o nome original', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'zephyr' } });
    const option = screen.getByRole('option');
    expect(option).toHaveTextContent('Zéfiro');
    expect(option).toHaveTextContent('Zephyr');
  });

  it('seta para baixo + Enter navega para o herói ativo', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('rota')).toHaveTextContent('/heroi/3');
  });

  it('Enter sem seleção navega para o primeiro resultado', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('rota')).toHaveTextContent('/heroi/1');
  });

  it('Esc fecha o listbox sem limpar o texto digitado', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveValue('lu');
  });

  it('perder o foco fecha a lista e focar de novo reabre', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    fireEvent.blur(input);
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('seta para baixo reabre a lista depois do Esc', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('clicar numa opção navega e limpa o campo', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    fireEvent.click(screen.getAllByRole('option')[1]);
    expect(screen.getByTestId('rota')).toHaveTextContent('/heroi/3');
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
