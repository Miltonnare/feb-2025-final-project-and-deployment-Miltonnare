import type { NextAuthConfig } from "next-auth"
import Github from "next-auth/providers/github"
import Google from "next-auth/providers/google"

export const authConfig = {
  providers: [
    Github({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnAdmin = nextUrl.pathname.startsWith("/admin")
      const isOnEditor = nextUrl.pathname.startsWith("/editor")

      if (isOnAdmin) {
        // Admin checks are performed here (role is loaded into session in auth.ts)
        return isLoggedIn && (auth.user as any)?.role === "ADMIN"
      }
      if (isOnDashboard || isOnEditor) {
        return isLoggedIn
      }
      return true
    },
  },
} satisfies NextAuthConfig
