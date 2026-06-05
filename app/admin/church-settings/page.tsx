import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminSettingsClient from "./AdminSettingsClient";

export const metadata: Metadata = { title: "AI Settings — Admin" };

// Default values matching original church knowledge file content
const DEFAULTS = {
  church_name: "House of Grace Fellowship",
  church_address: "11-A Iñigo St., Obrero, Davao City",
  sunday_services: "Sunday Schedule:\nService 1: 9:00 AM\nService 2: 11:00 AM\nBoth are held at the main HGF venue. Worship begins 15 minutes before the service start time.",
  midweek_services: "Wednesday prayer meeting at 7:00 PM. Open to all members and visitors.",
  prayer_schedules: "Wednesday Midweek Prayer meeting: 7:00 PM\nSaturday Morning Dawn Prayer: 6:00 AM",
  cell_groups: "Cell groups are small gatherings of 8-15 members that meet weekly for Bible study, prayer, and fellowship. They are the backbone of the HGF community.",
  volunteering: "To volunteer, attend our monthly ministry orientation. Express interest to the ministry leader or at the church office. Active ministries include: Worship Team, KIDS Church, Youth Ministry, Media, Ushering, Prayer, Cell Group, and Outreach.",
  worship_team: "Our HGF Worship Team leads praise and worship during services. Rehearsals are held weekly on Saturdays. Auditions and orientations are conducted periodically.",
  prayer_support: "You can submit prayer requests directly on the Prayer Wall inside the app, or message our ministry leaders for support.",
  latest_announcements: "Keep an eye on the community feed and the events section in the HGF Connect app for the latest updates.",
};

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) redirect("/login");

  const settingsList = await db.churchSetting.findMany();
  const settingsMap = settingsList.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  // Merge default values
  const initialSettings = {
    church_name: settingsMap.church_name ?? DEFAULTS.church_name,
    church_address: settingsMap.church_address ?? DEFAULTS.church_address,
    sunday_services: settingsMap.sunday_services ?? DEFAULTS.sunday_services,
    midweek_services: settingsMap.midweek_services ?? DEFAULTS.midweek_services,
    prayer_schedules: settingsMap.prayer_schedules ?? DEFAULTS.prayer_schedules,
    cell_groups: settingsMap.cell_groups ?? DEFAULTS.cell_groups,
    volunteering: settingsMap.volunteering ?? DEFAULTS.volunteering,
    worship_team: settingsMap.worship_team ?? DEFAULTS.worship_team,
    prayer_support: settingsMap.prayer_support ?? DEFAULTS.prayer_support,
    latest_announcements: settingsMap.latest_announcements ?? DEFAULTS.latest_announcements,
  };

  return <AdminSettingsClient initialSettings={initialSettings} />;
}
