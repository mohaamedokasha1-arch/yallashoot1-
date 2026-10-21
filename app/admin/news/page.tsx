import type { Metadata } from "next";
import Link from "next/link";
import { deleteArticleAction, deleteFeedAction, refreshFeedsAction, saveArticleAction, saveFeedAction } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { Field, Select, TextArea, TextInput } from "@/components/admin/Field";
import { Notice } from "@/components/ui/Notice";
import { requireSession } from "@/lib/admin/session";
import { ARTICLE_CATEGORIES, getArticleById, listArticles } from "@/lib/content/articles";
import { listFeeds } from "@/lib/content/feeds";
import { contentWritesAllowed } from "@/lib/store";
import { formatCairoDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "إدارة الأخبار" };

export default async function AdminNewsPage({ searchParams }: PageProps<"/admin/news">) {
  const session = await requireSession("editor");
  const sp = await searchParams;
  const editId = typeof sp.edit === "string" && /^[0-9a-f-]{36}$/.test(sp.edit) ? sp.edit : null;
  const [articles, feeds, editing] = await Promise.all([listArticles(true), listFeeds(), editId ? getArticleById(editId) : null]);
  const writable = contentWritesAllowed();

  return (
    <AdminShell session={session} active="/admin/news" title="الأخبار والمحتوى التحريري">
      {!writable ? <Notice variant="warn">الحفظ معطّل لعدم وجود تخزين دائم (Upstash Redis).</Notice> : null}
      <Notice variant="info">
        اكتب محتوى أصليًا فقط. لا تنسخ مقالات من مواقع أخرى؛ عند الاعتماد على مصدر اذكره بالرابط. الصور يجب أن تكون مرخّصة مع ذكر مصدرها،
        ويجب السماح بنطاقها في EXTRA_IMAGE_HOSTS.
      </Notice>

      <section className="card space-y-3 p-4">
        <h2 className="text-lg font-extrabold">{editing ? `تعديل: ${editing.title}` : "مقال جديد"}</h2>
        <ActionForm action={saveArticleAction} submitLabel={editing ? "حفظ التعديلات" : "حفظ المقال"}>
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <Field label="العنوان" htmlFor="title">
            <TextInput id="title" name="title" required minLength={8} maxLength={140} defaultValue={editing?.title} />
          </Field>
          <Field label="المعرّف في الرابط (اختياري)" htmlFor="slug" hint="حروف لاتينية صغيرة وأرقام وشرطات، مثل: ahly-zamalek-preview">
            <TextInput id="slug" name="slug" maxLength={100} dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={editing?.slug} />
          </Field>
          <Field label="الملخص" htmlFor="excerpt">
            <TextArea id="excerpt" name="excerpt" required minLength={20} maxLength={300} rows={2} defaultValue={editing?.excerpt} />
          </Field>
          <Field label="المحتوى" htmlFor="body" hint="فقرات يفصل بينها سطر فارغ. ## عنوان فرعي، - عنصر قائمة، **نص عريض**، [نص](https://رابط)">
            <TextArea id="body" name="body" required minLength={50} maxLength={20000} rows={12} defaultValue={editing?.body} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="التصنيف" htmlFor="category">
              <Select id="category" name="category" defaultValue={editing?.category ?? "news"}>
                {Object.entries(ARTICLE_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="الحالة" htmlFor="status">
              <Select id="status" name="status" defaultValue={editing?.status ?? "draft"}>
                <option value="draft">مسودة</option>
                <option value="published">منشور</option>
              </Select>
            </Field>
            <Field label="اسم المصدر (اختياري)" htmlFor="sourceName">
              <TextInput id="sourceName" name="sourceName" maxLength={80} defaultValue={editing?.sourceName ?? ""} />
            </Field>
            <Field label="رابط المصدر (اختياري)" htmlFor="sourceUrl">
              <TextInput id="sourceUrl" name="sourceUrl" type="url" maxLength={500} dir="ltr" defaultValue={editing?.sourceUrl ?? ""} />
            </Field>
            <Field label="رابط صورة مرخّصة (اختياري)" htmlFor="imageUrl">
              <TextInput id="imageUrl" name="imageUrl" type="url" maxLength={500} dir="ltr" defaultValue={editing?.imageUrl ?? ""} />
            </Field>
            <Field label="مصدر/ترخيص الصورة" htmlFor="imageCredit">
              <TextInput id="imageCredit" name="imageCredit" maxLength={120} defaultValue={editing?.imageCredit ?? ""} />
            </Field>
          </div>
        </ActionForm>
        {editing ? (
          <Link href="/admin/news" className="text-sm font-bold text-pitch-700 hover:underline">
            إلغاء التعديل وإنشاء مقال جديد
          </Link>
        ) : null}
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 text-lg font-extrabold">المقالات ({articles.length})</h2>
        <ul className="divide-y divide-slate-100">
          {articles.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
              <span className="min-w-0">
                <span className="block font-bold">{a.title}</span>
                <span className="text-xs text-slate-500">
                  {a.status === "published" ? "منشور" : "مسودة"} · {ARTICLE_CATEGORIES[a.category]} · {formatCairoDateTime(a.updatedAt)} · {a.author}
                </span>
              </span>
              <span className="flex items-center gap-2">
                {a.status === "published" ? (
                  <Link href={`/news/${a.slug}`} className="text-pitch-700 hover:underline">
                    عرض
                  </Link>
                ) : null}
                <Link href={`/admin/news?edit=${a.id}`} className="text-pitch-700 hover:underline">
                  تعديل
                </Link>
                <ActionForm action={deleteArticleAction} submitLabel="حذف" variant="danger" confirmText="حذف المقال نهائيًا؟">
                  <input type="hidden" name="id" value={a.id} />
                </ActionForm>
              </span>
            </li>
          ))}
          {articles.length === 0 ? <li className="px-4 py-4 text-center text-sm text-slate-500">لا توجد مقالات بعد.</li> : null}
        </ul>
      </section>

      {session.role === "admin" ? (
        <section className="card space-y-3 p-4">
          <h2 className="text-lg font-extrabold">مصادر أخبار مرخّصة (RSS)</h2>
          <p className="text-sm text-slate-600">
            تُعرض العناوين والروابط فقط مع اسم المصدر. أضف مصدرًا فقط إذا كانت شروطه تسمح بإعادة عرض العناوين، واذكر سند الإذن.
          </p>
          <ActionForm action={saveFeedAction} submitLabel="إضافة المصدر">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="اسم المصدر" htmlFor="feed-name">
                <TextInput id="feed-name" name="name" required minLength={2} maxLength={60} />
              </Field>
              <Field label="رابط RSS (HTTPS)" htmlFor="feed-url">
                <TextInput id="feed-url" name="url" type="url" required maxLength={500} dir="ltr" />
              </Field>
              <Field label="الصفحة الرئيسية للمصدر" htmlFor="feed-home">
                <TextInput id="feed-home" name="homepage" type="url" maxLength={500} dir="ltr" />
              </Field>
              <Field label="سند الإذن / الترخيص" htmlFor="feed-perm">
                <TextInput id="feed-perm" name="permissionNote" required minLength={5} maxLength={300} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" name="enabled" defaultChecked className="size-4" /> مفعّل
            </label>
          </ActionForm>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {feeds.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block font-bold">
                    {f.name} {f.enabled ? "" : "(معطّل)"}
                  </span>
                  <span className="block truncate text-xs text-slate-500" dir="ltr">
                    {f.url}
                  </span>
                  <span className="block text-xs text-slate-500">الإذن: {f.permissionNote}</span>
                </span>
                <ActionForm action={deleteFeedAction} submitLabel="حذف" variant="danger" confirmText="حذف المصدر؟">
                  <input type="hidden" name="id" value={f.id} />
                </ActionForm>
              </li>
            ))}
            {feeds.length === 0 ? <li className="px-3 py-3 text-center text-sm text-slate-500">لا توجد مصادر.</li> : null}
          </ul>
          {feeds.length ? <ActionForm action={refreshFeedsAction} submitLabel="جلب العناوين الآن" variant="secondary" /> : null}
        </section>
      ) : null}
    </AdminShell>
  );
}
