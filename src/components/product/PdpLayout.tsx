"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Следит за flex-wrap: sticky галереи только бок о бок.
 * После переноса sticky выключен — иначе покупка при скролле уезжает под кадр.
 */
export function PdpLayout({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const gallery = root.querySelector<HTMLElement>("[data-pdp-gallery-col]");
    const buy = root.querySelector<HTMLElement>(".product-buy-column");
    if (!gallery || !buy) return;

    const sync = () => {
      // Одна линия: верхи почти совпадают; перенос — покупка заметно ниже
      const sideBySide = buy.offsetTop <= gallery.offsetTop + 12;
      if (sideBySide) root.setAttribute("data-pdp-sidebyside", "");
      else root.removeAttribute("data-pdp-sidebyside");
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(root);
    observer.observe(gallery);
    observer.observe(buy);
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <div ref={rootRef} data-pdp-layout>
      {children}
    </div>
  );
}
