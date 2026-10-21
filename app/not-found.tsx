import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

// Next.js adds `<meta name="robots" content="noindex">` to not-found responses automatically.
export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
};

export default function NotFound() {
  return (
    <section className="ys-block mx-auto max-w-2xl">
      <div className="ys-entry-head">
        <h1 className="ys-entry-title">الصفحة غير موجودة</h1>
      </div>
      <div className="ys-empty">
        <SearchX aria-hidden="true" />
        <p className="ys-empty-text">
          الرابط الذي فتحته غير صحيح أو لم تعد الصفحة متاحة. يمكنك العودة إلى مباريات اليوم أو البحث عن فريق أو بطولة.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link href="/matches/today" className="ys-pill ys-pill--main">
            مباريات اليوم
          </Link>
          <Link href="/search" className="ys-pill">
            البحث
          </Link>
          <Link href="/" className="ys-pill">
            الرئيسية
          </Link>
        </div>
      </div>
    </section>
  );
}
