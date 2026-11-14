import { Suspense } from "react";
import Link from "next/link";
import { ProductViewTracker } from "@/components/analytics/ProductViewTracker";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CATEGORIES, type Product, type ProductDetails } from "@/lib/products";
import { getInsertMassDisplayLabel } from "@/lib/synthetic-diamond-labels";
import { resolveProductVideoUrl } from "@/lib/product-video";
import { ProductAccordions } from "./ProductAccordions";
import { ProductCategories } from "./ProductCategories";
import { ProductComplectSection } from "./ProductComplectSection";
import { ProductConfigurator } from "./ProductConfigurator";
import { ProductGallery } from "./ProductGallery";
import { ProductInspiredSection } from "./ProductInspiredSection";
import { PdpLayout } from "./PdpLayout";
import { ProductSelectionProvider } from "./ProductSelectionContext";

type ProductPageProps = {
  product: ProductDetails;
  relatedProducts: Product[];
  complectProducts: Product[];
};

function productTagline(product: ProductDetails) {
  switch (product.category) {
    case "rings":
      return "Кольцо из серебра 925 — для повседневных сочетаний";
    case "earrings":
      return "Серьги из серебра 925 с огранённым синтетическим алмазом";
    case "pendants":
      return "Колье из серебра 925 с огранённым синтетическим алмазом";
    case "bracelets":
      return "Браслет из серебра 925 с огранённым синтетическим алмазом";
    default:
      return "Украшение из серебра 925 с огранённым синтетическим алмазом";
  }
}

export function ProductPage({
  product,
  relatedProducts,
  complectProducts,
}: ProductPageProps) {
  const related = relatedProducts;
  const categoryTitle = CATEGORIES[product.category].title;
  const insertMass = getInsertMassDisplayLabel(product) ?? "";
  const videoUrl =
    resolveProductVideoUrl([
      product.artNo,
      ...Object.values(product.sizeArtNos ?? {}),
      ...(product.offerArtNos ?? []),
    ]) ?? product.videoUrl;
  const cartStoneLabel = insertMass;

  return (
    <section className="bg-white pb-16 md:pb-24">
      <ProductViewTracker
        id={product.artNo ?? product.slug}
        name={product.name}
        price={product.price}
        category={product.category}
        variant={insertMass}
      />

      <Suspense fallback={null}>
        <ProductSelectionProvider product={product}>
          {/* --pdp-pad-right: и поле страницы, и сдвиг колонки при открытом видео */}
          <div className="w-full pl-[clamp(10px,1.2vw,20px)] pr-[length:var(--pdp-pad-right)] [--pdp-pad-right:clamp(4.25rem,calc(2.35rem+4.25vw),6.5rem)]">
            {/*
              Flex-wrap: бок о бок, пока есть галерея + зазор X + колонка покупки.
              Sticky галереи — только в PdpLayout при data-pdp-sidebyside.
            */}
            <PdpLayout>
              <div data-pdp-gallery-col className="self-start">
                <div className="mb-3 md:mb-4">
                  <Link
                    href={`/shop/${product.category}`}
                    className="inline-flex items-center gap-1.5 text-sm text-brand-olive-dark hover:text-brand-terracotta"
                  >
                    <span aria-hidden>‹</span>
                    {categoryTitle}
                  </Link>
                </div>
                <ProductGallery
                  images={product.images}
                  name={product.name}
                  videoUrl={videoUrl}
                  slug={product.slug}
                  price={product.price}
                  productImage={product.image}
                  category={product.category}
                  stoneWeight={product.stoneWeight}
                  stoneLabel={cartStoneLabel}
                  inStock={product.inStock !== false}
                />
              </div>

              <div className="product-buy-column">
                {product.badge ? (
                  <span
                    className={`mb-3 inline-flex rounded-full px-3 py-1 text-[11px] font-medium tracking-wide ${
                      product.badge === "Новинка"
                        ? "bg-[#dfe6c8] text-[#4a5335]"
                        : "bg-[#e8eef3] text-[#3a4a58]"
                    }`}
                  >
                    {product.badge}
                  </span>
                ) : null}

                <div className="mb-2 flex items-start justify-between gap-4">
                  <h1 className="font-heading text-[1.75rem] leading-[1.15] text-brand-olive-dark md:text-[2.15rem]">
                    {product.name}
                  </h1>
                  <FavoriteButton
                    slug={product.slug}
                    variant="icon-plain"
                    className="mt-1 shrink-0"
                  />
                </div>

                <p className="mb-5 text-sm text-brand-muted md:text-[15px]">
                  {productTagline(product)}
                </p>

                <ProductConfigurator product={product} showAccordions={false} />
                <ProductAccordions product={product} />
                {complectProducts.length > 0 && product.setArtNos?.length ? (
                  <ProductComplectSection products={complectProducts} />
                ) : null}
                <ProductInspiredSection
                  product={{
                    name: product.name,
                    image:
                      product.image ||
                      product.images[0] ||
                      "/images/product-ring.webp",
                    price: product.price,
                  }}
                />
              </div>
            </PdpLayout>
          </div>

          <div className="w-full pl-[clamp(10px,1.2vw,20px)] pr-[length:var(--pdp-pad-right)] [--pdp-pad-right:clamp(4.25rem,calc(2.35rem+4.25vw),6.5rem)]">
            {related.length > 0 && (
              <div className="mt-16 md:mt-20">
                <h2 className="mb-6 font-heading text-2xl text-brand-olive-dark md:text-[1.75rem]">
                  Ещё модели
                </h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                  {related.map((item) => (
                    <ProductCard key={item.id} product={item} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 md:mt-5">
            <ProductCategories />
          </div>
        </ProductSelectionProvider>
      </Suspense>
    </section>
  );
}
