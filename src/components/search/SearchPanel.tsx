"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchPanel } from "@/context/SearchPanelContext";
import { SearchForm } from "./SearchForm";
import { readStoredSearchQuery } from "./search-query-storage";

const QUICK_CATEGORIES = [
  { label: "Кольца", href: "/shop/rings" },
  { label: "Серьги", href: "/shop/earrings" },
  { label: "Колье", href: "/shop/pendants" },
  { label: "Браслеты", href: "/shop/bracelets" },
  { label: "Подарки", href: "/shop/gifts" },
  { label: "Новая коллекция", href: "/collections/fw-2026" },
] as const;

/**
 * Панель поиска под закреплённой шапкой (не отдельная страница).
 * Типографика — в духе Missoma: Cormorant + лёгкий Inter.
 */
export function SearchPanel() {
  const { isOpen, closeSearch } = useSearchPanel();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [seedQuery, setSeedQuery] = useState("");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSeedQuery(readStoredSearchQuery());
    setFormKey((key) => key + 1);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSearch();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, closeSearch]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/25"
        aria-label="Закрыть поиск"
        onClick={closeSearch}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 top-[var(--site-header-height,66px)] z-10 border-b border-black/8 bg-white shadow-[0_12px_40px_rgba(40,43,36,0.08)]"
      >
        <div className="mx-auto max-w-5xl px-4 py-5 md:px-8 md:py-7">
          <h2 id={titleId} className="sr-only">
            Поиск по каталогу
          </h2>

          <SearchForm
            key={formKey}
            defaultQuery={seedQuery}
            autoFocus
            variant="overlay"
            className="w-full"
            onSubmit={closeSearch}
            onClear={() => {
              setSeedQuery("");
              setFormKey((key) => key + 1);
            }}
            onClose={closeSearch}
          />

          <div className="mt-5 md:mt-10">
            <p className="font-search mb-3 text-[12px] tracking-[0.18em] text-brand-olive-dark uppercase md:mb-4">
              Категории
            </p>
            {/* Мобилка: в ряд с переносом — экономия высоты при открытой клавиатуре */}
            <ul className="flex flex-row flex-wrap gap-x-5 gap-y-2.5 md:gap-x-8 md:gap-y-3">
              {QUICK_CATEGORIES.map((item) => (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    onClick={closeSearch}
                    className="font-search text-[18px] leading-tight text-brand-olive-dark underline decoration-black/20 underline-offset-[5px] transition-colors hover:decoration-brand-terracotta hover:text-brand-terracotta md:text-[22px]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
