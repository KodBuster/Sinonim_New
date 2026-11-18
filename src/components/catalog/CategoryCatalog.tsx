"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, CATALOG_CATEGORY_SLUGS, PRICE_RANGES, RING_BRACELET_SIZES, type Product } from "@/lib/products";
import { buildFilterQuery, countActiveFilters, shouldShowSizeFilter, type CatalogFilters } from "@/lib/catalog-utils";
import { SearchSortMenu } from "@/components/search/SearchSortMenu";
import { ProductCard } from "./ProductCard";
import styles from "./CategoryCatalog.module.css";

const PAGE_SIZE = 30;

type MobilePanel = "category" | "price" | "size" | "complects" | null;

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

/** Строка фильтра на мобилке: заголовок + плюс, опции во всплывающем окне как у сортировки */
function MobileFilterRow({
  title,
  open,
  onToggle,
  onClose,
  children,
  badge,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
  badge?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && !rootRef.current?.contains(target)) onCloseRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`${styles.filterSection} ${styles.mobileFilterRow}`}>
      <button
        type="button"
        className={styles.mobileFilterTrigger}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={onToggle}
      >
        <span>
          {title}
          {badge ? <span className={styles.mobileFilterBadge}>{badge}</span> : null}
        </span>
        <span className={styles.mobileFilterPlus} aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div id={listId} className={styles.mobileFilterPopup} role="listbox" aria-label={title}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function PopupOption({
  selected,
  onSelect,
  children,
  multi = false,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={styles.mobilePopupOption}
      onClick={onSelect}
    >
      <span
        className={`${styles.mobilePopupMark} ${multi ? styles.mobilePopupMarkSquare : ""} ${
          selected ? styles.mobilePopupMarkSelected : ""
        }`}
        aria-hidden
      >
        {selected ? (
          multi ? (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className={styles.mobilePopupDot} />
          )
        ) : null}
      </span>
      <span>{children}</span>
    </button>
  );
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
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
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
  const closeMobilePanel = () => {
    setMobilePanel(null);
  };
  const toggleMobilePanel = (panel: Exclude<MobilePanel, null>) => {
    setMobilePanel((current) => (current === panel ? null : panel));
  };

  const categoryOptions = (
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
  );

  const priceOptions = (
    <div className={styles.options}>{PRICE_RANGES.map(range => <label key={range.id}>
      <input type="checkbox" checked={filters.priceRanges.includes(range.id)} onChange={() => router.push(href(toggle("priceRanges", range.id)), { scroll: false })} />{range.label}
    </label>)}</div>
  );

  const sizeOptions = (
    <>
      <div className={styles.sizes}>{RING_BRACELET_SIZES.map(size => <Link key={size} href={href(toggle("sizes", String(size)))} scroll={false}
        aria-label={`Размер ${String(size).replace(".", ",")}${filters.sizes.includes(String(size)) ? ", выбран" : ""}`}
        className={filters.sizes.includes(String(size)) ? styles.selected : ""}>{String(size).replace(".", ",")}</Link>)}</div>
      <Link className={styles.sizeGuide} href="/how-size-ring">Как определить размер</Link>
    </>
  );

  const complectsOptions = (
    <div className={styles.options}><label><input type="checkbox" checked={filters.complectsOnly}
      onChange={() => router.push(href({ complectsOnly: !filters.complectsOnly }), { scroll: false })} />В составе комплекта</label></div>
  );

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
        onClick={() => {
          setMobileOpen(value => !value);
          setMobilePanel(null);
        }}><span aria-hidden="true">☷</span> Фильтры{activeCount ? ` (${activeCount})` : ""}</button>
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
        {/* Десктоп: как раньше — аккордеон details */}
        <div className={styles.desktopFilters}>
          {isShop && (
            <details className={styles.filterSection}>
              <summary>Категория</summary>
              {categoryOptions}
            </details>
          )}
          <details className={styles.filterSection}>
            <summary>Цена</summary>
            {priceOptions}
          </details>
          {showSizeFilter && <details className={styles.filterSection}>
            <summary>Размер</summary>
            {sizeOptions}
          </details>}
          <details className={styles.filterSection}>
            <summary>Комплекты{filters.complectsOnly ? " (1)" : ""}</summary>
            {complectsOptions}
          </details>
        </div>

        {/* Мобилка: компактные строки + попап в стиле сортировки */}
        <div className={styles.mobileFilters}>
          {isShop && (
            <MobileFilterRow
              title="Категория"
              open={mobilePanel === "category"}
              onToggle={() => toggleMobilePanel("category")}
              onClose={closeMobilePanel}
            >
              <ul className={styles.mobilePopupList}>
                {[undefined, ...CATALOG_CATEGORY_SLUGS].map((slug) => (
                  <li key={slug ?? "all"}>
                    <PopupOption
                      selected={category === slug}
                      onSelect={() => {
                        router.push(href({
                          category: slug,
                          sizes: shouldShowSizeFilter(slug) ? filters.sizes : [],
                        }), { scroll: false });
                        closeMobilePanel();
                      }}
                    >
                      {slug ? CATEGORIES[slug].title : "Все украшения"}
                    </PopupOption>
                  </li>
                ))}
              </ul>
            </MobileFilterRow>
          )}
          <MobileFilterRow
            title="Цена"
            open={mobilePanel === "price"}
            onToggle={() => toggleMobilePanel("price")}
            onClose={closeMobilePanel}
            badge={filters.priceRanges.length ? `(${filters.priceRanges.length})` : undefined}
          >
            <ul className={styles.mobilePopupList}>
              {PRICE_RANGES.map((range) => (
                <li key={range.id}>
                  <PopupOption
                    multi
                    selected={filters.priceRanges.includes(range.id)}
                    onSelect={() => router.push(href(toggle("priceRanges", range.id)), { scroll: false })}
                  >
                    {range.label}
                  </PopupOption>
                </li>
              ))}
            </ul>
          </MobileFilterRow>
          {showSizeFilter && (
            <MobileFilterRow
              title="Размер"
              open={mobilePanel === "size"}
              onToggle={() => toggleMobilePanel("size")}
              onClose={closeMobilePanel}
              badge={filters.sizes.length ? `(${filters.sizes.length})` : undefined}
            >
              <div className={styles.mobilePopupSizes}>
                {RING_BRACELET_SIZES.map((size) => {
                  const id = String(size);
                  const selected = filters.sizes.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      className={selected ? styles.selected : undefined}
                      onClick={() => router.push(href(toggle("sizes", id)), { scroll: false })}
                    >
                      {String(size).replace(".", ",")}
                    </button>
                  );
                })}
              </div>
              <Link className={styles.sizeGuide} href="/how-size-ring" onClick={closeMobilePanel}>
                Как определить размер
              </Link>
            </MobileFilterRow>
          )}
          <MobileFilterRow
            title="Комплекты"
            open={mobilePanel === "complects"}
            onToggle={() => toggleMobilePanel("complects")}
            onClose={closeMobilePanel}
            badge={filters.complectsOnly ? "(1)" : undefined}
          >
            <ul className={styles.mobilePopupList}>
              <li>
                <PopupOption
                  multi
                  selected={filters.complectsOnly}
                  onSelect={() => {
                    router.push(href({ complectsOnly: !filters.complectsOnly }), { scroll: false });
                    closeMobilePanel();
                  }}
                >
                  В составе комплекта
                </PopupOption>
              </li>
            </ul>
          </MobileFilterRow>
        </div>

        {activeCount > 0 && <Link className={styles.reset} href={href({ category: isShop ? undefined : category, priceRanges: [], sizes: [], complectsOnly: false, newOnly: false })} scroll={false}>Сбросить фильтры ({activeCount})</Link>}
        <button className={styles.apply} type="button" onClick={() => { setMobileOpen(false); setMobilePanel(null); }}>Показать товары ({products.length})</button>
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
