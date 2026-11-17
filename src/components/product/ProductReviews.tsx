"use client";

import { useEffect, useState, type FormEvent } from "react";
import styles from "./ProductReviews.module.css";

type Review = { id: number; name: string; rating: number; body: string; updated: number; yes: number; no: number; myVote: 0 | 1 | null };
type Reviews = {
  reviews: Review[];
  distribution: { rating: number; count: number }[];
  own: { name: string; rating: number; body: string; status: "pending" | "published" | "rejected" } | null;
};
const stars = [5, 4, 3, 2, 1];
const button = "rounded-md border border-brand-olive/30 px-3 py-2 disabled:opacity-50";
const topics = ["качество", "красота", "серебро", "подарок", "размер", "доставка", "блеск", "упаковка"];

export function ProductReviews({ slug }: { slug: string }) {
  const endpoint = `/api/reviews/${encodeURIComponent(slug)}`;
  const [data, setData] = useState<Reviews>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState("new");
  const [query, setQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [limit, setLimit] = useState(8);
  const [draftRating, setDraftRating] = useState(0);

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
  const average = count ? score / count : 0;
  const search = query.trim().toLocaleLowerCase("ru-RU");
  const reviews = (data?.reviews ?? []).filter((review) => {
    const text = `${review.name} ${review.body}`.toLocaleLowerCase("ru-RU");
    return (ratingFilter === null || review.rating === ratingFilter)
      && (!search || text.includes(search))
      && (!topic || review.body.toLocaleLowerCase("ru-RU").includes(topic));
  });
  if (sort === "helpful") reviews.sort((a, b) => (b.yes - b.no) - (a.yes - a.no));
  if (sort === "high") reviews.sort((a, b) => b.rating - a.rating);
  if (sort === "low") reviews.sort((a, b) => a.rating - b.rating);
  const availableTopics = topics.filter((word) =>
    data?.reviews.some((review) => review.body.toLocaleLowerCase("ru-RU").includes(word)));
  const hasFilters = Boolean(query || topic || ratingFilter !== null);

  return (
    <section id="product-reviews" aria-labelledby="product-reviews-title" className={styles.section}>
      <h2 id="product-reviews-title">Отзывы наших покупателей</h2>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {!data && !error && <p role="status">Загружаем отзывы…</p>}
      {data && <>
        <div className={styles.overview}>
          <div>
            <h3>Отзывы</h3>
            <p className={styles.intro}>Узнайте, как покупатели оценили украшение. Выберите оценку, чтобы отфильтровать отзывы.</p>
            <div className={styles.distribution}>
              {stars.map((rating) => {
                const amount = data.distribution.find((row) => row.rating === rating)?.count ?? 0;
                return <button key={rating} type="button" aria-pressed={ratingFilter === rating}
                  aria-label={`Оценка ${rating} из 5, отзывов: ${amount}`}
                  onClick={() => { setRatingFilter(ratingFilter === rating ? null : rating); setLimit(8); }}>
                  <span>{rating} ★</span>
                  <span className={styles.bar}><span style={{ width: `${count ? amount / count * 100 : 0}%` }} /></span>
                  <span>{amount}</span>
                </button>;
              })}
            </div>
          </div>
          <div className={styles.score}>
            <div className={styles.scoreLine}>
              <span className={styles.average}>{count ? average.toLocaleString("ru-RU", { maximumFractionDigits: 1 }) : "—"}</span>
              <div>
                <span className={styles.stars} aria-label={count ? `${average.toFixed(1)} из 5` : "Пока нет оценок"}>
                  <span aria-hidden="true">☆☆☆☆☆</span>
                  <span aria-hidden="true" className={styles.filledStars} style={{ width: `${average * 20}%` }}>★★★★★</span>
                </span>
                <p>Отзывов: {count}</p>
              </div>
            </div>
            <p>{count ? "Оценка на основе опубликованных отзывов" : "Поделитесь впечатлениями первыми"}</p>
          </div>
          <div className={styles.writeReview}>
            <h3>Оцените это украшение</h3>
            <div className={styles.ratingButtons} role="group" aria-label="Оставить оценку">
              {[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button"
                aria-label={`Написать отзыв с оценкой ${rating} из 5`}
                aria-pressed={editing && draftRating === rating}
                onClick={() => { setDraftRating(rating); setEditing(true); }}>
                <span aria-hidden="true">{editing && draftRating >= rating ? "★" : "☆"}</span>
              </button>)}
            </div>
            <button type="button" className={styles.editButton} aria-expanded={editing} aria-controls="product-review-form"
              onClick={() => { setDraftRating(data.own?.rating ?? 0); setEditing(!editing); }}>
              {editing ? "Закрыть форму" : data.own ? "Редактировать отзыв" : "Написать отзыв"}
            </button>
            {data.own?.status === "pending" && !notice && <p className={styles.notice}>Ваш отзыв на модерации.</p>}
            {data.own?.status === "rejected" && <p className={styles.notice}>Ваш отзыв не опубликован. Его можно отредактировать.</p>}
          </div>
        </div>

        {editing && <form id="product-review-form" onSubmit={save} className={styles.form}>
          <fieldset className="flex flex-wrap gap-3">
            <legend className="mb-2">Оценка товара</legend>
            {[1, 2, 3, 4, 5].map((rating) => (
              <label key={rating} className="flex items-center gap-1">
                <input name="rating" type="radio" value={rating} required checked={draftRating === rating} onChange={() => setDraftRating(rating)} />
                {rating} ★
              </label>
            ))}
          </fieldset>
          <label>Имя или псевдоним
            <input name="name" required minLength={2} maxLength={60} defaultValue={data.own?.name} />
          </label>
          <label>Ваш отзыв
            <textarea name="body" rows={4} required minLength={10} maxLength={2000} defaultValue={data.own?.body} />
          </label>
          <button type="submit" disabled={busy} className={button}>Отправить отзыв</button>
        </form>}

        <div className={styles.filters}>
          <label className={styles.search}>
            <span className="sr-only">Поиск по отзывам</span>
            <input type="search" placeholder="Поиск по отзывам" value={query}
              onChange={(event) => { setQuery(event.target.value); setLimit(8); }} />
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" />
            </svg>
          </label>
          {availableTopics.length > 0 && <div className={styles.topics} role="group" aria-label="Темы отзывов">
            {availableTopics.map((word) => <button key={word} type="button" aria-pressed={topic === word}
              onClick={() => { setTopic(topic === word ? "" : word); setLimit(8); }}>{word}</button>)}
          </div>}
          {hasFilters && <button className={styles.reset} type="button" onClick={() => {
            setQuery(""); setTopic(""); setRatingFilter(null); setLimit(8);
          }}>Сбросить фильтры</button>}
        </div>
        <div className={styles.resultsToolbar}>
          <p role="status">{reviews.length ? `1–${Math.min(limit, reviews.length)} из ${reviews.length} отзывов` : count ? "По вашему запросу отзывов нет" : "Пока нет отзывов"}</p>
          <label>Сортировать
            <select value={sort} onChange={(event) => { setSort(event.target.value); setLimit(8); }}>
              <option value="new">Сначала новые</option>
              <option value="helpful">Сначала полезные</option>
              <option value="high">С высокой оценкой</option>
              <option value="low">С низкой оценкой</option>
            </select>
          </label>
        </div>
        <div className={styles.list}>
          {reviews.slice(0, limit).map((review) => <article key={review.id} className={styles.review}>
            <div className={styles.author}>
              <p>{review.name}</p>
              <p className={styles.date}>{new Date(review.updated * 1000).toLocaleDateString("ru-RU")}</p>
            </div>
            <div className={styles.reviewContent}>
              <span aria-label={`Оценка ${review.rating} из 5`} className={styles.reviewStars}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
              <p className={styles.body}>{review.body}</p>
              <div className={styles.votes}>
                <span>Был ли отзыв полезен?</span>
                {([1, 0] as const).map((helpful) => (
                  <button key={helpful} type="button" disabled={busy} aria-pressed={review.myVote === helpful}
                    onClick={() => void send({ action: "vote", reviewId: review.id, helpful })}>
                    {helpful ? `Да (${review.yes})` : `Нет (${review.no})`}
                  </button>
                ))}
              </div>
            </div>
          </article>)}
        </div>
        {limit < reviews.length && <button type="button" className={styles.more} onClick={() => setLimit(limit + 8)}>Показать ещё отзывы</button>}
      </>}
    </section>
  );
}
