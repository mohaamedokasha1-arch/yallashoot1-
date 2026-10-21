import type { Metadata } from "next";
import { checkCoverageAction, leagueDisplayAction } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { Notice } from "@/components/ui/Notice";
import { COMPETITIONS, REGION_LABELS_AR } from "@/data/competitions";
import type { CoverageReport } from "@/lib/admin/action-state";
import { requireSession } from "@/lib/admin/session";
import { getSettings } from "@/lib/admin/settings";
import { getStore } from "@/lib/store";
import { formatCairoDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "البطولات والتغطية" };

const SOURCE_LABEL = { "api-sample": "مؤكد من عينة حقيقية", "third-party": "من مصدر خارجي", unverified: "غير مؤكد" } as const;

export default async function AdminLeaguesPage() {
  const session = await requireSession("admin");
  const [settings, report] = await Promise.all([getSettings(), getStore().get<CoverageReport>("coverage:report")]);
  const found = new Map<number, { name: string; country: string; currentSeason: number | null; standings: boolean | null }>();
  for (const g of report?.groups ?? []) for (const l of g.leagues) found.set(l.id, l);

  return (
    <AdminShell session={session} active="/admin/leagues" title="البطولات والتغطية">
      <section className="card space-y-3 p-4">
        <h2 className="text-lg font-extrabold">التحقق من تغطية الكرة المصرية والإفريقية</h2>
        <p className="text-sm text-slate-600">
          يستعلم من المزود عن بطولات مصر (country=Egypt) والبطولات الإفريقية (search=CAF و search=Africa) ويقارن المعرّفات بسجل البطولات الداخلي.
          يستهلك 3 طلبات من الحصة.
        </p>
        <ActionForm action={checkCoverageAction} submitLabel="تشغيل التحقق الآن" variant="secondary" />
        {report ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">آخر تحقق: {formatCairoDateTime(report.checkedAt)}</p>
            {report.errors.length ? <Notice variant="warn">{report.errors.join(" | ")}</Notice> : null}
            {report.groups.map((g) => (
              <details key={g.query} className="rounded-lg border border-slate-200">
                <summary className="cursor-pointer px-3 py-2 text-sm font-bold">
                  {g.query} — {g.leagues.length} بطولة
                </summary>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-2 py-1 text-start">ID</th>
                      <th className="px-2 py-1 text-start">الاسم لدى المزود</th>
                      <th className="px-2 py-1 text-start">الدولة</th>
                      <th className="px-2 py-1 text-start">الموسم الحالي</th>
                      <th className="px-2 py-1 text-start">ترتيب؟</th>
                      <th className="px-2 py-1 text-start">في السجل؟</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.leagues.map((l) => (
                      <tr key={l.id}>
                        <td className="ltr-nums px-2 py-1">{l.id}</td>
                        <td className="px-2 py-1" dir="ltr">{l.name}</td>
                        <td className="px-2 py-1" dir="ltr">{l.country}</td>
                        <td className="px-2 py-1">{l.currentSeason ?? "—"}</td>
                        <td className="px-2 py-1">{l.standings === null ? "—" : l.standings ? "نعم" : "لا"}</td>
                        <td className="px-2 py-1">{COMPETITIONS.some((c) => c.id === l.id) ? "✓" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ))}
          </div>
        ) : null}
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-lg font-extrabold">سجل البطولات ذات الأسماء العربية</h2>
        <p className="text-sm text-slate-600">
          الإخفاء والتمييز يؤثران على طريقة العرض في صفحات المباريات فقط ولا يغيّران أي بيانات أو نتائج.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-2 py-2 text-start">ID</th>
                <th className="px-2 py-2 text-start">البطولة</th>
                <th className="px-2 py-2 text-start">القسم</th>
                <th className="px-2 py-2 text-start">مصدر المعرّف</th>
                <th className="px-2 py-2 text-start">آخر تحقق</th>
                <th className="px-2 py-2 text-start">العرض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {COMPETITIONS.map((c) => {
                const hidden = settings.hiddenLeagueIds.includes(c.id);
                const featured = c.featured || settings.extraFeaturedLeagueIds.includes(c.id);
                const check = found.get(c.id);
                const mismatch = check && check.country !== c.apiCountry;
                return (
                  <tr key={c.id} className={hidden ? "bg-slate-50 text-slate-400" : undefined}>
                    <td className="ltr-nums px-2 py-2">{c.id}</td>
                    <td className="px-2 py-2 font-semibold">{c.nameAr}</td>
                    <td className="px-2 py-2 text-xs">{REGION_LABELS_AR[c.region]}</td>
                    <td className="px-2 py-2 text-xs">{SOURCE_LABEL[c.idSource]}</td>
                    <td className="px-2 py-2 text-xs">
                      {check ? (mismatch ? `⚠ الدولة لدى المزود: ${check.country}` : `✓ ${check.name} (${check.currentSeason ?? "?"})`) : "—"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <ActionForm action={leagueDisplayAction} submitLabel={hidden ? "إظهار" : "إخفاء"} variant="secondary">
                          <input type="hidden" name="leagueId" value={c.id} />
                          <input type="hidden" name="mode" value={hidden ? "show" : "hide"} />
                        </ActionForm>
                        {!c.featured ? (
                          <ActionForm action={leagueDisplayAction} submitLabel={featured ? "إلغاء التمييز" : "تمييز"} variant="secondary">
                            <input type="hidden" name="leagueId" value={c.id} />
                            <input type="hidden" name="mode" value={featured ? "unfeature" : "feature"} />
                          </ActionForm>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
