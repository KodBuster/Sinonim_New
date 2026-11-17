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
  ASSET,
  BESTSELLER_ORDER,
  COLLECTIONS,
  FEATURED_ORDER,
  FEATURED_TABS,
  HERO_SLIDES,
  JOURNAL,
  PRODUCTS,
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
    link.href = "/redesign/site.css?v=social-loop-commit-1";
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

/** Навигация «линия + точка»: тонкая стрелка без квадрата */
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

/** Три копии ряда — бесшовный круг; центр и шов ведём через DOM, без React-моргания */
const SOCIAL_LOOP_COPIES = 3;
const SOCIAL_BASE_LEN = SOCIAL_VIDEOS.length;
const SOCIAL_MIDDLE_START = SOCIAL_BASE_LEN;
const SOCIAL_SEED_INDEX = SOCIAL_MIDDLE_START + 3;
const SOCIAL_SLIDES = Array.from({ length: SOCIAL_LOOP_COPIES }, (_, copy) =>
  SOCIAL_VIDEOS.map((video, baseIndex) => ({
    video,
    baseIndex,
    key: `${copy}-${baseIndex}`,
    index: copy * SOCIAL_BASE_LEN + baseIndex,
  })),
).flat();

type SocialProduct = { name: string; image: string; price: number; href: string };

/** Только отрисовать первый кадр, не трогая уже играющий ролик */
function paintFirstFrame(video: HTMLVideoElement) {
  if (!video.paused) return;
  const seek = () => {
    if (!video.paused) return;
    try {
      if (video.currentTime > 0.05) return;
      video.currentTime = 0.001;
    } catch {
      /* ignore */
    }
  };
  if (video.readyState >= 1) seek();
  else video.addEventListener("loadeddata", seek, { once: true });
}

/** Уход с ролика: пауза + первый кадр (статика). Seek только если нужно — дешевле на скролле */
function deactivateVideo(video: HTMLVideoElement) {
  if (!video.paused) video.pause();
  if (video.currentTime < 0.05) return;
  try {
    video.currentTime = 0.001;
  } catch {
    /* ignore */
  }
}

