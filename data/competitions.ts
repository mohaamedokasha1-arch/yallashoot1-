/**
 * Competition registry (API-Football league ids).
 *
 * This is NOT a claim that every competition below is available on your plan
 * or has data this season. It only provides Arabic names, display priority and
 * section placement. What is actually shown always comes from the provider.
 *
 * `idSource` documents how each id was confirmed while building the project:
 *  - "api-sample":  the id, name and country were seen in real API-Football
 *                   responses — samples fetched while building, or published
 *                   raw exports of /fixtures and /leagues responses (the
 *                   evidence for Egyptian/African ids is listed in
 *                   docs/data-coverage.md).
 *  - "third-party": taken from hand-written configs of projects that consume
 *                   API-Football, not yet matched against a real response.
 *  - "unverified":  believed correct, must be confirmed by the coverage check
 *                   (admin panel → "التحقق من التغطية", or `npm run check:provider`).
 *
 * Safety net: an Arabic name is applied only when the provider returns the
 * same id AND the expected country (see lib/football/names.ts). Otherwise the
 * provider's own name is shown.
 */

export type Region =
  | "egypt"
  | "england"
  | "europe"
  | "arab"
  | "africa"
  | "international"
  | "asia"
  | "americas"
  | "other";

export interface CompetitionEntry {
  id: number;
  /** ASCII slug base used in `/leagues/{slug}-{id}`. */
  slug: string;
  nameAr: string;
  /** Provider name expected for this id (diagnostics only). */
  apiName: string;
  /** Provider country label expected for this id. */
  apiCountry: string;
  region: Region;
  /** Lower number = shown first inside its region. */
  priority: number;
  type: "league" | "cup";
  idSource: "api-sample" | "third-party" | "unverified";
  /** Shown in the main sections of the home page when it has matches. */
  featured: boolean;
}

