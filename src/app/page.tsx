import { RedesignHome } from "@/components/redesign/RedesignHome";
import { homeSocialProducts } from "@/lib/home-social-products";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildHomeJsonLd } from "@/lib/home-schema";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Синоним — ограненные синтетические алмазы в серебре",
  description:
    "Ювелирные украшения из серебра 925 с ограненными синтетическими алмазами. Шоурум в Москве.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <link rel="stylesheet" href="/redesign/site.css?v=category-text-shadow" precedence="home" />
      <JsonLd data={buildHomeJsonLd()} />
      <RedesignHome socialProducts={homeSocialProducts} />
      <Footer />
    </>
  );
}
