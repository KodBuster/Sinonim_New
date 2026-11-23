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
    const restore = () => {
      if (!restoring) return;
      window.scrollTo({ top: target, behavior: "instant" });
      if (Math.abs(window.scrollY - target) < 2) restoring = false;
    };
    const frame = requestAnimationFrame(restore);
    const observer = new ResizeObserver(restore);
    observer.observe(element);
    const timer = window.setTimeout(() => { restoring = false; observer.disconnect(); }, 5000);
    const save = () => {
      if (restoring) return;
      try {
        sessionStorage.setItem(key, JSON.stringify({ y: window.scrollY,
          desktop: element.querySelector('[aria-controls="category-filters"]')?.getAttribute("aria-expanded") === "true",
          mobile: element.querySelectorAll('[aria-controls="category-filters"]')[1]?.getAttribute("aria-expanded") === "true",
          sections: [...element.querySelectorAll("details")].map(section => section.open) }));
      } catch { /* Storage may be unavailable. */ }
    };
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    element.addEventListener("click", save, true);
    element.addEventListener("toggle", save, true);
    return () => {
      save(); cancelAnimationFrame(frame); clearTimeout(timer); observer.disconnect();
      window.removeEventListener("scroll", save); window.removeEventListener("pagehide", save);
      element.removeEventListener("click", save, true); element.removeEventListener("toggle", save, true);
    };
  }, [root, path, query, loading, setDesktop, setMobile]);
}
