import { getProductDisplayName } from "@/lib/product-display-names";

export const socialProductsBySlug = [
  {
    slug: "braslet-tennisnyy-iz-serebra-925-s-ogranennymi-sinteticheskimi-almazami-0-434-g-2-17-karat-serebro-925-11537",
    name: getProductDisplayName("194-030210", "Теннисный браслет"),
    image: "/images/social-194-030210.jpg",
    variants: [
      { article: "194-030210-1", size: "16.5", price: 93400 },
      { article: "194-030210-11", size: "18.5", price: 101900 },
    ],
  },
  {
    slug: "braslet-iz-serebra-925-s-ogranennym-sinteticheskim-almazom-0-004-g-0-02-karat-serebro-925-11554",
    name: getProductDisplayName("194-032002", "Браслет"),
    image: "/images/social-194-032002.jpg",
    variants: [{ article: "194-032002-5", size: "16.0+4", price: 5900 }],
  },
  {
    slug: "kole-iz-serebra-925-s-ogranennym-sinteticheskim-almazom-0-05-g-0-25-karat-serebro-925-10044",
    name: getProductDisplayName("195-020025", "Колье"),
    image: "/images/social-195-020025.jpg",
    variants: [{ article: "195-020025-14", size: "35.0+8", price: 16900 }],
  },
  {
    slug: "koltso-iz-serebra-925-s-ogranennymi-sinteticheskimi-almazami-0-025-g-s-dorozhkoy-0-13-karat-serebro-925-10032",
    name: getProductDisplayName("191-006010", "Кольцо"),
    image: "/images/social-191-006010.jpg",
    variants: [{ article: "191-006010-1", size: "16.5", price: 8900 }],
  },
  {
    slug: "sergi-pusety-iz-serebra-925-s-ogranennymi-sinteticheskimi-almazami-0-258-g-1-29-karat-serebro-925-12847",
    name: getProductDisplayName("803-03075", "Серьги"),
    image: "/images/social-803-03075.jpg",
    variants: [{ article: "803-03075", size: "", price: 59900 }],
  },
];

export const homeSocialProducts = Object.fromEntries(socialProductsBySlug.flatMap((product) =>
  product.variants.map(({ article, size, price }) => [article, {
    name: product.name,
    image: product.image,
    price,
    href: `/products/${product.slug}${size ? `?${new URLSearchParams({ size })}` : ""}`,
  }]),
));
