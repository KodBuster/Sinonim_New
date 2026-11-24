import { getProductDisplayName } from "@/lib/product-display-names";

export type RedesignProduct = {
  id: string;
  category: "rings" | "earrings" | "necklaces" | "bracelets";
  name: string;
  price: number;
  sku: string;
  slug: string;
  image: string;
};

export const ASSET = "/redesign";

export const NAV = [
  { label: "НОВАЯ КОЛЛЕКЦИЯ", href: "/collections/fw-2026" },
  { label: "КОЛЬЦА", href: "/shop/rings" },
  { label: "СЕРЬГИ", href: "/shop/earrings" },
  { label: "КОЛЬЕ", href: "/shop/pendants" },
  { label: "БРАСЛЕТЫ", href: "/shop/bracelets" },
  { label: "ПОДАРКИ", href: "/shop/gifts" },
  { label: "О БРЕНДЕ", href: "/about" },
  { label: "БЛОГ", href: "/blog" },
] as const;

export const COLLECTIONS = [
  {
    id: "rings",
    name: "Кольца",
    slogan: "Маленькое «да» себе",
    href: "/shop/rings",
    photo: "/images/Кольцо.png",
  },
  {
    id: "earrings",
    name: "Серьги",
    slogan: "Лови свой свет",
    href: "/shop/earrings",
    photo: "/images/Серьги.png",
  },
  {
    id: "necklaces",
    name: "Колье",
    slogan: "Ближе к сердцу",
    href: "/shop/pendants",
    photo: "/images/Колье.png",
  },
  {
    id: "bracelets",
    name: "Браслеты",
    slogan: "Блеск в каждом жесте",
    href: "/shop/bracelets",
    photo: "/images/Браслет.png",
  },
] as const;

export const PRODUCTS: RedesignProduct[] = [
  {
    id: "r01",
    category: "rings",
    name: getProductDisplayName("191-048025-7", "Кольцо"),
    price: 18500,
    sku: "191-048025-7",
    slug: "koltso-iz-serebra-925-s-ogranennym-sinteticheskim-almazom-0-05-g-0-25-karat-serebro-925-11545",
    image: "/images/191-048025_1.png",
  },
  {
    id: "r02",
    category: "rings",
    name: getProductDisplayName("191-025010-7", "Кольцо"),
    price: 7900,
    sku: "191-025010-7",
    slug: "koltso-iz-serebra-925-s-ogranennym-sinteticheskim-almazom-0-02-g-0-1-karat-serebro-925-11542",
    image: `${ASSET}/products/r02.jpg`,
  },
  {
    id: "r03",
    category: "rings",
    name: getProductDisplayName("191-024003-7", "Кольцо"),
    price: 5500,
    sku: "191-024003-7",
    slug: "koltso-iz-serebra-925-s-ogranennym-sinteticheskim-almazom-0-007-g-0-04-karat-serebro-925-11541",
    image: `${ASSET}/products/r03.jpg`,
  },
  {
    id: "r04",
    category: "rings",
    name: getProductDisplayName("191-038050-4", "Кольцо"),
    price: 39900,
    sku: "191-038050-4",
    slug: "koltso-iz-serebra-925-s-ogranennym-sinteticheskim-almazom-0-1-g-0-5-karat-serebro-925-10075",
    image: `${ASSET}/products/r04.jpg`,
  },
  {
    id: "e01",
    category: "earrings",
    name: getProductDisplayName("JYE60210L", "Серьги"),
    price: 59500,
    sku: "JYE60210L",
    slug: "sergi-s-brilliantom-0-2-karat-serebro-925-12895",
    image: "/images/JYE60210L_1.png",
  },
  {
    id: "n01",
    category: "necklaces",
    name: getProductDisplayName("JYN60328L-47", "Колье"),
    price: 33900,
    sku: "JYN60328L-47",
    slug: "kole-0-2-karat-serebro-925-12890",
    image: `${ASSET}/products/n01.jpg`,
  },
  {
    id: "b01",
    category: "bracelets",
    name: getProductDisplayName("JYB50576L-5", "Браслет"),
    price: 39950,
    sku: "JYB50576L-5",
    slug: "braslet-s-brilliantom-0-2-karat-serebro-925-12894",
    image: `${ASSET}/products/b01.jpg`,
  },
];

