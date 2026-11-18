"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useSearchPanel } from "@/context/SearchPanelContext";
import { writeStoredSearchQuery } from "./search-query-storage";
import { SearchSortMenu } from "./SearchSortMenu";

const SEARCH_GRID =
  "grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 lg:gap-6";

type SearchResultsProps = {
  query: string;
  products: Product[];
  error?: string;
  sort: string;
};

export function SearchResults({
  query,
  products,
  error,
  sort,
}: SearchResultsProps) {
  const router = useRouter();
  const { openSearch } = useSearchPanel();

  useEffect(() => {
    if (query) writeStoredSearchQuery(query);
  }, [query]);

  const onSortChange = (nextSort: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("sort", nextSort);
    router.push(`/search?${params.toString()}`, { scroll: false });
  };

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-10">
        <nav
          className="mb-6 font-body text-sm font-light tracking-[0.02em] text-brand-muted"
          aria-label="Хлебные крошки"
        >
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <a href="/" className="transition-opacity hover:opacity-70">
                Главная
              </a>
            </li>
            <li aria-hidden>/</li>
            <li>
              <span className="text-brand-olive-dark">Поиск</span>
            </li>
          </ol>
        </nav>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
          <div>
            <p className="font-search mb-2 text-[11px] tracking-[0.18em] text-brand-terracotta uppercase">
              Каталог
            </p>
            <h1 className="font-search text-3xl font-light text-brand-olive-dark md:text-4xl">
              {query ? `«${query}»` : "Поиск"}
            </h1>
            {query ? (
              <p className="mt-2 font-body text-sm font-light text-brand-muted">
                Результаты поиска
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={openSearch}
            className="rounded-sm border border-black/15 bg-white px-4 py-2.5 font-body text-sm font-light tracking-[0.04em] text-brand-olive-dark transition-colors hover:border-brand-terracotta hover:text-brand-terracotta"
          >
            {query ? "Изменить запрос" : "Открыть поиск"}
          </button>
        </div>

        {!query ? (
          <p className="font-body text-sm font-light text-brand-muted md:text-base">
            Нажмите лупу в шапке или кнопку «Открыть поиск», чтобы найти украшение
            по названию или артикулу.
          </p>
        ) : null}

        {query && error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
            <p className="mb-4 text-brand-text">{error}</p>
            <a
              href={`/search?q=${encodeURIComponent(query)}&sort=${encodeURIComponent(sort)}`}
              className="inline-flex rounded-lg bg-brand-terracotta px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-terracotta-logo"
            >
              Попробовать снова
            </a>
          </div>
        ) : null}

        {query && !error && products.length === 0 ? (
          <p className="py-12 text-center font-search text-[18px] text-brand-muted">
            По запросу «{query}» ничего не найдено.
          </p>
        ) : null}

        {query && !error && products.length > 0 ? (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <p className="font-search min-w-0 text-[15px] text-brand-olive-dark md:text-[16px]">
                Найдено: {products.length}
              </p>
              <SearchSortMenu value={sort} onChange={onSortChange} />
            </div>
            <div className={SEARCH_GRID}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
