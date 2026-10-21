"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { BUILTIN_FEED_IDS } from "@/data/news-feeds";
import type { ActionState, CoverageReport } from "@/lib/admin/action-state";
import { DUMMY_HASH, verifyPassword } from "@/lib/admin/password";
import {
  clearLoginFailures,
  clientIp,
  createSession,
  destroySession,
  isLoginBlocked,
  recordLoginFailure,
  requireSession,
  safeAdminPath,
} from "@/lib/admin/session";
import { getSettings, saveSettings, settingsSchema } from "@/lib/admin/settings";
import { annotationInputSchema, deleteAnnotation, saveAnnotation } from "@/lib/content/annotations";
import { articleInputSchema, deleteArticle, saveArticle } from "@/lib/content/articles";
import { deleteFeed, feedInputSchema, getFeedItems, saveFeed, setFeedEnabled } from "@/lib/content/feeds";
import { adminConfig } from "@/lib/env";
import { getResource } from "@/lib/football/cache";
import { EGYPT_PREMIER_LEAGUE_ID } from "@/lib/football/featured";
import { getProvider } from "@/lib/football/providers";
import {
  cairoToday,
  currentSeasonOf,
  getFixturesByDate,
  getLeagueDetails,
  getLeagues,
  getProviderAccountStatus,
  getStandings,
} from "@/lib/football/service";
import type { DataResult, League } from "@/lib/football/types";
import { clearErrorLog } from "@/lib/monitoring";
import { contentWritesAllowed, getStore } from "@/lib/store";
import { addDays } from "@/lib/utils/dates";

const NOT_PERSISTENT =
  "الحفظ معطّل: لا يوجد تخزين دائم مشترك. أضف Upstash Redis (UPSTASH_REDIS_REST_URL و UPSTASH_REDIS_REST_TOKEN) لتفعيل حفظ المحتوى والإعدادات.";

function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors };
}

function zodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

// ── Authentication ────────────────────────────────────────────────────────

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const cfg = adminConfig();
  if (!cfg.enabled) return fail("لوحة الإدارة غير مفعّلة: يجب ضبط متغيرات البيئة الخاصة بحساب المدير أولًا.");
  const ip = await clientIp();
  if (await isLoginBlocked(ip)) return fail("محاولات دخول كثيرة. حاول مرة أخرى بعد 15 دقيقة.");

  const parsed = z
    .object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(200) })
    .safeParse({ username: str(formData, "username"), password: str(formData, "password") });
  if (!parsed.success) return fail("أدخل اسم المستخدم وكلمة المرور.");

  const account = cfg.accounts.find((a) => a.username === parsed.data.username);
  const valid = await verifyPassword(parsed.data.password, account?.passwordHash ?? DUMMY_HASH);
  if (!account || !valid) {
    await recordLoginFailure(ip);
    return fail("بيانات الدخول غير صحيحة.");
  }
  await clearLoginFailures(ip);
  await createSession(account);
  redirect(safeAdminPath(str(formData, "next")));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

// ── Data refresh & diagnostics ───────────────────────────────────────────

function describeResult(label: string, res: DataResult<unknown>): ActionState {
  if (res.error && !res.stale) return fail(`${label}: ${res.error.message}`);
  if (res.stale) return fail(`${label}: لم يتم التحديث (${res.error?.message ?? ""}). تم الإبقاء على آخر نسخة صحيحة.`);
  const count = Array.isArray(res.data) ? ` (${res.data.length} عنصر)` : "";
  return { ok: true, message: `${label}: تم التحديث بنجاح${count}.` };
}

export async function refreshDataAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  const target = str(formData, "target");
  const today = cairoToday();
  switch (target) {
    case "today":
    case "yesterday":
    case "tomorrow": {
      const date = addDays(today, target === "yesterday" ? -1 : target === "tomorrow" ? 1 : 0);
      const res = await getFixturesByDate(date, { force: true });
      updateTag(`fixtures:${date}`);
      return describeResult(`مباريات ${date}`, res);
    }
    case "leagues": {
      const res = await getLeagues({ force: true });
      updateTag("leagues");
      return describeResult("قائمة البطولات", res);
    }
    case "egypt": {
      const league = await getLeagueDetails(EGYPT_PREMIER_LEAGUE_ID, { force: true });
      const season = currentSeasonOf(league.data);
      if (!season) return describeResult("الدوري المصري", league);
      const standings = await getStandings(EGYPT_PREMIER_LEAGUE_ID, season, { force: true });
      updateTag(`league:${EGYPT_PREMIER_LEAGUE_ID}`);
      updateTag(`standings:${EGYPT_PREMIER_LEAGUE_ID}`);
      return describeResult(`ترتيب الدوري المصري ${season}`, standings);
    }
    default:
      return fail("طلب غير معروف.");
  }
}

