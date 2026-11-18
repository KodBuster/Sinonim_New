"use client";

import { ProductImage } from "@/components/catalog/ProductImage";
import Link from "next/link";
import {
  flattenAutocompleteSuggestions,
  type SearchAutocompleteResult,
  type SearchAutocompleteSuggestion,
} from "@/lib/search-types";

type SearchAutocompleteListProps = {
  query: string;
  result: SearchAutocompleteResult | null;
  loading: boolean;
  open: boolean;
  activeIndex: number;
  listId: string;
  variant?: "default" | "overlay";
  onSelect: (suggestion: SearchAutocompleteSuggestion) => void;
  onShowAll: () => void;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(price);
}

export function SearchAutocompleteList({
  query,
  result,
  loading,
  open,
  activeIndex,
  listId,
  variant = "default",
  onSelect,
  onShowAll,
}: SearchAutocompleteListProps) {
  if (!open || query.trim().length < 2) {
    return null;
  }

  const suggestions = result ? flattenAutocompleteSuggestions(result) : [];
  const hasSuggestions = suggestions.length > 0;
  const isOverlay = variant === "overlay";

  const shellClass = isOverlay
    ? "absolute left-0 right-0 top-[calc(100%+0.75rem)] z-50 max-h-[min(42vh,340px)] overflow-y-auto overscroll-contain border border-black/8 bg-white shadow-[0_10px_30px_rgba(40,43,36,0.08)]"
    : "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(42vh,320px)] overflow-y-auto overscroll-contain rounded-xl border border-brand-olive/15 bg-white shadow-lg";

  if (loading && !hasSuggestions) {
    return (
      <div id={listId} role="listbox" className={shellClass}>
        <p className="px-4 py-3 font-body text-sm font-light text-brand-muted">
          Ищем подсказки…
        </p>
      </div>
    );
  }

  if (!hasSuggestions) {
    return (
      <div id={listId} role="listbox" className={shellClass}>
        <p className="px-4 py-3 font-body text-sm font-light text-brand-muted">
          Ничего не найдено
        </p>
        <a
          href={`/search?q=${encodeURIComponent(query.trim())}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.preventDefault();
            onShowAll();
          }}
          className="block w-full border-t border-black/8 px-4 py-3 text-left font-body text-sm font-light text-brand-terracotta transition-opacity hover:opacity-70"
        >
          Искать «{query}» во всём каталоге
        </a>
      </div>
    );
  }

  let itemIndex = -1;

  return (
    <div id={listId} role="listbox" className={shellClass}>
      {result?.categories.length ? (
        <div className="border-b border-black/8">
          <p className="font-search px-4 pt-4 pb-2 text-[11px] tracking-[0.16em] text-brand-olive-dark uppercase">
            Категории
          </p>
          <ul>
            {result.categories.map((category) => {
              itemIndex += 1;
              const isActive = itemIndex === activeIndex;

              return (
                <li key={`category-${category.slug}`}>
                  <Link
                    href={category.href}
                    role="option"
                    aria-selected={isActive}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelect(category)}
                    className={`block px-4 py-2.5 font-search text-[18px] transition-colors ${
                      isActive
                        ? "bg-brand-surface text-brand-olive-dark"
                        : "text-brand-olive-dark hover:bg-brand-surface/80"
                    }`}
                  >
                    <span className="underline decoration-black/15 underline-offset-[4px]">
                      {category.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {result?.products.length ? (
        <div>
          <p className="font-search px-4 pt-4 pb-2 text-[11px] tracking-[0.16em] text-brand-olive-dark uppercase">
            Найденные товары
          </p>
          <ul>
            {result.products.map((product) => {
              itemIndex += 1;
              const isActive = itemIndex === activeIndex;

              return (
                <li key={`product-${product.id}`}>
                  <Link
                    href={product.href}
                    role="option"
                    aria-selected={isActive}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelect(product)}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isActive ? "bg-brand-surface" : "hover:bg-brand-surface/80"
                    }`}
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden bg-[#f7f5f2]">
                      <ProductImage
                        src={product.image}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="font-search block truncate text-[17px] leading-snug text-brand-olive-dark">
                        {product.name}
                      </span>
                      {product.artNo ? (
                        <span className="mt-0.5 block truncate font-body text-[12px] font-light text-brand-muted">
                          Арт. {product.artNo}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-body text-[13px] font-light text-brand-olive-dark">
                      {formatPrice(product.price)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <a
        href={`/search?q=${encodeURIComponent(query.trim())}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.preventDefault();
          onShowAll();
        }}
        className="block w-full border-t border-black/8 px-4 py-3 text-left font-body text-sm font-light text-brand-terracotta transition-opacity hover:opacity-70"
      >
        {loading ? "Загрузка…" : `Показать все результаты для «${query}»`}
      </a>
    </div>
  );
}
