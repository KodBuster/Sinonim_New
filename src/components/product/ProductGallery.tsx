"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { ProductImage } from "@/components/catalog/ProductImage";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { useCart } from "@/context/CartContext";
import { trackAddToCart } from "@/lib/analytics/metrika";
import { formatPrice, type CategorySlug } from "@/lib/products";
import { galleryObjectFitForSrc } from "@/lib/product-media";
import { formatInsertMassLabel } from "@/lib/synthetic-diamond-labels";
import { useProductSelection } from "./ProductSelectionContext";

type GallerySlide =
  | { type: "image"; src: string }
  | { type: "video"; src: string };

type ProductGalleryProps = {
  images: string[];
  name: string;
  videoUrl?: string;
  slug: string;
  price: number;
  productImage: string;
  category: CategorySlug;
  stoneWeight: number;
  stoneLabel: string;
  inStock?: boolean;
};

type GalleryVideoProps = {
  src: string;
  label: string;
  className?: string;
  preload?: "auto" | "metadata";
  playing: boolean;
};

type GalleryLayoutProps = {
  slides: GallerySlide[];
  name: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  thumbClassName: string;
  mainClassName: string;
  mainObjectFit: "cover" | "contain";
  mainImageSizes: string;
  thumbImageSizes: string;
  mainPriority?: boolean;
  onMainClick?: () => void;
  thumbListClassName?: string;
  /** Missoma-style: thumbs column on the right of the main image */
  thumbsPosition?: "left" | "right";
};

function GalleryVideo({
  src,
  label,
  className = "",
  preload = "auto",
  playing,
}: GalleryVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;

    if (!playing) {
      video.pause();
      return;
    }

    const play = () => {
      const promise = video.play();
      if (promise) {
        promise.catch(() => {
          // Browser may block autoplay until interaction.
        });
      }
    };

    play();

    if (video.readyState < 2) {
      video.addEventListener("loadeddata", play, { once: true });
      return () => video.removeEventListener("loadeddata", play);
    }
  }, [src, playing]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      preload={preload}
      className={className}
      aria-label={label}
    />
  );
}

const THUMB_PAIR_GAP = 12;
const THUMB_LOOP_COPIES = 3;

type GalleryThumbnailsProps = {
  slides: GallerySlide[];
  name: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  thumbClassName: string;
  thumbImageSizes: string;
  isVideoActive: boolean;
  thumbListClassName?: string;
  /** Fixed viewport height for top-aligned snap scrolling (desktop PDP). */
  viewportHeight?: number | null;
  style?: CSSProperties;
};

