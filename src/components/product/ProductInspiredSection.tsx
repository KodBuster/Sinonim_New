"use client";

import { useEffect, useRef, useState } from "react";

/** Temporary Missoma PDP placeholders — replace with own videos later. */
const PLACEHOLDER_VIDEOS = [
  "https://cdn.shopify.com/videos/c/vp/4db180d519c54474b97b4a1e0adf8fcd/4db180d519c54474b97b4a1e0adf8fcd.SD-480p-1.5Mbps-90104591.mp4",
  "https://cdn.shopify.com/videos/c/vp/ee2ec5f074ee4d14be5e99e1eea79ee4/ee2ec5f074ee4d14be5e99e1eea79ee4.SD-480p-1.5Mbps-96026792.mp4",
  "https://cdn.shopify.com/videos/c/vp/3f16b74a96c1430ab10ca4de2eae7108/3f16b74a96c1430ab10ca4de2eae7108.SD-480p-1.5Mbps-86259426.mp4",
  "https://cdn.shopify.com/videos/c/vp/b0778c3b3f1e4ff59e44fee54a4e87a5/b0778c3b3f1e4ff59e44fee54a4e87a5.SD-480p-1.5Mbps-88101771.mp4",
  "https://cdn.shopify.com/videos/c/vp/df48c8846afa438c8528c3b79ccecd80/df48c8846afa438c8528c3b79ccecd80.SD-480p-1.5Mbps-96026916.mp4",
  "https://cdn.shopify.com/videos/c/vp/94930e95e05642349e5966520c0227e7/94930e95e05642349e5966520c0227e7.SD-480p-1.5Mbps-90102050.mp4",
] as const;

export function ProductInspiredSection() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);

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
            <div
              key={src}
              data-inspired-card
              className="relative aspect-[9/16] w-[42%] max-w-[168px] shrink-0 overflow-hidden rounded-2xl bg-[#f5f4f1] sm:w-[38%] sm:max-w-[180px]"
            >
              <video
                src={src}
                className="h-full w-full object-cover"
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
                aria-label={`Вдохновение ${index + 1}`}
              />
            </div>
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
    </div>
  );
}
