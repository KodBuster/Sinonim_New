import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProductPage } from "@/components/product/ProductPage";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/metadata";
import { buildProductMetaDescription } from "@/lib/product-metadata";
import { isLegacyProductSlug } from "@/lib/product-slug";
import { buildProductJsonLd } from "@/lib/product-schema";
import {
  getComplectProducts,
  getProductDetails,
  getRelatedProducts,
} from "@/lib/products-service";

export const dynamic = "force-dynamic";
const loadProduct = cache(getProductDetails);

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const product = await loadProduct(slug);
    if (!product) return {};

    const canonicalSlug = product.slug;

    return buildPageMetadata({
      title: `${product.name} — купить в Синоним`,
      description: buildProductMetaDescription(product),
      path: `/products/${canonicalSlug}`,
      ogImage: `/api/products/${encodeURIComponent(canonicalSlug)}/share-image`,
      ogImageWidth: 1000,
      ogImageHeight: 1250,
    });
  } catch (error) {
    console.error(`Product metadata failed for "${slug}":`, error);
    return {};
  }
}

export default async function ProductRoute({ params }: PageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await loadProduct(slug);
  } catch (error) {
    console.error(`Product page failed for "${slug}":`, error);
    notFound();
  }

  if (!product) {
    notFound();
  }

  if (isLegacyProductSlug(slug, product)) {
    permanentRedirect(`/products/${product.slug}`);
  }

  const relatedProducts = getRelatedProducts(product, 12).catch((error) => {
      console.error("Related products unavailable:", error);
      return [];
  });
  const complectProducts = getComplectProducts(product).catch((error) => {
      console.error("Complect products unavailable:", error);
      return [];
  });

  return (
    <>
      <JsonLd data={buildProductJsonLd(product, product.slug)} />
      <Header />
      <main>
        <ProductPage
          product={product}
          relatedProducts={relatedProducts}
          complectProducts={complectProducts}
        />
      </main>
      <Footer />
    </>
  );
}
