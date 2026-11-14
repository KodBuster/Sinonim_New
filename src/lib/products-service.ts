import { unstable_cache } from "next/cache";
import {
  fetchAdvantShopProducts,
  loadAdvantShopProductDetails,
} from "@/lib/advantshop/catalog";
import { findProductBySlug } from "@/lib/product-slug";
import {
  CATALOG_REVALIDATE_SECONDS,
  isAdvantShopConfigured,
} from "@/lib/advantshop/config";
import {
  FW2026_COLLECTION,
  isFw2026ProductId,
} from "@/lib/collections";
import {
  GIFT_SOURCE_CATEGORIES,
  getGiftPeriodId,
  getSecondsUntilNextGiftRefresh,
  pickGiftProducts,
} from "@/lib/gift-products";
import { getComplectSiblings } from "@/lib/product-complect";
import {
  PRODUCTS,
  getProductBySlug as getStaticProductBySlug,
  getProductDetails as getStaticProductDetails,
  getRelatedProducts as getStaticRelatedProducts,
  type CategorySlug,
  type Product,
  type ProductDetails,
} from "@/lib/products";

const getCachedAdvantShopCatalog = unstable_cache(
  async (categoryKey: string, sort: string) => {
    const category =
      categoryKey === "all" ? undefined : (categoryKey as CategorySlug);
    return fetchAdvantShopProducts({ category, sort });
  },
  ["advantshop-catalog"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["catalog"] }
);

const getCachedGiftCatalog = unstable_cache(
  async (periodId: string, sort: string) => {
    if (isAdvantShopConfigured()) {
      const lists = await Promise.all(
        GIFT_SOURCE_CATEGORIES.map((category) =>
          getCachedAdvantShopCatalog(category, "default")
        )
      );
      return pickGiftProducts(lists.flat(), sort, periodId);
    }

    return pickGiftProducts(PRODUCTS, sort, periodId);
  },
  ["gift-catalog"],
  {
    revalidate: 86_400,
    tags: ["gift-catalog"],
  }
);

async function getGiftCatalogProducts(sort: string): Promise<Product[]> {
  const periodId = getGiftPeriodId();
  return getCachedGiftCatalog(periodId, sort);
}

export function getGiftCatalogCacheSeconds(): number {
  return getSecondsUntilNextGiftRefresh();
}

export async function getCatalogProducts(options?: {
  category?: CategorySlug;
  sort?: string;
}): Promise<Product[]> {
  const sort = options?.sort ?? "new";

  if (options?.category === "gifts") {
    try {
      return await getGiftCatalogProducts(sort);
    } catch (error) {
      console.error("Gift catalog unavailable:", error);
      return pickGiftProducts(PRODUCTS, sort);
    }
  }

  if (isAdvantShopConfigured()) {
    try {
      return await getCachedAdvantShopCatalog(
        options?.category ?? "all",
        sort
      );
    } catch (error) {
      console.error("AdvantShop catalog unavailable:", error);
    }
  }

  let products = [...PRODUCTS];

  if (options?.category) {
    products = products.filter((product) => product.category === options.category);
  }

  if (sort === "price-asc") {
    products.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    products.sort((a, b) => b.price - a.price);
  } else if (sort === "new") {
    products.sort((a, b) => Number(b.isNew) - Number(a.isNew));
  }

  return products;
}

async function getAdvantShopProductList(options?: {
  includeOutOfStock?: boolean;
}): Promise<Product[]> {
  if (options?.includeOutOfStock && isAdvantShopConfigured()) {
    try {
      return await fetchAdvantShopProducts({ includeOutOfStock: true });
    } catch (error) {
      console.error(
        "AdvantShop out-of-stock catalog unavailable, falling back:",
        error,
      );
    }
  }

  return getCatalogProducts();
}

export async function getProductBySlug(
  slug: string,
  options?: { includeOutOfStock?: boolean },
): Promise<Product | undefined> {
  const products = await getAdvantShopProductList(options);
  const fromShop = findProductBySlug(products, slug);
  if (fromShop) return fromShop;
  return getStaticProductBySlug(slug);
}

