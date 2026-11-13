"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import {
  ASSET,
  BESTSELLER_ORDER,
  COLLECTIONS,
  FEATURED_ORDER,
  FEATURED_TABS,
  HERO_SLIDES,
  JOURNAL,
  NAV,
  PRODUCTS,
  PROMOS,
  formatPrice,
  productsByIds,
  type RedesignProduct,
} from "./data";
import { ProductCard } from "./ProductCard";

function useRedesignStyles() {
  useEffect(() => {
    const id = "synonym-redesign-css";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    const created = !link;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "/redesign/site.css";
      document.head.appendChild(link);
    }
    document.documentElement.classList.add("synonym-redesign-active");
    document.body.classList.add("synonym-redesign-active");
    return () => {
      document.documentElement.classList.remove("synonym-redesign-active");
      document.body.classList.remove("synonym-redesign-active");
      if (created) link?.remove();
    };
  }, []);
}

function Picture({
  desktop,
  mobile,
  alt,
  className = "",
}: {
  desktop: string;
  mobile: string;
  alt: string;
  className?: string;
}) {
  return (
    <picture className={className}>
      <source media="(max-width:680px)" srcSet={mobile} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={desktop} alt={alt} loading="eager" />
    </picture>
  );
}

function SectionHead({
  kicker,
  title,
  href,
  text = "Смотреть всё",
}: {
  kicker: string;
  title: string;
  href?: string;
  text?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h2>{title}</h2>
      </div>
      {href ? (
        <Link className="text-link" href={href}>
          {text} ↗
        </Link>
      ) : null}
    </div>
  );
}

