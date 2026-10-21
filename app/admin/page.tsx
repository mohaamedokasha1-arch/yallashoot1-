import type { Metadata } from "next";
import { accountStatusAction, refreshDataAction } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { Notice } from "@/components/ui/Notice";
import { requireSession } from "@/lib/admin/session";
import { footballConfig } from "@/lib/env";
import { getQuotaState, quotaFlags } from "@/lib/football/budget";
import { getMonitoringSnapshot } from "@/lib/monitoring";
import { contentWritesAllowed, getStore } from "@/lib/store";
import { formatCairoDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "لوحة المتابعة" };

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "ok" | "warn" | "bad" }) {
  const color = tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : tone === "bad" ? "text-rose-700" : "text-slate-900";
  return (
    <div className="card p-3">
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className={`mt-1 text-lg font-extrabold ${color}`}>{value}</dd>
    </div>
  );
}

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const session = await requireSession("editor");
  const sp = await searchParams;
  const cfg = footballConfig();
  const store = getStore();
  const [quota, mon, storeOk, account] = await Promise.all([
    getQuotaState(),
    getMonitoringSnapshot(),
    store.ping(),
    store.get<{ plan: string | null; active: boolean | null; requestsToday: number | null; dailyLimit: number | null; subscriptionEnd: string | null; checkedAt: string }>("provider:account"),
  ]);
  const { circuitOpen, blocked } = quotaFlags(quota);

  return (
    <AdminShell session={session} active="/admin" title="لوحة المتابعة">
      {sp.denied ? <Notice variant="warn">هذه الصفحة متاحة لحساب المدير فقط.</Notice> : null}
      {!cfg.apiKey ? (
        <Notice variant="error" title="مزود البيانات غير مربوط">
          أضف FOOTBALL_API_KEY في متغيرات البيئة ثم أعد النشر. حتى ذلك الحين تعرض الصفحات رسالة «مصدر البيانات غير مربوط».
        </Notice>
      ) : null}
      {cfg.baseUrlError ? <Notice variant="error">{cfg.baseUrlError}</Notice> : null}
      {!cfg.isOfficial && cfg.apiKey ? <Notice variant="test">مزود البيانات مضبوط على خادم غير رسمي: <span dir="ltr">{cfg.baseUrl}</span>. غيّر FOOTBALL_API_BASE_URL إلى العنوان الرسمي لعرض المباريات الحقيقية.</Notice> : null}
      {!contentWritesAllowed() ? (
        <Notice variant="warn" title="لا يوجد تخزين دائم">
          التخزين الحالي ({store.kind}) غير مشترك بين خوادم Vercel. الكاش يعمل لكل خادم على حدة، وحفظ المحتوى والإعدادات معطّل. أضف Upstash Redis لتفعيلها.
        </Notice>
      ) : null}

      <section aria-labelledby="provider-status" className="space-y-2">
        <h2 id="provider-status" className="text-lg font-extrabold">حالة مزود البيانات</h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="المزود" value={`API-Football ${cfg.apiKey ? "(مفتاح مضبوط)" : "(بدون مفتاح)"}`} tone={cfg.apiKey ? "ok" : "bad"} />
          <Stat
            label="الحصة اليومية المتبقية"
            value={quota.dailyRemaining !== null ? `${quota.dailyRemaining} / ${quota.dailyLimit ?? "?"}` : "غير معروفة بعد"}
            tone={quota.dailyRemaining !== null && quota.dailyLimit ? (quota.dailyRemaining / quota.dailyLimit < 0.1 ? "bad" : "ok") : "default"}
          />
          <Stat label="آخر طلب ناجح" value={mon.lastSuccess ? formatCairoDateTime(mon.lastSuccess.at) : "لا يوجد"} tone={mon.lastSuccess ? "ok" : "warn"} />
          <Stat label="آخر خطأ" value={mon.lastError ? `${mon.lastError.kind} — ${formatCairoDateTime(mon.lastError.at)}` : "لا يوجد"} tone={mon.lastError ? "warn" : "ok"} />
          <Stat label="قاطع الدائرة" value={circuitOpen ? "مفتوح (إيقاف مؤقت)" : "يعمل"} tone={circuitOpen ? "bad" : "ok"} />
          <Stat label="حظر مؤقت" value={blocked ? `${quota.blockedReason} حتى ${formatCairoDateTime(quota.blockedUntil as number)}` : "لا يوجد"} tone={blocked ? "bad" : "ok"} />
          <Stat label="التخزين" value={`${store.kind}${storeOk ? "" : " (لا يستجيب)"}`} tone={storeOk ? (store.kind === "upstash" ? "ok" : "warn") : "bad"} />
          <Stat
            label="آخر تشغيل للمهمة المجدولة"
            value={mon.lastCron ? `${mon.lastCron.ok ? "ناجح" : "فشل"} — ${formatCairoDateTime(mon.lastCron.finishedAt)}` : "لم تعمل بعد"}
            tone={mon.lastCron ? (mon.lastCron.ok ? "ok" : "bad") : "warn"}
          />
        </dl>
        {account ? (
          <p className="text-sm text-slate-600">
            الباقة: <strong>{account.plan ?? "غير معروفة"}</strong> — نشطة: {account.active === null ? "?" : account.active ? "نعم" : "لا"} — طلبات اليوم:{" "}
            {account.requestsToday ?? "?"}/{account.dailyLimit ?? "?"} — تنتهي: {account.subscriptionEnd ?? "?"} (فُحصت {formatCairoDateTime(account.checkedAt)})
          </p>
        ) : null}
      </section>

      {session.role === "admin" ? (
        <section aria-labelledby="actions" className="card space-y-4 p-4">
          <h2 id="actions" className="text-lg font-extrabold">إعادة محاولة الجلب</h2>
          <p className="text-sm text-slate-600">
            يجلب البيانات من المزود فورًا متجاوزًا مدة الكاش (مع احترام حماية الحصة اليومية). لا تؤثر هذه الأزرار على النتائج إلا بتحديثها من المزود نفسه.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["today", "تحديث مباريات اليوم"],
              ["yesterday", "تحديث مباريات الأمس"],
              ["tomorrow", "تحديث مباريات الغد"],
              ["leagues", "تحديث قائمة البطولات"],
              ["egypt", "تحديث ترتيب الدوري المصري"],
            ].map(([target, label]) => (
              <ActionForm key={target} action={refreshDataAction} submitLabel={label as string} variant="secondary">
                <input type="hidden" name="target" value={target} />
              </ActionForm>
            ))}
            <ActionForm action={accountStatusAction} submitLabel="فحص حالة حساب المزود" variant="secondary" />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="daily" className="card p-4">
        <h2 id="daily" className="mb-2 text-lg font-extrabold">طلبات المزود (آخر 7 أيام، بتوقيت UTC)</h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1 text-start">اليوم</th>
              <th className="py-1 text-center">ناجحة</th>
              <th className="py-1 text-center">فاشلة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mon.dailyCounts.map((d) => (
              <tr key={d.day}>
                <td className="ltr-nums py-1">{d.day}</td>
                <td className="py-1 text-center">{d.ok}</td>
                <td className="py-1 text-center">{d.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
