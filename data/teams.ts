/**
 * Arabic team names keyed by API-Football team id.
 *
 * `api` lists the provider names the id is known under; the Arabic name is
 * only applied when the provider's current name loosely matches one of them
 * (guards against wrong ids or clubs being renamed/merged).
 *
 * Egyptian ids were taken from real API-Football `/teams?country=Egypt`
 * responses. This list is a name dictionary, NOT a list of the current
 * season's participants — participants always come from the provider.
 */

export interface TeamNameEntry {
  id: number;
  ar: string;
  api: readonly string[];
  /** Extra search aliases (Arabic or Latin spellings). */
  aliases?: readonly string[];
  country: string;
  national?: boolean;
  /** Shown in "أندية بارزة" links. */
  notable?: boolean;
  /** Older duplicate id kept only to name historical fixtures (hidden from search/links). */
  legacy?: boolean;
}

export const TEAM_NAMES: readonly TeamNameEntry[] = [
  // ── Egypt — national teams ──────────────────────────────────────────────
  { id: 32, ar: "منتخب مصر", api: ["Egypt"], aliases: ["الفراعنة", "مصر"], country: "Egypt", national: true, notable: true },
  { id: 10172, ar: "منتخب مصر الأولمبي", api: ["Egypt U23"], aliases: ["المنتخب الأولمبي"], country: "Egypt", national: true },
  { id: 11027, ar: "منتخب مصر للشباب", api: ["Egypt U20"], country: "Egypt", national: true },
  { id: 23538, ar: "منتخب مصر تحت 21 عامًا", api: ["Egypt U21"], country: "Egypt", national: true },
  { id: 19417, ar: "منتخب مصر للسيدات", api: ["Egypt W"], country: "Egypt", national: true },

  // ── Egypt — clubs ─────────────────────────────────────────────────────────
  { id: 1577, ar: "الأهلي", api: ["Al Ahly"], aliases: ["الاهلي المصري", "النادي الأهلي", "al ahly", "ahly", "el ahly"], country: "Egypt", notable: true },
  { id: 1029, ar: "الأهلي", api: ["AL Ahly Cairo", "Al Ahly Cairo"], country: "Egypt", legacy: true },
  { id: 1040, ar: "الزمالك", api: ["Zamalek SC", "Zamalek"], aliases: ["نادي الزمالك", "zamalek", "zamalik"], country: "Egypt", notable: true },
  { id: 1036, ar: "بيراميدز", api: ["Pyramids FC", "Pyramids"], aliases: ["بيراميدز اف سي", "الأهرامات", "pyramids"], country: "Egypt", notable: true },
  { id: 1030, ar: "الإسماعيلي", api: ["Ismaily SC", "Ismaily"], aliases: ["الدراويش", "ismaily", "ismaili"], country: "Egypt", notable: true },
  { id: 1031, ar: "المصري البورسعيدي", api: ["AL Masry", "Al Masry"], aliases: ["المصري", "al masry", "masry"], country: "Egypt", notable: true },
  { id: 1035, ar: "الاتحاد السكندري", api: ["AL Ittih. Alexandria", "Al Ittihad Alexandria", "Al Ittihad"], aliases: ["الاتحاد", "اتحاد الإسكندرية", "ittihad alexandria"], country: "Egypt", notable: true },
  { id: 1572, ar: "الاتحاد السكندري", api: ["Al Ittihad", "Al Ittihad Alexandria"], country: "Egypt", legacy: true },
  { id: 14651, ar: "سيراميكا كليوباترا", api: ["Ceramica Cleopatra"], aliases: ["سيراميكا", "ceramica"], country: "Egypt", notable: true },
  { id: 1037, ar: "إنبي", api: ["Enppi", "ENPPI"], aliases: ["انبي", "enppi"], country: "Egypt" },
  { id: 1044, ar: "سموحة", api: ["Smouha SC", "Smouha"], aliases: ["smouha"], country: "Egypt" },
  { id: 1574, ar: "الجونة", api: ["El Gouna FC", "El Gouna"], aliases: ["gouna"], country: "Egypt" },
  { id: 1046, ar: "وادي دجلة", api: ["Wadi Degla"], aliases: ["wadi degla"], country: "Egypt" },
  { id: 1033, ar: "المقاولون العرب", api: ["AL Mokawloon", "Al Mokawloon", "Arab Contractors"], aliases: ["المقاولون", "mokawloon", "arab contractors"], country: "Egypt" },
  { id: 1575, ar: "المقاولون العرب", api: ["El Mokawloon", "Al Mokawloon"], country: "Egypt", legacy: true },
  { id: 1039, ar: "طلائع الجيش", api: ["El Geish", "Tala'ea El Gaish", "El Gaish"], aliases: ["الطلائع", "الجيش", "el geish"], country: "Egypt" },
  { id: 1041, ar: "بتروجت", api: ["Petrojet"], aliases: ["petrojet"], country: "Egypt" },
  { id: 13819, ar: "غزل المحلة", api: ["Ghazl El Mehalla"], aliases: ["الغزل", "ghazl"], country: "Egypt" },
  { id: 15570, ar: "البنك الأهلي", api: ["National Bank of Egypt", "National Bank"], aliases: ["البنك", "nbe"], country: "Egypt" },
  { id: 15736, ar: "فاركو", api: ["Pharco"], aliases: ["pharco"], country: "Egypt" },
  { id: 1576, ar: "حرس الحدود", api: ["Haras El Hodood"], aliases: ["الحرس", "haras el hodood"], country: "Egypt" },
  { id: 1038, ar: "مصر المقاصة", api: ["Misr EL Makasa", "Misr El Makasa"], aliases: ["المقاصة"], country: "Egypt" },
  { id: 1032, ar: "الداخلية", api: ["El Dakhleya"], country: "Egypt" },
  { id: 18021, ar: "بترول أسيوط", api: ["Asyut Petrol", "Petrol Asyut"], aliases: ["بترول اسيوط"], country: "Egypt" },
  { id: 13822, ar: "القناة", api: ["Olympic El Qanah", "El Qanah"], aliases: ["أوليمبي القناة"], country: "Egypt" },
  { id: 20458, ar: "كهرباء الإسماعيلية", api: ["Kahraba Ismailia"], aliases: ["الكهرباء"], country: "Egypt" },
  { id: 15731, ar: "أبو قير للأسمدة", api: ["Abu Qair Semad"], country: "Egypt" },
  { id: 16431, ar: "مودرن سبورت", api: ["Future FC", "Modern Sport", "Modern Sport FC"], aliases: ["فيوتشر", "مودرن فيوتشر"], country: "Egypt" },
  { id: 7520, ar: "زد", api: ["Masr", "ZED FC", "ZED"], aliases: ["زد اف سي", "مصر للتأمين"], country: "Egypt" },
  { id: 1034, ar: "الإنتاج الحربي", api: ["El Entag EL Harby", "El Entag El Harby"], country: "Egypt" },
  { id: 1042, ar: "رجاء مطروح", api: ["El Raja Marsa Matruh"], country: "Egypt" },
  { id: 1045, ar: "طنطا", api: ["Tanta SC", "Tanta"], country: "Egypt" },
  { id: 1047, ar: "نصر التعدين", api: ["Al Nasr Taaden"], country: "Egypt" },
  { id: 1048, ar: "أسوان", api: ["Aswan Sc", "Aswan"], country: "Egypt" },
  { id: 1049, ar: "الشرقية", api: ["El Sharkia"], country: "Egypt" },
  { id: 1573, ar: "نجوم المستقبل", api: ["Nogoom El Mostakbal FC", "Nogoom FC"], country: "Egypt" },
  { id: 2617, ar: "النصر", api: ["AL Nasr SC", "Al Nasr"], country: "Egypt" },
  { id: 13818, ar: "الشرطة", api: ["El Shorta"], country: "Egypt" },
  { id: 13820, ar: "ألعاب دمنهور", api: ["Alaab Damanhour"], country: "Egypt" },
  { id: 13821, ar: "المنيا", api: ["El Minya"], country: "Egypt" },
  { id: 13823, ar: "تليفونات بني سويف", api: ["Telephonaat Beni Suef"], country: "Egypt" },
  { id: 15739, ar: "الترسانة", api: ["Tersana"], country: "Egypt" },
  { id: 16432, ar: "المنصورة", api: ["El Mansura"], country: "Egypt" },
  { id: 16436, ar: "لافيينا", api: ["La Viena FC", "La Viena"], country: "Egypt" },
  { id: 16437, ar: "سوهاج", api: ["Sohag"], country: "Egypt" },
  { id: 18031, ar: "السكة الحديد", api: ["El Seka El Hadid"], country: "Egypt" },
  { id: 18036, ar: "بلدية المحلة", api: ["Baladiyyat Al Mehalla"], country: "Egypt" },
  { id: 18044, ar: "سبورتنج", api: ["Sporting Alexandria"], country: "Egypt" },
  { id: 18034, ar: "السويس", api: ["Suez"], country: "Egypt" },
  { id: 18035, ar: "المريخ البورسعيدي", api: ["Al Merreikh"], country: "Egypt" },
  { id: 18042, ar: "بيونيرز", api: ["Pioneers"], country: "Egypt" },
  { id: 15737, ar: "قنا", api: ["Qena"], country: "Egypt" },
  { id: 18025, ar: "الفيوم", api: ["Fayoum"], country: "Egypt" },
  { id: 18022, ar: "ديروط", api: ["Dayrout"], country: "Egypt" },
  { id: 18020, ar: "ألومنيوم نجع حمادي", api: ["Aluminium Nag Hammadi"], country: "Egypt" },
  { id: 20455, ar: "أسمنت أسيوط", api: ["Asmant Asyut"], country: "Egypt" },
  { id: 16435, ar: "كيما أسوان", api: ["Kima Aswan"], country: "Egypt" },
  { id: 16434, ar: "اتحاد نبروه", api: ["Itehad Nabaroh"], country: "Egypt" },
  { id: 15733, ar: "بيلا", api: ["Biyala"], country: "Egypt" },
  { id: 15734, ar: "دكرنس", api: ["Dikernis"], country: "Egypt" },
  { id: 16430, ar: "أشمون", api: ["Ashmoun"], country: "Egypt" },

  // ── Saudi Arabia (ids to be confirmed by the coverage check) ────────────
  { id: 2932, ar: "الهلال", api: ["Al-Hilal Saudi FC", "Al Hilal"], aliases: ["الهلال السعودي"], country: "Saudi-Arabia", notable: true },
  { id: 2939, ar: "النصر", api: ["Al-Nassr", "Al Nassr"], aliases: ["النصر السعودي"], country: "Saudi-Arabia", notable: true },
  { id: 2938, ar: "الاتحاد", api: ["Al-Ittihad FC", "Al Ittihad"], aliases: ["اتحاد جدة"], country: "Saudi-Arabia" },
  { id: 2929, ar: "الأهلي السعودي", api: ["Al-Ahli Jeddah", "Al Ahli Saudi", "Al-Ahli"], aliases: ["أهلي جدة"], country: "Saudi-Arabia" },

  // ── England ───────────────────────────────────────────────────────────────
  { id: 33, ar: "مانشستر يونايتد", api: ["Manchester United"], aliases: ["مان يونايتد", "man utd"], country: "England", notable: true },
  { id: 34, ar: "نيوكاسل يونايتد", api: ["Newcastle", "Newcastle United"], country: "England" },
  { id: 35, ar: "بورنموث", api: ["Bournemouth"], country: "England" },
  { id: 36, ar: "فولهام", api: ["Fulham"], country: "England" },
  { id: 39, ar: "وولفرهامبتون", api: ["Wolves", "Wolverhampton Wanderers"], country: "England" },
  { id: 40, ar: "ليفربول", api: ["Liverpool"], country: "England", notable: true },
  { id: 41, ar: "ساوثهامبتون", api: ["Southampton"], country: "England" },
  { id: 42, ar: "آرسنال", api: ["Arsenal"], aliases: ["ارسنال"], country: "England", notable: true },
  { id: 44, ar: "بيرنلي", api: ["Burnley"], country: "England" },
  { id: 45, ar: "إيفرتون", api: ["Everton"], country: "England" },
  { id: 46, ar: "ليستر سيتي", api: ["Leicester", "Leicester City"], country: "England" },
  { id: 47, ar: "توتنهام", api: ["Tottenham", "Tottenham Hotspur"], country: "England" },
  { id: 48, ar: "وست هام يونايتد", api: ["West Ham", "West Ham United"], country: "England" },
  { id: 49, ar: "تشيلسي", api: ["Chelsea"], country: "England", notable: true },
  { id: 50, ar: "مانشستر سيتي", api: ["Manchester City"], aliases: ["مان سيتي", "man city"], country: "England", notable: true },
  { id: 51, ar: "برايتون", api: ["Brighton", "Brighton & Hove Albion"], country: "England" },
  { id: 52, ar: "كريستال بالاس", api: ["Crystal Palace"], country: "England" },
  { id: 55, ar: "برينتفورد", api: ["Brentford"], country: "England" },
  { id: 63, ar: "ليدز يونايتد", api: ["Leeds", "Leeds United"], country: "England" },
  { id: 65, ar: "نوتنغهام فورست", api: ["Nottingham Forest"], country: "England" },
  { id: 66, ar: "أستون فيلا", api: ["Aston Villa"], country: "England" },

  // ── Spain ─────────────────────────────────────────────────────────────────
  { id: 541, ar: "ريال مدريد", api: ["Real Madrid"], aliases: ["الريال", "الملكي"], country: "Spain", notable: true },
  { id: 529, ar: "برشلونة", api: ["Barcelona"], aliases: ["البارسا", "برشلونه"], country: "Spain", notable: true },
  { id: 530, ar: "أتلتيكو مدريد", api: ["Atletico Madrid"], country: "Spain" },
  { id: 531, ar: "أتلتيك بلباو", api: ["Athletic Club"], country: "Spain" },
  { id: 532, ar: "فالنسيا", api: ["Valencia"], country: "Spain" },
  { id: 533, ar: "فياريال", api: ["Villarreal"], country: "Spain" },
  { id: 536, ar: "إشبيلية", api: ["Sevilla"], country: "Spain" },
  { id: 543, ar: "ريال بيتيس", api: ["Real Betis"], country: "Spain" },
  { id: 548, ar: "ريال سوسيداد", api: ["Real Sociedad"], country: "Spain" },

  // ── Italy ─────────────────────────────────────────────────────────────────
  { id: 489, ar: "ميلان", api: ["AC Milan"], country: "Italy" },
  { id: 505, ar: "إنتر ميلان", api: ["Inter"], aliases: ["انتر"], country: "Italy" },
  { id: 496, ar: "يوفنتوس", api: ["Juventus"], country: "Italy", notable: true },
  { id: 492, ar: "نابولي", api: ["Napoli"], country: "Italy" },
  { id: 497, ar: "روما", api: ["AS Roma"], country: "Italy" },
  { id: 487, ar: "لاتسيو", api: ["Lazio"], country: "Italy" },
  { id: 499, ar: "أتالانتا", api: ["Atalanta"], country: "Italy" },

  // ── Germany ───────────────────────────────────────────────────────────────
  { id: 157, ar: "بايرن ميونخ", api: ["Bayern München", "Bayern Munich"], country: "Germany", notable: true },
  { id: 165, ar: "بوروسيا دورتموند", api: ["Borussia Dortmund"], country: "Germany" },
  { id: 168, ar: "باير ليفركوزن", api: ["Bayer Leverkusen"], country: "Germany" },
  { id: 173, ar: "لايبزيغ", api: ["RB Leipzig"], country: "Germany" },

  // ── France ────────────────────────────────────────────────────────────────
  { id: 85, ar: "باريس سان جيرمان", api: ["Paris Saint Germain"], aliases: ["psg"], country: "France", notable: true },
  { id: 81, ar: "مارسيليا", api: ["Marseille"], country: "France" },
  { id: 80, ar: "ليون", api: ["Lyon"], country: "France" },
  { id: 91, ar: "موناكو", api: ["Monaco"], country: "France" },
];

