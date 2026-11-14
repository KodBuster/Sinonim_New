/**
 * Лайф-кадр по суффиксу в имени файла: -life / -look / -model
 * (регистр и разделитель - или _ не важны).
 * Пример: product-necklace-life.webp, showroom_look.jpg
 */
const LIFESTYLE_SUFFIX_RE = /(?:^|[_-])(life|look|model)(?=[._-]|$)/i;

/** true — лайф (cover на всю ячейку); false — студия (contain целиком). */
export function isLifestyleMediaSrc(src: string): boolean {
  if (!src) return false;

  try {
    const path = src.includes("://")
      ? new URL(src).pathname
      : src.split("?")[0] ?? src;
    const fileName = path.split("/").pop() ?? path;
    return LIFESTYLE_SUFFIX_RE.test(fileName);
  } catch {
    return LIFESTYLE_SUFFIX_RE.test(src);
  }
}

/** Режим вписывания слайда галереи: видео и лайф — cover, студия — contain. */
export function galleryObjectFitForSrc(
  src: string,
  kind: "image" | "video" = "image",
): "cover" | "contain" {
  if (kind === "video") return "cover";
  return isLifestyleMediaSrc(src) ? "cover" : "contain";
}
