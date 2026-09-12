import type { AuthState } from "./state";

export type RouteResolution = { action: "allow" } | { action: "redirect"; to: string };

const AUTH_PATHS = ["/login", "/setup-2fa", "/verify-2fa"];

/**
 * Table-driven route rules: for each AuthState, `home` is both its "allow"
 * destination (see homeFor) and the redirect target when the current path
 * isn't in `isAllowed`. Extend this map (not nested ifs) for new states,
 * e.g. US-002's RECOVERY.
 */
const ROUTES: Record<AuthState, { home: string; isAllowed: (pathname: string) => boolean }> = {
  ANON: { home: "/login", isAllowed: (path) => path === "/login" },
  NEEDS_ENROLL: { home: "/setup-2fa", isAllowed: (path) => path === "/setup-2fa" },
  NEEDS_VERIFY: { home: "/verify-2fa", isAllowed: (path) => path === "/verify-2fa" },
  FULL: { home: "/", isAllowed: (path) => !AUTH_PATHS.includes(path) },
};

/** The "allow" destination for a given AuthState. */
export function homeFor(state: AuthState): string {
  return ROUTES[state].home;
}

/** Pure route guard: given the current AuthState and pathname, allow or redirect. */
export function resolveRoute(state: AuthState, pathname: string): RouteResolution {
  const route = ROUTES[state];
  return route.isAllowed(pathname) ? { action: "allow" } : { action: "redirect", to: route.home };
}
