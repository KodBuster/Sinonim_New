import { RedesignHome } from "@/components/redesign/RedesignHome";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildHomeJsonLd } from "@/lib/home-schema";
import { buildPageMetadata } from "@/lib/metadata";
import { getProductDetails } from "@/lib/products-service";
import { getProductSizePrice } from "@/lib/products";

export const revalidate = 300;

export const metadata = buildPageMetadata({
  title: "Синоним — ограненные синтетические алмазы в серебре",
  description:
    "Ювелирные украшения из серебра 925 с ограненными синтетическими алмазами. Шоурум в Москве.",
  path: "/",
});

const socialProductsBySlug = [
  {
    slug: "braslet-tennisnyy-iz-serebra-925-s-ogranennymi-sinteticheskimi-almazami-0-434-g-2-17-karat-serebro-925-11537",
    articles: ["194-030210-1", "194-030210-11"],
  },
  {
    slug: "braslet-iz-serebra-925-s-ogranennym-sinteticheskim-almazom-0-004-g-0-02-karat-serebro-925-11554",
    articles: ["194-032002-5"],
  },
];

export default async function HomePage() {
  const results = await Promise.allSettled(socialProductsBySlug.map(async ({ slug, articles }) => {
    const product = await getProductDetails(slug);
    if (!product) return [];
    return articles.flatMap((article) => {
      const size = Object.entries(product.sizeArtNos ?? {}).find(([, value]) => value === article)?.[0];
      if (!size) return [];
      return [[article, {
        name: product.name,
        image: product.image,
        price: getProductSizePrice(product, size),
        href: `/products/${product.slug}?${new URLSearchParams({ size })}`,
      }]] as const;
    });
  }));
  const socialProducts = Object.fromEntries(results.flatMap((result) => result.status === "fulfilled" ? result.value : []));
  return (
    <>
      <JsonLd data={buildHomeJsonLd()} />
      <RedesignHome socialProducts={socialProducts} />
      <Footer />
    </>
  );
}
