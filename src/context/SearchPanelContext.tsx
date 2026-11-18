"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SearchPanelContextValue = {
  isOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

const SearchPanelContext = createContext<SearchPanelContextValue | null>(null);

export function SearchPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, openSearch, closeSearch }),
    [isOpen, openSearch, closeSearch],
  );

  return (
    <SearchPanelContext.Provider value={value}>
      {children}
    </SearchPanelContext.Provider>
  );
}

export function useSearchPanel() {
  const ctx = useContext(SearchPanelContext);
  if (!ctx) {
    throw new Error("useSearchPanel должен быть внутри SearchPanelProvider");
  }
  return ctx;
}
