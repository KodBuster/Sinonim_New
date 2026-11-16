"use client";

import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/catalog/ProductCard";
import type { Product } from "@/lib/products";

const STORAGE_KEY = "sinonim-recently-viewed";
const HISTORY_LIMIT = 20;

function isStoredProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Product>;
  return typeof item.slug === "string" && typeof item.name === "string"
    && typeof item.image === "string" && Number.isFinite(item.price);
}

export function RecentlyViewedProducts({ product }: { product: Product }) {
  const { id, slug, name, category, price, image, stoneWeight, badge } = product;
  const [history, setHistory] = useState<Product[]>([]);
  const [edges, setEdges] = useState({ previous: false, next: false });
  const railRef = useRef<HTMLDivElement>(null);
  const products = history.filter((item) => item.slug !== slug);
  const productCount = products.length;

  useEffect(() => {
    let saved: Product[] = [];
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored)) saved = stored.filter(isStoredProduct);
    } catch {
      // A corrupt or unavailable history starts empty.
    }
    const current = { id, slug, name, category, price, image, stoneWeight, badge };
    const next = [current, ...saved.filter((item) => item.slug !== slug)].slice(0, HISTORY_LIMIT);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be blocked by the browser.
    }
    // History can only be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(next);
  }, [id, slug, name, category, price, image, stoneWeight, badge]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const update = () => setEdges({
      previous: rail.scrollLeft > 1,
      next: rail.scrollWidth - rail.clientWidth - rail.scrollLeft > 1,
    });
    rail.scrollLeft = 0;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    rail.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      rail.removeEventListener("scroll", update);
    };
  }, [slug, productCount]);

  function scroll(direction: -1 | 1) {
    const rail = railRef.current;
    const card = rail?.firstElementChild;
    if (!rail || !card) return;
    const gap = Number.parseFloat(getComputedStyle(rail).columnGap);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap),
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }

  if (!productCount) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className="mt-8 px-[clamp(10px,1.2vw,20px)] md:mt-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 id="recently-viewed-heading" className="font-heading text-2xl text-brand-olive-dark md:text-[1.75rem]">
          Недавно просмотренные
        </h2>
        <div className="flex shrink-0 gap-2">
          {([-1, 1] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              aria-label={direction === -1 ? "Прокрутить влево" : "Прокрутить вправо"}
              aria-controls="recently-viewed-products"
              disabled={direction === -1 ? !edges.previous : !edges.next}
              onClick={() => scroll(direction)}
              className="grid size-9 place-items-center rounded-full border border-brand-sand text-brand-olive-dark enabled:hover:bg-brand-sand/30 disabled:opacity-35 md:size-11"
            >
              <span aria-hidden="true">{direction === -1 ? "←" : "→"}</span>
            </button>
          ))}
        </div>
      </div>
      <div
        id="recently-viewed-products"
        ref={railRef}
        className="grid snap-x snap-mandatory auto-cols-[calc((100%-10px)/2)] grid-flow-col gap-[10px] overflow-x-auto pb-2 [scrollbar-width:none] md:auto-cols-[calc((100%-20px)/3)] lg:auto-cols-[calc((100%-40px)/5)] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((item) => (
          <div key={item.slug} className="min-w-0 snap-start">
            <ProductCard product={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
