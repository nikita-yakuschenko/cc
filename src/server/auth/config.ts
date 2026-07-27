import type { NextAuthConfig } from "next-auth";

export type AppRole = "USER" | "MANAGER" | "ADMIN";

declare module "next-auth" {
  interface User {
    role: AppRole;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: AppRole;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
  }
}

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      if (pathname.startsWith("/admin")) {
        return isLoggedIn;
      }
      if (pathname === "/login" && isLoggedIn) {
        return Response.redirect(new URL("/admin", request.nextUrl));
      }
      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
