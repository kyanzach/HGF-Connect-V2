/**
 * lib/quiz-settings.ts — Global Quiz Access Mode helper
 *
 * Stored in `church_settings` under key `quiz_drip_enabled`.
 * Default is `false` (Open Access Mode):
 * - No daily drip delay — all 7 items of every quiz are unlocked immediately.
 * - No "one active quiz at a time" lock — members can play any Sunday quiz anytime.
 *
 * Admins/Pastors can toggle Drip & 1-Quiz-at-a-Time Mode back ON anytime in /quiz/admin.
 */

import { db } from "@/lib/db";

export const QUIZ_DRIP_SETTING_KEY = "quiz_drip_enabled";

export async function isQuizDripEnabled(): Promise<boolean> {
  try {
    const row = await db.churchSetting.findUnique({
      where: { key: QUIZ_DRIP_SETTING_KEY },
      select: { value: true },
    });
    return row?.value === "true";
  } catch (err) {
    console.warn("[quiz-settings] Failed to read quiz_drip_enabled, defaulting to false:", err);
    return false;
  }
}

export async function setQuizDripEnabled(enabled: boolean): Promise<boolean> {
  const val = enabled ? "true" : "false";
  await db.churchSetting.upsert({
    where: { key: QUIZ_DRIP_SETTING_KEY },
    update: { value: val },
    create: { key: QUIZ_DRIP_SETTING_KEY, value: val },
  });
  return enabled;
}