/**
 * Name rules for clubs whose ids were not verified. Applied only when the
 * team's country is known (domestic league fixtures) and matches.
 */
export interface TeamNameRule {
  country: string;
  pattern: RegExp;
  ar: string;
}

export const TEAM_NAME_RULES: readonly TeamNameRule[] = [
  { country: "Morocco", pattern: /^wydad/i, ar: "الوداد الرياضي" },
  { country: "Morocco", pattern: /^raja/i, ar: "الرجاء الرياضي" },
  { country: "Morocco", pattern: /^(as )?far rabat|^fus rabat/i, ar: "الجيش الملكي" },
  { country: "Morocco", pattern: /berkane/i, ar: "نهضة بركان" },
  { country: "Tunisia", pattern: /esperance/i, ar: "الترجي الرياضي" },
  { country: "Tunisia", pattern: /etoile.*sahel/i, ar: "النجم الساحلي" },
  { country: "Tunisia", pattern: /club africain/i, ar: "النادي الإفريقي" },
  { country: "Tunisia", pattern: /sfaxien/i, ar: "النادي الصفاقسي" },
  { country: "Algeria", pattern: /^mc alger/i, ar: "مولودية الجزائر" },
  { country: "Algeria", pattern: /belouizdad/i, ar: "شباب بلوزداد" },
  { country: "Algeria", pattern: /kabylie/i, ar: "شبيبة القبائل" },
  { country: "Algeria", pattern: /^usm alger/i, ar: "اتحاد العاصمة" },
  { country: "Saudi-Arabia", pattern: /^al[- ]?shabab/i, ar: "الشباب" },
  { country: "Saudi-Arabia", pattern: /^al[- ]?ettifaq/i, ar: "الاتفاق" },
  { country: "Saudi-Arabia", pattern: /^al[- ]?taawoun/i, ar: "التعاون" },
  { country: "Saudi-Arabia", pattern: /^al[- ]?fateh/i, ar: "الفتح" },
  { country: "Saudi-Arabia", pattern: /^al[- ]?qadisiyah/i, ar: "القادسية" },
  { country: "Libya", pattern: /^al ahli tripoli/i, ar: "الأهلي طرابلس" },
  { country: "Libya", pattern: /^al ittihad tripoli/i, ar: "الاتحاد الليبي" },
  { country: "Sudan", pattern: /^al hilal/i, ar: "الهلال السوداني" },
  { country: "Sudan", pattern: /merreikh|merrikh/i, ar: "المريخ السوداني" },
  { country: "Qatar", pattern: /^al sadd/i, ar: "السد" },
  { country: "Qatar", pattern: /^al duhail/i, ar: "الدحيل" },
  { country: "United-Arab-Emirates", pattern: /^al ain/i, ar: "العين" },
  { country: "United-Arab-Emirates", pattern: /^shabab al ahli/i, ar: "شباب الأهلي" },
  { country: "South-Africa", pattern: /sundowns/i, ar: "ماميلودي صن داونز" },
  { country: "South-Africa", pattern: /orlando pirates/i, ar: "أورلاندو بايرتس" },
  { country: "South-Africa", pattern: /kaizer chiefs/i, ar: "كايزر تشيفز" },
];
