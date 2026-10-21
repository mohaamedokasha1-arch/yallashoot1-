/**
 * Arabic labels for provider vocabulary (rounds, events, statistics, positions).
 * Unknown values are returned unchanged rather than guessed.
 */

const ORDINALS: Record<string, string> = {
  "1st": "الأول",
  "2nd": "الثاني",
  "3rd": "الثالث",
  "4th": "الرابع",
  "5th": "الخامس",
  "6th": "السادس",
  "7th": "السابع",
  "8th": "الثامن",
};

export function roundLabelAr(round: string | null | undefined): string | null {
  if (!round) return null;
  const r = round.trim();
  let m: RegExpExecArray | null;
  if ((m = /^Regular Season\s*-\s*(\d+)$/i.exec(r))) return `الجولة ${m[1]}`;
  if ((m = /^Championship Round\s*-\s*(\d+)$/i.exec(r))) return `مرحلة التتويج - الجولة ${m[1]}`;
  if ((m = /^Relegation Round\s*-\s*(\d+)$/i.exec(r))) return `مرحلة الهبوط - الجولة ${m[1]}`;
  if ((m = /^League Stage\s*-\s*(\d+)$/i.exec(r))) return `مرحلة الدوري - الجولة ${m[1]}`;
  if ((m = /^Group Stage\s*-\s*(\d+)$/i.exec(r))) return `دور المجموعات - الجولة ${m[1]}`;
  if ((m = /^Group ([A-Z0-9]+)\s*-\s*(\d+)$/i.exec(r))) return `المجموعة ${m[1]} - الجولة ${m[2]}`;
  if ((m = /^Round of (\d+)$/i.exec(r))) return `دور الـ${m[1]}`;
  if ((m = /^(\d+)(?:st|nd|rd|th) Round$/i.exec(r))) {
    const key = r.split(" ")[0] ?? "";
    return `الدور ${ORDINALS[key.toLowerCase()] ?? m[1]}`;
  }
  if ((m = /^(\d+)(?:st|nd|rd|th) Qualifying Round$/i.exec(r))) {
    const key = r.split(" ")[0] ?? "";
    return `الدور التمهيدي ${ORDINALS[key.toLowerCase()] ?? m[1]}`;
  }
  const fixed: Record<string, string> = {
    "quarter-finals": "ربع النهائي",
    "semi-finals": "نصف النهائي",
    final: "النهائي",
    "3rd place final": "مباراة تحديد المركز الثالث",
    "play-offs": "الملحق",
    "knockout round play-offs": "ملحق الأدوار الإقصائية",
    "preliminary round": "الدور التمهيدي",
    "qualifying round": "الأدوار التمهيدية",
    "group stage": "دور المجموعات",
    "league stage": "مرحلة الدوري",
  };
  return fixed[r.toLowerCase()] ?? r;
}

export function eventDetailAr(type: string, detail: string): string {
  const d = detail.toLowerCase();
  if (type === "goal") {
    if (d.includes("own goal")) return "هدف عكسي";
    if (d.includes("missed penalty")) return "ركلة جزاء ضائعة";
    if (d.includes("penalty")) return "هدف من ركلة جزاء";
    return "هدف";
  }
  if (type === "card") {
    if (d.includes("second yellow")) return "إنذار ثانٍ (طرد)";
    if (d.includes("red")) return "بطاقة حمراء";
    if (d.includes("yellow")) return "بطاقة صفراء";
    return "بطاقة";
  }
  if (type === "subst") return "تبديل";
  if (type === "var") {
    if (d.includes("goal cancelled") || d.includes("goal disallowed")) return "إلغاء هدف بتقنية الفيديو";
    if (d.includes("penalty confirmed")) return "احتساب ركلة جزاء بتقنية الفيديو";
    if (d.includes("penalty cancelled")) return "إلغاء ركلة جزاء بتقنية الفيديو";
    if (d.includes("card upgrade")) return "تعديل البطاقة بتقنية الفيديو";
    return "مراجعة بتقنية الفيديو";
  }
  return detail;
}

const STAT_LABELS: Record<string, string> = {
  "ball possession": "الاستحواذ",
  "total shots": "إجمالي التسديدات",
  "shots on goal": "تسديدات على المرمى",
  "shots off goal": "تسديدات خارج المرمى",
  "blocked shots": "تسديدات تم صدها",
  "shots insidebox": "تسديدات داخل المنطقة",
  "shots outsidebox": "تسديدات خارج المنطقة",
  "corner kicks": "ركلات ركنية",
  offsides: "تسلل",
  fouls: "أخطاء",
  "yellow cards": "بطاقات صفراء",
  "red cards": "بطاقات حمراء",
  "goalkeeper saves": "تصديات الحارس",
  "total passes": "إجمالي التمريرات",
  "passes accurate": "تمريرات صحيحة",
  "passes %": "دقة التمرير",
  expected_goals: "الأهداف المتوقعة (xG)",
  goals_prevented: "أهداف منعها الحارس",
};

/** Display order for statistics (unknown types go last, in provider order). */
export const STAT_ORDER = Object.keys(STAT_LABELS);

export function statLabelAr(type: string): string {
  return STAT_LABELS[type.toLowerCase()] ?? type;
}

export function positionLabelAr(pos: string | null | undefined): string | null {
  if (!pos) return null;
  const p = pos.trim().toLowerCase();
  if (p === "g" || p === "goalkeeper") return "حارس مرمى";
  if (p === "d" || p === "defender") return "مدافع";
  if (p === "m" || p === "midfielder") return "لاعب وسط";
  if (p === "f" || p === "attacker" || p === "forward") return "مهاجم";
  return pos;
}

/** Standing row description → short Arabic hint (e.g. qualification zones). */
export function standingDescriptionAr(desc: string | null): string | null {
  if (!desc) return null;
  const d = desc.toLowerCase();
  if (d.includes("relegation")) return "منطقة الهبوط";
  if (d.includes("champions league")) return d.includes("qualif") ? "تأهل لتصفيات دوري الأبطال" : "تأهل لدوري الأبطال";
  if (d.includes("europa conference") || d.includes("conference league")) return "تأهل لدوري المؤتمر";
  if (d.includes("europa league")) return "تأهل للدوري الأوروبي";
  if (d.includes("confederation cup")) return "تأهل لكأس الكونفدرالية";
  if (d.includes("promotion")) return "منطقة الصعود";
  if (d.includes("championship round")) return "التأهل لمرحلة التتويج";
  if (d.includes("next round") || d.includes("knockout") || d.includes("round of 16")) return "التأهل للدور التالي";
  if (d.includes("play-off") || d.includes("playoff")) return "الملحق";
  return desc;
}
