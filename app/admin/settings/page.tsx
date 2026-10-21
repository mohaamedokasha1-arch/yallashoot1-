import type { Metadata } from "next";
import { saveSettingsAction } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { Field, TextArea, TextInput } from "@/components/admin/Field";
import { Notice } from "@/components/ui/Notice";
import { requireSession } from "@/lib/admin/session";
import { getSettings } from "@/lib/admin/settings";
import { contentWritesAllowed } from "@/lib/store";

export const metadata: Metadata = { title: "إعدادات العرض" };

export default async function AdminSettingsPage() {
  const session = await requireSession("admin");
  const s = await getSettings();
  return (
    <AdminShell session={session} active="/admin/settings" title="إعدادات العرض">
      {!contentWritesAllowed() ? <Notice variant="warn">الحفظ معطّل لعدم وجود تخزين دائم (Upstash Redis).</Notice> : null}
      <section className="card p-4">
        <ActionForm action={saveSettingsAction} submitLabel="حفظ الإعدادات">
          <Field label="تنبيه عام أعلى الموقع (اختياري)" htmlFor="siteNotice" hint="حتى 280 حرفًا. اتركه فارغًا لإخفائه.">
            <TextArea id="siteNotice" name="siteNotice" rows={2} maxLength={280} defaultValue={s.siteNotice ?? ""} />
          </Field>
          <Field
            label="فترة تحديث الصفحات أثناء المباريات المباشرة (ثانية)"
            htmlFor="livePollSeconds"
            hint="بين 30 و600. الصفحات تُخدم من الكاش؛ هذا لا يزيد طلبات المزود مباشرة."
          >
            <TextInput id="livePollSeconds" name="livePollSeconds" type="number" min={30} max={600} required defaultValue={s.livePollSeconds} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="showOtherLeagues" defaultChecked={s.showOtherLeagues} className="size-4" />
            عرض «بطولات أخرى» (غير المميزة) في صفحات المباريات
          </label>
        </ActionForm>
      </section>
    </AdminShell>
  );
}
