import { getAdvantShopBaseUrl, getAdvantShopClientApiKey } from "./config";

export type AccountSession = { userId: string; userKey: string };
export const ACCOUNT_COOKIE = "sinonim-advantshop-account";

export function parseAccountSession(value?: string): AccountSession | undefined {
  const match = value?.match(/^([a-f0-9-]{36})\.([A-Za-z0-9+/=_-]{1,512})$/i);
  if (match) return { userId: match[1], userKey: match[2] };
}

export function accountLink(name: "ADVANTSHOP_REGISTER_URL" | "ADVANTSHOP_PASSWORD_RESET_URL") {
  try {
    const url = new URL(process.env[name] ?? "");
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export class AccountApiError extends Error {
  constructor(readonly status: number) {
    super("AdvantShop account request failed");
  }
}

export async function accountRequest<T>(
  path: string,
  options: { session?: AccountSession; credentials?: { email: string; password: string } } = {},
): Promise<T> {
  const base = new URL(process.env.ADVANTSHOP_ACCOUNT_BASE_URL || getAdvantShopBaseUrl());
  if (base.protocol !== "https:" || base.username || base.password) throw new AccountApiError(503);

  const url = new URL(`${base.pathname.replace(/\/$/, "")}/api/${path}`, base.origin);
  const apiKey = getAdvantShopClientApiKey();
  url.searchParams.set("apikey", apiKey);
  const headers = new Headers({ Accept: "application/json", "X-API-KEY": apiKey });
  if (options.session) {
    headers.set("X-API-USER-ID", options.session.userId);
    headers.set("X-API-USER-KEY", options.session.userKey);
  }
  if (options.credentials) headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    method: options.credentials ? "POST" : "GET",
    headers,
    body: options.credentials ? JSON.stringify(options.credentials) : undefined,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new AccountApiError(response.status);
  const data = await response.json() as T & { status?: string; errors?: string | string[] };
  if (data?.status === "error") {
    const message = [data.errors].flat().join(" ");
    const unauthorized = /не авторизован|неверн|не правильн|неправильн|invalid credentials/i.test(message);
    throw new AccountApiError(unauthorized ? 401 : 502);
  }
  return data;
}
