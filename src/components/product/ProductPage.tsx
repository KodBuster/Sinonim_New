import { Suspense } from "react";
import Link from "next/link";
import { ProductViewTracker } from "@/components/analytics/ProductViewTracker";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { CATEGORIES, type Product, type ProductDetails } from "@/lib/products";
import { getInsertMassDisplayLabel } from "@/lib/synthetic-diamond-labels";
import { resolveProductVideoUrl } from "@/lib/product-video";
import { ProductAccordions } from "./ProductAccordions";
import { ProductCategories } from "./ProductCategories";
import { ProductComplectSection } from "./ProductComplectSection";
import { ProductConfigurator } from "./ProductConfigurator";
import { ProductGallery } from "./ProductGallery";
import { ProductInspiredSection } from "./ProductInspiredSection";
import { ProductRecommendations } from "./ProductRecommendations";
import { ProductReviews } from "./ProductReviews";
import { RecentlyViewedProducts } from "./RecentlyViewedProducts";
import { PdpLayout } from "./PdpLayout";
import { ProductSelectionProvider } from "./ProductSelectionContext";

type ProductPageProps = {
  product: ProductDetails;
  relatedProducts: Promise<Product[]>;
  complectProducts: Promise<Product[]>;
};

async function RelatedProducts({ products }: { products: Promise<Product[]> }) {
  const related = await products;
  return related.length > 0 ? (
    <div className="mt-5"><ProductRecommendations products={related} /></div>
  ) : null;
}

async function ComplectProducts({ products }: { products: Promise<Product[]> }) {
  const complect = await products;
  return complect.length > 0 ? <ProductComplectSection products={complect} /> : null;
}

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
          <div className="w-full px-[clamp(10px,1.2vw,20px)]">
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
                  <h1 className="min-w-0 font-heading text-[1.75rem] leading-[1.15] text-brand-olive-dark [overflow-wrap:anywhere] md:text-[2.15rem]">
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
                {product.setArtNos?.length ? (
                  <Suspense fallback={null}><ComplectProducts products={complectProducts} /></Suspense>
                ) : null}
                <a href="#product-reviews" className="mt-5 inline-block text-sm underline underline-offset-4">
                  Отзывы о товаре
                </a>
                <ProductInspiredSection
                  product={product}
                />
              </div>
            </PdpLayout>
          </div>

          <div className="w-full px-[clamp(10px,1.2vw,20px)]">
            <Suspense fallback={null}><RelatedProducts products={relatedProducts} /></Suspense>
          </div>

          <div className="mt-4 md:mt-5">
            <ProductCategories />
          </div>
          <RecentlyViewedProducts product={product} />
          <ProductReviews key={product.slug} slug={product.slug} />
        </ProductSelectionProvider>
      </Suspense>
    </section>
  );
}
