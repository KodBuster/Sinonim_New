import { headers } from "next/headers";
import { getSiteUrl } from "./site-url";

export async function getRequestSiteUrl(): Promise<string> {
  const incoming = await headers();
  const host = (incoming.get("x-forwarded-host") ?? incoming.get("host"))?.split(",")[0].trim();
  if (!host) return getSiteUrl();
  const forwardedProtocol = incoming.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https";
  try {
    const url = new URL(`${protocol}://${host}`);
    return url.host === host && !url.username && !url.password ? url.origin : getSiteUrl();
  } catch {
    return getSiteUrl();
  }
}
