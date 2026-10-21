import { LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Field, TextInput } from "@/components/admin/Field";
import { Notice } from "@/components/ui/Notice";
import { getSession, safeAdminPath } from "@/lib/admin/session";
import { adminConfig } from "@/lib/env";

export const metadata: Metadata = { title: "تسجيل دخول الإدارة", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const session = await getSession();
  const sp = await searchParams;
  const next = safeAdminPath(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (session) redirect(next);
  const cfg = adminConfig();
  return (
    <div className="mx-auto max-w-md">
      <div className="ys-block space-y-4 p-6">
        <div className="flex items-center gap-2">
          <LockKeyhole aria-hidden="true" className="size-6 text-pitch-700" />
          <h1 className="text-xl font-bold">تسجيل دخول الإدارة</h1>
        </div>
        {!cfg.enabled ? (
          <Notice variant="warn" title="لوحة الإدارة غير مفعّلة">
            <p>لا توجد بيانات دخول افتراضية. لتفعيل اللوحة يجب ضبط متغيرات البيئة التالية ثم إعادة النشر:</p>
            <ul className="list-inside list-disc">
              {cfg.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Notice>
        ) : (
          <ActionForm action={loginAction} submitLabel="دخول">
            <input type="hidden" name="next" value={next} />
            <Field label="اسم المستخدم" htmlFor="username">
              <TextInput id="username" name="username" autoComplete="username" required maxLength={64} dir="ltr" />
            </Field>
            <Field label="كلمة المرور" htmlFor="password">
              <TextInput id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} dir="ltr" />
            </Field>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
