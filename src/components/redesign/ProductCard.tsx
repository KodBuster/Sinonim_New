"use client";

import Link from "next/link";
import { useFavorites } from "@/context/FavoritesContext";
import { formatPrice, type RedesignProduct } from "./data";

export function ProductCard({ product }: { product: RedesignProduct }) {
  const { isFavorite, toggleItem } = useFavorites();
  const fav = isFavorite(product.slug);

  return (
    <article className="product-card">
      <div className="card-media">
        <Link href={`/products/${product.slug}`} aria-label={`Открыть ${product.name}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="product-image from-catalog"
            src={product.image}
            alt={product.name}
            loading="lazy"
          />
        </Link>
        <button
          type="button"
          className={`card-heart ${fav ? "active" : ""}`}
          aria-label="В избранное"
          aria-pressed={fav}
          onClick={() => toggleItem(product.slug)}
        >
          {fav ? "♥" : "♡"}
        </button>
      </div>
      <div className="card-details">
        <Link className="card-name" href={`/products/${product.slug}`}>
          {product.name}
        </Link>
        <strong>{formatPrice(product.price)}</strong>
      </div>
    </article>
  );
}
