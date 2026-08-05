const KEYS: Record<string, string> = {
  Watcher: 'watcher',
  Northerner: 'northerner',
  Nightmare: 'nightmare',
  Cultist: 'cultist',
  Infernal: 'infernal',
  Piercer: 'piercer',
  Esotericist: 'esotericist',
  Chaotic: 'chaotic',
  Arbiter: 'arbiter',
  Unnamed: 'unnamed',
};

export function factionColor(titleEn: string): string {
  const key = KEYS[titleEn] ?? 'unnamed';
  return `var(--color-faction-${key})`;
}
