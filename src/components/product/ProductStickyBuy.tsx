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
  const [pastAnchor, setPastAnchor] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  /* После основной кнопки; на отзывах оставляем; на подвале и при клавиатуре убираем */
  const visible = pastAnchor && !footerInView && !keyboardOpen;

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
      setPastAnchor(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(button);
    return () => observer.disconnect();
  }, [anchor]);

  useEffect(() => {
    const footer = document.querySelector("[data-site-footer]");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => {
      setFooterInView(entry.isIntersecting);
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const isTextField = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      if (target instanceof HTMLTextAreaElement) return true;
      if (!(target instanceof HTMLInputElement)) return false;
      return !["button", "submit", "checkbox", "radio", "file", "reset", "image", "hidden", "range", "color"].includes(
        target.type,
      );
    };

    /* Источник правды — сжатие visualViewport; фокус сам по себе не держит скрытие после скролла */
    const isKeyboardVisible = () => {
      const viewport = window.visualViewport;
      if (!viewport) return false;
      return window.innerHeight - viewport.height > 120;
    };

    const syncKeyboard = () => {
      setKeyboardOpen(isKeyboardVisible());
    };

    const onFocusIn = (event: FocusEvent) => {
      if (isTextField(event.target)) setKeyboardOpen(true);
    };

    const onFocusOut = () => {
      window.setTimeout(syncKeyboard, 0);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", syncKeyboard, true);
    window.visualViewport?.addEventListener("resize", syncKeyboard);
    window.visualViewport?.addEventListener("scroll", syncKeyboard);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", syncKeyboard, true);
      window.visualViewport?.removeEventListener("resize", syncKeyboard);
      window.visualViewport?.removeEventListener("scroll", syncKeyboard);
    };
  }, []);

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