export const COMPETITIONS: readonly CompetitionEntry[] = [
  // ── Egypt ───────────────────────────────────────────────────────────────
  { id: 233, slug: "egyptian-premier-league", nameAr: "الدوري المصري الممتاز", apiName: "Premier League", apiCountry: "Egypt", region: "egypt", priority: 1, type: "league", idSource: "api-sample", featured: true },
  { id: 714, slug: "egypt-cup", nameAr: "كأس مصر", apiName: "Cup", apiCountry: "Egypt", region: "egypt", priority: 2, type: "cup", idSource: "api-sample", featured: true },
  { id: 539, slug: "egyptian-super-cup", nameAr: "كأس السوبر المصري", apiName: "Super Cup", apiCountry: "Egypt", region: "egypt", priority: 3, type: "cup", idSource: "api-sample", featured: true },
  { id: 895, slug: "egyptian-league-cup", nameAr: "كأس رابطة الأندية المصرية", apiName: "League Cup", apiCountry: "Egypt", region: "egypt", priority: 4, type: "cup", idSource: "api-sample", featured: true },
  { id: 887, slug: "egyptian-second-division", nameAr: "دوري المحترفين المصري (الدرجة الثانية)", apiName: "Second League", apiCountry: "Egypt", region: "egypt", priority: 5, type: "league", idSource: "api-sample", featured: true },

  // ── African competitions & national teams ─────────────────────────────
  { id: 12, slug: "caf-champions-league", nameAr: "دوري أبطال إفريقيا", apiName: "CAF Champions League", apiCountry: "World", region: "africa", priority: 1, type: "cup", idSource: "api-sample", featured: true },
  { id: 20, slug: "caf-confederation-cup", nameAr: "كأس الكونفدرالية الإفريقية", apiName: "CAF Confederation Cup", apiCountry: "World", region: "africa", priority: 2, type: "cup", idSource: "api-sample", featured: true },
  { id: 6, slug: "africa-cup-of-nations", nameAr: "كأس الأمم الإفريقية", apiName: "Africa Cup of Nations", apiCountry: "World", region: "africa", priority: 3, type: "cup", idSource: "api-sample", featured: true },
  { id: 36, slug: "africa-cup-of-nations-qualification", nameAr: "تصفيات كأس الأمم الإفريقية", apiName: "Africa Cup of Nations - Qualification", apiCountry: "World", region: "africa", priority: 4, type: "cup", idSource: "api-sample", featured: true },
  { id: 29, slug: "world-cup-qualification-africa", nameAr: "تصفيات كأس العالم - إفريقيا", apiName: "World Cup - Qualification Africa", apiCountry: "World", region: "africa", priority: 5, type: "cup", idSource: "api-sample", featured: true },
  { id: 288, slug: "south-africa-premier-soccer-league", nameAr: "الدوري الجنوب إفريقي", apiName: "Premier Soccer League", apiCountry: "South-Africa", region: "africa", priority: 20, type: "league", idSource: "api-sample", featured: false },

  // ── England ─────────────────────────────────────────────────────────────
  { id: 39, slug: "premier-league", nameAr: "الدوري الإنجليزي الممتاز", apiName: "Premier League", apiCountry: "England", region: "england", priority: 1, type: "league", idSource: "api-sample", featured: true },
  { id: 45, slug: "fa-cup", nameAr: "كأس الاتحاد الإنجليزي", apiName: "FA Cup", apiCountry: "England", region: "england", priority: 2, type: "cup", idSource: "api-sample", featured: true },
  { id: 48, slug: "efl-cup", nameAr: "كأس رابطة الأندية الإنجليزية", apiName: "League Cup", apiCountry: "England", region: "england", priority: 3, type: "cup", idSource: "api-sample", featured: true },
  { id: 40, slug: "efl-championship", nameAr: "دوري البطولة الإنجليزية", apiName: "Championship", apiCountry: "England", region: "england", priority: 4, type: "league", idSource: "api-sample", featured: true },
  { id: 528, slug: "community-shield", nameAr: "درع المجتمع الإنجليزي", apiName: "Community Shield", apiCountry: "England", region: "england", priority: 5, type: "cup", idSource: "api-sample", featured: true },
  { id: 41, slug: "efl-league-one", nameAr: "دوري الدرجة الأولى الإنجليزي", apiName: "League One", apiCountry: "England", region: "england", priority: 6, type: "league", idSource: "api-sample", featured: false },
  { id: 42, slug: "efl-league-two", nameAr: "دوري الدرجة الثانية الإنجليزي", apiName: "League Two", apiCountry: "England", region: "england", priority: 7, type: "league", idSource: "api-sample", featured: false },

  // ── Europe ──────────────────────────────────────────────────────────────
  { id: 2, slug: "uefa-champions-league", nameAr: "دوري أبطال أوروبا", apiName: "UEFA Champions League", apiCountry: "World", region: "europe", priority: 1, type: "cup", idSource: "api-sample", featured: true },
  { id: 3, slug: "uefa-europa-league", nameAr: "الدوري الأوروبي", apiName: "UEFA Europa League", apiCountry: "World", region: "europe", priority: 2, type: "cup", idSource: "api-sample", featured: true },
  { id: 848, slug: "uefa-conference-league", nameAr: "دوري المؤتمر الأوروبي", apiName: "UEFA Europa Conference League", apiCountry: "World", region: "europe", priority: 3, type: "cup", idSource: "api-sample", featured: true },
  { id: 531, slug: "uefa-super-cup", nameAr: "كأس السوبر الأوروبي", apiName: "UEFA Super Cup", apiCountry: "World", region: "europe", priority: 4, type: "cup", idSource: "api-sample", featured: true },
  { id: 140, slug: "la-liga", nameAr: "الدوري الإسباني", apiName: "La Liga", apiCountry: "Spain", region: "europe", priority: 5, type: "league", idSource: "api-sample", featured: true },
  { id: 135, slug: "serie-a", nameAr: "الدوري الإيطالي", apiName: "Serie A", apiCountry: "Italy", region: "europe", priority: 6, type: "league", idSource: "api-sample", featured: true },
  { id: 78, slug: "bundesliga", nameAr: "الدوري الألماني", apiName: "Bundesliga", apiCountry: "Germany", region: "europe", priority: 7, type: "league", idSource: "api-sample", featured: true },
  { id: 61, slug: "ligue-1", nameAr: "الدوري الفرنسي", apiName: "Ligue 1", apiCountry: "France", region: "europe", priority: 8, type: "league", idSource: "api-sample", featured: true },
  { id: 143, slug: "copa-del-rey", nameAr: "كأس ملك إسبانيا", apiName: "Copa del Rey", apiCountry: "Spain", region: "europe", priority: 9, type: "cup", idSource: "api-sample", featured: true },
  { id: 137, slug: "coppa-italia", nameAr: "كأس إيطاليا", apiName: "Coppa Italia", apiCountry: "Italy", region: "europe", priority: 10, type: "cup", idSource: "api-sample", featured: true },
  { id: 81, slug: "dfb-pokal", nameAr: "كأس ألمانيا", apiName: "DFB Pokal", apiCountry: "Germany", region: "europe", priority: 11, type: "cup", idSource: "api-sample", featured: true },
  { id: 66, slug: "coupe-de-france", nameAr: "كأس فرنسا", apiName: "Coupe de France", apiCountry: "France", region: "europe", priority: 12, type: "cup", idSource: "api-sample", featured: true },
  { id: 88, slug: "eredivisie", nameAr: "الدوري الهولندي", apiName: "Eredivisie", apiCountry: "Netherlands", region: "europe", priority: 13, type: "league", idSource: "api-sample", featured: true },
  { id: 94, slug: "primeira-liga", nameAr: "الدوري البرتغالي", apiName: "Primeira Liga", apiCountry: "Portugal", region: "europe", priority: 14, type: "league", idSource: "api-sample", featured: true },
  { id: 203, slug: "turkish-super-lig", nameAr: "الدوري التركي", apiName: "Süper Lig", apiCountry: "Turkey", region: "europe", priority: 15, type: "league", idSource: "api-sample", featured: true },
  { id: 179, slug: "scottish-premiership", nameAr: "الدوري الاسكتلندي", apiName: "Premiership", apiCountry: "Scotland", region: "europe", priority: 16, type: "league", idSource: "api-sample", featured: false },
  { id: 144, slug: "belgian-pro-league", nameAr: "الدوري البلجيكي", apiName: "Jupiler Pro League", apiCountry: "Belgium", region: "europe", priority: 17, type: "league", idSource: "api-sample", featured: false },
  { id: 141, slug: "la-liga-2", nameAr: "الدوري الإسباني - الدرجة الثانية", apiName: "Segunda División", apiCountry: "Spain", region: "europe", priority: 18, type: "league", idSource: "api-sample", featured: false },
  { id: 136, slug: "serie-b", nameAr: "الدوري الإيطالي - الدرجة الثانية", apiName: "Serie B", apiCountry: "Italy", region: "europe", priority: 19, type: "league", idSource: "api-sample", featured: false },
  { id: 79, slug: "2-bundesliga", nameAr: "الدوري الألماني - الدرجة الثانية", apiName: "2. Bundesliga", apiCountry: "Germany", region: "europe", priority: 20, type: "league", idSource: "api-sample", featured: false },
  { id: 62, slug: "ligue-2", nameAr: "الدوري الفرنسي - الدرجة الثانية", apiName: "Ligue 2", apiCountry: "France", region: "europe", priority: 21, type: "league", idSource: "api-sample", featured: false },
  { id: 207, slug: "swiss-super-league", nameAr: "الدوري السويسري", apiName: "Super League", apiCountry: "Switzerland", region: "europe", priority: 22, type: "league", idSource: "api-sample", featured: false },
  { id: 218, slug: "austrian-bundesliga", nameAr: "الدوري النمساوي", apiName: "Bundesliga", apiCountry: "Austria", region: "europe", priority: 23, type: "league", idSource: "api-sample", featured: false },

  // ── Arab competitions ────────────────────────────────────────────────────
  { id: 307, slug: "saudi-pro-league", nameAr: "دوري روشن السعودي", apiName: "Pro League", apiCountry: "Saudi-Arabia", region: "arab", priority: 1, type: "league", idSource: "api-sample", featured: true },
  { id: 504, slug: "saudi-kings-cup", nameAr: "كأس خادم الحرمين الشريفين", apiName: "King's Cup", apiCountry: "Saudi-Arabia", region: "arab", priority: 2, type: "cup", idSource: "api-sample", featured: true },
  { id: 826, slug: "saudi-super-cup", nameAr: "كأس السوبر السعودي", apiName: "Super Cup", apiCountry: "Saudi-Arabia", region: "arab", priority: 3, type: "cup", idSource: "api-sample", featured: true },
  { id: 200, slug: "botola-pro", nameAr: "الدوري المغربي (البطولة الاحترافية)", apiName: "Botola Pro", apiCountry: "Morocco", region: "arab", priority: 4, type: "league", idSource: "api-sample", featured: true },
  { id: 186, slug: "algeria-ligue-1", nameAr: "الدوري الجزائري", apiName: "Ligue 1", apiCountry: "Algeria", region: "arab", priority: 5, type: "league", idSource: "api-sample", featured: true },
  { id: 202, slug: "tunisia-ligue-1", nameAr: "الدوري التونسي", apiName: "Ligue 1", apiCountry: "Tunisia", region: "arab", priority: 6, type: "league", idSource: "api-sample", featured: true },
  { id: 305, slug: "qatar-stars-league", nameAr: "دوري نجوم قطر", apiName: "Stars League", apiCountry: "Qatar", region: "arab", priority: 7, type: "league", idSource: "api-sample", featured: true },
  { id: 301, slug: "uae-pro-league", nameAr: "دوري أدنوك للمحترفين الإماراتي", apiName: "Pro League", apiCountry: "United-Arab-Emirates", region: "arab", priority: 8, type: "league", idSource: "api-sample", featured: true },
  { id: 584, slug: "libya-premier-league", nameAr: "الدوري الليبي", apiName: "Premier League", apiCountry: "Libya", region: "arab", priority: 9, type: "league", idSource: "api-sample", featured: true },
  { id: 542, slug: "iraqi-league", nameAr: "دوري نجوم العراق", apiName: "Iraqi League", apiCountry: "Iraq", region: "arab", priority: 10, type: "league", idSource: "api-sample", featured: true },
  { id: 402, slug: "sudan-premier-league", nameAr: "الدوري السوداني الممتاز", apiName: "Sudani Premier League", apiCountry: "Sudan", region: "arab", priority: 11, type: "league", idSource: "api-sample", featured: false },
  { id: 390, slug: "lebanon-premier-league", nameAr: "الدوري اللبناني", apiName: "Premier League", apiCountry: "Lebanon", region: "arab", priority: 12, type: "league", idSource: "api-sample", featured: false },
  { id: 201, slug: "botola-2", nameAr: "الدوري المغربي - الدرجة الثانية", apiName: "Botola 2", apiCountry: "Morocco", region: "arab", priority: 13, type: "league", idSource: "api-sample", featured: false },
  { id: 822, slug: "morocco-throne-cup", nameAr: "كأس العرش المغربي", apiName: "Cup", apiCountry: "Morocco", region: "arab", priority: 14, type: "cup", idSource: "api-sample", featured: false },
  { id: 824, slug: "qatar-emir-cup", nameAr: "كأس أمير قطر", apiName: "Emir Cup", apiCountry: "Qatar", region: "arab", priority: 15, type: "cup", idSource: "api-sample", featured: false },
  { id: 720, slug: "kuwait-emir-cup", nameAr: "كأس أمير الكويت", apiName: "Emir Cup", apiCountry: "Kuwait", region: "arab", priority: 16, type: "cup", idSource: "api-sample", featured: false },

  // ── International ────────────────────────────────────────────────────────
  { id: 1, slug: "fifa-world-cup", nameAr: "كأس العالم", apiName: "World Cup", apiCountry: "World", region: "international", priority: 1, type: "cup", idSource: "api-sample", featured: true },
  { id: 15, slug: "fifa-club-world-cup", nameAr: "كأس العالم للأندية", apiName: "FIFA Club World Cup", apiCountry: "World", region: "international", priority: 2, type: "cup", idSource: "api-sample", featured: true },
  { id: 32, slug: "world-cup-qualification-europe", nameAr: "تصفيات كأس العالم - أوروبا", apiName: "World Cup - Qualification Europe", apiCountry: "World", region: "international", priority: 3, type: "cup", idSource: "api-sample", featured: true },
  { id: 30, slug: "world-cup-qualification-asia", nameAr: "تصفيات كأس العالم - آسيا", apiName: "World Cup - Qualification Asia", apiCountry: "World", region: "international", priority: 4, type: "cup", idSource: "api-sample", featured: true },
  { id: 34, slug: "world-cup-qualification-south-america", nameAr: "تصفيات كأس العالم - أمريكا الجنوبية", apiName: "World Cup - Qualification South America", apiCountry: "World", region: "international", priority: 5, type: "cup", idSource: "api-sample", featured: true },
  { id: 37, slug: "world-cup-qualification-playoffs", nameAr: "الملحق العالمي المؤهل لكأس العالم", apiName: "World Cup - Qualification Intercontinental Play-offs", apiCountry: "World", region: "international", priority: 6, type: "cup", idSource: "api-sample", featured: true },
  { id: 5, slug: "uefa-nations-league", nameAr: "دوري الأمم الأوروبية", apiName: "UEFA Nations League", apiCountry: "World", region: "international", priority: 7, type: "cup", idSource: "api-sample", featured: true },
  { id: 10, slug: "international-friendlies", nameAr: "مباريات ودية دولية", apiName: "Friendlies", apiCountry: "World", region: "international", priority: 8, type: "cup", idSource: "api-sample", featured: true },
  { id: 31, slug: "world-cup-qualification-concacaf", nameAr: "تصفيات كأس العالم - الكونكاكاف", apiName: "World Cup - Qualification CONCACAF", apiCountry: "World", region: "international", priority: 9, type: "cup", idSource: "api-sample", featured: false },
  { id: 33, slug: "world-cup-qualification-oceania", nameAr: "تصفيات كأس العالم - أوقيانوسيا", apiName: "World Cup - Qualification Oceania", apiCountry: "World", region: "international", priority: 10, type: "cup", idSource: "api-sample", featured: false },

  // ── Asia ────────────────────────────────────────────────────────────────
  { id: 17, slug: "afc-champions-league-elite", nameAr: "دوري أبطال آسيا للنخبة", apiName: "AFC Champions League Elite", apiCountry: "World", region: "asia", priority: 1, type: "cup", idSource: "api-sample", featured: true },
  { id: 18, slug: "afc-champions-league-two", nameAr: "دوري أبطال آسيا 2", apiName: "AFC Champions League Two", apiCountry: "World", region: "asia", priority: 2, type: "cup", idSource: "api-sample", featured: false },
  { id: 98, slug: "j1-league", nameAr: "الدوري الياباني", apiName: "J1 League", apiCountry: "Japan", region: "asia", priority: 3, type: "league", idSource: "api-sample", featured: false },

  // ── Americas ─────────────────────────────────────────────────────────────
  { id: 13, slug: "copa-libertadores", nameAr: "كأس ليبرتادوريس", apiName: "CONMEBOL Libertadores", apiCountry: "World", region: "americas", priority: 1, type: "cup", idSource: "api-sample", featured: false },
  { id: 11, slug: "copa-sudamericana", nameAr: "كأس سود أمريكانا", apiName: "CONMEBOL Sudamericana", apiCountry: "World", region: "americas", priority: 2, type: "cup", idSource: "api-sample", featured: false },
  { id: 253, slug: "major-league-soccer", nameAr: "الدوري الأمريكي", apiName: "Major League Soccer", apiCountry: "USA", region: "americas", priority: 3, type: "league", idSource: "api-sample", featured: false },
  { id: 71, slug: "brasileirao-serie-a", nameAr: "الدوري البرازيلي", apiName: "Serie A", apiCountry: "Brazil", region: "americas", priority: 4, type: "league", idSource: "api-sample", featured: false },
  { id: 128, slug: "liga-profesional-argentina", nameAr: "الدوري الأرجنتيني", apiName: "Liga Profesional Argentina", apiCountry: "Argentina", region: "americas", priority: 5, type: "league", idSource: "api-sample", featured: false },
  { id: 262, slug: "liga-mx", nameAr: "الدوري المكسيكي", apiName: "Liga MX", apiCountry: "Mexico", region: "americas", priority: 6, type: "league", idSource: "api-sample", featured: false },
];

export const REGION_ORDER: readonly Region[] = [
  "egypt",
  "england",
  "europe",
  "arab",
  "africa",
  "international",
  "asia",
  "americas",
  "other",
];

export const REGION_LABELS_AR: Record<Region, string> = {
  egypt: "الكرة المصرية",
  england: "الكرة الإنجليزية",
  europe: "البطولات الأوروبية",
  arab: "البطولات العربية",
  africa: "الكرة الإفريقية",
  international: "المنتخبات والبطولات الدولية",
  asia: "الكرة الآسيوية",
  americas: "الأمريكتان",
  other: "بطولات أخرى",
};

const BY_ID = new Map(COMPETITIONS.map((c) => [c.id, c]));

export function competitionById(id: number): CompetitionEntry | undefined {
  return BY_ID.get(id);
}

/** Egyptian national teams (senior, Olympic, youth, women). Verified provider ids. */
export const EGYPT_NATIONAL_TEAM_IDS: ReadonlySet<number> = new Set([32, 10172, 11027, 23538, 19417]);
