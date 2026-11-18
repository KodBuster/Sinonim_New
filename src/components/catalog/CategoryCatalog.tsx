"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, CATALOG_CATEGORY_SLUGS, PRICE_RANGES, RING_BRACELET_SIZES, type Product } from "@/lib/products";
import { buildFilterQuery, countActiveFilters, shouldShowSizeFilter, type CatalogFilters } from "@/lib/catalog-utils";
import { SearchSortMenu } from "@/components/search/SearchSortMenu";
import { ProductCard } from "./ProductCard";
import styles from "./CategoryCatalog.module.css";

const PAGE_SIZE = 30;

function ProductResults({ products }: { products: Product[] }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const shown = Math.min(limit, products.length);
  return <>
    <div id="category-products" className={styles.grid}>
      {products.slice(0, limit).map(product => <ProductCard key={product.id} product={product} />)}
    </div>
    <div className={styles.pagination}>
      <p role="status">Показано {shown} из {products.length}</p>
      <progress value={shown} max={products.length} aria-label="Показано товаров" />
      {shown < products.length && <button type="button" aria-controls="category-products"
        onClick={() => setLimit(value => value + PAGE_SIZE)}>
        Показать ещё {Math.min(PAGE_SIZE, products.length - shown)}
      </button>}
    </div>
  </>;
}

