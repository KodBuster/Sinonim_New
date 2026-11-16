"use client";

import { useEffect, useState, type FormEvent } from "react";

type Review = { id: number; name: string; rating: number; body: string; updated: number; yes: number; no: number; myVote: 0 | 1 | null };
type Reviews = {
  reviews: Review[];
  distribution: { rating: number; count: number }[];
  own: { name: string; rating: number; body: string; status: "pending" | "published" | "rejected" } | null;
};
const stars = [5, 4, 3, 2, 1];
const button = "rounded-md border border-brand-olive/30 px-3 py-2 disabled:opacity-50";

export function ProductReviews({ slug }: { slug: string }) {
  const endpoint = `/api/reviews/${encodeURIComponent(slug)}`;
  const [data, setData] = useState<Reviews>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState("new");

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setData(await response.json());
      })
      .catch(() => { if (!controller.signal.aborted) setError("Не удалось загрузить отзывы. Обновите страницу."); });
    return () => controller.abort();
  }, [endpoint]);

  async function send(payload: object, saved = false) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (saved) {
        setEditing(false);
        setNotice("Отзыв отправлен на модерацию.");
      }
      const refreshed = await fetch(endpoint);
      if (!refreshed.ok) throw new Error("Не удалось обновить список отзывов.");
      setData(await refreshed.json());
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : "Не удалось сохранить изменения.");
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void send({ action: "save", name: fields.get("name"), body: fields.get("body"), rating: Number(fields.get("rating")) }, true);
  }

  const count = data?.distribution.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const score = data?.distribution.reduce((sum, row) => sum + row.rating * row.count, 0) ?? 0;
  const reviews = data ? [...data.reviews] : [];
  if (sort === "helpful") reviews.sort((a, b) => (b.yes - b.no) - (a.yes - a.no));

  return (
    <section id="product-reviews" aria-labelledby="product-reviews-title" className="mx-auto mt-10 max-w-5xl px-4 pb-8 text-brand-olive-dark">
      <h2 id="product-reviews-title" className="mb-5 font-heading text-2xl md:text-[1.75rem]">Отзывы</h2>
      {error && <p role="alert" className="my-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="my-3">{notice}</p>}
      {!data && !error && <p role="status">Загружаем отзывы…</p>}
      {data && <>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            {count > 0 ? <>
              <p className="font-semibold">{(score / count).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} из 5 · Отзывов: {count}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {stars.map((rating) => <li key={rating}>{rating} ★ · {data.distribution.find((row) => row.rating === rating)?.count ?? 0}</li>)}
              </ul>
            </> : <p>Пока нет отзывов</p>}
            {data.own?.status === "pending" && !notice && <p className="mt-2 text-sm">Ваш отзыв на модерации.</p>}
            {data.own?.status === "rejected" && <p className="mt-2 text-sm">Ваш отзыв не опубликован. Его можно отредактировать.</p>}
          </div>
          <button type="button" className={button} aria-expanded={editing} onClick={() => setEditing(!editing)}>
            {editing ? "Закрыть форму" : data.own ? "Редактировать отзыв" : "Оставить отзыв"}
          </button>
        </div>
        {editing && <form onSubmit={save} className="mb-6 grid max-w-xl gap-4 rounded-lg border border-brand-sand p-4">
          <fieldset className="flex flex-wrap gap-3">
            <legend className="mb-2">Оценка товара</legend>
            {[...stars].reverse().map((rating) => (
              <label key={rating} className="flex items-center gap-1">
                <input name="rating" type="radio" value={rating} required defaultChecked={data.own?.rating === rating} />
                {rating} ★
              </label>
            ))}
          </fieldset>
          <label className="grid gap-1">Имя или псевдоним
            <input name="name" className={button} required minLength={2} maxLength={60} defaultValue={data.own?.name} />
          </label>
          <label className="grid gap-1">Ваш отзыв
            <textarea name="body" className={button} rows={4} required minLength={10} maxLength={2000} defaultValue={data.own?.body} />
          </label>
          <button type="submit" disabled={busy} className={button}>Отправить отзыв</button>
        </form>}
        {reviews.length > 1 && <label className="mb-4 flex items-center gap-2 text-sm">Сортировать
          <select value={sort} onChange={(event) => setSort(event.target.value)} className={button}>
            <option value="new">Сначала новые</option>
            <option value="helpful">Сначала полезные</option>
          </select>
        </label>}
        {reviews.map((review) => <article key={review.id} className="border-t border-brand-sand py-4">
          <p className="font-semibold">{review.name}</p>
          <p className="my-1 text-sm"><span aria-label={`Оценка ${review.rating} из 5`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
            {" · "}{new Date(review.updated * 1000).toLocaleDateString("ru-RU")}</p>
          <p className="my-3 whitespace-pre-wrap break-words">{review.body}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Был ли отзыв полезен?</span>
            {([1, 0] as const).map((helpful) => (
              <button key={helpful} type="button" disabled={busy} aria-pressed={review.myVote === helpful}
                className={`${button} aria-pressed:bg-brand-sand`}
                onClick={() => void send({ action: "vote", reviewId: review.id, helpful })}>
                {helpful ? `Да (${review.yes})` : `Нет (${review.no})`}
              </button>
            ))}
          </div>
        </article>)}
      </>}
    </section>
  );
}
