import type { Metadata } from "next";
import { clearErrorsAction } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireSession } from "@/lib/admin/session";
import { getMonitoringSnapshot } from "@/lib/monitoring";
import { formatCairoDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "السجلات" };

export default async function AdminLogsPage() {
  const session = await requireSession("admin");
  const mon = await getMonitoringSnapshot();
  return (
    <AdminShell session={session} active="/admin/logs" title="السجلات">
      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 font-extrabold">آخر طلبات مزود البيانات</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-1 text-start">الوقت</th>
                <th className="px-2 py-1 text-start">Endpoint</th>
                <th className="px-2 py-1 text-start">المعاملات</th>
                <th className="px-2 py-1 text-center">HTTP</th>
                <th className="px-2 py-1 text-center">النتيجة</th>
                <th className="px-2 py-1 text-center">ms</th>
                <th className="px-2 py-1 text-center">متبقي يوميًا</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mon.requests.map((r, i) => (
                <tr key={i} className={r.ok ? undefined : "bg-rose-50"}>
                  <td className="px-2 py-1 whitespace-nowrap">{formatCairoDateTime(r.at)}</td>
                  <td className="px-2 py-1" dir="ltr">{r.endpoint}</td>
                  <td className="max-w-[16rem] truncate px-2 py-1" dir="ltr">{r.params}</td>
                  <td className="px-2 py-1 text-center">{r.status ?? "—"}</td>
                  <td className="px-2 py-1 text-center">
                    {r.ok ? (
                      `ok (${r.results ?? 0})`
                    ) : (
                      <>
                        {r.errorKind}
                        {r.errorDetail ? (
                          <span className="block max-w-[14rem] truncate text-rose-600" dir="ltr" title={r.errorDetail}>
                            {r.errorDetail}
                          </span>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="px-2 py-1 text-center">{r.ms}</td>
                  <td className="px-2 py-1 text-center">{r.dailyRemaining ?? "—"}</td>
                </tr>
              ))}
              {mon.requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-slate-500">لا توجد طلبات مسجلة بعد.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="font-extrabold">سجل الأخطاء</h2>
          <ActionForm action={clearErrorsAction} submitLabel="مسح السجل" variant="secondary" confirmText="مسح سجل الأخطاء؟" />
        </div>
        <ul className="divide-y divide-slate-100 text-sm">
          {mon.errors.map((e, i) => (
            <li key={i} className="px-4 py-2">
              <span className="text-xs text-slate-500">{formatCairoDateTime(e.at)}</span> — <strong>{e.source}</strong> / {e.kind}:{" "}
              <span dir="auto">{e.message}</span>
              {e.key ? <span className="text-xs text-slate-500" dir="ltr"> [{e.key}]</span> : null}
            </li>
          ))}
          {mon.errors.length === 0 ? <li className="px-4 py-4 text-center text-slate-500">لا توجد أخطاء مسجلة.</li> : null}
        </ul>
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 font-extrabold">تشغيلات المهمة المجدولة (Cron)</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {mon.cronHistory.map((c, i) => (
            <li key={i} className="space-y-1 px-4 py-2">
              <p>
                <strong className={c.ok ? "text-emerald-700" : "text-rose-700"}>{c.ok ? "ناجح" : "فشل"}</strong> — {formatCairoDateTime(c.startedAt)}
              </p>
              <ul className="text-xs text-slate-600">
                {c.tasks.map((t) => (
                  <li key={t.name}>
                    {t.ok ? "✓" : "✗"} {t.name}: {t.detail}
                  </li>
                ))}
              </ul>
            </li>
          ))}
          {mon.cronHistory.length === 0 ? <li className="px-4 py-4 text-center text-slate-500">لم تعمل المهمة المجدولة بعد.</li> : null}
        </ul>
      </section>
    </AdminShell>
  );
}
