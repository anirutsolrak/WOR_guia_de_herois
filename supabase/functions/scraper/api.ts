export const API_BASE = 'https://app-web.mproject.skystone.games/actgateway/zgamecommunity';

export function apiUrl(path: string): string {
  return API_BASE + path;
}

export function gameHeaders(): HeadersInit {
  return {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://watcherofrealms.mproject.skystone.games',
    'referer': 'https://watcherofrealms.mproject.skystone.games/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    'x-lang': 'en',
    'x-location': 'sg',
  };
}

async function getJson(path: string): Promise<any> {
  const res = await fetch(apiUrl(path), { headers: gameHeaders() });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json();
}

export const fetchHeroDetail = (id: number) => getJson(`/heroes/${id}?id=${id}`);
export const fetchHeroes = () => getJson('/heroes');
export const fetchClasses = () => getJson('/classes');
export const fetchFactions = () => getJson('/factions');
