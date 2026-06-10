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
        otpVerified: { label: "OTP Verified", type: "text" },
      },
      async authorize(credentials) {
        // ── OTP Verified path ──────────────────────────────────────────────────
        // Triggered after successful account recovery / OTP verification.
        if (credentials?.otpVerified === "true" && credentials?.memberId) {
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as any).role;
        token.status = (user as any).status;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.username = (user as any).username;
        token.profilePicture = (user as any).profilePicture;
      }

      // Handle Impersonation
      if (trigger === "update" && session) {
        const currentRole = token.impersonator ? (token.impersonator as any).role : token.role;

        // ONLY administrators are allowed to trigger or modify impersonation
        if (currentRole === "admin") {
          if (session.impersonateId) {
            const targetId = parseInt(String(session.impersonateId), 10);
            if (!Number.isNaN(targetId)) {
              const targetMember = await db.member.findUnique({
                where: { id: targetId },
              });

              if (targetMember) {
                // If not already impersonating, save original admin details
                if (!token.impersonator) {
                  token.impersonator = {
                    id: token.id,
                    role: token.role,
                    status: token.status as any,
                    firstName: token.firstName,
                    lastName: token.lastName,
                    username: token.username,
                    profilePicture: token.profilePicture,
                  };
                }

                // Switch identity to target member
                token.id = String(targetMember.id);
                token.role = targetMember.role as any;
                token.status = targetMember.status as any;
                token.firstName = targetMember.firstName;
                token.lastName = targetMember.lastName;
                token.username = targetMember.username;
                token.profilePicture = targetMember.profilePicture;
              }
            }
          } else if (session.stopImpersonating) {
            // Restore original admin identity
            if (token.impersonator) {
              const imp = token.impersonator as any;
              token.id = imp.id;
              token.role = imp.role;
              token.status = imp.status;
              token.firstName = imp.firstName;
              token.lastName = imp.lastName;
              token.username = imp.username;
              token.profilePicture = imp.profilePicture;
              delete token.impersonator;
            }
          }
        }
      }

      // Re-fetch profile picture and user info from DB when session.update() is called (unless we are impersonating and just did the update above)
      if (trigger === "update" && token.id && (!session || (!session.impersonateId && !session.stopImpersonating))) {
        const numericId = parseInt(String(token.id), 10);
        if (!Number.isNaN(numericId)) {
          const fresh = await db.member.findUnique({
            where: { id: numericId },
            select: { profilePicture: true, username: true, firstName: true, lastName: true },
          });
          if (fresh) {
            token.profilePicture = fresh.profilePicture;
            token.username = fresh.username;
            token.firstName = fresh.firstName;
            token.lastName = fresh.lastName;
          }
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
        if (token.impersonator) {
          (session as any).impersonator = token.impersonator;
        } else {
          delete (session as any).impersonator;
        }
      }
      return session;
    },
  },
});
