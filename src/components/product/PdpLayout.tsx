"use client";

import type { ReactNode } from "react";

/**
 * Обёртка PDP: двухколоночный grid на md+ (стили в globals.css [data-pdp-layout]).
 */
export function PdpLayout({ children }: { children: ReactNode }) {
  return <div data-pdp-layout>{children}</div>;
}
