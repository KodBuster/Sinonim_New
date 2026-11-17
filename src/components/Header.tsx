"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { CartLink } from "@/components/cart/CartLink";
import { FavoritesLink } from "@/components/favorites/FavoritesLink";

const NAV_ITEMS = [
  { label: "Новая коллекция", href: "/collections/fw-2026" },
  { label: "Кольца", href: "/shop/rings" },
  { label: "Серьги", href: "/shop/earrings" },
  { label: "Колье", href: "/shop/pendants" },
  { label: "Браслеты", href: "/shop/bracelets" },
  { label: "Подарки", href: "/shop/gifts" },
  { label: "О бренде", href: "/about" },
  { label: "Блог", href: "/blog" },
];

const iconButtonClass =
  "relative z-[2] inline-flex cursor-pointer touch-manipulation text-brand-olive-dark hover:text-brand-terracotta transition-colors";

function IconSearch({ className = "size-6 lg:size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

type HeaderProps = {
  /** When true, header overlays content (homepage hero) without a spacer. */
  overlay?: boolean;
};

export function Header({ overlay = false }: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const syncHeight = () => {
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${el.offsetHeight}px`,
      );
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className="group/header fixed inset-x-0 top-0 z-[100] border-b border-transparent bg-white/20 backdrop-blur-[8px] transition-[background-color,border-color,backdrop-filter] duration-200 hover:border-[var(--color-brand-sand,#e8e8e8)] hover:bg-white hover:backdrop-blur-none"
      >
        <div className="flex h-[60px] items-center gap-0 px-2.5 md:h-[66px] md:px-4 lg:px-5">
          <Link
            href="/menu"
            className={`${iconButtonClass} mr-1.5 shrink-0 p-2 lg:hidden`}
            aria-label="Открыть меню"
          >
            <IconMenu />
          </Link>

          <Link
            href="/"
            className="mr-8 shrink-0 md:mr-10 lg:mr-14 xl:mr-16"
            aria-label="СИНОНИМ — главная"
          >
            <Image
              src="/redesign/synonym-logo.png"
              alt="СИНОНИМ"
              width={380}
              height={64}
              priority
              className="h-8 w-auto max-w-[190px] object-contain sm:h-9 md:h-10"
            />
          </Link>

          <nav
            className="hidden min-w-0 flex-1 items-center justify-start gap-x-3 overflow-x-auto lg:flex xl:gap-x-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Главная навигация"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 whitespace-nowrap border-b-2 border-transparent py-2 font-body text-[12px] font-normal uppercase tracking-[0.02em] text-brand-olive-dark transition-colors hover:border-brand-terracotta hover:text-brand-olive-logo xl:text-[13px]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Link
              href="/search"
              className={`${iconButtonClass} p-2 sm:p-2.5`}
              aria-label="Поиск по каталогу"
            >
              <IconSearch />
            </Link>
            <Link href="/account" className={`${iconButtonClass} p-2 sm:p-2.5`} aria-label="Личный кабинет">
              <svg className="size-5 sm:size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="12" cy="7.5" r="3.5" />
                <path d="M5 21v-2a7 7 0 0 1 14 0v2" strokeLinecap="round" />
              </svg>
            </Link>
            <FavoritesLink className="touch-manipulation p-2 sm:p-2.5" />
            <CartLink className="touch-manipulation p-2 sm:p-2.5" />
          </div>
        </div>
      </header>

      {!overlay ? (
        <div
          aria-hidden
          className="shrink-0"
          style={{ height: "var(--site-header-height, 66px)" }}
        />
      ) : null}
    </>
  );
}
