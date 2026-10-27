/**
 * FERPA mode: the privacy-protected version of the app.
 *
 * - Account profiles are encrypted on the device with a key derived from the student's password.
 * - Sign-in lasts until the tab closes or IDLE_LIMIT_MS of inactivity.
 * - Guests (no account) keep their work only in this tab's sessionStorage.
 * - The browser may only talk to this app's own origin (see the CSP in src/proxy.ts).
 *
 * Anyone can turn it on or off with the switch in the sidebar, which sets the FERPA_COOKIE cookie.
 * A school build (NEXT_PUBLIC_FERPA_MODE=1) is locked to FERPA mode and shows no switch.
 */
export const FERPA_BUILD = process.env.NEXT_PUBLIC_FERPA_MODE === "1";

export const FERPA_COOKIE = "aether-mode";

/** True when the cookie value (from document.cookie or a request) turns FERPA mode on. */
export function ferpaFromCookie(value: string | undefined) {
  return FERPA_BUILD || value === "ferpa";
}

/** Browser only: whether this page is in FERPA mode. Switching modes reloads the page. */
export function isFerpaMode() {
  if (FERPA_BUILD) return true;
  if (typeof document === "undefined") return false;
  const match = document.cookie.match(new RegExp(`(?:^|; )${FERPA_COOKIE}=([^;]*)`));
  return ferpaFromCookie(match?.[1]);
}

export function writeFerpaCookie(on: boolean) {
  document.cookie = `${FERPA_COOKIE}=${on ? "ferpa" : "normal"}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export const IDLE_LIMIT_MS = 30 * 60 * 1000;

/** Optional contact shown on the privacy page, e.g. privacy@district.edu. */
export const PRIVACY_CONTACT = process.env.NEXT_PUBLIC_PRIVACY_CONTACT || "";
