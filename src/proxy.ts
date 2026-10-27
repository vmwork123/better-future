import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FERPA_COOKIE, ferpaFromCookie } from "./lib/ferpa";

const isDev = process.env.NODE_ENV === "development";

/** FERPA mode: the browser may load from and send to this app's own origin only. */
const ferpaCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

export function proxy(request: NextRequest) {
  const ferpa = ferpaFromCookie(request.cookies.get(FERPA_COOKIE)?.value);
  if (!ferpa && request.nextUrl.pathname === "/privacy") {
    return NextResponse.redirect(new URL("/home", request.url));
  }
  const res = NextResponse.next();
  if (!ferpa) return res;
  res.headers.set("Content-Security-Policy", ferpaCsp);
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), interest-cohort=()");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
