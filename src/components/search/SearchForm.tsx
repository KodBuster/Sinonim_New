"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  flattenAutocompleteSuggestions,
  type SearchAutocompleteResult,
  type SearchAutocompleteSuggestion,
} from "@/lib/search-types";
import { SearchAutocompleteList } from "./SearchAutocompleteList";
import { writeStoredSearchQuery } from "./search-query-storage";

const AUTOCOMPLETE_DEBOUNCE_MS = 300;
const MIN_AUTOCOMPLETE_LENGTH = 2;

type SearchFormProps = {
  autoFocus?: boolean;
  defaultQuery?: string;
  onSubmit?: () => void;
  onClear?: () => void;
  onClose?: () => void;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
  enableAutocomplete?: boolean;
  /** overlay — строка в духе Missoma (лупа, кисточка очистки, Найти, крестик закрытия) */
  variant?: "default" | "overlay";
};

async function fetchAutocomplete(
  query: string,
  signal: AbortSignal,
): Promise<SearchAutocompleteResult> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/search/autocomplete?${params.toString()}`, {
    signal,
  });
  const data = (await response.json()) as SearchAutocompleteResult & {
    error?: string;
  };

  if (!response.ok) {
    return { products: [], categories: [] };
  }

  return {
    products: data.products ?? [],
    categories: data.categories ?? [],
  };
}

function searchHref(query: string) {
  return `/search?q=${encodeURIComponent(query.trim())}`;
}

/**
 * Search form with autocomplete (Sharoduvy-style):
 * real <form onSubmit>, enterKeyHint=search, no onBlur setState race,
 * suggestions use onMouseDown preventDefault.
 */
export function SearchForm({
  autoFocus = false,
  defaultQuery = "",
  onSubmit,
  onClear,
  onClose,
  className = "",
  inputClassName = "",
  compact = false,
  enableAutocomplete = true,
  variant = "default",
}: SearchFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [suggestQuery, setSuggestQuery] = useState(defaultQuery);
  const [suggestions, setSuggestions] = useState<SearchAutocompleteResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setSuggestQuery(defaultQuery);
    if (inputRef.current) {
      inputRef.current.value = defaultQuery;
    }
  }, [defaultQuery]);

  useEffect(() => {
    if (!enableAutocomplete) return;

    const trimmed = suggestQuery.trim();
    if (trimmed.length < MIN_AUTOCOMPLETE_LENGTH) {
      setSuggestions(null);
      setLoading(false);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setOpen(true);

      fetchAutocomplete(trimmed, controller.signal)
        .then((result) => {
          setSuggestions(result);
          setActiveIndex(-1);
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === "AbortError") return;
          setSuggestions({ products: [], categories: [] });
        })
        .finally(() => {
          setLoading(false);
        });
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [suggestQuery, enableAutocomplete]);

  const readQuery = () => inputRef.current?.value ?? suggestQuery;

  const leaveTo = (href: string, queryForStorage?: string) => {
    const stored =
      queryForStorage?.trim() ||
      (href.startsWith("/search?")
        ? new URL(href, "https://local.invalid").searchParams.get("q")?.trim()
        : "") ||
      "";
    if (stored) writeStoredSearchQuery(stored);
    onSubmit?.();
    setOpen(false);
    router.push(href);
  };

  const flatSuggestions = suggestions
    ? flattenAutocompleteSuggestions(suggestions)
    : [];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeIndex >= 0 && flatSuggestions[activeIndex]) {
      leaveTo(flatSuggestions[activeIndex].href);
      return;
    }
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    leaveTo(searchHref(q), q);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!enableAutocomplete || !open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        index < flatSuggestions.length - 1 ? index + 1 : index,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index > 0 ? index - 1 : -1));
    }
  };

  const isOverlay = variant === "overlay";

  return (
    <form
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      className={`relative ${className}`}
      role="search"
    >
      {isOverlay ? (
        <div className="flex items-center gap-2 border-b border-black/15 pb-3 md:gap-4">
          <span className="shrink-0 text-brand-olive-dark" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="M20 20l-3.2-3.2"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {/* type=text: без системного крестика очистки (дублировал «Очистить») */}
          <input
            ref={inputRef}
            type="text"
            name="q"
            defaultValue={defaultQuery}
            onInput={(event) => setSuggestQuery(event.currentTarget.value)}
            onFocus={() => {
              if (
                enableAutocomplete &&
                readQuery().trim().length >= MIN_AUTOCOMPLETE_LENGTH
              ) {
                setOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            enterKeyHint="search"
            autoComplete="off"
            aria-autocomplete={enableAutocomplete ? "list" : undefined}
            aria-controls={open ? listId : undefined}
            aria-expanded={enableAutocomplete ? open : undefined}
            placeholder="Поиск украшений…"
            className={`min-w-0 flex-1 border-0 bg-transparent py-1 font-body text-[17px] font-light text-brand-olive-dark placeholder:text-brand-muted/80 outline-none focus:ring-0 md:text-[18px] ${inputClassName}`}
          />
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {/* Только при непустом запросе; крупнее — как в симуляции Snagit */}
            {suggestQuery.trim() ? (
              <button
                type="button"
                aria-label="Очистить"
                title="Очистить"
                className="flex h-12 w-12 items-center justify-center text-brand-muted transition-opacity hover:opacity-70 md:h-14 md:w-14"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = "";
                  setSuggestQuery("");
                  setSuggestions(null);
                  setOpen(false);
                  writeStoredSearchQuery("");
                  onClear?.();
                  inputRef.current?.focus();
                }}
              >
                <img
                  src="/icons/search-clear.png"
                  alt=""
                  width={52}
                  height={52}
                  className="pointer-events-none block size-11 object-contain opacity-90 md:size-[52px]"
                  draggable={false}
                />
              </button>
            ) : null}
            <button
              type="submit"
              onMouseDown={(event) => event.preventDefault()}
              className="flex h-11 min-w-[3.25rem] items-center justify-center touch-manipulation px-2 font-body text-[13px] font-light tracking-[0.06em] text-brand-olive-dark uppercase transition-opacity hover:opacity-70 md:h-10 [-webkit-tap-highlight-color:transparent]"
            >
              Найти
            </button>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center text-brand-olive-dark transition-opacity hover:opacity-60 md:h-10 md:w-10"
                aria-label="Закрыть"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="search"
            name="q"
            defaultValue={defaultQuery}
            onInput={(event) => setSuggestQuery(event.currentTarget.value)}
            onFocus={() => {
              if (
                enableAutocomplete &&
                readQuery().trim().length >= MIN_AUTOCOMPLETE_LENGTH
              ) {
                setOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            enterKeyHint="search"
            autoComplete="off"
            aria-autocomplete={enableAutocomplete ? "list" : undefined}
            aria-controls={open ? listId : undefined}
            aria-expanded={enableAutocomplete ? open : undefined}
            placeholder="Кольцо, серьги, артикул…"
            className={`min-w-0 flex-1 rounded-lg border border-brand-olive/20 bg-white px-4 text-base text-brand-text placeholder:text-brand-muted focus:border-brand-olive focus:outline-none focus:ring-2 focus:ring-brand-olive/20 ${
              compact ? "py-2" : "py-2.5"
            } ${inputClassName}`}
          />
          <button
            type="submit"
            onMouseDown={(event) => event.preventDefault()}
            className={`shrink-0 touch-manipulation rounded-lg bg-brand-terracotta px-4 font-medium text-white transition-colors hover:bg-brand-terracotta-logo [-webkit-tap-highlight-color:transparent] ${
              compact ? "py-2 text-sm" : "py-2.5 text-base"
            }`}
          >
            Найти
          </button>
        </div>
      )}

      {enableAutocomplete ? (
        <SearchAutocompleteList
          query={suggestQuery.trim()}
          result={suggestions}
          loading={loading}
          open={open}
          activeIndex={activeIndex}
          listId={listId}
          variant={variant}
          onSelect={(suggestion: SearchAutocompleteSuggestion) =>
            leaveTo(suggestion.href)
          }
          onShowAll={() => {
            const q = readQuery().trim();
            if (q) leaveTo(searchHref(q));
          }}
        />
      ) : null}
    </form>
  );
}
