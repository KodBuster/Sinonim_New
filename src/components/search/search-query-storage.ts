/** Ключ последнего поискового запроса (помним между открытиями панели) */
export const SEARCH_QUERY_STORAGE_KEY = "sinonim-search-q";

export function readStoredSearchQuery(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(SEARCH_QUERY_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeStoredSearchQuery(query: string) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = query.trim();
    if (trimmed) sessionStorage.setItem(SEARCH_QUERY_STORAGE_KEY, trimmed);
    else sessionStorage.removeItem(SEARCH_QUERY_STORAGE_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}
