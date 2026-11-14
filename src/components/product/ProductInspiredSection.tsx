"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProductImage } from "@/components/catalog/ProductImage";
import { formatPrice } from "@/lib/products";
import { useProductSelection } from "./ProductSelectionContext";

/** Temporary Missoma PDP placeholders — replace with own videos later. */
const PLACEHOLDER_VIDEOS = [
  "https://cdn.shopify.com/videos/c/vp/4db180d519c54474b97b4a1e0adf8fcd/4db180d519c54474b97b4a1e0adf8fcd.SD-480p-1.5Mbps-90104591.mp4",
  "https://cdn.shopify.com/videos/c/vp/ee2ec5f074ee4d14be5e99e1eea79ee4/ee2ec5f074ee4d14be5e99e1eea79ee4.SD-480p-1.5Mbps-96026792.mp4",
  "https://cdn.shopify.com/videos/c/vp/3f16b74a96c1430ab10ca4de2eae7108/3f16b74a96c1430ab10ca4de2eae7108.SD-480p-1.5Mbps-86259426.mp4",
  "https://cdn.shopify.com/videos/c/vp/b0778c3b3f1e4ff59e44fee54a4e87a5/b0778c3b3f1e4ff59e44fee54a4e87a5.SD-480p-1.5Mbps-88101771.mp4",
  "https://cdn.shopify.com/videos/c/vp/df48c8846afa438c8528c3b79ccecd80/df48c8846afa438c8528c3b79ccecd80.SD-480p-1.5Mbps-96026916.mp4",
  "https://cdn.shopify.com/videos/c/vp/94930e95e05642349e5966520c0227e7/94930e95e05642349e5966520c0227e7.SD-480p-1.5Mbps-90102050.mp4",
] as const;

const PRODUCT_CARD_DELAY_MS = 1000;

type InspiredProduct = {
  name: string;
  image: string;
  price: number;
};

