"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductImage } from "@/components/catalog/ProductImage";
import { useCart } from "@/context/CartContext";
import { formatPrice, type ProductDetails } from "@/lib/products";
import { formatInsertMassLabel } from "@/lib/synthetic-diamond-labels";
import { splitDescriptionForSeoDisplay } from "@/lib/product-description";
import { trackAddToCart } from "@/lib/analytics/metrika";
import { useProductSelection } from "./ProductSelectionContext";
import styles from "./InspiredProductView.module.css";

export function InspiredProductView({ product, onBack, onClose }: {
  product: ProductDetails;
  onBack: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { addItem, closeCart } = useCart();
  const { selectedSize, setSelectedSize, selectedSizeLabel, price, artNo, diamondWeight } = useProductSelection();
  const [activeImage, setActiveImage] = useState(0);
  const [sizeError, setSizeError] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  const sizeRef = useRef<HTMLSelectElement>(null);
  const images = [...new Set([product.image, ...product.images].filter(Boolean))];
  const selectedStock = selectedSize ? product.sizeStockAmounts?.[selectedSize] : undefined;
  const available = product.inStock !== false && (selectedStock === undefined || selectedStock > 0);
  const needsSize = product.sizeOptions.length > 0;

  useEffect(() => { backRef.current?.focus(); }, []);

  function buy(checkout: boolean) {
    if (!available) return;
    if (needsSize && !selectedSize) {
      setSizeError(true);
      sizeRef.current?.focus();
      return;
    }
    addItem({ productSlug: product.slug, name: product.name, image: product.image,
      price, stoneWeight: diamondWeight, stoneLabel: formatInsertMassLabel(diamondWeight),
      size: selectedSize, artNo });
    trackAddToCart({ id: artNo ?? product.slug, name: product.name, price,
      category: product.category, variant: selectedSizeLabel ?? undefined });
    onClose();
    if (checkout) {
      closeCart();
      router.push("/checkout");
    }
  }

  return <div className={styles.view}>
    <header className={styles.header}>
      <button ref={backRef} type="button" onClick={onBack} aria-label="Вернуться к видео">←</button>
      <button type="button" onClick={onClose} aria-label="Закрыть карточку">×</button>
    </header>
    <div className={styles.content}>
      <div className={styles.image}>
        <ProductImage src={images[activeImage] || product.image} alt={product.name} fill sizes="360px" className="object-contain" />
      </div>
      {images.length > 1 && <div className={styles.thumbs} aria-label="Фотографии украшения">
        {images.map((src, index) => <button type="button" key={src} onClick={() => setActiveImage(index)}
          aria-label={`Фото украшения ${index + 1}`} aria-pressed={index === activeImage}>
          <ProductImage src={src} alt="" fill sizes="42px" className="object-contain" />
        </button>)}
      </div>}
      <h2>{product.name}</h2>
      <div className={styles.price}><strong>{formatPrice(price)}</strong><span>{available ? "В наличии" : "Нет в наличии"}</span></div>
      <p className={styles.metal}>{product.metal || "Серебро 925"}</p>
      {needsSize && <div className={styles.size}>
        <label htmlFor="inspired-product-size">Размер</label>
        <select ref={sizeRef} id="inspired-product-size" value={selectedSize ?? ""}
          aria-invalid={sizeError} aria-describedby={sizeError ? "inspired-size-error" : undefined}
          onChange={(event) => { setSelectedSize(event.target.value || null); setSizeError(false); }}>
          <option value="">Выберите размер</option>
          {product.sizeOptions.map((option) => {
            const stock = product.sizeStockAmounts?.[option.value];
            const soldOut = stock !== undefined && stock <= 0;
            return <option value={option.value} key={option.value} disabled={soldOut}>{option.label}{soldOut ? " — нет в наличии" : ""}</option>;
          })}
        </select>
        {sizeError && <p id="inspired-size-error" role="alert">Выберите размер украшения</p>}
      </div>}
      <div className={styles.actions}>
        <button type="button" disabled={!available} onClick={() => buy(false)}>В корзину</button>
        <button type="button" disabled={!available} onClick={() => buy(true)}>Купить сейчас</button>
      </div>
      <details className={styles.description} open>
        <summary>Описание <span aria-hidden="true">⌃</span></summary>
        <div>
          <p>{splitDescriptionForSeoDisplay(product.description).filter((part) => part.type === "visible").map((part) => part.text).join(" ")}</p>
          <p>Металл: {product.metal || "Серебро 925"}</p>
          <p>Масса вставки: {formatInsertMassLabel(diamondWeight)}</p>
          {selectedSizeLabel && <p>Размер: {selectedSizeLabel}</p>}
          {artNo && <p>Артикул: {artNo}</p>}
        </div>
      </details>
    </div>
  </div>;
}
