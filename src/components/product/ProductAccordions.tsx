"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  getInsertMassDisplayLabel,
  INSERT_WEIGHT_LABEL,
  SYNTHETIC_DIAMOND_CAP,
} from "@/lib/synthetic-diamond-labels";
import type { ProductDetails } from "@/lib/products";
import { splitDescriptionForSeoDisplay } from "@/lib/product-description";
import { useProductSelection } from "./ProductSelectionContext";

type AccordionItem = {
  id: string;
  title: string;
  content: ReactNode;
};

function AccordionRow({
  item,
  open,
  onToggle,
}: {
  item: AccordionItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-black/10">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="text-[15px] font-medium text-brand-olive-dark">
          {item.title}
        </span>
        <span
          className={`text-base leading-none text-brand-olive-dark transition-transform ${
            open ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          ›
        </span>
      </button>
      {open ? (
        <div className="pb-5 text-sm leading-relaxed text-brand-muted">
          {item.content}
        </div>
      ) : null}
    </div>
  );
}

export function ProductAccordions({ product }: { product: ProductDetails }) {
  const { selectedSize } = useProductSelection();
  const insertMass = getInsertMassDisplayLabel(product, selectedSize);
  const segments = splitDescriptionForSeoDisplay(product.description);
  const [openId, setOpenId] = useState<string | null>(null);

  const items: AccordionItem[] = [
    {
      id: "why",
      title: "Почему вам понравится",
      content: (
        <div className="space-y-3">
          <p>
            {segments.map((segment, index) =>
              segment.type === "seoHidden" ? (
                <span key={index} className="text-white select-none">
                  {segment.text}
                </span>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Серебро 925 и огранённый синтетический алмаз</li>
            <li>Лаконичная форма для повседневных и вечерних образов</li>
            <li>Можно носить соло или в сочетаниях</li>
          </ul>
        </div>
      ),
    },
    {
      id: "details",
      title: "Детали и размеры",
      content: (
        <dl className="space-y-2">
          <div className="flex justify-between gap-4">
            <dt>Металл</dt>
            <dd className="text-right text-brand-olive-dark">{product.metal}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Вставка</dt>
            <dd className="text-right text-brand-olive-dark">{SYNTHETIC_DIAMOND_CAP}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Огранка</dt>
            <dd className="text-right text-brand-olive-dark">{product.cut}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>{INSERT_WEIGHT_LABEL}</dt>
            <dd className="text-right text-brand-olive-dark">{insertMass || "—"}</dd>
          </div>
          {product.artNo ? (
            <div className="flex justify-between gap-4 pt-1">
              <dt>Артикул</dt>
              <dd className="text-right text-brand-olive-dark">{product.artNo}</dd>
            </div>
          ) : null}
        </dl>
      ),
    },
    {
      id: "style",
      title: "Как носить",
      content: (
        <p>
          Сочетайте с другими украшениями Синоним из серебра 925 — в одной
          категории или в комплекте. Для колец можно собрать мягкий стек на
          одном пальце или распределить акценты по руке.
        </p>
      ),
    },
    {
      id: "delivery",
      title: "Доставка и возврат",
      content: (
        <div className="space-y-3">
          <p>
            Доставка СДЭК по России. Самовывоз из шоурума в Москве. Актуальные
            сроки и стоимость рассчитываются при оформлении заказа.
          </p>
          <p>
            <Link href="/shipping" className="underline underline-offset-2 hover:text-brand-terracotta">
              Условия доставки
            </Link>
            {" · "}
            <Link href="/warranty" className="underline underline-offset-2 hover:text-brand-terracotta">
              Гарантия
            </Link>
          </p>
        </div>
      ),
    },
    {
      id: "care",
      title: "Уход и качество",
      content: (
        <div className="space-y-3">
          <p>
            Храните украшение в сухом месте и протирайте мягкой тканью без
            абразивов. Избегайте контакта с агрессивной бытовой химией.
          </p>
          <p>
            <Link
              href="/guide/lab-grown-diamonds"
              className="underline underline-offset-2 hover:text-brand-terracotta"
            >
              Об ограненных синтетических алмазах
            </Link>
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="mt-2">
      {items.map((item) => (
        <AccordionRow
          key={item.id}
          item={item}
          open={openId === item.id}
          onToggle={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
        />
      ))}
    </div>
  );
}