export async function checkCoverageAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  const queries: Array<{ key: string; label: string; params: Parameters<ReturnType<typeof getProvider>["getLeagues"]>[0] }> = [
    { key: "egypt", label: "country=Egypt", params: { country: "Egypt" } },
    { key: "caf", label: "search=CAF", params: { search: "CAF" } },
    { key: "africa", label: "search=Africa", params: { search: "Africa" } },
  ];
  const report: CoverageReport = { checkedAt: new Date().toISOString(), groups: [], errors: [] };
  for (const q of queries) {
    const res = await getResource<League[]>({
      key: `coverage:${q.key}`,
      priority: "low",
      ttl: 3600,
      force: true,
      fetcher: () => getProvider().getLeagues(q.params),
    });
    if (!res.data) {
      report.errors.push(`${q.label}: ${res.error?.message ?? "غير متاح"}`);
      continue;
    }
    report.groups.push({
      query: q.label,
      leagues: res.data.map((l) => {
        const current = l.seasons.find((s) => s.current) ?? l.seasons[0];
        return {
          id: l.id,
          name: l.name,
          country: l.country.name,
          type: l.type,
          currentSeason: current?.year ?? null,
          standings: current ? current.coverage.standings : null,
        };
      }),
    });
  }
  await getStore().set("coverage:report", report);
  return report.errors.length && report.groups.length === 0
    ? fail(`تعذّر التحقق: ${report.errors.join(" | ")}`)
    : { ok: true, message: `تم التحقق من التغطية (${report.groups.reduce((n, g) => n + g.leagues.length, 0)} بطولة).` };
}

