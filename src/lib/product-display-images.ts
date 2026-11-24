import { resolveProductDisplaySku } from "./product-display-names";

export function getProductDisplayImage(artNo: string | undefined, slug: string, fallback: string): string {
  const sku = resolveProductDisplaySku(artNo);
  if (sku === "191-048025" || slug.endsWith("-11545")) return "/images/191-048025_1.png";
  if (sku === "JYE60210L" || slug.endsWith("-12895")) return "/images/JYE60210L_1.png";
  return fallback;
}

export function getProductDisplayImages(artNo: string | undefined, slug: string, images: string[]): string[] {
  const first = getProductDisplayImage(artNo, slug, images[0] ?? "");
  return first ? [first, ...images.slice(1).filter(image => image !== first)] : images;
}
