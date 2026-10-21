import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { getStore } from "@/lib/store";

/**
 * Display settings managed from the admin panel. These only affect
 * presentation (what is shown and how often pages refresh) — they never
 * modify provider data such as scores, times or results.
 */

export const settingsSchema = z.object({
  siteNotice: z.string().trim().max(280).nullable().default(null),
  livePollSeconds: z.number().int().min(30).max(600).default(60),
  showOtherLeagues: z.boolean().default(true),
  hiddenLeagueIds: z.array(z.number().int().positive()).max(200).default([]),
  extraFeaturedLeagueIds: z.array(z.number().int().positive()).max(50).default([]),
});

export type DisplaySettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: DisplaySettings = settingsSchema.parse({});

const KEY = "settings:display";

export async function getSettings(): Promise<DisplaySettings> {
  try {
    const raw = await getStore().get<unknown>(KEY);
    const parsed = settingsSchema.safeParse(raw ?? {});
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: DisplaySettings): Promise<void> {
  await getStore().set(KEY, settingsSchema.parse(settings));
}

export async function qSettings(): Promise<DisplaySettings> {
  "use cache";
  cacheLife("reference");
  cacheTag("settings");
  return getSettings();
}
