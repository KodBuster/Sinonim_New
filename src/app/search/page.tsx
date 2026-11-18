import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SearchResults } from "@/components/search/SearchResults";
import { buildPageMetadata } from "@/lib/metadata";
import { DEFAULT_CATALOG_SORT, SORT_OPTIONS } from "@/lib/products";
import { getSearchProducts } from "@/lib/search-service";
import { getSiteUrl } from "@/lib/site-url";

type PageProps = {
  searchParams: Promise<{ q?: string; sort?: string }>;
};

function resolveSearchSort(raw?: string) {
  const value = raw?.trim() || DEFAULT_CATALOG_SORT;
  return SORT_OPTIONS.some((option) => option.id === value)
    ? value
    : DEFAULT_CATALOG_SORT;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const hasQuery = query.length > 0;
  const baseMetadata = buildPageMetadata({
    title: hasQuery ? `Поиск: ${query} — Синоним` : "Поиск — Синоним",
    description:
      "Поиск украшений из серебра 925 с ограненными синтетическими алмазами в каталоге Синоним.",
    path: "/search",
    noIndex: hasQuery,
    robotsFollow: hasQuery,
  });

  if (!hasQuery) {
    return baseMetadata;
  }

  return {
    ...baseMetadata,
    alternates: {
      canonical: `${getSiteUrl()}/search`,
    },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, sort: sortParam } = await searchParams;
  const query = q?.trim() ?? "";
  const sort = resolveSearchSort(sortParam);

  let products: Awaited<ReturnType<typeof getSearchProducts>> = [];
  let error: string | undefined;

  if (query) {
    try {
      products = await getSearchProducts(query, { sort });
    } catch (err) {
      console.error("Search page error:", err);
      error =
        err instanceof Error
          ? err.message === "terminated" || err.message.includes("fetch failed")
            ? "Поиск не ответил вовремя. Попробуйте обновить страницу."
            : err.message
          : "Не удалось выполнить поиск";
    }
  }

  return (
    <>
      <Header />
      <main>
        <SearchResults
          query={query}
          products={products}
          error={error}
          sort={sort}
        />
      </main>
      <Footer />
    </>
  );
}
