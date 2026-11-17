import { NextResponse } from "next/server";
import { socialProductsBySlug } from "@/lib/home-social-products";
import { getProductDetails } from "@/lib/products-service";

export async function GET() {
  const results = await Promise.allSettled(
    socialProductsBySlug.map(({ slug }) => getProductDetails(slug)),
  );
  const socialProducts = Object.fromEntries(socialProductsBySlug.flatMap((fallback, index) => {
    const result = results[index];
    const product = result.status === "fulfilled" ? result.value : undefined;
    const articlesBySize = Object.entries(product?.sizeArtNos ?? {});

    return fallback.variants.map((variant) => {
      const liveSize = articlesBySize.find(([, article]) => article === variant.article)?.[0];
      const size = liveSize ?? variant.size;
      return [variant.article, {
        name: product?.name ?? fallback.name,
        image: fallback.image,
        price: product?.sizePrices?.[size] ?? variant.price,
        href: `/products/${product?.slug ?? fallback.slug}?${new URLSearchParams({ size })}`,
      }];
    });
  }));
  return NextResponse.json(socialProducts, { headers: { "Cache-Control": "public, max-age=120" } });
}
