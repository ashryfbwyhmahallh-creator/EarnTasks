import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured, DEMO_COOKIE } from "@/lib/authConfig";

const PROTECTED = ["/dashboard", "/offers", "/referral", "/withdraw", "/account", "/proof"];
const PUBLIC_EXCEPTIONS = ["/creator/login", "/creator/register"];
const AUTH_PAGES = ["/login", "/register", "/creator/login", "/creator/register"];

function hasDemoSession(request: NextRequest): boolean {
  return Boolean(request.cookies.get(DEMO_COOKIE)?.value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // تجاوز فحص الصلاحيات تماماً للوحة الإدارة ولوحة صناع المحتوى لفتحها مباشرة للتصوير
  if (pathname.startsWith("/admin") || pathname.startsWith("/creator")) {
    return NextResponse.next();
  }

  const isPublicException = PUBLIC_EXCEPTIONS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isProtected = !isPublicException && PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!isSupabaseConfigured()) {
    if (isProtected && !hasDemoSession(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request: { headers: request.headers } });
  }

  const { response, user } = await updateSession(request);

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const dest = pathname.startsWith("/creator") ? "/creator" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cpalead|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)).*)"],
};