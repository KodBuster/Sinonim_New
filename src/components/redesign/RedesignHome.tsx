"use client";

import Link from "next/link";
import { ProductImage } from "@/components/catalog/ProductImage";
import { formatPrice } from "@/lib/products";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/checkout";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Header } from "@/components/Header";
import {
  ASSET,
  BESTSELLER_ORDER,
  COLLECTIONS,
  FEATURED_ORDER,
  HERO_SLIDES,
  JOURNAL,
  PROMOS,
  productsByIds,
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
      document.head.appendChild(link);
    }
    link.href = "/redesign/site.css?v=store-benefits-3";
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
  title,
  href,
  text,
}: {
  title: string;
  href?: string;
  text?: string;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {href && text ? (
        <Link className="text-link" href={href}>
          {text} ↗
        </Link>
      ) : null}
    </div>
  );
}

const SOCIAL_VIDEOS = [
  null,
  null,
  { src: "/images/braslet_video_6.mp4", article: "194-030210-11" },
  { src: "/images/braslet_video_3.mp4", article: "194-030210-1" },
  { src: "/images/braslet_video_7.mp4", article: "194-032002-5" },
  null,
  null,
  null,
];

type SocialProduct = { name: string; image: string; price: number; href: string };

export function RedesignHome({ socialProducts }: { socialProducts: Record<string, SocialProduct> }) {
  useRedesignStyles();

  const [slide, setSlide] = useState(0);
  const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const featuredRail = useRef<HTMLDivElement>(null);
  const socialRail = useRef<HTMLDivElement>(null);
  const socialCenter = useRef<HTMLDivElement>(null);
  const socialVideos = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeSocialVideo, setActiveSocialVideo] = useState(3);
  const touchX = useRef(0);

  function selectSocialVideo(index: number) {
    const rail = socialRail.current;
    const video = socialVideos.current[index];
    if (!rail || !video) return;

    if (index === activeSocialVideo) {
      if (video.paused) void video.play().catch(() => {});
      else video.pause();
      return;
    }

    socialVideos.current.forEach((other) => {
      if (other !== video) other?.pause();
    });
    setActiveSocialVideo(index);
    const card = video.parentElement!.getBoundingClientRect();
    const viewport = rail.getBoundingClientRect();
    rail.scrollBy({
      left: card.left + card.width / 2 - viewport.left - viewport.width / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    void video.play().catch(() => {});
  }

  useEffect(() => {
    const rail = socialRail.current;
    const center = socialCenter.current;
    if (!rail || !center) return;
    const observer = new ResizeObserver(() => {
      if (!getComputedStyle(rail).getPropertyValue("--social-card-width").trim()) return;
      const railRect = rail.getBoundingClientRect();
      const cardRect = center.getBoundingClientRect();
      rail.scrollLeft += cardRect.left + cardRect.width / 2 - railRect.left - railRect.width / 2;
      observer.disconnect();
    });
    observer.observe(rail);
    observer.observe(center);
    return () => observer.disconnect();
  }, []);

  const featuredProducts = useMemo(() => productsByIds(FEATURED_ORDER), []);

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
      <Header overlay />

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
              <h2 id="featured-products-title">Что сегодня выберите?</h2>
            </div>
          </div>
          <div className="featured-products-controls">
            <div className="featured-arrows ml-auto">
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
          >
            <div
              className="cards-scroll featured-products-track"
              id="featured-products-scroll"
              ref={featuredRail}
            >
              {featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
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
              <img src={c.photo} alt="" loading="lazy" />
              <span className="category-tile-copy">
                <span className="category-tile-slogan">{c.slogan}</span>
                <span className="category-tile-name">{c.name} <span aria-hidden="true">↗</span></span>
              </span>
            </Link>
          ))}
        </section>

        <section className="bestsellers wrap" data-home-block="4">
          <SectionHead title="Бестселлеры" />
          <div className="cards-scroll" id="bestseller-scroll">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} />
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
          <SectionHead title="Украшения в движении" />
          <div ref={socialRail} className="social-rail" id="social-rail">
            {SOCIAL_VIDEOS.map((video, i) => {
              const product = video ? socialProducts[video.article] : undefined;
              return (
                <div
                  key={i}
                  ref={i === 3 ? socialCenter : undefined}
                  className={`social-card ${i === activeSocialVideo ? "center" : ""}`}
                  aria-label={video ? undefined : `Концепция будущего видео ${i + 1}`}
                >
                  <div className="social-card-media">
                    {video ? (
                      <>
                        <video
                          ref={(element) => { socialVideos.current[i] = element; }}
                          src={video.src}
                          className="block h-full w-full object-cover"
                          autoPlay={i === 3 && activeSocialVideo === 3}
                          preload="metadata"
                          muted
                          loop
                          playsInline
                        />
                        <button
                          type="button"
                          className="absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
                          aria-label={i === activeSocialVideo ? "Пауза или воспроизведение текущего видео" : `Воспроизвести видео ${i - 1} в центре`}
                          onClick={() => selectSocialVideo(i)}
                        />
                      </>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${ASSET}/models/model-${String(i + 1).padStart(2, "0")}.webp`}
                          alt={`Рекламный портрет модели ${i + 1} с серебряными украшениями`}
                          loading="lazy"
                        />
                        <span className="social-placeholder">ВИДЕО СКОРО</span>
                      </>
                    )}
                  </div>
                  {product ? (
                    <Link className="social-product" href={product.href}>
                      <span className="social-product-image">
                        <ProductImage src={product.image} alt="" fill sizes="56px" className="object-contain" />
                      </span>
                      <span className="social-product-copy">
                        <span className="social-product-name">{product.name}</span>
                        <span>{formatPrice(product.price)}</span>
                      </span>
                    </Link>
                  ) : <div className="social-product-spacer" aria-hidden="true" />}
                </div>
              );
              })}
          </div>
        </section>

        <nav className="store-benefits" aria-label="Гарантия, доставка и возврат">
          <Link href="/warranty">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="19" r="15" />
              <circle cx="24" cy="19" r="10" />
              <path d="m19 19 3 3 7-7M13 30l-5 13 8-3 4 5 4-11m11-4 5 13-8-3-4 5-4-11" />
            </svg>
            <span>Гарантия 2 года</span>
          </Link>
          <Link href="/shipping">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path d="M11 13h19l-4 19h-9m12-14h7l7 8-1 6h-5m-8 0h-3M4 19h12m-9 6h8m-13 6h7" />
              <circle cx="13" cy="32" r="4" /><circle cx="33" cy="32" r="4" />
            </svg>
            <span>Бесплатная доставка от {formatPrice(FREE_DELIVERY_THRESHOLD)}</span>
          </Link>
          <Link href="/terms">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path d="M10 25V12l6-6h19l6 6v25H27M10 12h31M21 17h9M15 28l-11 8 11 8v-5h12v-6H15z" />
            </svg>
            <span>Возврат и обмен</span>
          </Link>
        </nav>

        <section className="journal wrap" data-home-block="7">
          <SectionHead
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

    </div>
  );
}
