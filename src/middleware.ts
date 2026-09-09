import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("gg_token")?.value;
  const { pathname } = req.nextUrl;

  const isAuthRoute = pathname.startsWith("/api/auth");
  const isPublicApi = pathname.startsWith("/api/categories"); // categorías pueden ser públicas
  const isLoginPage = pathname === "/login" || pathname === "/register";
  const isStatic = pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".");

  if (isStatic || isAuthRoute || isPublicApi) return NextResponse.next();

  // proteger APIs privadas y la app
  const isApi = pathname.startsWith("/api/");
  if (!token) {
    if (isApi) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!isLoginPage) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  } else {
    // si ya está logueado y va a login/register, redirige a /
    if (isLoginPage) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
