import type { Metadata } from "next";
import Link from "next/link";
import { deleteAnnotationAction, saveAnnotationAction } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { Field, TextArea, TextInput } from "@/components/admin/Field";
import { Notice } from "@/components/ui/Notice";
import { requireSession } from "@/lib/admin/session";
import { listAnnotations } from "@/lib/content/annotations";
import { contentWritesAllowed } from "@/lib/store";
import { formatCairoDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "معلومات البث" };

export default async function AdminAnnotationsPage() {
  const session = await requireSession("editor");
  const items = await listAnnotations();
  return (
    <AdminShell session={session} active="/admin/annotations" title="معلومات النقل التلفزيوني">
      {!contentWritesAllowed() ? <Notice variant="warn">الحفظ معطّل لعدم وجود تخزين دائم (Upstash Redis).</Notice> : null}
      <Notice variant="info">
        أضف الجهة الناقلة الرسمية فقط إذا كانت مؤكدة من مصدر رسمي (الاتحاد/الرابطة/القناة)، مع رابط المصدر. تظهر المعلومة في صفحة المباراة
        كمعلومة تحريرية منفصلة ولا تغيّر بيانات المزود. لا تضف روابط بث.
      </Notice>
      <section className="card p-4">
        <ActionForm action={saveAnnotationAction} submitLabel="حفظ">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="رقم المباراة لدى المزود (Fixture ID)" htmlFor="fixtureId" hint="الرقم في آخر رابط صفحة المباراة.">
              <TextInput id="fixtureId" name="fixtureId" type="number" min={1} required dir="ltr" />
            </Field>
            <Field label="الجهات الناقلة" htmlFor="broadcasters" hint="افصل بينها بفاصلة.">
              <TextInput id="broadcasters" name="broadcasters" required maxLength={400} />
            </Field>
            <Field label="اسم المصدر" htmlFor="sourceName">
              <TextInput id="sourceName" name="sourceName" required minLength={2} maxLength={80} />
            </Field>
            <Field label="رابط المصدر (HTTPS)" htmlFor="sourceUrl">
              <TextInput id="sourceUrl" name="sourceUrl" type="url" required maxLength={500} dir="ltr" />
            </Field>
          </div>
          <Field label="ملاحظة (اختياري)" htmlFor="note">
            <TextArea id="note" name="note" rows={2} maxLength={200} />
          </Field>
        </ActionForm>
      </section>
      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 font-extrabold">المعلومات المضافة ({items.length})</h2>
        <ul className="divide-y divide-slate-100">
          {items.map((a) => (
            <li key={a.fixtureId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
              <span className="min-w-0">
                <Link href={`/matches/${a.fixtureId}`} className="font-bold text-pitch-700 hover:underline">
                  مباراة {a.fixtureId}
                </Link>
                : {a.broadcasters.join("، ")}
                <span className="block text-xs text-slate-500">
                  المصدر: {a.sourceName} · {formatCairoDateTime(a.updatedAt)} · {a.updatedBy}
                </span>
              </span>
              <ActionForm action={deleteAnnotationAction} submitLabel="حذف" variant="danger" confirmText="حذف هذه المعلومة؟">
                <input type="hidden" name="fixtureId" value={a.fixtureId} />
              </ActionForm>
            </li>
          ))}
          {items.length === 0 ? <li className="px-4 py-4 text-center text-sm text-slate-500">لا توجد معلومات مضافة.</li> : null}
        </ul>
      </section>
    </AdminShell>
  );
}
