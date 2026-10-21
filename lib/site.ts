export const SITE = {
  name: "يلا شوت",
  nameEn: "Yalla Shoot",
  title: "يلا شوت | مواعيد ونتائج المباريات بتوقيت القاهرة",
  description:
    "يلا شوت: مواعيد ونتائج مباريات اليوم بتوقيت القاهرة، مع أولوية للكرة المصرية — الدوري المصري وكأس مصر والبطولات الإفريقية — إلى جانب الدوريات الأوروبية والعربية، وجداول الترتيب وتفاصيل المباريات من مزود بيانات رياضي موثوق.",
  locale: "ar_EG",
  /** Main brand color (logo box, today tab, accents). */
  themeColor: "#931800",
} as const;

export interface NavItem {
  href: string;
  label: string;
}

export const MAIN_NAV: readonly NavItem[] = [
  { href: "/", label: "يلا شوت" },
  { href: "/matches/today", label: "مباريات اليوم" },
  { href: "/leagues/egyptian-premier-league-233", label: "الدوري المصري" },
  { href: "/leagues", label: "البطولات" },
  { href: "/news", label: "الأخبار" },
  { href: "/search", label: "بحث" },
];

export const FOOTER_NAV: readonly { href: string; label: string }[] = [
  { href: "/about", label: "عن الموقع ومصادر البيانات" },
  { href: "/privacy", label: "سياسة الخصوصية" },
  { href: "/terms", label: "شروط الاستخدام" },
  { href: "/contact", label: "اتصل بنا" },
];

/** localStorage key + values used by the night-skin toggle. */
export const SKIN_STORAGE_KEY = "ys-skin";

/** Runs before first paint (inline in <head>) so the night skin never flashes. */
export const SKIN_BOOT_SCRIPT = `(function(){try{if(localStorage.getItem("${SKIN_STORAGE_KEY}")==="night")document.documentElement.classList.add("night")}catch(e){}})();`;