function GalleryThumbnails({
  slides,
  name,
  activeIndex,
  onActiveIndexChange,
  thumbClassName,
  thumbImageSizes,
  isVideoActive,
  thumbListClassName = "max-h-full",
  viewportHeight = null,
  style,
}: GalleryThumbnailsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wheelLockRef = useRef(false);
  const initKeyRef = useRef<string | null>(null);

  // Окошко = высота главного кадра (верх↔низ вровень); стрелки снаружи
  const columnHeight =
    viewportHeight != null && viewportHeight > 0
      ? Math.round(viewportHeight)
      : null;
  const snapMode = columnHeight != null;
  const thumbHeight =
    columnHeight != null && columnHeight > THUMB_PAIR_GAP
      ? Math.floor((columnHeight - THUMB_PAIR_GAP) / 2)
      : null;
  const infinite = snapMode && slides.length > 1;
  const thumbWidth = thumbHeight != null ? thumbHeight * 0.75 : null;
  const stepSize =
    thumbHeight != null ? thumbHeight + THUMB_PAIR_GAP : null;
  // Шаг между началами соседних кадров = h+gap; один «круг» = n шагов
  // (не n*h+(n-1)*gap — иначе scrollTop попадает в щель и кадры съезжают вниз)
  const setHeight =
    stepSize != null && slides.length > 0 ? slides.length * stepSize : null;

  const loopSlides = useMemo(() => {
    if (!infinite) return slides;
    return Array.from({ length: THUMB_LOOP_COPIES }, () => slides).flat();
  }, [infinite, slides]);

  const normalizeLoop = useCallback(() => {
    const el = listRef.current;
    if (!el || !infinite || setHeight == null || setHeight <= 0) return;
    const top = el.scrollTop;
    if (top < setHeight * 0.5) {
      el.scrollTop = top + setHeight;
    } else if (top >= setHeight * 2.5) {
      el.scrollTop = top - setHeight;
    } else if (top < setHeight) {
      el.scrollTop = top + setHeight;
    } else if (top >= setHeight * 2) {
      el.scrollTop = top - setHeight;
    }
  }, [infinite, setHeight]);

  const scrollByStep = useCallback(
    (direction: 1 | -1) => {
      const el = listRef.current;
      if (!el || stepSize == null || stepSize <= 0 || wheelLockRef.current) {
        return;
      }

      const currentIndex = Math.round(el.scrollTop / stepSize);
      let target = (currentIndex + direction) * stepSize;
      if (infinite && setHeight != null && target >= setHeight * 2) {
        // Rebase before moving down: with two slides and an odd viewport height,
        // the browser's maximum scrollTop is 1px short of the lower loop boundary.
        el.scrollTop -= setHeight;
        target -= setHeight;
      }
      wheelLockRef.current = true;
      el.scrollTo({ top: target, behavior: "smooth" });
      window.setTimeout(() => {
        normalizeLoop();
        wheelLockRef.current = false;
      }, 320);
    },
    [infinite, setHeight, stepSize, normalizeLoop],
  );

  useEffect(() => {
    const el = listRef.current;
    if (!el || !infinite || setHeight == null) return;

    const initKey = `${slides.length}:${Math.round(setHeight)}`;
    if (initKeyRef.current === initKey) return;
    initKeyRef.current = initKey;
    el.scrollTop = setHeight;
  }, [infinite, setHeight, slides.length]);

  useEffect(() => {
    const root = rootRef.current;
    const el = listRef.current;
    if (!root || !el || !snapMode || stepSize == null || stepSize <= 0) return;

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 0.5 && Math.abs(event.deltaX) < 0.5) return;
      event.preventDefault();
      event.stopPropagation();
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;
      scrollByStep(delta > 0 ? 1 : -1);
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [snapMode, stepSize, scrollByStep]);

  if (slides.length <= 1) return null;

  return (
    <div
      ref={rootRef}
      className={`relative flex shrink-0 flex-col items-center overflow-visible ${thumbListClassName}`}
      style={
        snapMode
          ? {
              width: thumbWidth ?? undefined,
              height: columnHeight ?? undefined,
            }
          : style
      }
    >
      {snapMode ? (
        <ThumbScrollArrow
          direction="up"
          onStep={() => scrollByStep(-1)}
        />
      ) : null}
      <div
        className="h-full w-full overflow-hidden"
        style={
          snapMode
            ? { height: columnHeight ?? undefined }
            : style
        }
      >
        <div
          ref={listRef}
          className="flex h-full max-h-full flex-col gap-3 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {loopSlides.map((slide, index) => {
            const realIndex = index % slides.length;
            return (
              <button
                key={`${slide.type}-${slide.src}-${index}`}
                type="button"
                onClick={() => onActiveIndexChange(realIndex)}
                aria-label={
                  slide.type === "video"
                    ? `Видео ${name}`
                    : `${name} — фото ${realIndex + 1}`
                }
                aria-pressed={activeIndex === realIndex}
                className={`relative shrink-0 overflow-hidden bg-white transition-opacity hover:opacity-80 ${
                  snapMode ? "rounded-2xl" : thumbClassName
                }`}
                style={
                  snapMode && thumbHeight != null
                    ? { height: thumbHeight, width: "100%" }
                    : undefined
                }
              >
                {slide.type === "video" ? (
                  <GalleryVideo
                    key={`thumb-${slide.src}-${index}`}
                    src={slide.src}
                    label={`Видео ${name}`}
                    className="h-full w-full object-cover bg-white pointer-events-none"
                    preload="metadata"
                    playing={!isVideoActive}
                  />
                ) : (
                  <ProductImage
                    src={slide.src}
                    alt=""
                    fill
                    className={
                      galleryObjectFitForSrc(slide.src) === "cover"
                        ? "object-cover"
                        : "object-contain"
                    }
                    sizes={thumbImageSizes}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {snapMode ? (
        <ThumbScrollArrow
          direction="down"
          onStep={() => scrollByStep(1)}
        />
      ) : null}
    </div>
  );
}

/** Стрелка снаружи габаритов карусели: клик + автоскролл на «1» и «3» */
function ThumbScrollArrow({
  onStep,
  direction,
}: {
  onStep: () => void;
  direction: "up" | "down";
}) {
  const { start, stop, onClickStep } = useHoverBeatSteps(onStep, true);

  return (
    <button
      type="button"
      className={`absolute left-1/2 z-10 flex h-5 w-8 -translate-x-1/2 items-center justify-center text-brand-olive-dark transition-opacity hover:opacity-70 ${
        direction === "up" ? "-top-5" : "-bottom-5"
      }`}
      aria-label={direction === "up" ? "Предыдущие фото" : "Следующие фото"}
      onClick={onClickStep}
      onMouseEnter={start}
      onMouseLeave={stop}
      onBlur={stop}
    >
      <span
        className={`block h-0 w-0 border-x-[5px] border-x-transparent ${
          direction === "up"
            ? "border-b-[7px] border-b-current"
            : "border-t-[7px] border-t-current"
        }`}
      />
    </button>
  );
}

function GalleryMainMedia({
  slide,
  name,
  objectFit,
  imageSizes,
  priority,
}: {
  slide: GallerySlide;
  name: string;
  objectFit: "cover" | "contain";
  imageSizes: string;
  priority?: boolean;
}) {
  if (slide.type === "video") {
    return (
      <GalleryVideo
        key={`main-${slide.src}`}
        src={slide.src}
        label={`Видео — ${name}`}
        className={`absolute inset-0 h-full w-full ${
          objectFit === "cover" ? "object-cover bg-white" : "object-contain bg-white"
        }`}
        playing
      />
    );
  }

  return (
    <ProductImage
      key={slide.src}
      src={slide.src}
      alt={name}
      fill
      className={objectFit === "cover" ? "object-cover" : "object-contain"}
      sizes={imageSizes}
      priority={priority}
    />
  );
}

const GALLERY_ARROW_CLASS =
  "absolute bottom-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-brand-terracotta/95 text-white shadow-[0_8px_24px_rgba(212,119,80,0.35)] backdrop-blur-[2px] transition-all duration-200 hover:border-white/50 hover:bg-brand-terracotta-logo hover:shadow-[0_10px_28px_rgba(201,106,74,0.42)] hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40";

/**
 * Клик всегда листает.
 * Авто (1 и 3) — только после паузы без кликов, пока курсор на стрелке.
 */
function useHoverBeatSteps(onStep: () => void, enabled: boolean) {
  const AUTO_DELAY_MS = 700;
  const BEAT_MS = 1160;
  const CLICK_GAP_MS = 400;

  const beatTimerRef = useRef<number | null>(null);
  const delayTimerRef = useRef<number | null>(null);
  const lastStepAtRef = useRef(0);
  const hoveringRef = useRef(false);

  const clearBeat = useCallback(() => {
    if (beatTimerRef.current != null) {
      window.clearInterval(beatTimerRef.current);
      beatTimerRef.current = null;
    }
  }, []);

  const clearDelay = useCallback(() => {
    if (delayTimerRef.current != null) {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    hoveringRef.current = false;
    clearBeat();
    clearDelay();
  }, [clearBeat, clearDelay]);

  const guardedStep = useCallback(() => {
    const now = Date.now();
    if (now - lastStepAtRef.current < CLICK_GAP_MS) return;
    lastStepAtRef.current = now;
    onStep();
  }, [CLICK_GAP_MS, onStep]);

  const armAuto = useCallback(() => {
    clearDelay();
    clearBeat();
    if (!enabled || !hoveringRef.current) return;

    delayTimerRef.current = window.setTimeout(() => {
      delayTimerRef.current = null;
      if (!hoveringRef.current) return;
      // Первый автошаг после паузы, дальше — на «1» и «3»
      guardedStep();
      beatTimerRef.current = window.setInterval(() => {
        if (!hoveringRef.current) return;
        guardedStep();
      }, BEAT_MS);
    }, AUTO_DELAY_MS);
  }, [AUTO_DELAY_MS, BEAT_MS, clearBeat, clearDelay, enabled, guardedStep]);

  const onHoverStart = useCallback(() => {
    if (!enabled) return;
    hoveringRef.current = true;
    armAuto();
  }, [armAuto, enabled]);

  const onClickStep = useCallback(() => {
    if (!enabled) {
      onStep();
      return;
    }
    // Клик: шаг сразу, авто паузим и перезапускаем таймер тишины
    clearBeat();
    clearDelay();
    guardedStep();
    if (hoveringRef.current) armAuto();
  }, [armAuto, clearBeat, clearDelay, enabled, guardedStep, onStep]);

  useEffect(() => () => stopAll(), [stopAll]);

  return { start: onHoverStart, stop: stopAll, onClickStep };
}

function GalleryNavArrow({
  direction,
  onClick,
  disabled,
  label,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  const { start, stop, onClickStep } = useHoverBeatSteps(onClick, !disabled);

  return (
    <button
      type="button"
      onClick={onClickStep}
      disabled={disabled}
      aria-label={label}
      className={`${GALLERY_ARROW_CLASS} ${direction === "prev" ? "left-4" : "right-4"}`}
      onMouseEnter={start}
      onMouseLeave={stop}
      onBlur={stop}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={direction === "prev" ? "M14 7l-5 5 5 5" : "M10 7l5 5-5 5"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
function ZoomInPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 7.5v5M7.5 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type MobileImageZoomProps = {
  src: string;
  alt: string;
  onClose: () => void;
};

function getTouchDistance(
  touchA: { clientX: number; clientY: number },
  touchB: { clientX: number; clientY: number },
) {
  return Math.hypot(
    touchB.clientX - touchA.clientX,
    touchB.clientY - touchA.clientY,
  );
}

function MobileImageZoom({ src, alt, onClose }: MobileImageZoomProps) {
  const [scale, setScale] = useState(1.5);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const panStart = useRef<{
    x: number;
    y: number;
    posX: number;
    posY: number;
  } | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && pinchStart.current) {
        event.preventDefault();
        const distance = getTouchDistance(event.touches[0], event.touches[1]);
        const nextScale = Math.min(
          4,
          Math.max(1, pinchStart.current.scale * (distance / pinchStart.current.distance)),
        );
        setScale(nextScale);
        return;
      }

      if (event.touches.length === 1 && panStart.current) {
        event.preventDefault();
        const touch = event.touches[0];
        setPosition({
          x: panStart.current.posX + (touch.clientX - panStart.current.x),
          y: panStart.current.posY + (touch.clientY - panStart.current.y),
        });
      }
    };

    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      viewport.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      pinchStart.current = {
        distance: getTouchDistance(event.touches[0], event.touches[1]),
        scale,
      };
      panStart.current = null;
      return;
    }

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      panStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        posX: position.x,
        posY: position.y,
      };
      pinchStart.current = null;
    }
  };

  const handleTouchEnd = () => {
    pinchStart.current = null;
    panStart.current = null;
  };

  // Выше шапки (z-100) и FAB, иначе крестик оказывается под корзиной
  return createPortal(
    <div className="fixed inset-0 z-[130] bg-white" role="dialog" aria-modal="true" aria-label="Увеличенное изображение">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-[max(0.75rem,env(safe-area-inset-right))] z-30 flex h-11 w-11 items-center justify-center rounded-full border border-brand-olive/20 bg-white text-brand-olive-dark shadow-lg top-[max(0.75rem,env(safe-area-inset-top))]"
        aria-label="Закрыть"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div
        ref={viewportRef}
        className="flex h-full w-full items-center justify-center overflow-hidden px-4 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom))] touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative aspect-square w-full max-w-md will-change-transform"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        >
          <ProductImage
            src={src}
            alt={alt}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

type MobileGalleryProgressProps = {
  count: number;
  activeIndex: number;
};

function MobileGalleryProgress({ count, activeIndex }: MobileGalleryProgressProps) {
  return (
    <div className="mb-3 px-1">
      <div className="mb-2 flex items-center justify-center gap-2 text-[11px] tracking-wide text-brand-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-brand-terracotta/50">
          <path d="M14 7l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Листайте влево или вправо</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-brand-terracotta/50">
          <path d="M10 7l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div
        className="flex items-center gap-2"
        role="tablist"
        aria-label="Слайды галереи"
      >
        {Array.from({ length: count }, (_, index) => (
          <div
            key={`mobile-progress-${index}`}
            role="tab"
            aria-selected={activeIndex === index}
            className={`h-1 flex-1 rounded-full transition-colors ${
              activeIndex === index
                ? "bg-brand-terracotta"
                : "border border-dashed border-brand-olive/35 bg-brand-surface"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

type MobileProductGalleryProps = {
  slides: GallerySlide[];
  name: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
};

function MobileProductGallery({
  slides,
  name,
  activeIndex,
  onActiveIndexChange,
}: MobileProductGalleryProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);
  const activeSlide = slides[activeIndex] ?? slides[0];
  const isVideoSlide = activeSlide?.type === "video";

  useEffect(() => {
    setZoomOpen(false);
  }, [activeIndex]);

  if (!activeSlide) return null;

  const goToSlide = (index: number) => {
    onActiveIndexChange((index + slides.length) % slides.length);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current || slides.length <= 1) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    touchStart.current = null;

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    didSwipe.current = true;

    if (deltaX < 0) {
      goToSlide(activeIndex + 1);
      return;
    }

    goToSlide(activeIndex - 1);
  };

  return (
    <div className="md:hidden">
      {slides.length > 1 && (
        <MobileGalleryProgress count={slides.length} activeIndex={activeIndex} />
      )}

      <div
        className="relative mx-1 aspect-square overflow-hidden rounded-xl bg-white touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isVideoSlide ? (
          <GalleryMainMedia
            slide={activeSlide}
            name={name}
            objectFit={galleryObjectFitForSrc(activeSlide.src, "video")}
            imageSizes="(max-width: 768px) 92vw, 50vw"
            priority
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (didSwipe.current) {
                didSwipe.current = false;
                return;
              }
              setZoomOpen(true);
            }}
            className="relative block h-full w-full"
            aria-label="Увеличить изображение"
          >
            <GalleryMainMedia
              slide={activeSlide}
              name={name}
              objectFit={galleryObjectFitForSrc(activeSlide.src)}
              imageSizes="(max-width: 768px) 92vw, 50vw"
              priority
            />
          </button>
        )}

        {!isVideoSlide && (
          <div
            className="pointer-events-none absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-olive-dark shadow-sm"
            aria-hidden
          >
            <ZoomInPlusIcon />
          </div>
        )}
      </div>

      {zoomOpen && activeSlide.type === "image" && (
        <MobileImageZoom
          src={activeSlide.src}
          alt={name}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}

const GALLERY_VIEWPORT_MAX_H =
  "max-h-[calc(100dvh-var(--site-header-height,4rem)-1.5rem)]";

function GalleryLayout({
  slides,
  name,
  activeIndex,
  onActiveIndexChange,
  thumbClassName,
  mainClassName,
  mainObjectFit,
  mainImageSizes,
  thumbImageSizes,
  mainPriority,
  onMainClick,
  thumbListClassName = "max-h-full",
  thumbsPosition = "right",
}: GalleryLayoutProps) {
  const activeSlide = slides[activeIndex] ?? slides[0];
  const isVideoActive = activeSlide?.type === "video";
  const mainObserverRef = useRef<ResizeObserver | null>(null);
  const [thumbsHeight, setThumbsHeight] = useState<number | null>(null);

  const setMainNode = useCallback((node: HTMLElement | null) => {
    mainObserverRef.current?.disconnect();
    mainObserverRef.current = null;
    if (!node) return;

    const update = () => {
      const next = Math.round(node.getBoundingClientRect().height);
      setThumbsHeight((prev) => (prev === next ? prev : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    mainObserverRef.current = observer;
  }, []);

  /**
   * Высота main = min(viewport, высота при которой галерея + gap + покупка
   * ещё влезают в ряд). На 2K+ без потолка basis раздувается от 100dvh
   * и flex-wrap уводит колонку покупки вниз.
   */
  useLayoutEffect(() => {
    const GALLERY_MAIN_THUMBS_GAP = 16; // md:gap-4
    const HEADER_FALLBACK_PX = 66;
    const VIEWPORT_CHROME_PX = 5.5 * 16;

    const syncGalleryMetrics = () => {
      const rootStyle = getComputedStyle(document.documentElement);
      const headerRaw = rootStyle.getPropertyValue("--site-header-height").trim();
      const headerH = headerRaw.endsWith("px")
        ? Number.parseFloat(headerRaw)
        : HEADER_FALLBACK_PX;
      const viewportMaxH = Math.max(
        280,
        window.innerHeight -
          (Number.isFinite(headerH) ? headerH : HEADER_FALLBACK_PX) -
          VIEWPORT_CHROME_PX,
      );

      const leftPad = Math.min(20, Math.max(10, window.innerWidth * 0.012));
      const rightPad = Math.min(
        6.5 * 16,
        Math.max(4.25 * 16, 2.35 * 16 + window.innerWidth * 0.0425),
      );
      const colGap = Math.min(3.5 * 16, Math.max(16, window.innerWidth * 0.025));
      const contentW = Math.max(320, window.innerWidth - leftPad - rightPad - colGap);
      // Как в globals: 1.55fr / (1.55fr + 0.78fr) — ширина колонки галереи
      const galleryFr = 1.55;
      const buyFr = 0.78;
      const galleryColW = contentW * (galleryFr / (galleryFr + buyFr));
      // Запас, чтобы main+thumbs не вылезали в колонку покупки
      const maxGalleryW = Math.max(240, galleryColW - 8);

      // basis(h) ≈ 1.175h + 16 - 0.375*THUMB_PAIR_GAP → h под maxGalleryW
      const maxHFromWidth =
        (maxGalleryW - GALLERY_MAIN_THUMBS_GAP + 0.375 * THUMB_PAIR_GAP) / 1.175;
      const mainH = Math.max(280, Math.min(viewportMaxH, maxHFromWidth));

      document.documentElement.style.setProperty(
        "--pdp-gallery-main-max-h",
        `${Math.round(mainH)}px`,
      );
    };

    syncGalleryMetrics();
    window.addEventListener("resize", syncGalleryMetrics);
    return () => {
      window.removeEventListener("resize", syncGalleryMetrics);
      document.documentElement.style.removeProperty("--pdp-gallery-main-max-h");
    };
  }, []);

  useEffect(() => {
    return () => {
      mainObserverRef.current?.disconnect();
      mainObserverRef.current = null;
    };
  }, []);

  if (!activeSlide) return null;

  // Студия — contain; лайф (-life/-look/-model) и видео — cover на всю ячейку
  const resolvedObjectFit =
    activeSlide.type === "video"
      ? galleryObjectFitForSrc(activeSlide.src, "video")
      : galleryObjectFitForSrc(activeSlide.src);

  const mainPanel = (
    <GalleryMainMedia
      slide={activeSlide}
      name={name}
      objectFit={resolvedObjectFit}
      imageSizes={mainImageSizes}
      priority={mainPriority}
    />
  );

  const thumbs = (
    <GalleryThumbnails
      slides={slides}
      name={name}
      activeIndex={activeIndex}
      onActiveIndexChange={onActiveIndexChange}
      thumbClassName={thumbClassName}
      thumbImageSizes={thumbImageSizes}
      isVideoActive={isVideoActive}
      thumbListClassName={thumbListClassName}
      viewportHeight={thumbsHeight}
    />
  );

  const main = onMainClick ? (
    <button
      ref={setMainNode}
      type="button"
      onClick={onMainClick}
      className={`relative min-w-0 flex-1 overflow-hidden bg-white cursor-zoom-in ${mainClassName}`}
      aria-label="Открыть галерею в полном размере"
    >
      {mainPanel}
    </button>
  ) : (
    <div
      ref={setMainNode}
      className={`relative min-w-0 flex-1 overflow-hidden bg-white ${mainClassName}`}
    >
      {mainPanel}
    </div>
  );

    // w-fit: блок не на всю колонку — справа воздух до покупки
  return (
    <div
      data-product-gallery
      className={`flex w-fit max-w-full min-w-0 items-start gap-3.5 overflow-visible md:gap-4 ${GALLERY_VIEWPORT_MAX_H}`}
    >
      {thumbsPosition === "left" ? (
        <>
          {thumbs}
          {main}
        </>
      ) : (
        <>
          {main}
          {thumbs}
        </>
      )}
    </div>
  );
}

type ModalThumbsColumnProps = {
  slides: GallerySlide[];
  name: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
};

/** Левая карусель модалки: зацикленный скролл, размер окошек как на PDP */
function ModalThumbsColumn({
  slides,
  name,
  activeIndex,
  onActiveIndexChange,
}: ModalThumbsColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [thumbsHeight, setThumbsHeight] = useState<number | null>(null);
  const activeSlide = slides[activeIndex] ?? slides[0];
  const isVideoActive = activeSlide?.type === "video";

  useEffect(() => {
    const node = columnRef.current;
    if (!node) return;

    // Полная высота колонки: стрелки вверх/вниз вычитает GalleryThumbnails
    const update = () => {
      const next = Math.max(0, Math.round(node.getBoundingClientRect().height));
      setThumbsHeight((prev) => (prev === next ? prev : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={columnRef} className="relative flex min-h-0 shrink-0 self-stretch overflow-visible">
      <GalleryThumbnails
        slides={slides}
        name={name}
        activeIndex={activeIndex}
        onActiveIndexChange={onActiveIndexChange}
        thumbClassName="aspect-[3/4] w-full rounded-xl"
        thumbImageSizes="120px"
        isVideoActive={Boolean(isVideoActive)}
        thumbListClassName="max-h-full self-start"
        viewportHeight={thumbsHeight}
      />
    </div>
  );
}

type ModalGalleryViewProps = {
  slides: GallerySlide[];
  name: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onGoPrev: () => void;
  onGoNext: () => void;
  hideThumbs?: boolean;
};

function ModalGalleryView({
  slides,
  name,
  activeIndex,
  onGoPrev,
  onGoNext,
  tvFrameRef,
}: ModalGalleryViewProps & {
  tvFrameRef?: Ref<HTMLDivElement>;
}) {
  const activeSlide = slides[activeIndex] ?? slides[0];
  const hasMultipleSlides = slides.length > 1;

  if (!activeSlide) return null;

  const activeFit =
    activeSlide.type === "video"
      ? galleryObjectFitForSrc(activeSlide.src, "video")
      : galleryObjectFitForSrc(activeSlide.src);

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          ref={tvFrameRef}
          className="relative aspect-square h-full max-h-full max-w-full w-auto overflow-hidden rounded-xl bg-white"
        >
          <GalleryMainMedia
            slide={activeSlide}
            name={name}
            objectFit={activeFit}
            imageSizes="(max-width: 1024px) 90vw, 60vw"
          />

          {hasMultipleSlides && (
            <>
              <GalleryNavArrow
                direction="prev"
                onClick={onGoPrev}
                disabled={false}
                label="Предыдущее фото"
              />
              <GalleryNavArrow
                direction="next"
                onClick={onGoNext}
                disabled={false}
                label="Следующее фото"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function modalProductTagline(category: CategorySlug) {
  switch (category) {
    case "rings":
      return "Кольцо из серебра 925 — для повседневных сочетаний";
    case "earrings":
      return "Серьги из серебра 925 с огранённым синтетическим алмазом";
    case "pendants":
      return "Колье из серебра 925 с огранённым синтетическим алмазом";
    case "bracelets":
      return "Браслет из серебра 925 с огранённым синтетическим алмазом";
    default:
      return "Украшение из серебра 925 с огранённым синтетическим алмазом";
  }
}

type ProductGalleryModalFooterProps = {
  slug: string;
  name: string;
  productImage: string;
  category: CategorySlug;
  inStock?: boolean;
};

/**
 * Курсор-корзина: заливается только кузов (от днища кверху).
 * Колёса и ручка — только контур, в заливку не входят.
 */
function cartCursorCss(progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  // Границы кузова в viewBox (без колёс y≈19.5)
  const bodyTop = 6.6;
  const bodyBottom = 17.3;
  const bodyH = bodyBottom - bodyTop;
  const clipH = bodyH * p;
  const clipY = bodyBottom - clipH;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
  <defs>
    <clipPath id="rise"><rect x="5" y="${clipY.toFixed(2)}" width="16" height="${clipH.toFixed(2)}"/></clipPath>
  </defs>
  <path d="M6.4 6.8h13.8l-2 7.2H7.8L6.4 6.8Z" fill="#ffffff"/>
  <path d="M7.8 14h10.4l.9 3.2H7.2L7.8 14Z" fill="#ffffff"/>
  <g clip-path="url(#rise)">
    <path d="M6.4 6.8h13.8l-2 7.2H7.8L6.4 6.8Z" fill="#1a1a1a"/>
    <path d="M7.8 14h10.4l.9 3.2H7.2L7.8 14Z" fill="#1a1a1a"/>
  </g>
  <path d="M3 4h1.8l1.1 2.2L7.8 14h10.4l2-7.2H6.4" fill="none" stroke="#1a1a1a" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M7.8 14h10.4l.9 3.2H7.2L7.8 14Z" fill="none" stroke="#1a1a1a" stroke-width="1.25" stroke-linejoin="round"/>
  <circle cx="9.5" cy="19.5" r="1.25" fill="none" stroke="#1a1a1a" stroke-width="1.25"/>
  <circle cx="16.5" cy="19.5" r="1.25" fill="none" stroke="#1a1a1a" stroke-width="1.25"/>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 4 4, pointer`;
}

/**
 * «Купить»: секунда паузы → курсор-корзина, плавная заливка; увести — отмена.
 * Курсор обновляем через DOM (без setState на каждом кадре) — без ступеней.
 */
function HoverConfirmBuyButton({
  disabled,
  label,
  doneLabel,
  onConfirm,
  className = "",
}: {
  disabled: boolean;
  label: string;
  doneLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const DELAY_MS = 1000;
  const HOLD_MS = 2200;

  const [phase, setPhase] = useState<"idle" | "pending" | "hold" | "done">(
    "idle",
  );
  const [ariaPct, setAriaPct] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef<number | null>(null);
  const delayTimerRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const confirmedRef = useRef(false);
  const doneTimerRef = useRef<number | null>(null);
  const lastAriaRef = useRef(-1);

  const applyCursor = useCallback((value: string) => {
    if (buttonRef.current) buttonRef.current.style.cursor = value;
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startRef.current = null;
  }, []);

  const clearDelay = useCallback(() => {
    if (delayTimerRef.current != null) {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
  }, []);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const cancelHold = useCallback(() => {
    if (phaseRef.current !== "pending" && phaseRef.current !== "hold") return;
    clearDelay();
    stopRaf();
    confirmedRef.current = false;
    lastAriaRef.current = -1;
    setAriaPct(0);
    setPhase("idle");
    applyCursor(disabled ? "not-allowed" : "pointer");
  }, [applyCursor, clearDelay, disabled, stopRaf]);

  const markDone = useCallback(() => {
    setPhase("done");
    setAriaPct(100);
    applyCursor(cartCursorCss(1));
    if (doneTimerRef.current != null) window.clearTimeout(doneTimerRef.current);
    doneTimerRef.current = window.setTimeout(() => {
      setPhase("idle");
      setAriaPct(0);
      lastAriaRef.current = -1;
      applyCursor(disabled ? "not-allowed" : "pointer");
      doneTimerRef.current = null;
    }, 2800);
  }, [applyCursor, disabled]);

  const tick = useCallback(() => {
    if (startRef.current == null) return;
    const raw = Math.min(1, (performance.now() - startRef.current) / HOLD_MS);
    applyCursor(cartCursorCss(raw));
    const pct = Math.round(raw * 100);
    if (pct !== lastAriaRef.current) {
      lastAriaRef.current = pct;
      setAriaPct(pct);
    }
    if (raw >= 1) {
      rafRef.current = null;
      startRef.current = null;
      if (!confirmedRef.current) {
        confirmedRef.current = true;
        onConfirm();
        markDone();
      }
      return;
    }
    rafRef.current = window.requestAnimationFrame(tick);
  }, [HOLD_MS, applyCursor, markDone, onConfirm]);

  const beginHold = useCallback(() => {
    if (disabled) return;
    clearDelay();
    stopRaf();
    confirmedRef.current = false;
    lastAriaRef.current = -1;
    setAriaPct(0);
    setPhase("pending");
    applyCursor("pointer");
    delayTimerRef.current = window.setTimeout(() => {
      delayTimerRef.current = null;
      if (phaseRef.current !== "pending") return;
      setPhase("hold");
      applyCursor(cartCursorCss(0));
      startRef.current = performance.now();
      rafRef.current = window.requestAnimationFrame(tick);
    }, DELAY_MS);
  }, [DELAY_MS, applyCursor, clearDelay, disabled, stopRaf, tick]);

  useEffect(
    () => () => {
      clearDelay();
      stopRaf();
      if (doneTimerRef.current != null) window.clearTimeout(doneTimerRef.current);
    },
    [clearDelay, stopRaf],
  );

  return (
    <button
      ref={buttonRef}
      type="button"
      data-add-to-cart
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        clearDelay();
        stopRaf();
        confirmedRef.current = true;
        onConfirm();
        markDone();
      }}
      onMouseEnter={beginHold}
      onMouseLeave={cancelHold}
      onBlur={cancelHold}
      aria-label={
        phase === "hold"
          ? `Покупка ${ariaPct}%. Уберите курсор, чтобы отменить`
          : phase === "pending"
            ? "Удерживайте курсор для покупки. Уберите, чтобы отменить"
            : label
      }
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
      className={`inline-flex items-center justify-center px-6 py-3.5 bg-brand-terracotta hover:bg-brand-terracotta-logo disabled:opacity-50 text-white text-sm tracking-widest uppercase transition-colors whitespace-nowrap ${className}`}
    >
      {disabled ? "Скоро будет" : phase === "done" ? doneLabel : label}
    </button>
  );
}

/** «Купить» + избранное — в шапке у крестика */
function ProductGalleryModalActions({
  slug,
  name,
  productImage,
  category,
  inStock = true,
}: ProductGalleryModalFooterProps) {
  const { addItem } = useCart();
  const { selectedSize, selectedSizeLabel, artNo, price: selectedPrice, diamondWeight } =
    useProductSelection();
  const cartStoneLabel = formatInsertMassLabel(diamondWeight);

  const handleBuy = useCallback(() => {
    if (!inStock) return;

    const variant = [
      cartStoneLabel,
      selectedSizeLabel != null ? `размер ${selectedSizeLabel}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    addItem({
      productSlug: slug,
      name,
      image: productImage,
      price: selectedPrice,
      stoneWeight: diamondWeight,
      stoneLabel: cartStoneLabel,
      size: selectedSize,
      artNo,
    });
    trackAddToCart({
      id: artNo ?? slug,
      name,
      price: selectedPrice,
      category,
      variant: variant || undefined,
    });
  }, [
    addItem,
    artNo,
    cartStoneLabel,
    category,
    diamondWeight,
    inStock,
    name,
    productImage,
    selectedPrice,
    selectedSize,
    selectedSizeLabel,
    slug,
  ]);

  return (
    <div className="flex items-center gap-2">
      <HoverConfirmBuyButton
        disabled={!inStock}
        label="Купить"
        doneLabel="Добавлено ✓"
        onConfirm={handleBuy}
        className="!px-5 !py-2.5 text-xs"
      />
      <FavoriteButton
        slug={slug}
        variant="icon-plain"
        iconSize={24}
        className="h-10 w-10 shrink-0 text-brand-olive-dark hover:text-brand-terracotta"
      />
    </div>
  );
}

function ProductGalleryModalFooter({
  priceInset = 0,
}: {
  /** Отступ слева = левый край «ТВ» */
  priceInset?: number;
}) {
  const { price: selectedPrice } = useProductSelection();

  return (
    <div
      className="flex shrink-0 items-center border-t border-brand-sand pt-4"
      style={{ paddingLeft: priceInset > 0 ? priceInset : undefined }}
    >
      {/* Тот же heading, что у названия, чуть мельче */}
      <p className="font-heading text-base leading-tight text-brand-olive-dark md:text-lg">
        {formatPrice(selectedPrice)}
      </p>
    </div>
  );
}

type ProductGalleryModalProps = {
  open: boolean;
  onClose: () => void;
  slides: GallerySlide[];
  name: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  slug: string;
  price: number;
  productImage: string;
  category: CategorySlug;
  stoneWeight: number;
  stoneLabel: string;
  inStock?: boolean;
};

function ProductGalleryModal({
  open,
  onClose,
  slides,
  name,
  activeIndex: pageActiveIndex,
  onActiveIndexChange,
  slug,
  price,
  productImage,
  category,
  stoneWeight,
  stoneLabel,
  inStock = true,
}: ProductGalleryModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const tvFrameRef = useRef<HTMLDivElement>(null);
  const [priceInset, setPriceInset] = useState(0);
  // Свой индекс: листание в «ТВ» не дёргает большую картинку на фоне
  const [modalIndex, setModalIndex] = useState(pageActiveIndex);
  const modalIndexRef = useRef(modalIndex);
  modalIndexRef.current = modalIndex;

  // Цена по вертикали с левым краем большого окна «ТВ»
  useEffect(() => {
    if (!open) return;
    const column = rightColumnRef.current;
    const frame = tvFrameRef.current;
    if (!column || !frame) return;

    const update = () => {
      const next = Math.max(
        0,
        Math.round(frame.getBoundingClientRect().left - column.getBoundingClientRect().left),
      );
      setPriceInset((prev) => (prev === next ? prev : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(column);
    observer.observe(frame);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [open, modalIndex]);

  useEffect(() => {
    if (open) setModalIndex(pageActiveIndex);
  }, [open, pageActiveIndex]);

  const goPrev = useCallback(() => {
    const i = modalIndexRef.current;
    setModalIndex((i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goNext = useCallback(() => {
    const i = modalIndexRef.current;
    setModalIndex((i + 1) % slides.length);
  }, [slides.length]);

  const handleClose = useCallback(() => {
    // При закрытии синхронизируем фон с последним кадром в «ТВ»
    onActiveIndexChange(modalIndexRef.current);
    onClose();
  }, [onActiveIndexChange, onClose]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
        return;
      }

      if (slides.length <= 1) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    },
    [goNext, goPrev, handleClose, slides.length],
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] max-md:hidden flex items-center justify-center p-4 md:p-8"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={handleClose}
        aria-label="Закрыть галерею"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Галерея — ${name}`}
        className="relative z-10 flex h-[min(95vh,960px)] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-brand-surface shadow-2xl"
      >
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 md:top-4 md:right-4">
          <ProductGalleryModalActions
            slug={slug}
            name={name}
            productImage={productImage}
            category={category}
            inStock={inStock}
          />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-sand hover:text-brand-terracotta-dark"
            aria-label="Закрыть"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-4 md:gap-4 md:p-6">
          {/* Карусель на всю высоту — зацикленный скролл; шапка справа совпадает с левым краем «ТВ» */}
          {slides.length > 1 ? (
            <ModalThumbsColumn
              slides={slides}
              name={name}
              activeIndex={modalIndex}
              onActiveIndexChange={setModalIndex}
            />
          ) : null}

          <div
            ref={rightColumnRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          >
            <div className="mb-3 shrink-0 border-b border-brand-sand pb-3 pr-[min(42%,18rem)]">
              <h2 className="font-heading text-lg leading-tight text-brand-olive-dark md:text-xl">
                {name}
              </h2>
              <p className="mt-1 text-sm text-brand-muted md:text-[15px]">
                {modalProductTagline(category)}
              </p>
            </div>

            <ModalGalleryView
              slides={slides}
              name={name}
              activeIndex={modalIndex}
              onActiveIndexChange={setModalIndex}
              onGoPrev={goPrev}
              onGoNext={goNext}
              tvFrameRef={tvFrameRef}
            />

            <ProductGalleryModalFooter priceInset={priceInset} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ProductGallery({
  images,
  name,
  videoUrl,
  slug,
  price,
  productImage,
  category,
  stoneWeight,
  stoneLabel,
  inStock = true,
}: ProductGalleryProps) {
  const slides = useMemo(() => {
    const uniqueImages = images.filter((img, i, arr) => arr.indexOf(img) === i);
    const items: GallerySlide[] = uniqueImages.map((src) => ({
      type: "image",
      src,
    }));

    if (videoUrl) {
      items.push({ type: "video", src: videoUrl });
    }

    return items;
  }, [images, videoUrl]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  if (slides.length === 0) return null;

  return (
    <>
      <MobileProductGallery
        slides={slides}
        name={name}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />

      <div className="hidden md:block">
        <GalleryLayout
          slides={slides}
          name={name}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          thumbClassName="aspect-[3/4] w-full rounded-xl"
          /* Высота через .pdp-gallery-main → --pdp-gallery-main-max-h (см. globals.css) */
          mainClassName="pdp-gallery-main aspect-[4/5] !flex-none w-auto max-w-full min-h-[280px] rounded-xl"
          mainObjectFit="contain"
          mainImageSizes="(max-width: 1280px) 100vw, 48vw"
          thumbImageSizes="(max-width: 1280px) 120px, 180px"
          mainPriority
          thumbsPosition="right"
          onMainClick={() => setModalOpen(true)}
        />
      </div>

      <ProductGalleryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        slides={slides}
        name={name}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        slug={slug}
        price={price}
        productImage={productImage}
        category={category}
        stoneWeight={stoneWeight}
        stoneLabel={stoneLabel}
        inStock={inStock}
      />
    </>
  );
}
