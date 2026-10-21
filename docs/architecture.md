# البنية التقنية

## التقنيات

Next.js 16 (App Router, Cache Components / Partial Prerendering, Turbopack) · React 19 · TypeScript 5.9 (strict) ·
Tailwind CSS 4 + `app/theme.css` · lucide-react · Zod · Upstash Redis (اختياري) · Vitest · Playwright.

## مسار البيانات

```
المزود (API-Football) ──► lib/football/providers/api-football/{client,mapper}.ts   (HTTP + تحويل إلى أنواع موحدة)
        │
        ▼
lib/football/cache.ts   getResource(): نسخة حديثة؟ ← فحص الحصة (budget.ts) ← دمج الطلبات + قفل مشترك ← جلب
                         ← حارس القوائم الفارغة المشبوهة ← دمج بلا تراجع (merge.ts) ← حفظ «آخر نسخة صحيحة» 21 يومًا
        │
        ▼
lib/football/service.ts  getFixturesByDate / getMatchDetails / getStandings / … (مدد صلاحية لكل نوع)
        │
        ▼
lib/football/queries.ts  دوال 'use cache' مع cacheLife (live/fixtures/standings/reference/archive/retry)
        │
        ▼
app/** (Server Components)  ← لا يوجد أي طلب للمزود من المتصفح
```

- **التخزين:** `lib/store` (ذاكرة للاختبار، ملفات محليًا في `.data/`، Upstash في الإنتاج) لحفظ آخر نسخة صحيحة، عدادات
  الحصة، الأقفال، المحتوى التحريري والإعدادات وسجل الطلبات.
- **الأخطاء:** `lib/football/errors.ts` يصنف (not_configured، plan_restricted، quota_exceeded، rate_limited، timeout،
  server، network، not_found…) مع رسائل عربية واضحة تُعرض في `components/ui/DataStatus.tsx`.
- **الكاش السلبي:** قيود الباقة 6 ساعات، غير موجود ساعة، أخطاء المصادقة 10 دقائق، أخطاء الشبكة/الخادم 60 ثانية.

## العرض

- الرئيسية و `/matches/{today,yesterday,tomorrow}`: ثابتة مع إعادة توليد (ISR) كل 30 ثانية – 10 دقائق.
- صفحات المباراة/البطولة/الفريق/اللاعب/التاريخ: تُولَّد كاملة عند أول طلب (`ensureStatic = "navigation"`) ثم تُخزن،
  والمعرفات غير الصحيحة تعيد 404 حقيقيًا.
- الأقسام الثانوية في صفحة المباراة (المواجهات، مستوى الفريقين، الترتيب) تُبث عبر Suspense.
- `PageFreshness` (عميل) يعيد طلب الصفحة المخزنة أثناء المباريات المباشرة فقط، وعندما تكون التبويبة ظاهرة، وبحد أقصى.
- التبويبات ومرشحات الحالة تعمل بـ HTML/CSS (radio + `:has()`) دون JavaScript.
- زر الوضع الليلي: سكربت صغير في `<head>` يطبق الاختيار المحفوظ قبل أول رسم (بلا وميض).

## الأمان

CSP وترويسات أمان (`next.config.ts`)، `proxy.ts` لحماية `/admin`، جلسات موقعة HttpOnly، scrypt لكلمات المرور،
حد محاولات الدخول، Zod للتحقق من المدخلات، فحص SSRF لخلاصات الأخبار (`lib/content/safe-fetch.ts`)، عرض المقالات
بمحلل آمن بلا HTML خام (`lib/content/markup.ts`)، مفتاح المزود على الخادم فقط (`server-only`).

## SEO

`lib/seo/metadata.ts` (عنوان ووصف وcanonical فريد لكل صفحة)، `lib/seo/jsonld.ts` (WebSite، SportsEvent، SportsTeam،
NewsArticle، BreadcrumbList للبيانات المؤكدة فقط)، `app/sitemap.ts` و `app/robots.ts`، صور OG، `noindex` للبحث والإدارة
والصفحات غير الموجودة، `lang="ar"` و `dir="rtl"` بدون hreflang (لا توجد نسخ لغوية أخرى).
