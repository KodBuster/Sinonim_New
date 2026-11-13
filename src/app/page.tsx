import { RedesignHome } from "@/components/redesign/RedesignHome";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildHomeJsonLd } from "@/lib/home-schema";
import { buildPageMetadata } from "@/lib/metadata";

export const revalidate = 300;

export const metadata = buildPageMetadata({
  title: "Синоним — ограненные синтетические алмазы в серебре",
  description:
    "Ювелирные украшения из серебра 925 с ограненными синтетическими алмазами. Шоурум в Москве.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildHomeJsonLd()} />
      <RedesignHome />
    </>
  );
}
