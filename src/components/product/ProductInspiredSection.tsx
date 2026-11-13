"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Temporary Missoma PDP placeholders — replace with own videos later. */
const PLACEHOLDER_VIDEOS = [
  "https://cdn.shopify.com/videos/c/vp/4db180d519c54474b97b4a1e0adf8fcd/4db180d519c54474b97b4a1e0adf8fcd.SD-480p-1.5Mbps-90104591.mp4",
  "https://cdn.shopify.com/videos/c/vp/ee2ec5f074ee4d14be5e99e1eea79ee4/ee2ec5f074ee4d14be5e99e1eea79ee4.SD-480p-1.5Mbps-96026792.mp4",
  "https://cdn.shopify.com/videos/c/vp/3f16b74a96c1430ab10ca4de2eae7108/3f16b74a96c1430ab10ca4de2eae7108.SD-480p-1.5Mbps-86259426.mp4",
  "https://cdn.shopify.com/videos/c/vp/b0778c3b3f1e4ff59e44fee54a4e87a5/b0778c3b3f1e4ff59e44fee54a4e87a5.SD-480p-1.5Mbps-88101771.mp4",
  "https://cdn.shopify.com/videos/c/vp/df48c8846afa438c8528c3b79ccecd80/df48c8846afa438c8528c3b79ccecd80.SD-480p-1.5Mbps-96026916.mp4",
  "https://cdn.shopify.com/videos/c/vp/94930e95e05642349e5966520c0227e7/94930e95e05642349e5966520c0227e7.SD-480p-1.5Mbps-90102050.mp4",
] as const;

function PlayIcon({ className = "size-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13l11-6.5L8 5.5Z" />
    </svg>
  );
}

function InspiredVideoModal({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр видео"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-olive-dark transition-opacity hover:opacity-80"
        >
          <span className="text-xl leading-none">×</span>
        </button>
        <video
          src={src}
          className="aspect-[9/16] max-h-[min(85vh,720px)] w-full object-contain"
          controls
          autoPlay
          playsInline
          preload="auto"
        />
      </div>
    </div>,
    document.body,
  );
}

export function ProductInspiredSection() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);
  const [activeSrc, setActiveSrc] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateScrollState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollMore(el.scrollWidth - el.scrollLeft - el.clientWidth > 8);
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

  const scrollNext = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-inspired-card]");
    const step = card ? card.offsetWidth + 12 : el.clientWidth * 0.7;
    el.scrollBy({ left: step, behavior: "smooth" });
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
              onClick={() => setActiveSrc(src)}
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
              <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-brand-olive-dark shadow-sm">
                  <PlayIcon className="size-5 translate-x-px" />
                </span>
              </span>
            </button>
          ))}
        </div>

        {canScrollMore ? (
          <button
            type="button"
            onClick={scrollNext}
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

      {mounted && activeSrc ? (
        <InspiredVideoModal src={activeSrc} onClose={() => setActiveSrc(null)} />
      ) : null}
    </div>
  );
}
