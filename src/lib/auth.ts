import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { authConfig } from "./auth.config"

const authResult = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role || "READER"
      }

      // Allow dynamically updating user session fields if triggered
      if (trigger === "update" && session) {
        if (session.role) token.role = session.role
        if (session.name) token.name = session.name
        if (session.picture) token.picture = session.picture
      }

      // Fetch fresh role/details from DB if not present
      if (token.id && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        })
        if (dbUser) {
          token.role = dbUser.role
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        (session.user as any).role = token.role as string
      }
      return session
    },
  },
})

export const { handlers: { GET, POST }, auth, signIn, signOut } = authResult
