/**
 * Pure diagnostics for the FOOTBALL_API_KEY value.
 *
 * API-Sports (api-football.com) issues 64-character hexadecimal keys. The most
 * common misconfigurations behind "auth" failures are detected here so the
 * admin panel can explain a rejected key WITHOUT ever displaying it.
 * Returns null when the key looks correct (or is absent — absence is reported
 * separately as "not configured").
 */
export function apiKeyFormatIssue(key: string | null | undefined): string | null {
  if (!key) return null;
  if (/^[0-9a-f]{64}$/i.test(key)) return null;

  if (/^FOOTBALL_API_KEY\s*=/i.test(key)) {
    return "القيمة المحفوظة تبدأ بـ «FOOTBALL_API_KEY=» — في Vercel ضع المفتاح وحده في خانة القيمة، بدون اسم المتغير.";
  }
  if (/^[0-9a-f-]{32,36}$/i.test(key.replace(/-/g, ""))) {
    return "المفتاح المحفوظ 32 حرفًا (أو UUID): هذا شكل مفاتيح RapidAPI وهي لا تعمل مع هذا الموقع. المطلوب مفتاح API-Sports من dashboard.api-football.com (مجانًا) وطوله 64 حرفًا.";
  }
  if (/\s/.test(key)) {
    return "المفتاح المحفوظ يحتوي على مسافة داخلية — أعد نسخه من dashboard.api-football.com كنص واحد متصل.";
  }
  return `شكل المفتاح غير مطابق لمفاتيح API-Sports (المتوقع 64 حرفًا ست عشريًا، والمحفوظ ${key.length} حرفًا). أعد نسخه من dashboard.api-football.com وتأكد أن الحساب مفعّل.`;
}
