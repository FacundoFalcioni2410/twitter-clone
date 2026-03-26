import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/types";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith(ROUTES.LOGIN) || pathname.startsWith(ROUTES.REGISTER);
  const isProtectedRoute = pathname.startsWith(ROUTES.HOME);

  const token = request.cookies.get("session")?.value;
  const user = token ? await verifyToken(token) : null;

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL(ROUTES.HOME, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
