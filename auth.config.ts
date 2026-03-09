import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/trackers", "/settings"];
const authRoutes = ["/login", "/register"];
const blockedAuthHosts = new Set(["0.0.0.0", "127.0.0.1", "localhost"]);

function toSafeOrigin(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    if (blockedAuthHosts.has(parsed.hostname)) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function resolvePublicBaseUrl(baseUrl: string): string {
  return (
    toSafeOrigin(process.env.AUTH_URL) ??
    toSafeOrigin(process.env.NEXTAUTH_URL) ??
    toSafeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    toSafeOrigin(baseUrl) ??
    baseUrl
  );
}

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      const publicBaseUrl = resolvePublicBaseUrl(baseUrl);

      if (url.startsWith("/")) {
        return `${publicBaseUrl}${url}`;
      }

      try {
        const targetUrl = new URL(url);
        if (targetUrl.origin === publicBaseUrl) {
          return targetUrl.toString();
        }
      } catch {
        return publicBaseUrl;
      }

      return publicBaseUrl;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isAuthenticated = !!auth?.user;
      const isProtectedRoute = protectedRoutes.some((r) => nextUrl.pathname.startsWith(r));
      const isAuthRoute = authRoutes.some((r) => nextUrl.pathname.startsWith(r));

      if (isProtectedRoute && !isAuthenticated) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (isAuthRoute && isAuthenticated) {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
};
