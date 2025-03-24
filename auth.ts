/* eslint-disable @typescript-eslint/no-explicit-any */

import NextAuth, { Account, Profile, User } from "next-auth";
import GitHub from "next-auth/providers/github";
import { AUTHOR_BY_GITHUB_ID_QUERY } from "@/sanity/lib/queries";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/write-client";
import { JWT as NextAuthJWT } from "next-auth/jwt";
import { AdapterUser } from "next-auth/adapters";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [ GitHub({
    clientId: process.env.AUTH_GITHUB_ID as string,
    clientSecret: process.env.AUTH_GITHUB_SECRET as string,
  }),],
  callbacks: {
    async signIn({
      user,
      profile,
    }:{
      user: User | AdapterUser,
      profile? : Profile,
      account: Account | null
    }) {
      const { name, email, image } = user
      const { id, login, bio } = profile || {}
      const existingUser = await client
        .withConfig({ useCdn: false })
        .fetch(AUTHOR_BY_GITHUB_ID_QUERY, {
          id,
        });

      if (!existingUser) {
        await writeClient.create({
          _type: "AUTHOR_BY_GITHUB_ID_QUERY",
          id,
          name,
          username: login,
          email,
          image,
          bio: bio || "",
        });
      }

      return true;
    },
    async jwt({ token, account, profile }: { token: NextAuthJWT; account: Account | null; profile?: Profile }) {
      if (account && profile) {
        const user = await client
          .withConfig({ useCdn: false })
          .fetch(AUTHOR_BY_GITHUB_ID_QUERY, {
            id: profile?.id,
          });

        token.id = user?._id;
      }

      return token;
    },
    async session({ session, token }:{session:any, token:any}) {
      Object.assign(session, { id: token.id });
      // session.id = token.id
      return session;
    },
  },
});
