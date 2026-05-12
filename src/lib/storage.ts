import { RecipeSummary } from "./types";

const FRIDGE_KEY = "fridge_v1";
const FAVORITES_KEY = "favorites_v1";

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getFridge(): string[] {
  return safeGet<string[]>(FRIDGE_KEY, []);
}

export function setFridge(items: string[]): void {
  safeSet(FRIDGE_KEY, items);
}

export function getFavorites(): RecipeSummary[] {
  return safeGet<RecipeSummary[]>(FAVORITES_KEY, []);
}

export function isFavorite(id: string): boolean {
  return getFavorites().some((f) => f.id === id);
}

export function toggleFavorite(recipe: RecipeSummary): boolean {
  const list = getFavorites();
  const idx = list.findIndex((f) => f.id === recipe.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    safeSet(FAVORITES_KEY, list);
    return false;
  }
  safeSet(FAVORITES_KEY, [recipe, ...list]);
  return true;
}