export async function getProductDetails(
  slug: string,
  options?: { includeOutOfStock?: boolean },
): Promise<ProductDetails | undefined> {
  const products = await getAdvantShopProductList(options);
  const summary = findProductBySlug(products, slug);

  if (summary) {
    try {
      const product = await loadAdvantShopProductDetails(summary);
      // Полная карточка из AdvantShop — как есть (галерея тоже оттуда).
      if (product) return product;
    } catch (error) {
      console.error(`AdvantShop product "${slug}" unavailable:`, error);
    }

    // Catalog summary is enough to render the card if details API fails.
    // Если в summary мало фото — берём локальную галерею из static (для вёрстки карусели).
    const staticDetails = getStaticProductDetails(slug);
    const summaryImages = summary.images?.length
      ? summary.images
      : [summary.image];
    const images =
      summaryImages.length >= 2
        ? summaryImages
        : staticDetails?.images?.length
          ? staticDetails.images
          : summaryImages;

    return {
      ...summary,
      description: summary.description ?? staticDetails?.description ?? "",
      images,
      // Локальный videoUrl для вёрстки, если у summary нет своего ролика по artNo
      videoUrl: summary.videoUrl ?? staticDetails?.videoUrl,
      color: summary.color ?? "",
      clarity: summary.clarity ?? "",
      cut: summary.cut ?? "",
      metal: summary.metal ?? "Серебро 925",
      sizeOptions: summary.sizeOptions ?? [],
      stoneVariants: [
        {
          weight: summary.stoneWeight,
          label: String(summary.stoneWeight),
          price: summary.price,
        },
      ],
    };
  }

  return getStaticProductDetails(slug);
}

export async function getRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[]> {
  const catalog = await getCatalogProducts({ category: product.category });
  return catalog.filter((item) => item.id !== product.id).slice(0, limit);
}

export async function getComplectProducts(
  product: Product,
  limit = 3
): Promise<Product[]> {
  if (!product.setArtNos?.length) return [];

  const catalog = await getCatalogProducts();
  return getComplectSiblings(product, catalog, limit);
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (isAdvantShopConfigured()) {
    const products = await getCatalogProducts();
    const slugSet = new Set(slugs);
    const order = new Map(slugs.map((slug, index) => [slug, index]));
    return products
      .filter((product) => slugSet.has(product.slug))
      .sort(
        (a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0)
      );
  }

  return slugs
    .map((slug) => getStaticProductBySlug(slug))
    .filter((product): product is Product => product !== undefined);
}

export function getCatalogSource(): "advantshop" | "static" {
  return isAdvantShopConfigured() ? "advantshop" : "static";
}

const FEATURED_CATEGORY_SLUGS: CategorySlug[] = [
  "rings",
  "earrings",
  "pendants",
  "bracelets",
];

function pickRandomProduct(products: Product[]): Product | undefined {
  if (!products.length) return undefined;
  const index = Math.floor(Math.random() * products.length);
  return products[index];
}

export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const catalog = await getCatalogProducts();
    const picks = FEATURED_CATEGORY_SLUGS.map((category) =>
      pickRandomProduct(catalog.filter((product) => product.category === category))
    );

    const featured = picks.filter(
      (product): product is Product => product !== undefined
    );
    if (featured.length) return featured;
  } catch (error) {
    console.error("Failed to load featured products:", error);
  }

  return FEATURED_CATEGORY_SLUGS.map((category) =>
    pickRandomProduct(PRODUCTS.filter((product) => product.category === category))
  ).filter((product): product is Product => product !== undefined);
}

function sortCollectionProducts(products: Product[], sort: string): Product[] {
  const next = [...products];
  if (sort === "price-asc") {
    next.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    next.sort((a, b) => b.price - a.price);
  } else if (sort === "new") {
    next.sort((a, b) => Number(b.isNew) - Number(a.isNew));
  }
  return next;
}

/** Товары коллекции FW 2026 (канонические productId производителя). */
export async function getFw2026CollectionProducts(options?: {
  sort?: string;
}): Promise<Product[]> {
  const sort = options?.sort ?? "default";
  const catalog = await getCatalogProducts({ sort });
  const collection = catalog.filter((product) => isFw2026ProductId(product.id));

  if (collection.length) {
    return sortCollectionProducts(collection, sort);
  }

  // Fallback на статику, если ID ещё не в ответе AdvantShop.
  return sortCollectionProducts(
    PRODUCTS.filter((product) => isFw2026ProductId(product.id)),
    sort,
  );
}

export function getFw2026CollectionMeta() {
  return FW2026_COLLECTION;
}
