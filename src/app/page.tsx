import { RedesignHome } from "@/components/redesign/RedesignHome";
import { connection } from "next/server";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildHomeJsonLd } from "@/lib/home-schema";
import { buildPageMetadata } from "@/lib/metadata";
import { getProductDetails } from "@/lib/products-service";

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
    name: "Браслет теннисный из серебра 925 с ограненными синтетическими алмазами 0,434 г",
    image: "/images/social-194-030210.jpg",
    variants: [
      { article: "194-030210-1", size: "16.5", price: 93400 },
      { article: "194-030210-11", size: "18.5", price: 101900 },
    ],
  },
  {
    slug: "braslet-iz-serebra-925-s-ogranennym-sinteticheskim-almazom-0-004-g-0-02-karat-serebro-925-11554",
    name: "Браслет из серебра 925 с ограненным синтетическим алмазом 0,004 г",
    image: "/images/social-194-032002.jpg",
    variants: [{ article: "194-032002-5", size: "16.0+4", price: 5900 }],
  },
];

export default async function HomePage() {
  await connection();
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
  return (
    <>
      <JsonLd data={buildHomeJsonLd()} />
      <RedesignHome socialProducts={socialProducts} />
      <Footer />
    </>
  );
}