export function RedesignHome({ socialProducts }: { socialProducts: Record<string, SocialProduct> }) {
  useRedesignStyles();

  const [slide, setSlide] = useState(0);
  const [featuredTab, setFeaturedTab] = useState<(typeof FEATURED_TABS)[number]["id"]>("all");
  const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const featuredRail = useRef<HTMLDivElement>(null);
  const socialRail = useRef<HTMLDivElement>(null);
  const socialCenter = useRef<HTMLDivElement>(null);
  const socialVideos = useRef<(HTMLVideoElement | null)[]>([]);
  /** Абсолютный индекс карточки в центре — только ref, класс .center пишем в DOM */
  const activeSocialAbs = useRef(SOCIAL_SEED_INDEX);
  const activeSocialBase = useRef(SOCIAL_SEED_INDEX % SOCIAL_BASE_LEN);
  const [loadSocialVideos, setLoadSocialVideos] = useState(false);
  const [liveSocialProducts, setLiveSocialProducts] = useState<Record<string, SocialProduct>>();
  const touchX = useRef(0);
  const socialJumping = useRef(false);
  const socialSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ручная пауза на активном ролике — settle не должен снова жать play */
  const socialUserPaused = useRef(false);

  useEffect(() => {
    const rail = socialRail.current;
    if (!rail) return;
    const controller = new AbortController();
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setLoadSocialVideos(true);
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

  function socialCards(): HTMLElement[] {
    const rail = socialRail.current;
    if (!rail) return [];
    return [...rail.querySelectorAll<HTMLElement>(".social-card")];
  }

  function socialPeriodWidth(): number {
    const cards = socialCards();
    if (cards.length < SOCIAL_BASE_LEN + 1) return 0;
    return cards[SOCIAL_BASE_LEN].offsetLeft - cards[0].offsetLeft;
  }

  function nearestSocialIndex(): number {
    const rail = socialRail.current;
    const cards = socialCards();
    if (!rail || !cards.length) return activeSocialAbs.current;
    const mid = rail.getBoundingClientRect().left + rail.getBoundingClientRect().width / 2;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function markSocialCenter(absIndex: number) {
    socialCards().forEach((card, i) => {
      card.classList.toggle("center", i === absIndex);
    });
  }

  function toMiddleSocialAbs(absIndex: number) {
    return SOCIAL_MIDDLE_START + (absIndex % SOCIAL_BASE_LEN);
  }

  function isEdgeSocialAbs(absIndex: number) {
    return absIndex < SOCIAL_BASE_LEN || absIndex >= SOCIAL_BASE_LEN * 2;
  }

  /** На шве отключаем transition высоты — иначе .center прыгает на клон и «расширение» дёргается */
  function setSocialInstant(on: boolean) {
    const rail = socialRail.current;
    if (!rail) return;
    rail.classList.toggle("social-rail--instant", on);
    if (on) void rail.offsetWidth;
  }

  function scrollSocialCardToCenter(index: number, behavior: ScrollBehavior) {
    const rail = socialRail.current;
    const card = socialCards()[index];
    if (!rail || !card) return;
    const railRect = rail.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    rail.scrollBy({
      left: cardRect.left + cardRect.width / 2 - railRect.left - railRect.width / 2,
      behavior,
    });
  }

  /**
   * Активный ролик крутится loop с 1-го кадра.
   * Остальные — статика на 1-м кадре.
   * Тот же активный уже играет — не трогаем (иначе обрыв цикла).
   */
  function playSocialAt(absIndex: number) {
    const next = socialVideos.current[absIndex];
    const prevAbs = activeSocialAbs.current;
    const switching = absIndex !== prevAbs;
    const sameBase =
      switching && prevAbs % SOCIAL_BASE_LEN === absIndex % SOCIAL_BASE_LEN;
    const prev = socialVideos.current[prevAbs];

    socialVideos.current.forEach((other, i) => {
      if (!other || i === absIndex) return;
      if (sameBase && i === prevAbs) {
        other.pause();
        return;
      }
      deactivateVideo(other);
    });

    if (!next) {
      socialUserPaused.current = false;
      return;
    }

    // Тот же слот уже играет по кругу — не перезапускать
    if (!switching && !next.paused) return;
    // Ручная пауза на активном
    if (!switching && socialUserPaused.current) return;

    if (switching) {
      socialUserPaused.current = false;
      if (sameBase && prev && Number.isFinite(prev.currentTime)) {
        try {
          next.currentTime = prev.currentTime;
        } catch {
          /* ignore */
        }
      } else {
        try {
          next.currentTime = 0.001;
        } catch {
          /* ignore */
        }
      }
    }

    void next.play().catch(() => {});
  }

  function applySocialCenter(absIndex: number, opts?: { play?: boolean }) {
    markSocialCenter(absIndex);
    if (opts?.play !== false) playSocialAt(absIndex);
    activeSocialAbs.current = absIndex;
    activeSocialBase.current = absIndex % SOCIAL_BASE_LEN;
  }

  /** Во время свайпа только пауза соседей; сброс на 1-й кадр — в settle/playSocialAt */
  function pauseSocialExcept(absIndex: number) {
    socialVideos.current.forEach((other, i) => {
      if (!other || i === absIndex) return;
      if (!other.paused) other.pause();
    });
  }

  /** Держим скролл в средней копии сдвигом на ширину периода — без смены «картинки» */
  function normalizeSocialLoop() {
    const rail = socialRail.current;
    if (!rail || socialJumping.current) return nearestSocialIndex();

    let best = nearestSocialIndex();
    const period = socialPeriodWidth();
    if (period <= 0) return best;

    const shift = (delta: number) => {
      socialJumping.current = true;
      const snap = rail.style.scrollSnapType;
      rail.style.scrollSnapType = "none";
      rail.scrollLeft += delta;
      void rail.offsetWidth;
      rail.style.scrollSnapType = snap;
      socialJumping.current = false;
    };

    if (best < SOCIAL_BASE_LEN) {
      shift(period);
      best += SOCIAL_BASE_LEN;
    } else if (best >= SOCIAL_BASE_LEN * 2) {
      shift(-period);
      best -= SOCIAL_BASE_LEN;
    }
    return best;
  }

  function selectSocialVideo(absIndex: number) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const video = socialVideos.current[absIndex];

    // Повторный тап по центру — пауза / продолжить (без сброса на первый кадр)
    if (absIndex === activeSocialAbs.current) {
      if (!video) return;
      if (video.paused) {
        socialUserPaused.current = false;
        void video.play().catch(() => {});
      } else {
        socialUserPaused.current = true;
        video.pause();
      }
      return;
    }

    // Тап по другой карточке — короткий путь; уход сбросит предыдущий на 1-й кадр
    socialUserPaused.current = false;
    scrollSocialCardToCenter(absIndex, reduce ? "instant" : "smooth");
    applySocialCenter(absIndex);
  }

  /**
   * Шов только на полной остановке скролла (не в жесте!).
   * Прыжок scrollLeft во время драга даёт затык «после шва» и ломает плавную высоту.
   */
  function remapSocialSeamQuiet(rawEdgeIndex: number): number {
    const target = toMiddleSocialAbs(rawEdgeIndex);
    setSocialInstant(true);
    markSocialCenter(target);
    const best = normalizeSocialLoop();
    const finalIndex = isEdgeSocialAbs(best) ? target : best;
    activeSocialAbs.current = finalIndex;
    activeSocialBase.current = finalIndex % SOCIAL_BASE_LEN;
    void socialRail.current?.offsetWidth;
    requestAnimationFrame(() => setSocialInstant(false));
    return finalIndex;
  }

  const settleSocialRail = useCallback(() => {
    if (socialJumping.current) return;

    let raw = nearestSocialIndex();
    if (isEdgeSocialAbs(raw)) {
      raw = remapSocialSeamQuiet(raw);
    } else {
      markSocialCenter(raw);
      activeSocialAbs.current = raw;
      activeSocialBase.current = raw % SOCIAL_BASE_LEN;
    }

    const target = raw;
    requestAnimationFrame(() => {
      playSocialAt(target);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- логика на refs
  }, []);

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
      applySocialCenter(SOCIAL_SEED_INDEX);
    });
    observer.observe(rail);
    observer.observe(center);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadSocialVideos) return;
    playSocialAt(activeSocialAbs.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- логика на refs
  }, [loadSocialVideos]);

  useEffect(() => {
    const rail = socialRail.current;
    if (!rail) return;

    const onScroll = () => {
      if (socialJumping.current) return;

      // В жесте только плавный .center — шов НЕ трогаем (иначе затык и «тыр-тыр»)
      const raw = nearestSocialIndex();
      if (raw !== activeSocialAbs.current) {
        markSocialCenter(raw);
        pauseSocialExcept(raw);
        activeSocialAbs.current = raw;
        activeSocialBase.current = raw % SOCIAL_BASE_LEN;
      }

      if (socialSettleTimer.current) clearTimeout(socialSettleTimer.current);
      // Чуть дольше ждём полной остановки, потом тихий шов + play
      socialSettleTimer.current = setTimeout(settleSocialRail, 220);
    };

    rail.addEventListener("scroll", onScroll, { passive: true });
    rail.addEventListener("scrollend", settleSocialRail);
    return () => {
      rail.removeEventListener("scroll", onScroll);
      rail.removeEventListener("scrollend", settleSocialRail);
      if (socialSettleTimer.current) clearTimeout(socialSettleTimer.current);
    };
  }, [settleSocialRail]);

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
          <div className="hero-controls">
            <button
              type="button"
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
              <h2 id="featured-products-title">Товары СИНОНИМ</h2>
              <p>
                Украшения, которые становятся частью вашей истории. Подборка настоящих изделий из
                каталога.
              </p>
            </div>
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
          <div ref={socialRail} className="social-rail" id="social-rail">
            {SOCIAL_SLIDES.map((slideItem) => {
              const { video, baseIndex, key, index: i } = slideItem;
              const product = video ? (liveSocialProducts?.[video.article] ?? socialProducts[video.article]) : undefined;
              const isCenterSeed = i === SOCIAL_SEED_INDEX;
              return (
                <div
                  key={key}
                  ref={isCenterSeed ? socialCenter : undefined}
                  className={`social-card${isCenterSeed ? " center" : ""}`}
                  data-social-index={i}
                  aria-label={video ? undefined : `Концепция будущего видео ${baseIndex + 1}`}
                >
                  <div className="social-card-media">
                    {video ? (
                      <>
                        <video
                          ref={(element) => {
                            socialVideos.current[i] = element;
                            if (element) paintFirstFrame(element);
                          }}
                          src={loadSocialVideos ? video.src : undefined}
                          className="social-card-video"
                          preload="auto"
                          muted
                          loop
                          playsInline
                          onLoadedMetadata={(e) => paintFirstFrame(e.currentTarget)}
                          onLoadedData={(e) => paintFirstFrame(e.currentTarget)}
                        />
                        <button
                          type="button"
                          className="social-card-hit"
                          aria-label={`Видео ${baseIndex + 1}: воспроизвести или пауза`}
                          onClick={() => selectSocialVideo(i)}
                        />
                      </>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${ASSET}/models/model-${String(baseIndex + 1).padStart(2, "0")}.webp`}
                          alt={`Рекламный портрет модели ${baseIndex + 1} с серебряными украшениями`}
                          loading="lazy"
                        />
                        <span className="social-placeholder">ВИДЕО СКОРО</span>
                        <button
                          type="button"
                          className="social-card-hit"
                          aria-label={`Показать карточку ${baseIndex + 1} в центре`}
                          onClick={() => selectSocialVideo(i)}
                        />
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
                  ) : (
                    <div className="social-product-spacer" aria-hidden="true" />
                  )}
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
