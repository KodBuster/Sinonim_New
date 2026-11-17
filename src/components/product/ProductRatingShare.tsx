"use client";

import { useEffect, useState } from "react";

type Distribution = { rating: number; count: number }[];

export function ProductRatingShare({ slug }: { slug: string }) {
  const [distribution, setDistribution] = useState<Distribution>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reviews/${encodeURIComponent(slug)}?summary`, { signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setDistribution((await response.json()).distribution);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [slug]);

  const count = distribution?.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const total = distribution?.reduce((sum, row) => sum + row.rating * row.count, 0) ?? 0;
  const rating = count ? total / count : 0;
  const ratingLabel = count
    ? `${rating.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} из 5, отзывов: ${count}`
    : distribution ? "Пока нет отзывов" : "Отзывы о товаре";

  async function copyLink() {
    const url = new URL(`/products/${encodeURIComponent(slug)}`, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Ссылка скопирована");
    } catch {
      const field = document.createElement("textarea");
      const focused = document.activeElement as HTMLElement | null;
      field.value = url;
      field.readOnly = true;
      field.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
      document.body.appendChild(field);
      try {
        field.select();
        field.setSelectionRange(0, url.length);
        setMessage(document.execCommand("copy") ? "Ссылка скопирована" : "Не удалось скопировать ссылку. Попробуйте ещё раз.");
      } catch {
        setMessage("Не удалось скопировать ссылку. Попробуйте ещё раз.");
      } finally {
        field.remove();
        focused?.focus({ preventScroll: true });
      }
    }
  }

  return (
    <div className="text-brand-olive-dark">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <a href="#product-reviews" aria-label={ratingLabel} className="inline-flex min-h-11 items-center gap-2 text-sm">
          <span aria-hidden="true" className="relative inline-block whitespace-nowrap text-xl leading-none tracking-[2px]">
            <span className="text-brand-olive/30">★★★★★</span>
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${rating * 20}%` }}>★★★★★</span>
          </span>
          <span>{distribution ? `(${count})` : "Отзывы"}</span>
        </a>
        <button type="button" onClick={() => void copyLink()} className="inline-flex min-h-11 items-center gap-2 text-sm">
          Поделиться
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V3m-4 4 4-4 4 4M5 14v6h14v-6" />
          </svg>
        </button>
      </div>
      <p role="status" className="text-xs">{message}</p>
    </div>
  );
}
