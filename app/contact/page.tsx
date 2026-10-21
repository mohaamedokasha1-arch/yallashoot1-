import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { StaticPage } from "@/components/ui/StaticPage";
import { contactEmail } from "@/lib/env";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "اتصل بنا",
  description: "تواصل مع فريق يلا شوت للإبلاغ عن خطأ في البيانات أو للاستفسارات العامة.",
  path: "/contact",
});

export default function ContactPage() {
  const email = contactEmail();
  return (
    <StaticPage title="اتصل بنا" path="/contact">
      <p>يسعدنا تلقي ملاحظاتك، خاصةً الإبلاغ عن أي خطأ في مواعيد المباريات أو النتائج أو الأسماء العربية للفرق.</p>
      {email ? (
        <p className="flex items-center gap-2">
          <Mail aria-hidden="true" className="size-5 text-pitch-700" />
          <span>
            البريد الإلكتروني:{" "}
            <a href={`mailto:${email}`} dir="ltr">
              {email}
            </a>
          </span>
        </p>
      ) : (
        <p>لم تُضف إدارة الموقع وسيلة تواصل عامة بعد.</p>
      )}
      <h2>قبل الإبلاغ عن خطأ في نتيجة</h2>
      <p>
        النتائج والمواعيد تأتي من مزود البيانات وتُعرض كما هي، وقد يستغرق تصحيحها لدى المزود بعض الوقت. يُرجى ذكر رابط صفحة
        المباراة ووصف الخطأ بدقة.
      </p>
    </StaticPage>
  );
}
