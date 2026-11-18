"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { trackAddToCart } from "@/lib/analytics/metrika";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/checkout";
import { formatInsertMassLabel } from "@/lib/synthetic-diamond-labels";
import { formatPrice, type ProductDetails } from "@/lib/products";
import { ProductRatingShare } from "./ProductRatingShare";
import { ProductStickyBuy } from "./ProductStickyBuy";
import { useProductSelection } from "./ProductSelectionContext";
import { ProductAccordions } from "./ProductAccordions";

const PRODUCT_PERKS = [
  "2 года гарантии",
  `Бесплатная доставка от ${formatPrice(FREE_DELIVERY_THRESHOLD)}`,
  "Шоурум в Москве",
] as const;

const PERK_SLIDE_MS = 450;

function ProductPerksCarousel() {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const trackSlides = [...PRODUCT_PERKS, PRODUCT_PERKS[0]];
  const activeDot = index % PRODUCT_PERKS.length;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAnimate(true);
      setIndex((current) => current + 1);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [index]);

  useEffect(() => {
    if (index < PRODUCT_PERKS.length) return;
    const timer = window.setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, PERK_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (animate || index !== 0) return;
    const frame = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(frame);
  }, [animate, index]);

  const goTo = (target: number) => {
    setAnimate(true);
    setIndex(target);
  };

  return (
    <div>
      <div className="relative overflow-hidden bg-[#f3f1ec] py-3 text-sm text-brand-olive-dark">
        <div
          className={`flex ease-out ${
            animate ? "transition-transform" : ""
          }`}
          style={{
            transform: `translateX(-${index * 100}%)`,
            transitionDuration: animate ? `${PERK_SLIDE_MS}ms` : "0ms",
          }}
        >
          {trackSlides.map((perk, slideIndex) => (
            <p
              key={`${perk}-${slideIndex}`}
              className="product-video-safe-label font-search w-full shrink-0 px-4 text-center font-semibold"
            >
              {perk}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-1.5 pr-0.5">
        {PRODUCT_PERKS.map((perk, perkIndex) => (
          <button
            key={perk}
            type="button"
            aria-label={perk}
            aria-current={perkIndex === activeDot}
            onClick={() => goTo(perkIndex)}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              perkIndex === activeDot ? "bg-black" : "bg-black/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

type ProductConfiguratorProps = {
  product: ProductDetails;
  showAccordions?: boolean;
};

export function ProductConfigurator({
  product,
  showAccordions = true,
}: ProductConfiguratorProps) {
  const defaultVariant =
    product.stoneVariants.find(
      (variant) => Math.abs(variant.weight - product.stoneWeight) < 0.001,
    ) ?? product.stoneVariants[0];

  const { selectedSize, setSelectedSize, selectedSizeLabel, artNo, price, diamondWeight } =
    useProductSelection();
  const cartStoneLabel = formatInsertMassLabel(diamondWeight);
  const [added, setAdded] = useState(false);
  const [sizeTouched, setSizeTouched] = useState(false);
  const buyButton = useRef<HTMLButtonElement>(null);
  const sizeChoices = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const selectedSizeStock =
    selectedSize && product.sizeStockAmounts
      ? product.sizeStockAmounts[selectedSize]
      : undefined;
  const selectedSizeAvailable =
    selectedSizeStock === undefined || selectedSizeStock > 0;
  const needsSize = product.sizeOptions.length > 0;
  const canBuy =
    product.inStock !== false &&
    selectedSizeAvailable &&
    (!needsSize || selectedSize != null);

  const handleAddToCart = () => {
    if (needsSize && selectedSize == null) {
      setSizeTouched(true);
      sizeChoices.current?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      sizeChoices.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
      return;
    }
    if (!canBuy) return;

    const variant = [
      defaultVariant.label,
      selectedSizeLabel != null ? `размер ${selectedSizeLabel}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    addItem({
      productSlug: product.slug,
      name: product.name,
      image: product.image,
      price,
      stoneWeight: diamondWeight,
      stoneLabel: cartStoneLabel,
      size: selectedSize,
      artNo,
    });
    trackAddToCart({
      id: artNo ?? product.slug,
      name: product.name,
      price,
      category: product.category,
      variant: variant || undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  };

  const sizeError = needsSize && sizeTouched && selectedSize == null;

  return (
    <div className="space-y-5">
      <div>
        <p className="font-search text-sm font-semibold text-brand-olive-dark md:text-base">
          {formatPrice(price)}
        </p>
        {product.inStock === false ? (
          <p className="mt-2 text-sm font-medium text-brand-terracotta">Скоро будет</p>
        ) : null}
      </div>

      <ProductRatingShare key={product.slug} slug={product.slug} />

      <div className="space-y-4">
        {needsSize ? (
          <div>
            <p
              id="size-label"
              className={`font-search mb-2 text-sm font-semibold ${
                sizeError ? "text-red-600" : "text-brand-olive-dark"
              }`}
            >
              Размер:{" "}
              {selectedSizeLabel != null ? (
                <span className="font-medium">{selectedSizeLabel}</span>
              ) : (
                <span className={sizeError ? "font-medium" : undefined}>
                  выберите размер
                </span>
              )}
            </p>
            <div
              ref={sizeChoices}
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-labelledby="size-label"
            >
              {product.sizeOptions.map((size) => {
                const isSelected = selectedSize === size.value;
                const sizeStock = product.sizeStockAmounts?.[size.value];
                const sizeAvailable = sizeStock === undefined || sizeStock > 0;
                return (
                  <button
                    key={size.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!sizeAvailable}
                    onClick={() => {
                      setSelectedSize(size.value);
                      setSizeTouched(true);
                    }}
                    className={`relative flex h-10 min-w-10 items-center justify-center whitespace-nowrap rounded-full border px-2 text-sm transition-colors ${
                      isSelected
                        ? "border-brand-olive-dark bg-brand-olive-dark text-white"
                        : sizeAvailable
                          ? "border-black/20 bg-white text-brand-olive-dark hover:border-brand-olive-dark"
                          : "cursor-not-allowed border-black/10 bg-[#f3f3f3] text-black/30 line-through"
                    }`}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          data-add-to-cart
          ref={buyButton}
          onClick={handleAddToCart}
          disabled={product.inStock === false || !selectedSizeAvailable}
          className="product-video-safe-label font-search w-full bg-brand-olive-dark px-6 py-3.5 text-center text-sm font-semibold tracking-[0.04em] text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 md:text-[15px]"
        >
          {product.inStock === false || !selectedSizeAvailable
            ? "Скоро будет"
            : added
              ? "Добавлено ✓"
              : "В корзину"}
        </button>
        <Link
          href="/showroom"
          className="product-video-safe-label font-search flex w-full items-center justify-center border border-black/15 bg-white px-6 py-3.5 text-sm font-semibold tracking-[0.04em] text-brand-olive-dark transition-colors hover:border-brand-olive-dark md:text-[15px]"
        >
          Примерить в шоуруме
        </Link>
        <ProductPerksCarousel />
      </div>

      {added ? (
        <p className="text-sm text-brand-terracotta">
          Товар добавлен в корзину.{" "}
          <Link href="/cart" className="underline hover:text-brand-terracotta">
            Перейти в корзину →
          </Link>
        </p>
      ) : null}

      {artNo ? (
        <p className="text-xs text-brand-muted">Артикул: {artNo}</p>
      ) : null}

      {showAccordions ? <ProductAccordions product={product} /> : null}
      <ProductStickyBuy
        anchor={buyButton}
        name={product.name}
        price={price}
        disabled={product.inStock === false || !selectedSizeAvailable}
        label={product.inStock === false || !selectedSizeAvailable ? "Скоро будет" : added ? "Добавлено ✓" : needsSize && !selectedSize ? "Выберите размер" : "В корзину"}
        onBuy={handleAddToCart}
      />
    </div>
  );
}