export const FEATURED_ORDER = ["r01", "e01", "n01", "b01", "r02", "r03", "r04"] as const;
export const BESTSELLER_ORDER = ["r01", "e01", "n01", "r02", "b01", "r03"] as const;

export const HERO_SLIDES = [
  {
    desktop: `${ASSET}/hero/desktop/hero-01-v01.webp`,
    mobile: `${ASSET}/hero/mobile/hero-01-v01.webp`,
    eyebrow: "МАЛЕНЬКОЕ «ДА» СЕБЕ",
    title: "Хочу. Просто потому, что красиво.",
    description: "То самое колье, которое хочется надеть сразу — и улыбнуться своему отражению.",
    href: "/shop/pendants",
    cta: "Найти своё колье",
  },
  {
    desktop: `${ASSET}/hero/desktop/hero-02-v02.webp`,
    mobile: `${ASSET}/hero/mobile/hero-02-v02.webp`,
    eyebrow: "ПОДАРОК СЕБЕ",
    title: "Увидеть. Влюбиться. Надеть.",
    description: "Серьги, в которых хочется ловить каждый взгляд и улыбаться своему отражению. Осталось выбрать свои.",
    href: "/shop/earrings",
    cta: "Выбрать свои серьги",
  },
  {
    desktop: `${ASSET}/hero/desktop/hero-03-v01.webp`,
    mobile: `${ASSET}/hero/mobile/hero-03-v01.webp`,
    eyebrow: "ПОВОД — ВАШЕ ЖЕЛАНИЕ",
    title: "Как приятно, когда это — вам.",
    description: "Открыть коробочку, примерить и не захотеть снимать. Подарите себе это чувство.",
    href: "/shop/rings",
    cta: "Порадовать себя",
  },
] as const;

export const PROMOS = [
  {
    id: "price",
    title: "Украшения до 15\u00A0000\u00A0₽",
    sub: "Маленькие детали. Большие чувства.",
    href: "/shop",
    desktop: `${ASSET}/promos/desktop/promo-price-v01.webp`,
    mobile: `${ASSET}/promos/mobile/promo-price-v01.webp`,
  },
  {
    id: "sets",
    title: "Сочетайте по-своему",
    sub: "Ваша история начинается с деталей.",
    href: "/shop",
    desktop: `${ASSET}/promos/desktop/promo-sets-v01.webp`,
    mobile: `${ASSET}/promos/mobile/promo-sets-v01.webp`,
  },
  {
    id: "gifts",
    title: "Повод — вы",
    sub: "Красивые знаки внимания каждый день.",
    href: "/shop/gifts",
    desktop: `${ASSET}/promos/desktop/promo-gifts-v01.webp`,
    mobile: `${ASSET}/promos/mobile/promo-gifts-v01.webp`,
  },
] as const;

export const JOURNAL = [
  {
    tag: "БРЕНД",
    title: "История СИНОНИМ",
    href: "/about",
    image: `${ASSET}/blog/blog-brand-v02.webp`,
  },
  {
    tag: "ПОЛЕЗНО",
    title: "Как выбрать размер",
    href: "/how-size-ring",
    image: `${ASSET}/blog/blog-sizes-v02.webp`,
  },
  {
    tag: "СТИЛЬ",
    title: "Искусство сочетаний",
    href: "/blog/kak-vybrat-ukrashenie-sem-pravil",
    image: "/images/Тёплый_портрет_с_подвеской_и_вазой.png",
  },
  {
    tag: "ГИД",
    title: "Бережный уход",
    href: "/blog",
    image: `${ASSET}/blog/blog-care-v02.webp`,
  },
] as const;

export const FEATURED_TABS = [
  { id: "all", label: "Все изделия" },
  { id: "rings", label: "Кольца" },
  { id: "earrings", label: "Серьги" },
  { id: "necklaces", label: "Колье" },
  { id: "bracelets", label: "Браслеты" },
] as const;

export function formatPrice(n: number) {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;
}

export function getProduct(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}

export function productsByIds(ids: readonly string[]) {
  return ids.map((id) => getProduct(id)).filter(Boolean) as RedesignProduct[];
}
