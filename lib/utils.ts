/**
 * Shared utility functions — port of PHP utils/functions.php
 * All timezone-aware operations use Asia/Manila (UTC+8)
 */

/** Normalize a Philippine phone number to +63XXXXXXXXX format */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");

  // Handle +63 prefix
  if (digits.startsWith("63") && digits.length === 12) {
    digits = "0" + digits.slice(2);
  }

  // Handle 09XXXXXXXXX → +63XXXXXXXXX
  if (digits.startsWith("0") && digits.length === 11) {
    return "+63" + digits.slice(1);
  }

  // Already in +63 format
  if (digits.length === 10) {
    return "+63" + digits;
  }

  return phone; // Return original if can't normalize
}

/** Format a date in Manila time: "February 22, 2026" */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

/** Format a date-time in Manila time */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  });
}

/** Get current Manila time as a Date object */
export function getManilaTime(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
  );
}

/** Format time in 12-hour format: "9:30 AM" */
export function formatTime(time: Date | string): string {
  const d = typeof time === "string" ? new Date(`1970-01-01T${time}`) : time;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Auto-generate a username from first + last name */
export async function generateUsername(
  firstName: string,
  lastName: string,
  db: import("@prisma/client").PrismaClient
): Promise<string> {
  const base =
    (firstName.toLowerCase().replace(/[^a-z0-9]/g, "") +
      lastName.toLowerCase().replace(/[^a-z0-9]/g, "")).slice(0, 20) ||
    "member";

  let username = base;
  let counter = 1;

  while (true) {
    const existing = await db.member.findUnique({ where: { username } });
    if (!existing) break;
    username = `${base}${counter++}`;
  }

  return username;
}

/** Sanitize string for display (prevent XSS) */
export function sanitizeOutput(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** Map event type value to a human-readable label */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  sunday_service: "Sunday Service",
  prayer_meeting: "Prayer Meeting",
  bible_study: "Bible Study",
  special_event: "Special Event",
  grace_night: "Grace Night",
  other: "Other",
};

/** Map member type enum to display string */
export const MEMBER_TYPE_LABELS: Record<string, string> = {
  FamilyMember: "Family Member",
  GrowingFriend: "Growing Friend",
  NewFriend: "New Friend",
};

/** Map role to display label */
export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  moderator: "Moderator",
  usher: "Usher",
  user: "Member",
};

/** HGF brand colors (for programmatic use) */
export const BRAND = {
  primary: "#4EB1CB",
  primaryDark: "#3A95AD",
  primaryLight: "#7EC8DA",
} as const;
