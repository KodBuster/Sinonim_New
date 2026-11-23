"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * На мобилках Next иногда сохраняет scrollY после перехода с длинной главной
 * на короткую страницу (404 / PDP) — оказывается в «подвале». Сбрасываем вверх.
 */
export function ScrollToTopOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (pathname === "/shop" || pathname.startsWith("/shop/") || pathname === "/collections/fw-2026") {
      try {
        if (sessionStorage.getItem(`catalog-return:${pathname}${window.location.search}`)) return;
      } catch { /* Storage may be unavailable. */ }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
