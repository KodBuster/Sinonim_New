import { notFound, permanentRedirect } from "next/navigation";
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

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const product = await getProductDetails(slug, { includeOutOfStock: true });
    if (!product) return {};

    const canonicalSlug = product.slug;

    return buildPageMetadata({
      title: `${product.name} — купить в Синоним`,
      description: buildProductMetaDescription(product),
      path: `/products/${canonicalSlug}`,
      ogImage: product.images[0] ?? product.image,
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
    product = await getProductDetails(slug, { includeOutOfStock: true });
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

  const [relatedProducts, complectProducts] = await Promise.all([
    getRelatedProducts(product, 12).catch((error) => {
      console.error("Related products unavailable:", error);
      return [];
    }),
    getComplectProducts(product).catch((error) => {
      console.error("Complect products unavailable:", error);
      return [];
    }),
  ]);

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
