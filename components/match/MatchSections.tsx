import { Radio } from "lucide-react";
import { StandingsTable } from "@/components/league/StandingsTable";
import { MatchRow } from "@/components/matches/MatchRow";
import { DataStatus } from "@/components/ui/DataStatus";
import { Section } from "@/components/ui/Section";
import { qAnnotation } from "@/lib/content/annotations";
import { displayName } from "@/lib/football/names";
import { qHeadToHead, qLeagueFixtures, qStandings } from "@/lib/football/queries";
import type { Match } from "@/lib/football/types";
import { formatCairoDateTime } from "@/lib/utils/format";

export async function HeadToHeadSection({ match: m }: { match: Match }) {
  const res = await qHeadToHead(m.home.id, m.away.id);
  const meetings = (res.data ?? []).filter((x) => x.id !== m.id && x.status.group === "finished").slice(0, 10);
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  for (const x of meetings) {
    if (x.goals.home === null || x.goals.away === null) continue;
    const homeGoals = x.home.id === m.home.id ? x.goals.home : x.goals.away;
    const awayGoals = x.home.id === m.home.id ? x.goals.away : x.goals.home;
    if (homeGoals > awayGoals) homeWins++;
    else if (awayGoals > homeGoals) awayWins++;
    else draws++;
  }
  return (
    <Section id="h2h" title="المواجهات المباشرة" subtitle="آخر المباريات الرسمية والودية بين الفريقين حسب مزود البيانات">
      {meetings.length ? (
        <>
          <dl className="grid grid-cols-3 gap-2 p-3 text-center text-sm">
            <div className="ys-tile flex-col justify-center gap-0">
              <dt className="max-w-full truncate text-xs text-slate-500">فوز {displayName(m.home)}</dt>
              <dd className="text-xl font-bold">{homeWins}</dd>
            </div>
            <div className="ys-tile flex-col justify-center gap-0">
              <dt className="text-xs text-slate-500">تعادل</dt>
              <dd className="text-xl font-bold">{draws}</dd>
            </div>
            <div className="ys-tile flex-col justify-center gap-0">
              <dt className="max-w-full truncate text-xs text-slate-500">فوز {displayName(m.away)}</dt>
              <dd className="text-xl font-bold">{awayWins}</dd>
            </div>
          </dl>
          <ul className="ys-matches ys-block-body ys-block-body--flush pt-0">
            {meetings.map((x) => (
              <MatchRow key={x.id} match={x} showDate size="sm" />
            ))}
          </ul>
        </>
      ) : res.data !== null ? (
        <p className="p-4 text-sm text-slate-600">لا توجد مواجهات سابقة مسجلة بين الفريقين لدى مزود البيانات.</p>
      ) : (
        <div className="p-3">
          <DataStatus result={res} subject="المواجهات المباشرة" />
        </div>
      )}
    </Section>
  );
}

function teamMatches(list: readonly Match[], teamId: number, excludeId: number) {
  const mine = list.filter((x) => x.id !== excludeId && (x.home.id === teamId || x.away.id === teamId));
  const last = mine
    .filter((x) => x.status.group === "finished")
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
  const next = mine
    .filter((x) => x.status.group === "upcoming")
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 3);
  return { last, next };
}

export async function TeamsFormSection({ match: m }: { match: Match }) {
  if (!m.league.season) return null;
  const res = await qLeagueFixtures(m.league.id, m.league.season);
  if (res.data === null) {
    return (
      <Section id="form" title="آخر مباريات الفريقين والمباريات القادمة">
        <div className="p-3">
          <DataStatus result={res} subject="مباريات الفريقين" />
        </div>
      </Section>
    );
  }
  const teams = [m.home, m.away];
  return (
    <Section id="form" title="آخر مباريات الفريقين والمباريات القادمة" subtitle={`ضمن ${displayName(m.league)} هذا الموسم`}>
      <div className="grid gap-x-4 p-3 pb-0 lg:grid-cols-2">
        {teams.map((t) => {
          const { last, next } = teamMatches(res.data ?? [], t.id, m.id);
          return (
            <div key={t.id} className="min-w-0">
              <h3 className="ys-league-bar">{displayName(t)}</h3>
              <h4 className="mb-2 text-sm text-slate-500">آخر النتائج</h4>
              {last.length ? (
                <ul className="ys-matches">
                  {last.map((x) => (
                    <MatchRow key={x.id} match={x} showDate highlightTeamId={t.id} size="sm" />
                  ))}
                </ul>
              ) : (
                <p className="mb-3 text-sm text-slate-500">لا توجد نتائج سابقة في هذه البطولة هذا الموسم.</p>
              )}
              <h4 className="mb-2 text-sm text-slate-500">المباريات القادمة</h4>
              {next.length ? (
                <ul className="ys-matches">
                  {next.map((x) => (
                    <MatchRow key={x.id} match={x} showDate highlightTeamId={t.id} size="sm" />
                  ))}
                </ul>
              ) : (
                <p className="mb-3 text-sm text-slate-500">لا توجد مباريات قادمة مسجلة في هذه البطولة.</p>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export async function MatchStandingsSection({ match: m }: { match: Match }) {
  if (!m.league.season) return null;
  const res = await qStandings(m.league.id, m.league.season);
  const groups = (res.data?.groups ?? []).filter((g) => g.rows.some((r) => r.team.id === m.home.id || r.team.id === m.away.id));
  if (res.data === null && !res.error) return null;
  if (res.data !== null && groups.length === 0) return null;
  return (
    <Section id="standings" title="ترتيب الفريقين في البطولة" action={{ href: `/leagues/${m.league.slug}#standings`, label: "الجدول الكامل" }}>
      {groups.length ? (
        groups.map((g, i) => (
          <div key={g.name ?? i}>
            {g.name && groups.length > 1 ? <h3 className="ys-league-bar m-3 mb-0">{g.name}</h3> : null}
            <StandingsTable group={g} highlightTeamIds={[m.home.id, m.away.id]} compact caption={`ترتيب ${displayName(m.league)}`} />
          </div>
        ))
      ) : (
        <div className="p-3">
          <DataStatus result={res} subject="جدول الترتيب" />
        </div>
      )}
    </Section>
  );
}

/** Broadcaster information — only when added by the editorial team with a cited source. */
export async function BroadcastSection({ match: m }: { match: Match }) {
  const annotation = await qAnnotation(m.id);
  if (!annotation) return null;
  return (
    <Section id="broadcast" title="معلومات النقل التلفزيوني">
      <div className="space-y-2 p-4 text-sm">
        <p className="flex items-center gap-2">
          <Radio aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
          <span>
            الجهة الناقلة الرسمية: <strong>{annotation.broadcasters.join("، ")}</strong>
          </span>
        </p>
        {annotation.note ? <p className="text-slate-600">{annotation.note}</p> : null}
        <p className="text-xs text-slate-500">
          أضافها فريق التحرير استنادًا إلى:{" "}
          <a href={annotation.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-pitch-700 underline">
            {annotation.sourceName}
          </a>{" "}
          · آخر تحديث {formatCairoDateTime(annotation.updatedAt)}. يلا شوت لا يقدم بثًا مباشرًا.
        </p>
      </div>
    </Section>
  );
}