export function CategoryCatalog({ title, description, products, filters, basePath, loading, error, onRetry }: {
  title: string;
  description: string;
  products: Product[];
  filters: CatalogFilters;
  basePath: string;
  loading: boolean;
  error?: string;
  onRetry: () => void;
}) {
  const router = useRouter();
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { category } = filters;
  const isShop = basePath === "/shop";
  const activeCount = countActiveFilters(filters) + (isShop && category ? 1 : 0);
  const intro = /[.!?]$/.test(description) ? description : `${description}.`;
  const showSizeFilter = shouldShowSizeFilter(category);
  const href = (updates: Partial<CatalogFilters>) => {
    const next = { ...filters, ...updates };
    const query = new URLSearchParams(buildFilterQuery(next, {}));
    if (isShop && next.category) query.set("category", next.category);
    return query.size ? `${basePath}?${query}` : basePath;
  };
  const toggle = (key: "priceRanges" | "sizes", value: string) => ({
    [key]: filters[key].includes(value) ? filters[key].filter(item => item !== value) : [...filters[key], value],
  });

  return <section className={styles.catalog}>
    <div className={isShop ? `${styles.intro} ${styles.shopIntro}` : styles.intro}>
      <nav aria-label="Хлебные крошки">
        <ol className={styles.breadcrumbs}>
          <li><Link href="/">Главная</Link></li>
          <li aria-hidden="true">/</li>
          {isShop ? <li aria-current="page">Каталог</li> : <>
            <li><Link href="/shop">Каталог</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{title}</li>
          </>}
        </ol>
      </nav>
      <h1>{title}</h1>
      <p>
        {intro}
        {!isShop && category === "rings" && " Носите любимое каждый день или сочетайте несколько."}
        {(category === "rings" || category === "bracelets") && <> Не знаете размер?{" "}
          <Link href="/how-size-ring">Найдите свой.</Link>
        </>}
      </p>
      <nav aria-label="Быстрые подборки" className={styles.quickLinks}>
        <Link href={basePath}>{isShop ? "Все украшения" : category ? `Все ${title.toLowerCase()}` : "Вся коллекция"}</Link>
        <Link href={href({ complectsOnly: true })}>В составе комплекта</Link>
        <Link href={href({ priceRanges: [PRICE_RANGES[0].id] })}>До 15 000 ₽</Link>
        {showSizeFilter && <Link href="/how-size-ring">Как выбрать размер</Link>}
      </nav>
    </div>
    <div className={styles.toolbar}>
      <button className={styles.desktopToggle} type="button" aria-expanded={desktopOpen} aria-controls="category-filters"
        onClick={() => setDesktopOpen(value => !value)}><span aria-hidden="true">☷</span> {desktopOpen ? "Скрыть фильтры" : "Показать фильтры"}</button>
      <button className={styles.mobileToggle} type="button" aria-expanded={mobileOpen} aria-controls="category-filters"
        onClick={() => setMobileOpen(value => !value)}><span aria-hidden="true">☷</span> Фильтры{activeCount ? ` (${activeCount})` : ""}</button>
      <p className={styles.count}>{loading ? "Загрузка…" : `${products.length} товаров`}</p>
      <div className={styles.sort}>
        <SearchSortMenu
          value={filters.sort}
          onChange={(sort) => router.push(href({ sort }), { scroll: false })}
        />
      </div>
    </div>
    <div className={`${styles.layout} ${!desktopOpen ? styles.withoutSidebar : ""}`}>
      <aside id="category-filters" aria-label="Фильтры товаров" className={`${styles.sidebar} ${!desktopOpen ? styles.desktopHidden : ""} ${mobileOpen ? styles.mobileOpen : ""}`}>
        {isShop && (
          <details className={styles.filterSection}>
            <summary>Категория</summary>
            <div className={styles.options}>
              {[undefined, ...CATALOG_CATEGORY_SLUGS].map((slug) => (
                <label key={slug ?? "all"}>
                  <input
                    type="radio"
                    name="catalog-category"
                    checked={category === slug}
                    onChange={() => router.push(href({
                      category: slug,
                      sizes: shouldShowSizeFilter(slug) ? filters.sizes : [],
                    }), { scroll: false })}
                  />
                  {slug ? CATEGORIES[slug].title : "Все украшения"}
                </label>
              ))}
            </div>
          </details>
        )}
        <details className={styles.filterSection}>
          <summary>Цена</summary>
          <div className={styles.options}>{PRICE_RANGES.map(range => <label key={range.id}>
            <input type="checkbox" checked={filters.priceRanges.includes(range.id)} onChange={() => router.push(href(toggle("priceRanges", range.id)), { scroll: false })} />{range.label}
          </label>)}</div>
        </details>
        {showSizeFilter && <details className={styles.filterSection}>
          <summary>Размер</summary>
          <div className={styles.sizes}>{RING_BRACELET_SIZES.map(size => <Link key={size} href={href(toggle("sizes", String(size)))} scroll={false}
            aria-label={`Размер ${String(size).replace(".", ",")}${filters.sizes.includes(String(size)) ? ", выбран" : ""}`}
            className={filters.sizes.includes(String(size)) ? styles.selected : ""}>{String(size).replace(".", ",")}</Link>)}</div>
          <Link className={styles.sizeGuide} href="/how-size-ring">Как определить размер</Link>
        </details>}
        <details className={styles.filterSection}>
          <summary>Комплекты{filters.complectsOnly ? " (1)" : ""}</summary>
          <div className={styles.options}><label><input type="checkbox" checked={filters.complectsOnly}
            onChange={() => router.push(href({ complectsOnly: !filters.complectsOnly }), { scroll: false })} />В составе комплекта</label></div>
        </details>
        {activeCount > 0 && <Link className={styles.reset} href={href({ category: isShop ? undefined : category, priceRanges: [], sizes: [], complectsOnly: false, newOnly: false })} scroll={false}>Сбросить фильтры ({activeCount})</Link>}
        <button className={styles.apply} type="button" onClick={() => setMobileOpen(false)}>Показать товары ({products.length})</button>
      </aside>
      <div className={styles.results} aria-busy={loading}>
        {loading ? <div className={styles.grid}>{Array.from({ length: 6 }, (_, i) => <div key={i} className={styles.skeleton} />)}</div>
          : error ? <div className={styles.empty}><h2>Каталог временно недоступен</h2><p>{error}</p><button type="button" onClick={onRetry}>Попробовать снова</button></div>
          : products.length ? <ProductResults key={href({})} products={products} />
          : <div className={styles.empty}><h2>Ничего не найдено</h2><p>Попробуйте изменить фильтры.</p><Link href={basePath} scroll={false}>Сбросить фильтры</Link></div>}
      </div>
    </div>
  </section>;
}
