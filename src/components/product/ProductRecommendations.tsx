"use client";

import { useState } from "react";
import { ProductCard } from "@/components/catalog/ProductCard";
import type { Product } from "@/lib/products";

export function ProductRecommendations({ products }: { products: Product[] }) {
  const [expanded, setExpanded] = useState(false);
  const buttonVisibility =
    products.length > 5 ? "flex" :
    products.length > 3 ? "flex lg:hidden" :
    products.length > 2 ? "flex md:hidden" : "hidden";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="font-heading text-2xl text-brand-olive-dark md:text-[1.75rem]">
          Вам также может понравиться
        </h2>
        <button
          type="button"
          aria-label={expanded ? "Свернуть рекомендации" : "Развернуть рекомендации"}
          aria-expanded={expanded}
          aria-controls="recommended-products"
          onClick={() => setExpanded((open) => !open)}
          className={`${buttonVisibility} size-11 shrink-0 items-center justify-center rounded-full border border-brand-sand text-brand-olive-dark hover:bg-brand-sand/30`}
        >
          <svg
            className={expanded ? "rotate-180" : undefined}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div
        id="recommended-products"
        className="grid grid-cols-2 gap-[10px] md:grid-cols-3 lg:grid-cols-5"
      >
        {products.map((product, index) => {
          const visibility = expanded || index < 2 ? "" :
            index < 3 ? "hidden md:block" :
            index < 5 ? "hidden lg:block" : "hidden";

          return (
            <div key={product.id} className={visibility}>
              <ProductCard product={product} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
