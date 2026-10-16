const SEARCH_RATE_WINDOW_MS = 60_000;
const MAX_SEARCH_REQUESTS_PER_WINDOW = 20;
const MAX_SEARCH_RATE_ENTRIES = 10_000;

const searchRate = new Map<string, { count: number; resetAt: number }>();

export function allowSearchRequest(ip: string, now = Date.now()): boolean {
  for (const [key, entry] of searchRate) {
    if (now >= entry.resetAt) searchRate.delete(key);
  }

  let entry = searchRate.get(ip);
  if (!entry || now >= entry.resetAt) {
    if (searchRate.size >= MAX_SEARCH_RATE_ENTRIES) return false;
    entry = { count: 0, resetAt: now + SEARCH_RATE_WINDOW_MS };
    searchRate.set(ip, entry);
  }

  if (entry.count >= MAX_SEARCH_REQUESTS_PER_WINDOW) return false;
  entry.count++;
  return true;
}
