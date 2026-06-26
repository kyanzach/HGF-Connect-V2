import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "admin" | "moderator" | "usher" | "user" | "multimedia";
    status: "active" | "inactive" | "pending" | "archived" | "guest" | "approved";
    firstName: string;
    lastName: string;
    username: string | null;
    profilePicture: string | null;
  }

  interface Session {
    user: User;
    impersonator?: {
      id: string;
      role: "admin" | "moderator" | "usher" | "user" | "multimedia";
      status: "active" | "inactive" | "pending" | "archived" | "guest" | "approved";
      firstName: string;
      lastName: string;
      username: string | null;
      profilePicture: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "moderator" | "usher" | "user" | "multimedia";
    status: "active" | "inactive" | "pending" | "archived" | "guest" | "approved";
    firstName: string;
    lastName: string;
    username: string | null;
    profilePicture: string | null;
    impersonator?: {
      id: string;
      role: "admin" | "moderator" | "usher" | "user" | "multimedia";
      status: "active" | "inactive" | "pending" | "archived" | "guest" | "approved";
      firstName: string;
      lastName: string;
      username: string | null;
      profilePicture: string | null;
    };
  }
}

