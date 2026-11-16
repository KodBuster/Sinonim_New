"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

function IconCart() {
  return (
    <svg className="size-6 lg:size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 4h1.8l1.1 2.2L7.8 14h10.4l2-7.2H6.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.8 14h10.4l.9 3.2H7.2L7.8 14Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="19.5" r="1.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16.5" cy="19.5" r="1.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function CartLink({ className = "" }: { className?: string }) {
  const { count, isReady, openCart } = useCart();

  return (
    <Link
      href="/cart"
      onClick={(event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openCart();
      }}
      aria-haspopup="dialog"
      className={`text-brand-olive-dark hover:text-brand-terracotta transition-colors relative ${className || "p-2.5"}`}
      aria-label={count > 0 ? `Корзина: ${count} товаров` : "Корзина"}
    >
      <IconCart />
      {isReady && count > 0 && (
        <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-brand-terracotta text-white text-[10px] font-medium rounded-full">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
