import Link from "next/link";
import { ScorePair } from "@/components/matches/MatchCenter";
import { roundLabelAr } from "@/lib/football/labels";
import { displayName } from "@/lib/football/names";
import { hasScore, statusLabel } from "@/lib/football/status";
import type { Match } from "@/lib/football/types";
import { formatCairoTime, formatDateLong, formatSeason } from "@/lib/utils/format";

/** Plain-language, data-driven description of the match (unique per page). */
export function matchParagraphs(m: Match): string[] {
  const home = displayName(m.home);
  const away = displayName(m.away);
  const league = displayName(m.league);
  const round = roundLabelAr(m.league.round);
  const season = m.league.season ? ` موسم ${formatSeason(m.league.season)}` : "";
  const where = `${round ? `ضمن ${round} من ` : "ضمن "}${league}${season}`;
  const date = formatDateLong(m.cairoDate);
  const time = m.status.code === "TBD" ? "" : ` في تمام الساعة ${formatCairoTime(m.kickoff)} بتوقيت القاهرة`;
  const venue = m.venue?.name ? ` على ${m.venue.name}${m.venue.city ? ` في ${m.venue.city}` : ""}` : "";
  const ref = m.referee ? ` ويدير اللقاء الحكم ${m.referee}.` : "";
  const out: string[] = [];

  if (m.status.group === "upcoming") {
    out.push(`تُقام مباراة ${home} و${away} يوم ${date}${time} ${where}${venue}.${ref}`);
    out.push("تظهر التشكيلة عادةً قبل انطلاق المباراة بنحو ساعة، ثم الأحداث والإحصائيات أثناء اللعب إذا كانت تغطية البطولة تشملها.");
  } else if (m.status.group === "live" && hasScore(m)) {
    out.push(`تُلعب الآن مباراة ${home} و${away} ${where}${venue}، والنتيجة حاليًا ${home} ${m.goals.home} - ${m.goals.away} ${away} (${statusLabel(m.status)}).${ref}`);
  } else if (m.status.group === "finished" && hasScore(m)) {
    const h = m.goals.home as number;
    const a = m.goals.away as number;
    const result =
      m.status.code === "PEN" && m.score.penalty.home !== null && m.score.penalty.away !== null
        ? `بالتعادل ${h}-${a} ثم ${m.score.penalty.home > m.score.penalty.away ? `فوز ${home}` : `فوز ${away}`} بركلات الترجيح ${m.score.penalty.home}-${m.score.penalty.away}`
        : h > a
          ? `بفوز ${home} ${h}-${a}`
          : a > h
            ? `بفوز ${away} ${a}-${h}`
            : `بالتعادل ${h}-${a}`;
    out.push(`انتهت مباراة ${home} و${away} ${result}، وأقيمت يوم ${date} ${where}${venue}.${ref}`);
    const ht = m.score.halftime;
    if (ht.home !== null && ht.away !== null) out.push(`انتهى الشوط الأول بنتيجة ${home} ${ht.home} - ${ht.away} ${away}.`);
  } else if (m.status.group === "postponed") {
    out.push(`تأجلت مباراة ${home} و${away} ${where} التي كانت مقررة يوم ${date}. سيظهر الموعد الجديد هنا فور اعتماده لدى مزود البيانات.`);
  } else if (m.status.group === "cancelled") {
    out.push(`مباراة ${home} و${away} ${where} (يوم ${date}) حالتها: ${statusLabel(m.status)} حسب مزود البيانات.`);
  } else {
    out.push(`مباراة ${home} و${away} ${where} يوم ${date}${venue} — الحالة الحالية: ${statusLabel(m.status)}.`);
  }
  out.push("جميع المواعيد بتوقيت القاهرة. يعرض يلا شوت المعلومات والإحصاءات فقط ولا يقدم بثًا مباشرًا للمباريات.");
  return out;
}

/** "بطاقة المباراة" table (competition, date, Cairo time, venue, referee, status, result). */
export function MatchInfoTable({ match: m }: { match: Match }) {
  const home = displayName(m.home);
  const away = displayName(m.away);
  const round = roundLabelAr(m.league.round);
  const rows: Array<[string, React.ReactNode]> = [
    ["البطولة", <Link key="l" href={`/leagues/${m.league.slug}`}>{displayName(m.league)}</Link>],
    ...(m.league.season ? ([["الموسم", formatSeason(m.league.season)]] as Array<[string, React.ReactNode]>) : []),
    ...(round ? ([["الجولة", round]] as Array<[string, React.ReactNode]>) : []),
    ["تاريخ المباراة", formatDateLong(m.cairoDate)],
    ["توقيت المباراة", m.status.code === "TBD" ? "لم يحدد بعد" : `${formatCairoTime(m.kickoff)} بتوقيت القاهرة`],
    ["الملعب", m.venue?.name ? `${m.venue.name}${m.venue.city ? ` — ${m.venue.city}` : ""}` : "غير متوفر من مزود البيانات"],
    ["الحكم", m.referee ?? "غير متوفر"],
    ["الحالة", statusLabel(m.status)],
    [
      "النتيجة",
      hasScore(m) ? (
        <span key="r">
          {home} <ScorePair home={m.goals.home} away={m.goals.away} className="font-bold" /> {away}
        </span>
      ) : (
        "لم تبدأ بعد أو لا توجد نتيجة"
      ),
    ],
  ];
  return (
    <div className="mt-5">
      <h2 className="ys-h2">
        بطاقة المباراة {home} ضد {away}
      </h2>
      <div className="ys-info-table-wrap">
        <table className="ys-info-table">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
