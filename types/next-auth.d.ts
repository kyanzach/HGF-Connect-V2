import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "admin" | "moderator" | "usher" | "user";
    status: "active" | "inactive" | "pending";
    firstName: string;
    lastName: string;
    username: string | null;
    profilePicture: string | null;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "moderator" | "usher" | "user";
    status: "active" | "inactive" | "pending";
    firstName: string;
    lastName: string;
    username: string | null;
    profilePicture: string | null;
  }
}
