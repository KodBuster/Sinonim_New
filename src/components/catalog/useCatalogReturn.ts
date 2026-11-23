"use client";

import { useEffect, type RefObject } from "react";
import { useSearchParams } from "next/navigation";

export function useCatalogReturn(root: RefObject<HTMLElement | null>, path: string, loading: boolean,
  setDesktop: (value: boolean) => void, setMobile: (value: boolean) => void) {
  const query = useSearchParams().toString();
  useEffect(() => {
    const element = root.current;
    if (!element || loading) return;
    const key = `catalog-return:${path}${window.location.search}`;
    let restoring = false;
    let saved: { y: number; desktop: boolean; mobile: boolean; sections: boolean[] } | undefined;
    try { saved = JSON.parse(sessionStorage.getItem(key) ?? "null") ?? undefined; } catch { /* Storage may be unavailable. */ }
    if (saved) {
      restoring = true;
      setDesktop(saved.desktop);
      setMobile(saved.mobile);
      element.querySelectorAll("details").forEach((section, index) => { section.open = saved!.sections[index] ?? false; });
    }
    const target = saved?.y ?? 0;
    let frame = 0;
    const started = performance.now();
    const restore = () => {
      if (!restoring || window.location.pathname !== path) return;
      window.scrollTo({ top: target, behavior: "instant" });
      // Navigation and card mounting can reset scroll after the first frame.
      if (performance.now() - started < 750 || Math.abs(window.scrollY - target) >= 2) {
        frame = requestAnimationFrame(restore);
      } else {
        restoring = false;
      }
    };
    frame = requestAnimationFrame(restore);
    const observer = new ResizeObserver(restore);
    observer.observe(element);
    const timer = window.setTimeout(() => { restoring = false; observer.disconnect(); }, 5000);
    const save = () => {
      if (restoring || !element.isConnected || window.location.pathname !== path) return;
      try {
        sessionStorage.setItem(key, JSON.stringify({ y: window.scrollY,
          desktop: element.querySelector('[aria-controls="category-filters"]')?.getAttribute("aria-expanded") === "true",
          mobile: element.querySelectorAll('[aria-controls="category-filters"]')[1]?.getAttribute("aria-expanded") === "true",
          sections: [...element.querySelectorAll("details")].map(section => section.open) }));
      } catch { /* Storage may be unavailable. */ }
    };
    const stopRestoring = () => { restoring = false; cancelAnimationFrame(frame); };
    window.addEventListener("wheel", stopRestoring, { passive: true });
    window.addEventListener("touchstart", stopRestoring, { passive: true });
    window.addEventListener("keydown", stopRestoring);
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    element.addEventListener("click", save, true);
    element.addEventListener("toggle", save, true);
    return () => {
      // The destination page may already have scrolled to zero at cleanup.
      cancelAnimationFrame(frame); clearTimeout(timer); observer.disconnect();
      window.removeEventListener("wheel", stopRestoring); window.removeEventListener("touchstart", stopRestoring);
      window.removeEventListener("keydown", stopRestoring);
      window.removeEventListener("scroll", save); window.removeEventListener("pagehide", save);
      element.removeEventListener("click", save, true); element.removeEventListener("toggle", save, true);
    };
  }, [root, path, query, loading, setDesktop, setMobile]);
}
