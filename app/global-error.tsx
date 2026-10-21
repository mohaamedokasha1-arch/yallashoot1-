"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui, Tahoma, Arial, sans-serif", margin: 0, background: "#eceef2", color: "#000" }}>
        <main style={{ maxWidth: 560, margin: "15vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>حدث خطأ في الخادم</h1>
          <p style={{ lineHeight: 1.9 }}>نعتذر، تعذّر تحميل الموقع الآن. يرجى المحاولة مرة أخرى بعد قليل.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, padding: "10px 18px", borderRadius: 8, border: 0, background: "#931800", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
