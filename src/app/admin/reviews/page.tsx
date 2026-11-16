"use client";

import { useState, type FormEvent } from "react";

type PendingReview = { id: number; product: string; name: string; rating: number; body: string };
const control = "rounded border border-brand-sand px-3 py-2 disabled:opacity-50";

export default function ReviewModerationPage() {
  const [token, setToken] = useState("");
  const [pending, setPending] = useState<PendingReview[]>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setPending(undefined);
    try {
      const response = await fetch("/api/reviews/admin?moderation", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(response.status === 403 ? "Проверьте ключ модерации." : "Не удалось загрузить отзывы.");
      const result = await response.json();
      setPending(result.pending);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось загрузить отзывы.");
    } finally {
      setBusy(false);
    }
  }

  async function moderate(review: PendingReview, status: "published" | "rejected") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(review.product)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "moderate", reviewId: review.id, status }),
      });
      if (!response.ok) throw new Error();
      setPending((current) => current?.filter((item) => item.id !== review.id));
    } catch {
      setError("Не удалось сохранить решение. Проверьте ключ и попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 text-brand-olive-dark">
      <h1 className="mb-5 font-heading text-3xl">Модерация отзывов</h1>
      <form onSubmit={load} className="mb-5 flex flex-wrap items-end gap-3">
        <label className="grid gap-1">Ключ модерации
          <input type="password" autoComplete="off" required minLength={32} value={token}
            onChange={(event) => { setToken(event.target.value); setPending(undefined); }} className={control} />
        </label>
        <button type="submit" disabled={busy} className={control}>Загрузить отзывы</button>
      </form>
      {error && <p role="alert" className="my-3 text-red-700">{error}</p>}
      {pending?.length === 0 && <p>Нет отзывов на модерации.</p>}
      {pending?.map((review) => (
        <article key={review.id} className="border-t border-brand-sand py-4">
          <p className="font-semibold">{review.name} · {review.rating} из 5</p>
          <a href={`/products/${encodeURIComponent(review.product)}`} className="break-all text-sm underline">{review.product}</a>
          <p className="my-3 whitespace-pre-wrap break-words">{review.body}</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void moderate(review, "published")} className={control}>Опубликовать</button>
            <button type="button" disabled={busy} onClick={() => void moderate(review, "rejected")} className={control}>Отклонить</button>
          </div>
        </article>
      ))}
    </main>
  );
}
