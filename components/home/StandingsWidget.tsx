import { StandingsTable } from "@/components/league/StandingsTable";
import { DataStatus } from "@/components/ui/DataStatus";
import { Section } from "@/components/ui/Section";
import { competitionById } from "@/data/competitions";
import { competitionPath } from "@/lib/football/featured";
import { currentSeasonOf, qLeague, qStandings } from "@/lib/football/queries";
import { formatSeason } from "@/lib/utils/format";

export async function StandingsWidget({ leagueId, limit = 8 }: { leagueId: number; limit?: number }) {
  const entry = competitionById(leagueId);
  const leagueRes = await qLeague(leagueId);
  const season = currentSeasonOf(leagueRes.data);
  const standingsRes = season ? await qStandings(leagueId, season) : null;
  const group = standingsRes?.data?.groups[0];
  const seasonInfo = leagueRes.data?.seasons.find((s) => s.year === season);
  const title = `ترتيب ${entry?.nameAr ?? leagueRes.data?.nameAr ?? leagueRes.data?.name ?? "الدوري"}`;
  const href = entry ? competitionPath(entry) : leagueRes.data ? `/leagues/${leagueRes.data.slug}` : "/leagues";

  return (
    <Section
      id={`standings-widget-${leagueId}`}
      title={title}
      subtitle={season ? `موسم ${formatSeason(season, seasonInfo?.start, seasonInfo?.end)}` : undefined}
      action={{ href: `${href}#standings`, label: "الجدول كاملًا" }}
    >
      {group ? (
        <StandingsTable group={group} compact limit={limit} caption={title} />
      ) : (
        <div className="p-3">
          {standingsRes && standingsRes.data === null && !standingsRes.error ? (
            <p className="text-sm text-slate-600">جدول الترتيب غير متاح لهذا الموسم لدى مزود البيانات.</p>
          ) : (
            <DataStatus result={standingsRes ?? leagueRes} subject="جدول الترتيب" />
          )}
        </div>
      )}
    </Section>
  );
}
