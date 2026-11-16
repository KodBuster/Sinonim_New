"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { ProductImage } from "@/components/catalog/ProductImage";
import { formatPrice, type Product, type ProductDetails } from "@/lib/products";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/checkout";
import { formatCaratWeight } from "@/lib/product-weight";
import styles from "./CartDrawer.module.css";

export function CartDrawer() {
  const { items, count, total, isOpen, closeCart, addItem, removeItem, updateQuantity } = useCart();
  const dialog = useRef<HTMLDialogElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    if (!element || !isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    fetch("/api/catalog?sort=new", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { products: Product[] }) => setProducts(data.products.filter((p) => p.inStock !== false && p.price > 0)))
      .catch(() => {});
    return () => controller.abort();
  }, [isOpen]);

  async function addRecommendation(product: Product) {
    setBusy(product.slug);
    setError("");
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.slug)}`);
      if (!response.ok) throw new Error();
      const { product: fresh } = await response.json() as { product: ProductDetails };
      if (!fresh || fresh.inStock === false || fresh.sizeOptions.length > 0) {
        setError("Откройте украшение, чтобы проверить наличие и выбрать размер.");
        return;
      }
      addItem({ productSlug: fresh.slug, name: fresh.name, image: fresh.image,
        price: fresh.price, stoneWeight: fresh.stoneWeight,
        stoneLabel: `${formatCaratWeight(fresh.stoneWeight)} карат`, size: null, artNo: fresh.artNo });
    } catch {
      setError("Не удалось добавить украшение. Попробуйте ещё раз.");
    } finally {
      setBusy(null);
    }
  }

  const candidates = products.filter((p) => !items.some((item) => item.productSlug === p.slug));
  const categories = ["earrings", "pendants", "rings", "bracelets"] as const;
  const recommendations = [0, 1].flatMap((index) => categories.flatMap((category) => {
    const product = candidates.filter((p) => p.category === category)[index];
    return product ? [product] : [];
  }));
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - total);

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="cart-drawer-title"
      onCancel={closeCart} onClick={(event) => { if (event.target === event.currentTarget) closeCart(); }}>
      <div className={styles.shell}>
        <section className={styles.bag}>
          <header className={styles.header}>
            <h2 id="cart-drawer-title">Ваша корзина ({count})</h2>
            <button autoFocus type="button" className={styles.icon} onClick={closeCart} aria-label="Закрыть корзину">×</button>
          </header>
          <div className={styles.delivery} aria-live="polite">
            <p>{remaining > 0 ? `До бесплатной доставки — ${formatPrice(remaining)}` : "Ваш заказ доставим бесплатно!"}</p>
            <progress max={FREE_DELIVERY_THRESHOLD} value={Math.min(total, FREE_DELIVERY_THRESHOLD)} aria-label="До бесплатной доставки" />
          </div>
          <div className={styles.items}>
            {items.length ? <>
              <p className={styles.ribbon}>Украшения, которые станут частью вашей истории</p>
              {items.map((item) => <article className={styles.item} key={item.id}>
                <Link href={`/products/${item.productSlug}`} onClick={closeCart} className={styles.image}>
                  <ProductImage src={item.image} alt={item.name} fill sizes="100px" className={styles.photo} />
                </Link>
                <div className={styles.info}>
                  <Link href={`/products/${item.productSlug}`} onClick={closeCart} className={styles.name}>{item.name}</Link>
                  <p className={styles.variant}>Серебро 925{item.size !== null ? ` · Размер: ${item.size}` : ""}</p>
                  <div className={styles.itemBottom}>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                    <div className={styles.quantity}>
                      <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`Уменьшить количество: ${item.name}`}>−</button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={`Увеличить количество: ${item.name}`}>+</button>
                    </div>
                  </div>
                </div>
                <button type="button" className={styles.remove} onClick={() => removeItem(item.id)} aria-label={`Удалить: ${item.name}`}>×</button>
              </article>)}
            </> : <div className={styles.empty}>
              <h3>Ваша корзина пока пуста</h3>
              <p>Найдите украшение, которое расскажет о вас.</p>
              <Link href="/shop" onClick={closeCart} className={styles.checkout}>Выбрать украшение</Link>
            </div>}
          </div>
          {items.length > 0 && <footer className={styles.footer}>
            <details className={styles.details}>
              <summary>Доставка и самовывоз <span aria-hidden="true">+</span></summary>
              <p>Бесплатная доставка от 30 000 ₽. Самовывоз из шоурума — бесплатно. Способ доставки можно выбрать при оформлении.</p>
            </details>
            <div className={styles.summary}>
              <div className={styles.total}><span>Итого</span><span>{formatPrice(total)}</span></div>
              <p>Стоимость доставки рассчитывается при оформлении</p>
              <Link href="/checkout" onClick={closeCart} className={styles.checkout}>Оформить заказ <span aria-hidden="true">→</span></Link>
              <span className={styles.payment}>Способ оплаты можно выбрать при оформлении</span>
            </div>
          </footer>}
        </section>
        {recommendations.length > 0 && <aside className={styles.recommendations} aria-label="Рекомендации к заказу">
          <h2>Дополните образ</h2>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.recommendationList}>
            {recommendations.map((product) => <article key={product.slug} className={styles.recommendation}>
              <Link href={`/products/${product.slug}`} onClick={closeCart} className={styles.recommendationImage}>
                <ProductImage src={product.image} alt={product.name} fill sizes="160px" className={styles.photo} />
              </Link>
              <Link href={`/products/${product.slug}`} onClick={closeCart} className={styles.name}>{product.name}</Link>
              <p>{formatPrice(product.price)}</p>
              {(product.sizeOptions?.length || product.category === "rings" || product.category === "bracelets") ?
                <Link href={`/products/${product.slug}`} onClick={closeCart} className={styles.add}>Выбрать размер</Link> :
                <button type="button" className={styles.add} disabled={busy !== null} onClick={() => void addRecommendation(product)}>{busy === product.slug ? "Добавляем…" : "В корзину"}</button>}
            </article>)}
          </div>
        </aside>}
      </div>
    </dialog>
  );
}
