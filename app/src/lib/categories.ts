export type CategoryKey = 'arena' | 'gear' | 'guild' | 'towers' | 'other';

export interface Category {
  key: CategoryKey;
  label: string;
}

export const CATEGORY_ORDER: Category[] = [
  { key: 'arena', label: 'Arena' },
  { key: 'gear', label: 'Gear' },
  { key: 'guild', label: 'Guilda' },
  { key: 'towers', label: 'Torres & Ilusões' },
  { key: 'other', label: 'Outros' },
];

// Categoriza pelo name_en (estável). Ordem de checagem importa: nenhum nome
// dos 19 modos atuais contém palavras-chave de duas categorias.
export function categorize(nameEn: string): CategoryKey {
  const n = nameEn.toLowerCase();
  if (n.includes('arena')) return 'arena';
  if (n.includes('gear') || n.includes('artifact material')) return 'gear';
  if (n.includes('guild') || n.includes('titanic') || n.includes('drake')) return 'guild';
  if (n.includes('tower') || n.includes('malrik')) return 'towers';
  return 'other';
}
