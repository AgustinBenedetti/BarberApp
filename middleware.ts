import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Matches /{slug} and /{slug}/book — public tenant routes
const SLUG_PATTERN = /^\/[a-z0-9-]+(?:\/book(?:\/.*)?)?$/;

const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: Siempre llamar getUser() para refrescar el token.
  // No usar getSession() en el middleware — puede cachear datos desactualizados.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Root: public marketing page
  if (pathname === "/") return response;

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isOnboarding = pathname.startsWith("/onboarding");
  const isDashboard = pathname.startsWith("/dashboard");

  // Tenant public routes: /{slug} and /{slug}/book
  // Must be checked AFTER known system routes to avoid conflicts (e.g. /dashboard)
  const isTenantRoute =
    !isAuthRoute && !isOnboarding && !isDashboard && SLUG_PATTERN.test(pathname);

  if (isTenantRoute) return response;

  const tenantId = user?.app_metadata?.tenant_id as string | undefined;

  // Auth routes (/login, /register): redirect away if already authenticated
  if (isAuthRoute) {
    if (user) {
      const dest = tenantId ? "/dashboard" : "/onboarding/step-1";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return response;
  }

  // All remaining routes require authentication
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated but onboarding not started → send to step 1
  // (except when they're already navigating through the onboarding wizard)
  if (!tenantId && !isOnboarding) {
    return NextResponse.redirect(new URL("/onboarding/step-1", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Excluye rutas internas de Next.js y archivos estáticos.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
