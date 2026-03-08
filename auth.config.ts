import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/trackers", "/settings"];
const authRoutes = ["/login", "/register"];

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
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
    authorized({ auth, request: { nextUrl } }) {
      const isAuthenticated = !!auth?.user;
      const isProtectedRoute = protectedRoutes.some((r) =>
        nextUrl.pathname.startsWith(r)
      );
      const isAuthRoute = authRoutes.some((r) =>
        nextUrl.pathname.startsWith(r)
      );

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
