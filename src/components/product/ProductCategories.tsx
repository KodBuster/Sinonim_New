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
            className="group relative block aspect-[4/5.2] overflow-hidden bg-white md:aspect-[4/4.45]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={category.photo}
              alt={category.name}
              className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.045]"
              loading="lazy"
            />
            <span className="absolute bottom-[14px] left-[13px] right-[13px] z-[2] flex items-end justify-between bg-[#fffdf6e8] px-2.5 py-1.5 font-heading text-[23px] leading-[1.12] text-brand-olive-logo md:bottom-[clamp(17px,2.4vw,35px)] md:left-[clamp(15px,2.5vw,35px)] md:right-[clamp(15px,2.5vw,35px)] md:text-[clamp(24px,2.4vw,40px)]">
              {category.name}
              <b className="pb-0.5 font-sans text-[15px] font-normal md:text-lg">↗</b>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
