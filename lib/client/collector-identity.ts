import type { CallbackResult, Settings } from "@netlify/identity";

export type Identity = typeof import("@netlify/identity");
export type IdentityStartup = { identity: Identity; settings: Settings | null; callback: CallbackResult | null; available: boolean; callbackError: string | null };
const callbackKeys = ["access_token", "refresh_token", "token_type", "expires_in", "expires_at", "confirmation_token", "recovery_token", "invite_token", "email_change_token", "error", "error_description", "error_code"];
let startup: Promise<IdentityStartup> | undefined;

export function identityTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("Identity startup timed out.")), 8000); });
  return Promise.race([operation, timeout]).finally(() => { if (timer) clearTimeout(timer); });
}

/** Remove only recognised failed auth parameters, retaining unrelated app fragments. */
export function invalidCallbackUrl(href: string): string | null {
  const url = new URL(href);
  const params = new URLSearchParams(url.hash.slice(1));
  if (!callbackKeys.some(key => params.has(key))) return null;
  callbackKeys.forEach(key => params.delete(key));
  url.hash = params.toString();
  return url.href;
}

export async function discoverIdentity(identity: Pick<Identity, "handleAuthCallback" | "getSettings">, page: Pick<Location, "href" | "protocol" | "hostname">, replaceUrl: (href: string) => void) {
  let callback: CallbackResult | null = null;
  let callbackError: string | null = null;
  try { callback = await identityTimeout(identity.handleAuthCallback()); }
  catch (cause) {
    const status = cause && typeof cause === "object" && "status" in cause ? cause.status : undefined;
    const cleaned = invalidCallbackUrl(page.href);
    if (cleaned && [400, 401, 403, 410, 422].includes(status as number)) {
      replaceUrl(cleaned);
      callbackError = "This sign-in link is invalid or has expired. Sign in normally or request a fresh link.";
    } else if (cleaned) callbackError = "The sign-in link could not be completed. Check your connection and the hosted app's Identity configuration, then retry.";
  }
  const local = page.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(page.hostname);
  const settings = local ? null : await identityTimeout(identity.getSettings());
  return { callback, callbackError, settings, available: !local };
}

/** The official SDK owns authentication, session cookies and credential storage. */
export function initialiseIdentity(): Promise<IdentityStartup> {
  if (!startup) startup = (async () => {
    const identity = await import("@netlify/identity");
    const result = await discoverIdentity(identity, window.location, href => window.history.replaceState(window.history.state, "", href));
    return { identity, ...result };
  })();
  return startup;
}
