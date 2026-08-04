// Dicionário curado EN->PT dos termos fixos do jogo.
// Ampliar conforme novos termos aparecerem no pipeline.
export const GLOSSARY: Record<string, string> = {
  // Classes
  'Fighter': 'Lutador', 'Mage': 'Mago', 'Marksman': 'Atirador',
  'Defender': 'Defensor', 'Healer': 'Curandeiro', 'Tactician': 'Tático',
  // Facções
  'Watcher': 'Vigia', 'Northerner': 'Nortista', 'Nightmare': 'Pesadelo',
  'Cultist': 'Cultista', 'Infernal': 'Infernal', 'Piercer': 'Perfurador',
  'Esotericist': 'Esotérico', 'Chaotic': 'Caótico', 'Arbiter': 'Árbitro',
  'Unnamed': 'Inominado',
  // Slots de equipamento
  'Weapon': 'Arma', 'Breastplate': 'Peitoral', 'Bangle': 'Bracelete',
  'Amulet': 'Amuleto', 'Ring': 'Anel',
  // Atributos
  'ATK': 'ATQ', 'HP': 'HP', 'DEF': 'DEF',
  'ATK Bonus': 'Bônus de ATQ', 'HP Bonus': 'Bônus de HP', 'DEF Bonus': 'Bônus de DEF',
  'Crit. Rate': 'Taxa Crít.', 'Crit. DMG': 'Dano Crít.', 'ATK Spd.': 'Vel. de ATQ',
  'Rage Regen': 'Regen. de Fúria',
  // Labels/tags comuns
  'AoE DPS': 'DPS em Área', 'Range Boost': 'Alcance Ampliado', 'Durability': 'Durabilidade',
  'Strong CC': 'Controle Forte', 'Ally Buff': 'Buff de Aliados',
  'DEF Penetration': 'Penetração de DEF', 'Anti-Air Bonus': 'Bônus Antiaéreo',
  'Single-Target DPS': 'DPS Alvo Único', 'Team Protection': 'Proteção de Equipe',
};

export function translateTerm(en: string): string | null {
  return GLOSSARY[en] ?? null;
}
