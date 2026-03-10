import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register"];
const SLUG_PATTERN = /^\/[a-z0-9-]+(?:\/book(?:\/.*)?)?$/;

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

  // Rutas públicas de la landing por tenant: /{slug} y /{slug}/book
  if (SLUG_PATTERN.test(pathname)) {
    return response;
  }

  // Rutas de auth: redirigir al dashboard si ya está autenticado
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Rutas del dashboard: requieren autenticación
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
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
