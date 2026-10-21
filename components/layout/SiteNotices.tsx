import { FlaskConical, Megaphone } from "lucide-react";
import { qSettings } from "@/lib/admin/settings";
import { footballConfig } from "@/lib/env";

/** Shown when the provider base URL is not the official API (mock/test server). */
export function TestDataBanner() {
  const cfg = footballConfig();
  if (cfg.isOfficial || !cfg.apiKey) return null;
  return (
    <div role="status" className="ys-msg ys-msg--test">
      <FlaskConical aria-hidden="true" />
      <p className="ys-msg-title">بيئة اختبار: البيانات المعروضة مصدرها خادم محاكاة وليست مباريات أو نتائج حقيقية.</p>
    </div>
  );
}

/** Optional site-wide editorial notice configured in the admin panel. */
export async function SiteNotice() {
  const settings = await qSettings();
  if (!settings.siteNotice) return null;
  return (
    <div role="status" className="ys-msg ys-msg--warn">
      <Megaphone aria-hidden="true" />
      <p>{settings.siteNotice}</p>
    </div>
  );
}
