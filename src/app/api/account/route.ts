import { NextRequest, NextResponse } from "next/server";
import { ACCOUNT_COOKIE, AccountApiError, accountRequest, parseAccountSession, type AccountSession } from "@/lib/advantshop/account";

const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" } as const;
const respond = (body: object, status = 200) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

type Customer = { id?: string; email?: string; firstName?: string; lastName?: string; phone?: string | number };
type Order = { id: number; number?: string; date?: string; sum?: number; status?: { name?: string } };

export async function GET(request: NextRequest) {
  const session = parseAccountSession(request.cookies.get(ACCOUNT_COOKIE)?.value);
  if (!session) return respond({ customer: null });

  try {
    const result = await accountRequest<Customer & { customer?: Customer }>("users/me", { session });
    const customer = result.customer ?? result;
    if (customer.id?.toLowerCase() !== session.userId.toLowerCase()) throw new AccountApiError(401);
    let orders: object[] = [];
    let ordersUnavailable = false;
    let hasMoreOrders = false;
    const page = Math.max(1, Math.min(1000, Number(request.nextUrl.searchParams.get("page")) || 1));
    try {
      const payload = await accountRequest<Order[] | { orders?: Order[]; pagination?: { totalPageCount?: number } }>(
        `orders/me?page=${Math.floor(page)}&itemsPerPage=20&loadBillingApiLink=false`, { session },
      );
      const rows = Array.isArray(payload) ? payload : payload.orders;
      if (!Array.isArray(rows)) throw new Error("Unexpected orders payload");
      hasMoreOrders = Array.isArray(payload) ? rows.length === 20 : (payload.pagination?.totalPageCount ?? page) > page;
      orders = rows.map((order) => ({
        id: order.id, number: order.number ?? String(order.id),
        date: order.date, sum: order.sum, status: order.status?.name,
      }));
    } catch {
      ordersUnavailable = true;
    }
    return respond({
      customer: { firstName: customer.firstName, lastName: customer.lastName, email: customer.email, phone: customer.phone },
      orders, ordersUnavailable, hasMoreOrders,
    });
  } catch (error) {
    if (error instanceof AccountApiError && error.status === 401) {
      const response = respond({ customer: null });
      response.cookies.set(ACCOUNT_COOKIE, "", { ...cookieOptions, maxAge: 0 });
      return response;
    }
    return respond({ error: "Кабинет временно недоступен. Попробуйте позже." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site" || !request.headers.get("content-type")?.startsWith("application/json")) {
    return respond({ error: "Недопустимый запрос" }, 400);
  }
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 256) {
    return respond({ error: "Введите электронную почту и пароль." }, 400);
  }

  try {
    const result = await accountRequest<Partial<AccountSession>>("users/signin", { credentials: { email, password } });
    const value = `${result.userId}.${result.userKey}`;
    if (!parseAccountSession(value)) throw new AccountApiError(502);
    const response = respond({ ok: true });
    response.cookies.set(ACCOUNT_COOKIE, value, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch (error) {
    if (error instanceof AccountApiError && error.status === 401) {
      return respond({ error: "Проверьте электронную почту и пароль." }, 401);
    }
    return respond({ error: "Вход временно недоступен. Попробуйте позже." }, 503);
  }
}

export async function DELETE(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return respond({ error: "Недопустимый запрос" }, 400);
  const response = respond({ ok: true });
  response.cookies.set(ACCOUNT_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
