export const socialProductsBySlug = [
  {
    slug: "braslet-tennisnyy-iz-serebra-925-s-ogranennymi-sinteticheskimi-almazami-0-434-g-2-17-karat-serebro-925-11537",
    name: "Браслет теннисный из серебра 925 с ограненными синтетическими алмазами 0,434 г",
    image: "/images/social-194-030210.jpg",
    variants: [
      { article: "194-030210-1", size: "16.5", price: 93400 },
      { article: "194-030210-11", size: "18.5", price: 101900 },
    ],
  },
  {
    slug: "braslet-iz-serebra-925-s-ogranennym-sinteticheskim-almazom-0-004-g-0-02-karat-serebro-925-11554",
    name: "Браслет из серебра 925 с ограненным синтетическим алмазом 0,004 г",
    image: "/images/social-194-032002.jpg",
    variants: [{ article: "194-032002-5", size: "16.0+4", price: 5900 }],
  },
];

export const homeSocialProducts = Object.fromEntries(socialProductsBySlug.flatMap((product) =>
  product.variants.map(({ article, size, price }) => [article, {
    name: product.name,
    image: product.image,
    price,
    href: `/products/${product.slug}?${new URLSearchParams({ size })}`,
  }]),
));
