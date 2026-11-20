"use client";

import Link from "next/link";
import Image from "next/image";
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
  BESTSELLER_ORDER,
  COLLECTIONS,
  FEATURED_ORDER,
  HERO_SLIDES,
  JOURNAL,
  PROMOS,
  productsByIds,
} from "./data";
import { ProductCard } from "./ProductCard";

function Picture({
  desktop,
  mobile,
  alt,
  priority = false,
  className = "",
}: {
  desktop: string;
  mobile: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <picture className={className}>
      <source media="(max-width:680px)" srcSet={mobile} />
      <img src={desktop} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "low"} />
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
          {text}
        </Link>
      ) : null}
    </div>
  );
}

/** Тонкая стрелка «линия + наконечник» — как раньше, не скобки ‹ › */
function LineArrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg className="nav-line-icon" viewBox="0 0 28 12" fill="none" aria-hidden="true">
      {dir === "prev" ? (
        <path
          d="M8 1 2 6l6 5M2 6h24"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="m20 1 6 5-6 5M2 6h24"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

const SOCIAL_VIDEOS: { src: string; article?: string }[] = [
  { src: "/images/new1_live.mp4" },
  { src: "/images/braslet_video_6.mp4", article: "194-030210-11" },
  { src: "/images/braslet_video_3.mp4", article: "194-030210-1" },
  { src: "/images/braslet_video_7.mp4", article: "194-032002-5" },
  { src: "/images/new2_live.mp4" },
  { src: "/images/new3_live.mp4" },
];
const SOCIAL_VIDEO_COUNT = SOCIAL_VIDEOS.length;
const INITIAL_SOCIAL_VIDEO = SOCIAL_VIDEO_COUNT + 2;
const SOCIAL_LOOP_VIDEOS = Array.from({ length: 3 }, () => SOCIAL_VIDEOS).flat();

type SocialProduct = { name: string; image: string; price: number; href: string };

export function RedesignHome({ socialProducts }: { socialProducts: Record<string, SocialProduct> }) {
  const [slide, setSlide] = useState(0);
  const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const featuredRail = useRef<HTMLDivElement>(null);
  const socialRail = useRef<HTMLDivElement>(null);
  const socialCards = useRef<(HTMLDivElement | null)[]>([]);
  const socialVideos = useRef<(HTMLVideoElement | null)[]>([]);
  const activeSocialVideoRef = useRef(INITIAL_SOCIAL_VIDEO);
  const socialScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socialNavigating = useRef(false);
  const [liveSocialProducts, setLiveSocialProducts] = useState<Record<string, SocialProduct>>();
  const [activeSocialVideo, setActiveSocialVideo] = useState(INITIAL_SOCIAL_VIDEO);
  const socialTouch = useRef<{ x: number; y: number } | null>(null);
  const suppressSocialClick = useRef(false);
  const touchX = useRef(0);

  useEffect(() => {
    const rail = socialRail.current;
    if (!rail) return;
    const controller = new AbortController();
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      fetch("/api/home-social-products", { signal: controller.signal })
        .then(async (response) => {
          if (response.ok) setLiveSocialProducts(await response.json());
        })
        .catch(() => {});
    }, { rootMargin: "200px" });
    observer.observe(rail);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, []);

  const activateSocialVideo = useCallback((index: number) => {
    const video = socialVideos.current[index];
    const previousIndex = activeSocialVideoRef.current;
    if (!video || index === previousIndex) return;
    const previous = socialVideos.current[previousIndex];
    const sameVideo = index % SOCIAL_VIDEO_COUNT === previousIndex % SOCIAL_VIDEO_COUNT;
    const paused = sameVideo && previous ? previous.paused : false;
    if (sameVideo && previous) {
      try { video.currentTime = previous.currentTime; } catch { /* Metadata may still be loading. */ }
    }
    socialVideos.current.forEach((other) => {
      if (other !== video) other?.pause();
    });
    activeSocialVideoRef.current = index;
    setActiveSocialVideo(index);
    if (!paused) void video.play().catch(() => {});
  }, []);

  const rebaseSocialVideo = useCallback((index: number) => {
    const rail = socialRail.current;
    const middleIndex = SOCIAL_VIDEO_COUNT + index % SOCIAL_VIDEO_COUNT;
    const card = socialCards.current[index];
    const middleCard = socialCards.current[middleIndex];
    if (!rail || !card || !middleCard) return index;
    if (index !== middleIndex) {
      const shift = middleCard.offsetLeft - card.offsetLeft;
      activateSocialVideo(middleIndex);
      rail.scrollTo({ left: rail.scrollLeft + shift, behavior: "instant" });
    } else {
      activateSocialVideo(index);
    }
    return middleIndex;
  }, [activateSocialVideo]);

  const settleSocialRail = useCallback(() => {
    const rail = socialRail.current;
    if (!rail) return;
    const viewport = rail.getBoundingClientRect();
    const center = viewport.left + viewport.width / 2;
    let closest = activeSocialVideoRef.current;
    let distance = Infinity;
    socialCards.current.forEach((card, index) => {
      if (!card) return;
      const bounds = card.getBoundingClientRect();
      const nextDistance = Math.abs(bounds.left + bounds.width / 2 - center);
      if (nextDistance < distance) { distance = nextDistance; closest = index; }
    });
    rebaseSocialVideo(closest);
  }, [rebaseSocialVideo]);

  const handleSocialScroll = useCallback(() => {
    if (!socialNavigating.current) settleSocialRail();
    if (socialScrollTimer.current) clearTimeout(socialScrollTimer.current);
    socialScrollTimer.current = setTimeout(() => {
      socialNavigating.current = false;
      settleSocialRail();
    }, 180);
  }, [settleSocialRail]);

  function selectSocialVideo(index: number) {
    const rail = socialRail.current;
    const video = socialVideos.current[index];
    const card = socialCards.current[index];
    if (!rail || !video || !card) return;
    if (index === activeSocialVideoRef.current) {
      if (video.paused) void video.play().catch(() => {});
      else video.pause();
      return;
    }
    socialNavigating.current = true;
    activateSocialVideo(index);
    const bounds = card.getBoundingClientRect();
    const viewport = rail.getBoundingClientRect();
    rail.scrollTo({
      left: rail.scrollLeft + bounds.left + bounds.width / 2 - viewport.left - viewport.width / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    handleSocialScroll();
  }

  function stepSocialVideo(direction: 1 | -1) {
    const current = rebaseSocialVideo(activeSocialVideoRef.current);
    selectSocialVideo(current + direction);
  }

  useEffect(() => {
    const rail = socialRail.current;
    if (!rail) return;
    const observer = new ResizeObserver(() => {
      const center = socialCards.current[activeSocialVideoRef.current];
      if (!center) return;
      if (!getComputedStyle(rail).getPropertyValue("--social-card-width").trim()) return;
      const railRect = rail.getBoundingClientRect();
      const cardRect = center.getBoundingClientRect();
      rail.scrollTo({ left: rail.scrollLeft + cardRect.left + cardRect.width / 2 - railRect.left - railRect.width / 2, behavior: "instant" });
    });
    observer.observe(rail);
    return () => {
      observer.disconnect();
      if (socialScrollTimer.current) clearTimeout(socialScrollTimer.current);
    };
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
                  priority={i === 0}
                  className="hero-photo"
                />
                <div className="hero-shade" />
                <div className="hero-copy wrap">
                  <span className="hero-kicker">{s.eyebrow}</span>
                  <h1>{s.title}</h1>
                  <p>{s.description}</p>
                  <Link className="hero-cta" href={s.href}>
                    {s.cta}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {/* Десктоп: тонкие стрелки без кружков + точки; мобилка — только точки */}
          <div className="hero-controls">
            <button
              type="button"
              className="hero-nav-arrow"
              aria-label="Предыдущий баннер"
              onClick={() => {
                setSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
                startHero();
              }}
            >
              <LineArrow dir="prev" />
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
              className="hero-nav-arrow"
              aria-label="Следующий баннер"
              onClick={() => {
                setSlide((prev) => (prev + 1) % HERO_SLIDES.length);
                startHero();
              }}
            >
              <LineArrow dir="next" />
            </button>
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
              <h2 id="featured-products-title">Вот оно. Ваше.</h2>
            </div>
            <div className="featured-products-controls">
              <div className="featured-arrows ml-auto">
                <button
                  type="button"
                  aria-label="Предыдущие товары"
                  onClick={() => stepFeatured(-1)}
                >
                  <LineArrow dir="prev" />
                </button>
                <button
                  type="button"
                  aria-label="Следующие товары"
                  onClick={() => stepFeatured(1)}
                >
                  <LineArrow dir="next" />
                </button>
              </div>
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
              <Image src={c.photo} alt="" fill sizes="(max-width: 960px) 50vw, 25vw" />
              <span className="category-tile-copy">
                <span className="category-tile-slogan">{c.slogan}</span>
                <span className="category-tile-name">{c.name}</span>
              </span>
            </Link>
          ))}
        </section>

        <section className="bestsellers wrap" data-home-block="4">
          <div className="bestsellers-header">
            <SectionHead title="Бестселлеры" />
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
                <LineArrow dir="prev" />
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
                <LineArrow dir="next" />
              </button>
            </div>
          </div>
          <div className="cards-scroll" id="bestseller-scroll">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
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
                <u>Смотреть подборку</u>
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
          <div
            ref={socialRail}
            className="social-rail"
            id="social-rail"
            tabIndex={0}
            role="region"
            aria-label="Видео украшений. Используйте стрелки влево и вправо для перелистывания"
            onScroll={handleSocialScroll}
            onWheel={() => { socialNavigating.current = false; }}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              stepSocialVideo(event.key === "ArrowRight" ? 1 : -1);
            }}
            onTouchStart={(event) => {
              if (!window.matchMedia("(max-width: 680px)").matches) return;
              const touch = event.touches[0];
              suppressSocialClick.current = false;
              socialTouch.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
            }}
            onTouchEnd={(event) => {
              const start = socialTouch.current;
              socialTouch.current = null;
              if (!start) return;
              const touch = event.changedTouches[0];
              const x = start.x - touch.clientX;
              const y = Math.abs(touch.clientY - start.y);
              if (Math.abs(x) <= Math.max(24, y)) return;
              suppressSocialClick.current = true;
              stepSocialVideo(x > 0 ? 1 : -1);
            }}
            onTouchCancel={() => { socialTouch.current = null; }}
            onClickCapture={(event) => {
              if (!suppressSocialClick.current || event.detail === 0) return;
              suppressSocialClick.current = false;
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {SOCIAL_LOOP_VIDEOS.map((video, i) => {
              const product = video.article ? liveSocialProducts?.[video.article] ?? socialProducts[video.article] : undefined;
              return (
                <div
                  key={i}
                  ref={(element) => { socialCards.current[i] = element; }}
                  className={`social-card ${i === activeSocialVideo ? "center" : ""}`}
                >
                  <div className="social-card-media">
                    <video
                      ref={(element) => { socialVideos.current[i] = element; }}
                      src={video.src}
                      poster={video.src.replace(/\.mp4$/i, "-frame.png")}
                      className="block h-full w-full object-cover"
                      autoPlay={i === INITIAL_SOCIAL_VIDEO}
                      preload={i === INITIAL_SOCIAL_VIDEO ? "auto" : "metadata"}
                      muted
                      loop
                      playsInline
                    />
                    <button
                      type="button"
                      className="absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
                      aria-label={i === activeSocialVideo ? "Пауза или воспроизведение текущего видео" : `Воспроизвести видео ${i % SOCIAL_VIDEO_COUNT + 1} в центре`}
                      onClick={() => selectSocialVideo(i)}
                    />
                  </div>
                  {product ? (
                    <Link className="social-product" href={product.href}>
                      <span className="social-product-image">
                        <ProductImage src={product.image} alt="" fill sizes="56px" className="object-contain" />
                      </span>
                      <span className="social-product-copy">
                        <span className="social-product-name product-preview-title" title={product.name}>{product.name}</span>
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
                  <img src={b.image} alt={b.title} loading="lazy" />
                </div>
                <span className="eyebrow">{b.tag}</span>
                <h3>{b.title}</h3>
                <span className="text-link">Читать</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

    </div>
  );
}