export async function accountStatusAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  try {
    const status = await getProviderAccountStatus();
    await getStore().set("provider:account", { ...status, checkedAt: new Date().toISOString() });
    return { ok: true, message: `الباقة: ${status.plan ?? "غير معروفة"} — الطلبات اليوم: ${status.requestsToday ?? "?"}/${status.dailyLimit ?? "?"}` };
  } catch (err) {
    return fail(`تعذّر جلب حالة الحساب: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function clearErrorsAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  await clearErrorLog();
  return { ok: true, message: "تم مسح سجل الأخطاء." };
}

// ── Display settings ──────────────────────────────────────────────────────

export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  if (!contentWritesAllowed()) return fail(NOT_PERSISTENT);
  const current = await getSettings();
  const parsed = settingsSchema.safeParse({
    ...current,
    siteNotice: str(formData, "siteNotice").trim() || null,
    livePollSeconds: Number(str(formData, "livePollSeconds")),
    showOtherLeagues: formData.get("showOtherLeagues") === "on",
  });
  if (!parsed.success) return fail("تحقق من القيم المدخلة.", zodErrors(parsed.error));
  await saveSettings(parsed.data);
  updateTag("settings");
  return { ok: true, message: "تم حفظ الإعدادات." };
}

export async function leagueDisplayAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  if (!contentWritesAllowed()) return fail(NOT_PERSISTENT);
  const id = Number(str(formData, "leagueId"));
  const mode = str(formData, "mode");
  if (!Number.isInteger(id) || id <= 0) return fail("معرّف بطولة غير صالح.");
  const s = await getSettings();
  const without = (list: number[]) => list.filter((x) => x !== id);
  if (mode === "hide") s.hiddenLeagueIds = [...without(s.hiddenLeagueIds), id];
  else if (mode === "show") s.hiddenLeagueIds = without(s.hiddenLeagueIds);
  else if (mode === "feature") s.extraFeaturedLeagueIds = [...without(s.extraFeaturedLeagueIds), id];
  else if (mode === "unfeature") s.extraFeaturedLeagueIds = without(s.extraFeaturedLeagueIds);
  else return fail("إجراء غير معروف.");
  await saveSettings(settingsSchema.parse(s));
  updateTag("settings");
  return { ok: true, message: "تم تحديث إعدادات عرض البطولة (العرض فقط، دون أي تعديل على البيانات)." };
}

// ── Editorial content ─────────────────────────────────────────────────────

export async function saveArticleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("editor");
  if (!contentWritesAllowed()) return fail(NOT_PERSISTENT);
  const parsed = articleInputSchema.safeParse({
    title: str(formData, "title"),
    slug: str(formData, "slug"),
    excerpt: str(formData, "excerpt"),
    body: str(formData, "body"),
    category: str(formData, "category"),
    status: str(formData, "status"),
    sourceName: str(formData, "sourceName"),
    sourceUrl: str(formData, "sourceUrl"),
    imageUrl: str(formData, "imageUrl"),
    imageCredit: str(formData, "imageCredit"),
  });
  if (!parsed.success) return fail("تحقق من الحقول المطلوبة.", zodErrors(parsed.error));
  const id = str(formData, "id") || undefined;
  const article = await saveArticle(parsed.data, session.username, id);
  updateTag("articles");
  return { ok: true, message: `تم حفظ المقال «${article.title}» (${article.status === "published" ? "منشور" : "مسودة"}).` };
}

export async function deleteArticleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("editor");
  if (!contentWritesAllowed()) return fail(NOT_PERSISTENT);
  const id = str(formData, "id");
  if (!/^[0-9a-f-]{36}$/.test(id)) return fail("معرّف غير صالح.");
  await deleteArticle(id);
  updateTag("articles");
  return { ok: true, message: "تم حذف المقال." };
}

export async function saveFeedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("admin");
  if (!contentWritesAllowed()) return fail(NOT_PERSISTENT);
  const parsed = feedInputSchema.safeParse({
    name: str(formData, "name"),
    url: str(formData, "url"),
    homepage: str(formData, "homepage"),
    permissionNote: str(formData, "permissionNote"),
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) return fail("تحقق من الحقول.", zodErrors(parsed.error));
  try {
    await saveFeed(parsed.data, session.username, str(formData, "id") || undefined);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "رابط غير مسموح.");
  }
  updateTag("feeds");
  return { ok: true, message: "تم حفظ مصدر الأخبار." };
}

const FEED_ID = /^[a-z0-9-]{3,64}$/;

export async function deleteFeedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("admin");
  if (!contentWritesAllowed()) return fail(NOT_PERSISTENT);
  const id = str(formData, "id");
  if (!FEED_ID.test(id)) return fail("معرّف غير صالح.");
  await deleteFeed(id, session.username);
  updateTag("feeds");
  return { ok: true, message: BUILTIN_FEED_IDS.has(id) ? "تم تعطيل المصدر." : "تم حذف المصدر." };
}

/** Switches a source on/off. Built-in sources stay in the catalogue. */
export async function toggleFeedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("admin");
  if (!contentWritesAllowed()) return fail(NOT_PERSISTENT);
  const id = str(formData, "id");
  if (!FEED_ID.test(id)) return fail("معرّف غير صالح.");
  const enabled = str(formData, "enabled") === "1";
  await setFeedEnabled(id, enabled, session.username);
  updateTag("feeds");
  return { ok: true, message: enabled ? "تم تفعيل المصدر." : "تم تعطيل المصدر." };
}

export async function refreshFeedsAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  const { items, errors } = await getFeedItems({ force: true });
  updateTag("feeds");
  return errors.length
    ? fail(`تم جلب ${items.length} عنوانًا، مع أخطاء: ${errors.map((e) => `${e.feed}: ${e.error}`).join(" | ")}`)
    : { ok: true, message: `تم جلب ${items.length} عنوانًا.` };
}

export async function saveAnnotationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("editor");
  if (!contentWritesAllowed()) return fail(NOT_PERSISTENT);
  const parsed = annotationInputSchema.safeParse({
    fixtureId: Number(str(formData, "fixtureId")),
    broadcasters: str(formData, "broadcasters")
      .split(/[,،\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
    sourceName: str(formData, "sourceName"),
    sourceUrl: str(formData, "sourceUrl"),
    note: str(formData, "note"),
  });
  if (!parsed.success) return fail("تحقق من الحقول.", zodErrors(parsed.error));
  await saveAnnotation(parsed.data, session.username);
  updateTag(`annotation:${parsed.data.fixtureId}`);
  return { ok: true, message: `تم حفظ معلومات البث للمباراة ${parsed.data.fixtureId}.` };
}

export async function deleteAnnotationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("editor");
  if (!contentWritesAllowed()) return fail(NOT_PERSISTENT);
  const id = Number(str(formData, "fixtureId"));
  if (!Number.isInteger(id) || id <= 0) return fail("معرّف غير صالح.");
  await deleteAnnotation(id);
  updateTag(`annotation:${id}`);
  return { ok: true, message: "تم الحذف." };
}
