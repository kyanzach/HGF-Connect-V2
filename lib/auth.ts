import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
        memberId: { label: "Member ID", type: "text" },
        biometricVerified: { label: "Biometric Verified", type: "text" },
      },
      async authorize(credentials) {
        // ── Biometric (WebAuthn) path ─────────────────────────────────────────
        // The login page sends biometricVerified:"true" + memberId after a
        // successful WebAuthn assertion. We trust it because the API route
        // (/api/auth/webauthn/login-verify) already verified the cryptographic
        // signature server-side before signIn() is ever called.
        if (credentials?.biometricVerified === "true" && credentials?.memberId) {
          const member = await db.member.findUnique({
            where: { id: Number(credentials.memberId) },
          });
          if (!member) return null;

          await db.member.update({
            where: { id: member.id },
            data: { lastLogin: new Date() },
          });

          return {
            id: String(member.id),
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            role: member.role,
            status: member.status,
            firstName: member.firstName,
            lastName: member.lastName,
            username: member.username,
            profilePicture: member.profilePicture,
          };
        }

        // ── Password path ─────────────────────────────────────────────────────
        if (!credentials?.username || !credentials?.password) return null;

        const identifier = credentials.username as string;
        const password = credentials.password as string;

        // Find member by username OR email
        const member = await db.member.findFirst({
          where: {
            OR: [
              { username: identifier },
              { email: identifier },
            ],
          },
        });

        if (!member || !member.password) return null;

        const passwordMatch = await bcrypt.compare(password, member.password);
        if (!passwordMatch) return null;

        // Update last_login
        await db.member.update({
          where: { id: member.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: String(member.id),
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          role: member.role,
          status: member.status,
          firstName: member.firstName,
          lastName: member.lastName,
          username: member.username,
          profilePicture: member.profilePicture,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as any).role;
        token.status = (user as any).status;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.username = (user as any).username;
        token.profilePicture = (user as any).profilePicture;
      }
      // Re-fetch profile picture from DB when session.update() is called
      if (trigger === "update" && token.id) {
        const numericId = parseInt(String(token.id), 10);
        if (!Number.isNaN(numericId)) {
          const fresh = await db.member.findUnique({
            where: { id: numericId },
            select: { profilePicture: true },
          });
          if (fresh) token.profilePicture = fresh.profilePicture;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
        (session.user as any).firstName = token.firstName;
        (session.user as any).lastName = token.lastName;
        (session.user as any).username = token.username;
        (session.user as any).profilePicture = token.profilePicture;
      }
      return session;
    },
  },
});
