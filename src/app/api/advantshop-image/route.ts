import { NextResponse } from "next/server";
import { isAllowedAdvantShopImageUrl } from "@/lib/advantshop/images";

function getMiddleImage(src: string): string | undefined {
  const url = new URL(src);
  const path = url.pathname.replace(
    /^(\/pictures\/product\/)big\/([^/]+)_big(\.[^/.]+)$/i,
    "$1middle/$2_middle$3",
  );
  if (path === url.pathname) return;
  url.pathname = path;
  return url.toString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src");

  if (!src || !isAllowedAdvantShopImageUrl(src)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  const headers: HeadersInit = {
    Accept: "image/*",
  };

  const storeCookie = process.env.ADVANTSHOP_STORE_COOKIE?.trim();
  if (storeCookie) {
    headers.Cookie = storeCookie;
  }

  const middle = getMiddleImage(src);
  for (const candidate of middle ? [src, middle] : [src]) {
    try {
      const response = await fetch(candidate, {
        headers,
        next: { revalidate: 86400 },
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.startsWith("image/")) {
        await response.body?.cancel();
        continue;
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 128) continue;

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": candidate === src
            ? "public, max-age=2592000, stale-while-revalidate=31536000"
            : "public, max-age=300",
        },
      });
    } catch {
      // Try the same photo at a smaller size if the original cannot be fetched.
    }
  }
  return NextResponse.json({ error: "Не удалось загрузить изображение" }, { status: 502 });
}
