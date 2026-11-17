import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";
import { GET as getCatalogImage } from "@/app/api/advantshop-image/route";
import { isAllowedAdvantShopImageUrl } from "@/lib/advantshop/images";
import { getProductDetails } from "@/lib/products-service";

export const runtime = "nodejs";

async function readProductImage(src: string): Promise<Buffer> {
  const url = new URL(src, "https://local.invalid");
  const remote = url.pathname === "/api/advantshop-image" ? url.searchParams.get("src") : src;
  if (remote && isAllowedAdvantShopImageUrl(remote)) {
    const response = await getCatalogImage(new Request(`https://local.invalid/api/advantshop-image?src=${encodeURIComponent(remote)}`));
    if (!response.ok) throw new Error("Product image unavailable");
    return Buffer.from(await response.arrayBuffer());
  }

  const publicDir = resolve(process.cwd(), "public");
  const imagePath = resolve(publicDir, `.${decodeURIComponent(url.pathname)}`);
  if (url.origin !== "https://local.invalid" || !imagePath.startsWith(`${publicDir}${sep}`)) {
    throw new Error("Unsupported product image");
  }
  return readFile(imagePath);
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductDetails(slug);
  if (!product) return new Response(null, { status: 404 });

  try {
    const source = await readProductImage(product.images[0] ?? product.image);
    // Remove empty photo margins before fitting the whole piece into the preview.
    const cropped = await sharp(source).rotate().flatten({ background: "#ffffff" })
      .trim({ background: "#ffffff", threshold: 12 }).toBuffer();
    const image = await sharp(cropped)
      .resize(900, 1150, { fit: "contain", background: "#ffffff" })
      .extend({ top: 50, bottom: 50, left: 50, right: 50, background: "#ffffff" })
      .jpeg({ quality: 90 }).toBuffer();
    return new Response(new Uint8Array(image), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error(`Product share image failed for ${slug}:`, error);
    return new Response(null, { status: 502 });
  }
}
