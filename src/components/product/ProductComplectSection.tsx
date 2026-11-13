"use client";

import Link from "next/link";
import { ProductImage } from "@/components/catalog/ProductImage";
import { formatPrice, type Product } from "@/lib/products";

type ProductComplectSectionProps = {
  products: Product[];
};

export function ProductComplectSection({
  products,
}: ProductComplectSectionProps) {
  if (!products.length) return null;

  return (
    <div className="mt-8 border-t border-black/10 pt-6">
      <h2 className="font-heading text-xl text-brand-olive-dark md:text-[1.35rem]">
        Комплект к этому украшению
      </h2>
      <div className="mt-3 mb-5 h-px w-full bg-black/10" />

      <div className="space-y-3">
        {products.map((item) => (
          <div
            key={item.id}
            className="flex gap-3 rounded-xl bg-[#f5f4f1] p-3 sm:gap-4 sm:p-3.5"
          >
            <Link
              href={`/products/${item.slug}`}
              className="relative block h-[88px] w-[88px] shrink-0 overflow-hidden bg-white sm:h-[100px] sm:w-[100px]"
            >
              <ProductImage
                src={item.image}
                alt={item.name}
                fill
                className="object-contain"
                sizes="100px"
              />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
              <div>
                <Link
                  href={`/products/${item.slug}`}
                  className="font-heading text-[15px] leading-snug text-brand-olive-dark underline decoration-black/25 underline-offset-2 hover:decoration-brand-olive-dark sm:text-base"
                >
                  {item.name}
                </Link>
                <p className="mt-1 text-sm text-brand-olive-dark">
                  {formatPrice(item.price)}
                </p>
              </div>
              <Link
                href={`/products/${item.slug}`}
                className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-black/20 bg-white px-3 py-2 text-center text-xs font-medium tracking-wide text-brand-olive-dark transition-colors hover:border-brand-olive-dark sm:text-sm"
              >
                Смотреть
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
