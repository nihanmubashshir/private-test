import { NextResponse, type NextRequest } from "next/server";
import { deriveAuthState } from "@/lib/auth/state";
import { resolveRoute } from "@/lib/auth/route-guard";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { supabase, response, claims } = await updateSession(request);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const state = deriveAuthState({
    user: claims ? { id: claims.sub } : null,
    aal: { currentLevel: aal?.currentLevel ?? null, nextLevel: aal?.nextLevel ?? null },
  });

  const result = resolveRoute(state, request.nextUrl.pathname);
  if (result.action === "allow") {
    return response;
  }

  const redirectResponse = NextResponse.redirect(new URL(result.to, request.url));
  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)",
  ],
};
