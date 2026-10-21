import { FlaskConical, Megaphone } from "lucide-react";
import { qSettings } from "@/lib/admin/settings";
import { footballConfig } from "@/lib/env";

/**
 * Data-protection notice: shown only while the provider base URL points at
 * something other than the official API (a local sample server used to review
 * the design). With the real provider configured it never renders, so the live
 * site carries no such notice.
 */
export function SampleDataNotice() {
  const cfg = footballConfig();
  if (cfg.isOfficial || !cfg.apiKey) return null;
  return (
    <div role="status" className="ys-msg ys-msg--test">
      <FlaskConical aria-hidden="true" />
      <p className="ys-msg-title">المباريات والنتائج المعروضة هنا أمثلة توضيحية للتصميم، وليست مباريات حقيقية.</p>
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
