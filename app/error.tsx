"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page error]", error.digest ?? error.message);
  }, [error]);

  return (
    <section className="ys-block mx-auto max-w-2xl">
      <div className="ys-entry-head">
        <h1 className="ys-entry-title">حدث خطأ غير متوقع</h1>
      </div>
      <div className="ys-empty">
        <TriangleAlert aria-hidden="true" />
        <p className="ys-empty-text">تعذّر عرض هذه الصفحة الآن. يمكنك إعادة المحاولة أو العودة إلى الصفحة الرئيسية.</p>
        {error.digest ? <p className="text-xs">رمز الخطأ: {error.digest}</p> : null}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="ys-pill ys-pill--main cursor-pointer">
            <RotateCcw aria-hidden="true" className="size-4" />
            إعادة المحاولة
          </button>
          <Link href="/" className="ys-pill">
            الرئيسية
          </Link>
        </div>
      </div>
    </section>
  );
}
