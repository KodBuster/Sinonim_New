"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { formatPrice } from "@/lib/products";
import styles from "./ProductStickyBuy.module.css";

export function ProductStickyBuy({ anchor, name, price, label, disabled, onBuy }: {
  anchor: RefObject<HTMLButtonElement | null>;
  name: string;
  price: number;
  label: string;
  disabled: boolean;
  onBuy: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!visible || !panel.current) return;
    const element = panel.current;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--product-sticky-buy-height", `${element.getBoundingClientRect().height}px`);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--product-sticky-buy-height");
    };
  }, [visible]);

  useEffect(() => {
    const button = anchor.current;
    if (!button) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(button);
    return () => observer.disconnect();
  }, [anchor]);

  if (!visible) return null;
  return createPortal(
    <section ref={panel} data-product-sticky-buy className={styles.panel} aria-label="Купить товар">
      <div className={styles.summary}>
        <p title={name}>{name}</p>
        <span>{formatPrice(price)}</span>
      </div>
      <div className={styles.action}>
        <button type="button" disabled={disabled} onClick={onBuy}>{label}</button>
      </div>
    </section>,
    document.body,
  );
}
