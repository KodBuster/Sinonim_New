import Link from "next/link";
import { COLLECTIONS } from "@/components/redesign/data";

export function ProductCategories() {
  return (
    <section aria-label="Категории">
      <div className="grid grid-cols-2 gap-[10px] md:grid-cols-4">
        {COLLECTIONS.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className="group relative block aspect-[2/3] overflow-hidden bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={category.photo}
              alt={category.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
              loading="lazy"
            />
            <span className="absolute bottom-[14px] left-[13px] right-[13px] z-[2] px-2.5 py-1.5 font-heading text-[23px] leading-[1.12] text-white [text-shadow:0_1px_3px_#000c,0_2px_8px_#0009] md:bottom-[clamp(17px,2.4vw,35px)] md:left-[clamp(15px,2.5vw,35px)] md:right-[clamp(15px,2.5vw,35px)] md:text-[clamp(24px,2.4vw,40px)]">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