export function RedesignHome() {
  useRedesignStyles();

  const { count: cartCount, isReady: cartReady } = useCart();
  const { count: favCount, isReady: favReady } = useFavorites();

  const [slide, setSlide] = useState(0);
  const [featuredTab, setFeaturedTab] = useState<(typeof FEATURED_TABS)[number]["id"]>("all");
  const [quickView, setQuickView] = useState<RedesignProduct | null>(null);
  const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const featuredRail = useRef<HTMLDivElement>(null);
  const touchX = useRef(0);

  const featuredProducts = useMemo(() => {
    if (featuredTab === "all") return productsByIds(FEATURED_ORDER);
    return PRODUCTS.filter((p) => p.category === featuredTab);
  }, [featuredTab]);

  const bestsellers = useMemo(() => productsByIds(BESTSELLER_ORDER), []);

  const startHero = useCallback(() => {
    if (heroTimer.current) clearInterval(heroTimer.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    heroTimer.current = setInterval(() => {
      setSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 3000);
  }, []);

  useEffect(() => {
    startHero();
    const onVis = () => {
      if (document.hidden) {
        if (heroTimer.current) clearInterval(heroTimer.current);
      } else startHero();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (heroTimer.current) clearInterval(heroTimer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [startHero]);

  const stepFeatured = (dir: number) => {
    const rail = featuredRail.current;
    if (!rail) return;
    const first = rail.querySelector(".product-card") as HTMLElement | null;
    if (!first) return;
    const gap = parseFloat(getComputedStyle(rail).gap) || 12;
    const amount =
      (first.getBoundingClientRect().width + gap) * (window.innerWidth <= 680 ? 1 : 2);
    rail.scrollBy({
      left: dir * amount,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  const countLabel = (n: number) => {
    if (n === 1) return "изделие";
    if (n > 1 && n < 5) return "изделия";
    return "изделий";
  };

  return (
    <div className="synonym-redesign-root" style={{ minHeight: "100vh", background: "#fff" }}>
      <header className="site-header">
        <div className="header-core wrap">
          <Link href="/menu" className="icon-btn mobile-menu" aria-label="Открыть меню">
            ☰
          </Link>
          <Link href="/" className="brand" aria-label="СИНОНИМ — главная">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ASSET}/synonym-logo.png`} alt="СИНОНИМ" />
          </Link>
          <div className="header-tools">
            <Link href="/search" className="icon-btn" aria-label="Поиск по каталогу">
              ⌕
            </Link>
            <Link href="/favorites" className="icon-btn" aria-label="Избранное">
              ♡
              <span
                data-counter="favorites"
                style={
                  {
                    display: favReady && favCount > 0 ? "grid" : "none",
                  } as CSSProperties
                }
              >
                {favCount || ""}
              </span>
            </Link>
            <Link href="/cart" className="icon-btn" aria-label="Корзина">
              ♧
              <span
                data-counter="cart"
                style={
                  {
                    display: cartReady && cartCount > 0 ? "grid" : "none",
                  } as CSSProperties
                }
              >
                {cartCount || ""}
              </span>
            </Link>
          </div>
        </div>
        <nav className="header-navigation wrap" aria-label="Главная навигация">
          {NAV.map((item) => (
            <Link key={item.href + item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main>
        <section className="hero" data-home-block="1" aria-label="Три истории SYNONYM">
          <div
            className="hero-track"
            id="hero-track"
            onMouseEnter={() => {
              if (heroTimer.current) clearInterval(heroTimer.current);
            }}
            onMouseLeave={startHero}
            onTouchStart={(e) => {
              touchX.current = e.changedTouches[0].screenX;
            }}
            onTouchEnd={(e) => {
              const d = e.changedTouches[0].screenX - touchX.current;
              if (Math.abs(d) > 50) {
                setSlide((prev) => (prev + (d < 0 ? 1 : -1) + HERO_SLIDES.length) % HERO_SLIDES.length);
                startHero();
              }
            }}
          >
            {HERO_SLIDES.map((s, i) => (
              <article
                key={s.title}
                className={`hero-slide ${i === slide ? "active" : ""}`}
                data-slide={i}
                aria-hidden={i !== slide}
              >
                <Picture
                  desktop={s.desktop}
                  mobile={s.mobile}
                  alt="Редакционная фотография SYNONYM"
                  className="hero-photo"
                />
                <div className="hero-shade" />
                <div className="hero-copy wrap">
                  <span className="hero-kicker">{s.eyebrow}</span>
                  <h1>{s.title}</h1>
                  <p>{s.description}</p>
                  <Link className="hero-cta" href={s.href}>
                    {s.cta} <span>↗</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="hero-controls">
            <button
              type="button"
              aria-label="Предыдущий баннер"
              onClick={() => {
                setSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
                startHero();
              }}
            >
              ‹
            </button>
            <div className="hero-dots">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === slide ? "active" : ""}
                  aria-label={`Баннер ${i + 1}`}
                  aria-current={i === slide ? "true" : undefined}
                  onClick={() => {
                    setSlide(i);
                    startHero();
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Следующий баннер"
              onClick={() => {
                setSlide((prev) => (prev + 1) % HERO_SLIDES.length);
                startHero();
              }}
            >
              ›
            </button>
          </div>
          <div className="hero-pagination">
            0{slide + 1} / 0{HERO_SLIDES.length}
          </div>
        </section>

        <section
          className="featured-products wrap"
          id="synonym-products"
          data-home-block="2"
          aria-labelledby="featured-products-title"
        >
          <div className="featured-products-top">
            <div className="featured-products-intro">
              <span className="eyebrow">СИНОНИМ / КАТАЛОГ</span>
              <h2 id="featured-products-title">Товары СИНОНИМ</h2>
              <p>
                Украшения, которые становятся частью вашей истории. Подборка настоящих изделий из
                каталога.
              </p>
            </div>
            <Link href="/shop" className="text-link featured-all">
              Смотреть все украшения ↗
            </Link>
          </div>
          <div className="featured-products-controls">
            <div className="featured-tabs" role="tablist" aria-label="Товары по категориям">
              {FEATURED_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={`featured-tab ${featuredTab === tab.id ? "active" : ""}`}
                  aria-selected={featuredTab === tab.id}
                  onClick={() => {
                    setFeaturedTab(tab.id);
                    if (featuredRail.current) featuredRail.current.scrollLeft = 0;
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="featured-arrows">
              <button
                type="button"
                aria-label="Предыдущие товары"
                onClick={() => stepFeatured(-1)}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Следующие товары"
                onClick={() => stepFeatured(1)}
              >
                ›
              </button>
            </div>
          </div>
          <div
            className="featured-products-viewport"
            id="featured-panel"
            role="tabpanel"
            aria-labelledby="featured-products-title"
          >
            <div
              className="cards-scroll featured-products-track"
              id="featured-products-scroll"
              ref={featuredRail}
            >
              {featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
              ))}
            </div>
          </div>
          <p className="featured-products-note" id="featured-count" role="status" aria-live="polite">
            {featuredProducts.length} {countLabel(featuredProducts.length)} из каталога
          </p>
        </section>

        <section className="categories wrap" data-home-block="3" aria-label="Категории">
          {COLLECTIONS.map((c) => (
            <Link key={c.id} href={c.href} className="category-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.photo} alt={c.name} loading="eager" />
              <span>
                {c.name} <b>↗</b>
              </span>
            </Link>
          ))}
        </section>

        <section className="bestsellers wrap" data-home-block="4">
          <SectionHead kicker="ВАШ ВЫБОР" title="Бестселлеры" href="/shop" />
          <div className="cards-scroll" id="bestseller-scroll">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
            ))}
          </div>
          <div className="scroll-actions">
            <button
              type="button"
              aria-label="Предыдущие товары"
              onClick={() =>
                document
                  .getElementById("bestseller-scroll")
                  ?.scrollBy({ left: -440, behavior: "smooth" })
              }
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Следующие товары"
              onClick={() =>
                document
                  .getElementById("bestseller-scroll")
                  ?.scrollBy({ left: 440, behavior: "smooth" })
              }
            >
              →
            </button>
          </div>
        </section>

        <section className="promos" data-home-block="5" aria-label="Рекламные подборки">
          {PROMOS.map((p) => (
            <Link key={p.id} href={p.href} className="promo">
              <Picture desktop={p.desktop} mobile={p.mobile} alt={p.title} className="promo-img" />
              <span className="promo-overlay" />
              <span className="promo-text">
                <strong>{p.title}</strong>
                <span>{p.sub}</span>
                <u>Смотреть подборку ↗</u>
              </span>
            </Link>
          ))}
        </section>

        <section className="advantages">
          <div className="wrap advantages-inner">
            <div>
              <span className="adv-icon">◇</span>
              <strong>Внимание к деталям</strong>
              <p>Украшения с продуманным характером</p>
            </div>
            <div>
              <span className="adv-icon">✧</span>
              <strong>Серебро 925</strong>
              <p>Лаконичная современная эстетика</p>
            </div>
            <div>
              <span className="adv-icon">↗</span>
              <strong>Ваши истории</strong>
              <p>Украшения, созвучные вам</p>
            </div>
          </div>
        </section>

        <section className="social-section wrap" data-home-block="6">
          <SectionHead kicker="БУДЕТ ДОПОЛНЕНО" title="Украшения в движении" />
          <p className="subhead">
            Сюда добавим настоящие видео инфлюенсеров. После загрузки центральный ролик будет
            автоматически воспроизводиться без звука.
          </p>
          <div className="social-rail" id="social-rail">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className={`social-card ${i === 3 ? "center" : ""}`}
                aria-label={`Концепция будущего видео ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ASSET}/models/model-${String(i + 1).padStart(2, "0")}.webp`}
                  alt={`Рекламный портрет модели ${i + 1} с серебряными украшениями`}
                  loading="lazy"
                />
                <span className="social-placeholder">ВИДЕО СКОРО</span>
              </div>
            ))}
          </div>
          <p className="social-note">
            Рекламные фотоконцепции будущей видеокарусели. Ролики появятся после загрузки материалов;
            изображения не привязаны к артикулам.
          </p>
        </section>

        <section className="journal wrap" data-home-block="7">
          <SectionHead
            kicker="СИНОНИМ · ЖУРНАЛ"
            title="Истории и вдохновение"
            href="/blog"
            text="В блог"
          />
          <div className="journal-grid">
            {JOURNAL.map((b) => (
              <Link key={b.title} className="journal-card" href={b.href}>
                <div className="journal-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image} alt={b.title} loading="eager" />
                </div>
                <span className="eyebrow">{b.tag}</span>
                <h3>{b.title}</h3>
                <span className="text-link">Читать ↗</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-grid">
          <div className="footer-brand">
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ASSET}/synonym-logo.png`} alt="СИНОНИМ" />
            </Link>
            <p>
              Простые ценности.
              <br />
              Инновационные технологии.
              <br />
              Высокое качество.
            </p>
          </div>
          <div>
            <h3>Каталог</h3>
            {NAV.slice(1, 6).map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label.charAt(0) + item.label.slice(1).toLowerCase()}
              </Link>
            ))}
          </div>
          <div>
            <h3>О нас</h3>
            <Link href="/about">О бренде</Link>
            <Link href="/blog">Блог</Link>
            <Link href="/about">Философия</Link>
            <Link href="/showroom">Шоурум</Link>
          </div>
          <div>
            <h3>Контакты</h3>
            <p>Шоурум в Москве. Украшения из серебра 925 с огранёнными синтетическими алмазами.</p>
            <Link className="footer-real-link" href="/shop">
              Смотреть каталог ↗
            </Link>
          </div>
        </div>
        <div className="wrap footer-line">
          <span>© SYNONYM</span>
          <span>
            <Link href="/privacy">Конфиденциальность</Link>
            {" · "}
            <Link href="/terms">Оферта</Link>
          </span>
        </div>
      </footer>

      {quickView ? (
        <div
          className="modal-overlay visible"
          role="dialog"
          aria-modal="true"
          aria-hidden="false"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickView(null);
          }}
        >
          <div className="modal-box">
            <button
              type="button"
              className="icon-btn modal-close"
              aria-label="Закрыть окно"
              onClick={() => setQuickView(null)}
            >
              ×
            </button>
            <div id="modal-content">
              <div className="quick-modal">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="product-image from-catalog"
                    src={quickView.image}
                    alt={quickView.name}
                  />
                </div>
                <div>
                  <span className="eyebrow">БЫСТРЫЙ ПРОСМОТР</span>
                  <h2>{quickView.name}</h2>
                  <p className="pdp-price">{formatPrice(quickView.price)}</p>
                  <p>Арт. {quickView.sku}</p>
                  <Link className="button filled" href={`/products/${quickView.slug}`}>
                    Выбрать изделие ↗
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
