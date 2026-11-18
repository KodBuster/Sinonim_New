"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SORT_OPTIONS } from "@/lib/products";

type SearchSortMenuProps = {
  value: string;
  onChange: (next: string) => void;
};

function SortLinesIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 14" fill="none" aria-hidden>
      <path d="M1 2h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4 7h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 12h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Компактная сортировка: подпись + иконка «чёрточки», выпадающий список с radio */
export function SearchSortMenu({ value, onChange }: SearchSortMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current =
    SORT_OPTIONS.find((option) => option.id === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && !rootRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="inline-flex items-center gap-2 font-search text-[16px] text-brand-olive-dark transition-opacity hover:opacity-70"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Сортировка: ${current.label}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>Сортировка</span>
        <SortLinesIcon />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Варианты сортировки"
          className="absolute right-0 z-30 mt-2 min-w-[15.5rem] rounded-sm border border-black/10 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(40,43,36,0.08)]"
        >
          <ul className="space-y-1">
            {SORT_OPTIONS.map((option) => {
              const selected = option.id === value;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className="flex w-full items-center gap-3 py-2 text-left font-search text-[16px] text-brand-olive-dark transition-opacity hover:opacity-70"
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                  >
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? "border-brand-olive-dark"
                          : "border-brand-olive/35"
                      }`}
                      aria-hidden
                    >
                      {selected ? (
                        <span className="h-2 w-2 rounded-full bg-brand-olive-dark" />
                      ) : null}
                    </span>
                    <span>{option.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
