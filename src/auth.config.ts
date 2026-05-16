import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe auth config — no bcrypt, no Prisma. Used by both the full
 * NextAuth instance (in src/auth.ts, where we add the Credentials provider)
 * and the middleware (Edge Runtime), which needs to be free of Node-only
 * dependencies.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [], // populated in src/auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as {
          id: string;
          role: Role;
          loginId: string | null;
          mustChangePassword: boolean;
        };
        token.id = u.id;
        token.role = u.role;
        token.loginId = u.loginId;
        token.mustChangePassword = u.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.loginId = (token.loginId as string | null) ?? null;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
