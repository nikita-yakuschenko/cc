import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";
import { BitrixProvider, syncBitrixUser, type BitrixProfile } from "@/server/auth/bitrix";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [BitrixProvider()],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider !== "bitrix" || !profile) return false;
      const user = await syncBitrixUser(profile as BitrixProfile);
      return !!user;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "bitrix" && profile) {
        const user = await syncBitrixUser(profile as BitrixProfile);
        if (!user) {
          throw new Error("Bitrix user sync failed");
        }
        token.id = user.id;
        token.role = user.role;
        return token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