function IconMute({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg className="size-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M11 5 6 9H3v6h3l5 4V5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="m16 9.5 4 4m0-4-4 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className="size-[22px]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 5 6 9H3v6h3l5 4V5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InspiredVideoModal({
  videos,
  startIndex,
  product,
  onClose,
}: {
  videos: readonly string[];
  startIndex: number;
  product: InspiredProduct;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const scrollingTo = useRef<number | null>(null);
  const [index, setIndex] = useState(startIndex);
  const [showProductCard, setShowProductCard] = useState(false);
  const [muted, setMuted] = useState(true);

  const scrollToIndex = useCallback(
    (next: number, behavior: ScrollBehavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el) return;
      const clamped = ((next % videos.length) + videos.length) % videos.length;
      scrollingTo.current = clamped;
      setIndex(clamped);
      el.scrollTo({ top: clamped * el.clientHeight, behavior });
      window.setTimeout(() => {
        if (scrollingTo.current === clamped) scrollingTo.current = null;
      }, behavior === "smooth" ? 520 : 0);
    },
    [videos.length],
  );

  const goPrev = useCallback(() => {
    const next = (index - 1 + videos.length) % videos.length;
    const wraps = index === 0 && next === videos.length - 1;
    scrollToIndex(next, wraps ? "auto" : "smooth");
  }, [index, videos.length, scrollToIndex]);

  const goNext = useCallback(() => {
    const next = (index + 1) % videos.length;
    const wraps = index === videos.length - 1 && next === 0;
    scrollToIndex(next, wraps ? "auto" : "smooth");
  }, [index, videos.length, scrollToIndex]);

  // Jump to startIndex once mounted
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: startIndex * el.clientHeight, behavior: "auto" });
  }, [startIndex]);

  // Сигнал странице: сдвиг колонки к карусели + запас для подписей в кнопках
  useEffect(() => {
    const panel = panelRef.current;
    let shiftFrame = 0;
    let instantClearTimer = 0;
    /** Зазор колонка↔карусель ≈ gap main↔thumbs (1rem) */
    const GALLERY_GAP_PX = 16;

    const syncCover = () => {
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const fromRight = Math.max(0, window.innerWidth - rect.left);
      document.documentElement.style.setProperty(
        "--inspired-video-cover",
        `${Math.round(fromRight)}px`,
      );
    };

    /** Реальный translateX сейчас (во время transition ≠ CSS-переменная) */
    const readActualTx = (el: HTMLElement) => {
      const raw = getComputedStyle(el).transform;
      if (!raw || raw === "none") return 0;
      try {
        return new DOMMatrixReadOnly(raw).m41;
      } catch {
        return 0;
      }
    };

    const syncBuyShift = () => {
      const gallery = document.querySelector<HTMLElement>("[data-product-gallery]");
      const buy = document.querySelector<HTMLElement>(".product-buy-column");
      if (!gallery || !buy) {
        document.documentElement.style.setProperty("--product-buy-shift", "0px");
        return;
      }

      const galleryRect = gallery.getBoundingClientRect();
      // Скрытая desktop-галерея на мобилке даёт нули — сдвиг не трогаем
      if (galleryRect.width < 8) {
        document.documentElement.style.setProperty("--product-buy-shift", "0px");
        return;
      }

      const desiredLeft = galleryRect.right + GALLERY_GAP_PX;
      // Покойная позиция = экранная минус фактический transform (не var!)
      const restLeft = buy.getBoundingClientRect().left - readActualTx(buy);
      const shift = Math.max(0, Math.round(restLeft - desiredLeft));
      document.documentElement.style.setProperty(
        "--product-buy-shift",
        `${shift}px`,
      );
    };

    const syncAll = () => {
      syncCover();
      syncBuyShift();
    };

    /** Ресайз: без transition, иначе набегает ошибка и колонка уезжает на карусель */
    const syncAllInstant = () => {
      document.documentElement.setAttribute("data-inspired-shift-instant", "");
      syncAll();
      window.clearTimeout(instantClearTimer);
      instantClearTimer = window.setTimeout(() => {
        document.documentElement.removeAttribute("data-inspired-shift-instant");
      }, 120);
    };

    // Сначала цифры сдвига, на следующем кадре — атрибут (чтобы сыграл transition)
    syncAll();
    shiftFrame = window.requestAnimationFrame(() => {
      shiftFrame = window.requestAnimationFrame(() => {
        document.body.setAttribute("data-inspired-video-open", "");
      });
    });

    const gallery = document.querySelector<HTMLElement>("[data-product-gallery]");
    const buy = document.querySelector<HTMLElement>(".product-buy-column");
    const observer = new ResizeObserver(syncAllInstant);
    if (panel) observer.observe(panel);
    if (gallery) observer.observe(gallery);
    if (buy) observer.observe(buy);
    window.addEventListener("resize", syncAllInstant);

    return () => {
      window.cancelAnimationFrame(shiftFrame);
      window.clearTimeout(instantClearTimer);
      observer.disconnect();
      window.removeEventListener("resize", syncAllInstant);
      document.body.removeAttribute("data-inspired-video-open");
      document.documentElement.removeAttribute("data-inspired-shift-instant");
      document.documentElement.style.removeProperty("--inspired-video-cover");
      document.documentElement.style.removeProperty("--product-buy-shift");
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        goPrev();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    setShowProductCard(false);
    const timer = window.setTimeout(() => {
      setShowProductCard(true);
    }, PRODUCT_CARD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [index]);

  // Sync active video playback + mute
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      video.muted = muted;
      if (i === index) {
        void video.play().catch(() => {
          if (!video.muted) {
            video.muted = true;
            setMuted(true);
            void video.play().catch(() => {});
          }
        });
      } else {
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          // ignore seek errors while loading
        }
      }
    });
  }, [index, muted]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const updateFromScroll = () => {
      if (scrollingTo.current != null) return;
      const height = el.clientHeight || 1;
      const next = Math.round(el.scrollTop / height);
      if (next >= 0 && next < videos.length && next !== index) {
        setIndex(next);
      }
    };

    el.addEventListener("scroll", updateFromScroll, { passive: true });
    return () => el.removeEventListener("scroll", updateFromScroll);
  }, [index, videos.length]);

  const handleEnded = useCallback(() => {
    goNext();
  }, [goNext]);

  const handleBuy = () => {
    onClose();
    // Ждём сдвиг колонки после закрытия видео, затем вспышка «В корзину»
    window.setTimeout(() => {
      const button = document.querySelector<HTMLButtonElement>(
        ".product-buy-column [data-add-to-cart]",
      );
      if (!button) return;
      button.scrollIntoView({ behavior: "smooth", block: "center" });
      button.focus({ preventScroll: true });
      button.classList.remove("cart-btn-attention");
      void button.offsetWidth;
      button.classList.add("cart-btn-attention");
      window.setTimeout(() => {
        button.classList.remove("cart-btn-attention");
      }, 1500);
    }, 480);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    const video = videoRefs.current[index];
    if (video) {
      video.muted = next;
      if (!next) {
        void video.play().catch(() => {
          video.muted = true;
          setMuted(true);
        });
      }
    }
  };

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр видео"
    >
      <div
        ref={panelRef}
        className="pointer-events-auto absolute top-[calc(var(--site-header-height,4rem)+0.75rem)] right-3 overflow-hidden rounded-2xl bg-black shadow-[0_12px_40px_rgba(0,0,0,0.28)] sm:right-4 md:right-6"
        style={{
          height: "calc(100dvh - var(--site-header-height, 4rem) - 1.5rem)",
          width:
            "min(100vw - 1.5rem, calc((100dvh - var(--site-header-height, 4rem) - 1.5rem) * 9 / 16))",
          maxHeight: "calc(100dvh - var(--site-header-height, 4rem) - 1.5rem)",
        }}
      >
        <div
          ref={scrollerRef}
          className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {videos.map((src, i) => (
            <div
              key={src}
              className="relative h-full w-full shrink-0 snap-start snap-always"
            >
              <video
                ref={(node) => {
                  videoRefs.current[i] = node;
                }}
                src={src}
                className="h-full w-full object-cover"
                muted={muted}
                playsInline
                preload={Math.abs(i - index) <= 1 ? "auto" : "metadata"}
                controls={false}
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                onEnded={i === index ? handleEnded : undefined}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-3.5 left-3.5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white transition-opacity hover:bg-black/55"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M18 6 6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="absolute top-1/2 right-3 z-20 flex -translate-y-1/2 flex-col gap-2.5">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Предыдущее видео"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white/90 transition-opacity hover:bg-black/50 hover:text-white"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 14.5 12 8.5l6 6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Следующее видео"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white/90 transition-opacity hover:bg-black/50 hover:text-white"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 9.5l6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Включить звук" : "Выключить звук"}
          className="absolute top-3.5 right-3.5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white transition-opacity hover:bg-black/55"
        >
          <IconMute muted={muted} />
        </button>

        {showProductCard ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-black/45 px-3 py-3 backdrop-blur-[2px] sm:px-3.5 sm:py-3.5">
            <div className="pointer-events-auto flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-white sm:h-16 sm:w-16">
                <ProductImage
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm leading-snug text-white">
                  {product.name}
                </p>
                <p className="mt-0.5 text-sm font-medium text-white">
                  {formatPrice(product.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleBuy}
                className="shrink-0 rounded-md bg-white px-3.5 py-2 text-xs font-medium tracking-wide text-brand-olive-dark transition-opacity hover:opacity-90 sm:text-sm"
              >
                Купить
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function ProductInspiredSection({
  product,
}: {
  product: InspiredProduct;
}) {
  const { price } = useProductSelection();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const cardProduct = { ...product, price };

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateScrollState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 8);
    setCanScrollNext(el.scrollWidth - el.scrollLeft - el.clientWidth > 8);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, []);

  const scrollByCard = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-inspired-card]");
    const step = card ? card.offsetWidth + 12 : el.clientWidth * 0.7;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <div className="mt-10">
      <h2 className="font-heading text-xl text-brand-olive-dark md:text-[1.35rem]">
        Вдохновляйтесь
      </h2>

      <div className="relative mt-4">
        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {PLACEHOLDER_VIDEOS.map((src, index) => (
            <button
              key={src}
              type="button"
              data-inspired-card
              onClick={() => setActiveIndex(index)}
              aria-label={`Смотреть видео ${index + 1}`}
              className="relative aspect-[9/16] w-[calc((100%-2.25rem)/3.5)] shrink-0 overflow-hidden rounded-2xl bg-[#f5f4f1] text-left transition-opacity hover:opacity-90"
            >
              <video
                src={src}
                className="pointer-events-none h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
                aria-hidden
              />
            </button>
          ))}
        </div>

        {canScrollPrev ? (
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Предыдущие видео"
            className="absolute top-1/2 left-0 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-olive-dark shadow-sm transition-opacity hover:opacity-80"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}

        {canScrollNext ? (
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Следующие видео"
            className="absolute top-1/2 right-0 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-olive-dark shadow-sm transition-opacity hover:opacity-80"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {mounted && activeIndex != null ? (
        <InspiredVideoModal
          videos={PLACEHOLDER_VIDEOS}
          startIndex={activeIndex}
          product={cardProduct}
          onClose={() => setActiveIndex(null)}
        />
      ) : null}
    </div>
  );
}
