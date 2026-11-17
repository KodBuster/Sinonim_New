import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products-service";
import { reviewsDb } from "@/lib/reviews-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };
const COOKIE = "sinonim-review-visitor";
const jsonError = (error: string, status: number) => NextResponse.json({ error }, { status });
const validSlug = (slug: string) => /^[a-z0-9][a-z0-9-]{0,239}$/i.test(slug);
const digest = (value: string) => createHash("sha256").update(value).digest();

function visitor(request: NextRequest) {
  const existing = request.cookies.get(COOKIE)?.value;
  const token = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : randomBytes(32).toString("hex");
  return { token, id: digest(token).toString("hex") };
}

function withVisitor(response: NextResponse, token: string) {
  response.cookies.set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/api/reviews", maxAge: 365 * 86400,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function isModerator(request: NextRequest) {
  const secret = process.env.REVIEWS_ADMIN_TOKEN;
  return Boolean(secret && secret.length >= 32 && timingSafeEqual(
    digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`),
  ));
}

export async function GET(request: NextRequest, { params }: Context) {
  const { slug } = await params;
  if (!validSlug(slug)) return jsonError("Товар не найден", 404);
  const db = reviewsDb();
  if (request.nextUrl.searchParams.has("moderation")) {
    if (!isModerator(request)) return jsonError("Нет доступа", 403);
    const pending = db.prepare(
      "SELECT id, product, name, rating, body, updated FROM reviews WHERE status = 'pending' ORDER BY updated, id LIMIT 100",
    ).all();
    return NextResponse.json({ pending }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (request.nextUrl.searchParams.has("summary")) {
    const distribution = db.prepare(
      "SELECT rating, COUNT(*) AS count FROM reviews WHERE product = ? AND status = 'published' GROUP BY rating",
    ).all(slug);
    return NextResponse.json({ distribution }, { headers: { "Cache-Control": "no-store" } });
  }
  const { token, id } = visitor(request);
  const reviews = db.prepare(`
    SELECT r.id, r.name, r.rating, r.body, r.updated,
      COUNT(CASE WHEN v.helpful = 1 THEN 1 END) AS yes,
      COUNT(CASE WHEN v.helpful = 0 THEN 1 END) AS no,
      MAX(CASE WHEN v.voter = ? THEN v.helpful END) AS myVote
    FROM reviews r LEFT JOIN review_votes v ON v.review = r.id
    WHERE r.product = ? AND r.status = 'published'
    GROUP BY r.id ORDER BY r.updated DESC, r.id DESC
    LIMIT 100
  `).all(id, slug);
  const distribution = db.prepare(
    "SELECT rating, COUNT(*) AS count FROM reviews WHERE product = ? AND status = 'published' GROUP BY rating",
  ).all(slug);
  const [own] = db.prepare("SELECT name, rating, body, status FROM reviews WHERE product = ? AND author = ?").all(slug, id);
  return withVisitor(NextResponse.json({ reviews, distribution, own: own ?? null }), token);
}

export async function POST(request: NextRequest, { params }: Context) {
  const { slug } = await params;
  if (!validSlug(slug)) return jsonError("Товар не найден", 404);
  if (request.headers.get("sec-fetch-site") === "cross-site"
    || !request.headers.get("content-type")?.startsWith("application/json")) {
    return jsonError("Недопустимый запрос", 400);
  }

  let data: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return jsonError("Запрос слишком большой", 413);
    data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
  } catch {
    return jsonError("Недопустимый запрос", 400);
  }
  const { action, reviewId } = data;
  if (action === "moderate") {
    if (!isModerator(request)) return jsonError("Нет доступа", 403);
    if (typeof reviewId !== "number" || !Number.isSafeInteger(reviewId)
      || (data.status !== "published" && data.status !== "rejected")) return jsonError("Недопустимое решение", 400);
    const result = reviewsDb().prepare("UPDATE reviews SET status = ? WHERE id = ? AND product = ?").run(data.status, reviewId, slug);
    return result.changes ? NextResponse.json({ ok: true }) : jsonError("Отзыв не найден", 404);
  }
  const { token, id } = visitor(request);
  if (action === "vote") {
    if (typeof reviewId !== "number" || !Number.isSafeInteger(reviewId)
      || (data.helpful !== 0 && data.helpful !== 1)) return jsonError("Недопустимый голос", 400);
    const result = reviewsDb().prepare(`
      INSERT INTO review_votes (review, voter, helpful)
      SELECT id, ?, ? FROM reviews WHERE id = ? AND product = ? AND status = 'published' AND author <> ?
      ON CONFLICT(review, voter) DO UPDATE SET helpful = excluded.helpful
    `).run(id, data.helpful, reviewId, slug, id);
    return result.changes ? withVisitor(NextResponse.json({ ok: true }), token) : jsonError("Этот отзыв нельзя оценить", 400);
  }
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const body = typeof data.body === "string" ? data.body.trim() : "";
  const rating = data.rating;
  if (action !== "save" || name.length < 2 || name.length > 60 || body.length < 10 || body.length > 2000
    || typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonError("Укажите имя, оценку и отзыв от 10 до 2000 символов", 400);
  }
  if (!await getProductBySlug(slug)) return jsonError("Товар не найден", 404);
  reviewsDb().prepare(`
    INSERT INTO reviews (product, author, name, rating, body) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(product, author) DO UPDATE SET name = excluded.name, rating = excluded.rating,
    body = excluded.body, status = 'pending', updated = unixepoch()
  `).run(slug, id, name, rating, body);
  return withVisitor(NextResponse.json({ ok: true }), token);
}
