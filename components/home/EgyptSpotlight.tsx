import Link from "next/link";
import { MatchRow } from "@/components/matches/MatchRow";
import { DataStatus } from "@/components/ui/DataStatus";
import { Section } from "@/components/ui/Section";
import { COMPETITIONS } from "@/data/competitions";
import { competitionPath, EGYPT_PREMIER_LEAGUE_ID } from "@/lib/football/featured";
import { currentSeasonOf, qLeague, qLeagueFixtures } from "@/lib/football/queries";

/**
 * Egyptian football block shown on the home page when there are no Egyptian
 * matches today: next league fixtures + links to Egyptian competitions.
 * Fixtures come from the provider (no hardcoded schedules).
 */
export async function EgyptSpotlight() {
  const leagueRes = await qLeague(EGYPT_PREMIER_LEAGUE_ID);
  const season = currentSeasonOf(leagueRes.data);
  const fixturesRes = season ? await qLeagueFixtures(EGYPT_PREMIER_LEAGUE_ID, season) : null;
  const upcoming = (fixturesRes?.data ?? [])
    .filter((m) => m.status.group === "upcoming" && m.status.code !== "TBD")
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 5);
  const egyptian = COMPETITIONS.filter((c) => c.region === "egypt");
  const caf = COMPETITIONS.filter((c) => c.id === 12 || c.id === 20);

  return (
    <Section id="egypt-spotlight" title="الكرة المصرية" accent bodyClassName="ys-block-body">
      <p className="mb-3 text-sm text-slate-600">لا توجد مباريات مصرية مسجلة لدى مزود البيانات في هذا اليوم.</p>
      {upcoming.length > 0 ? (
        <>
          <h3 className="ys-league-bar">أقرب مباريات الدوري المصري الممتاز</h3>
          <ul className="ys-matches">
            {upcoming.map((m) => (
              <MatchRow key={m.id} match={m} showDate size="sm" />
            ))}
          </ul>
        </>
      ) : (
        <DataStatus result={fixturesRes ?? leagueRes} subject="مباريات الدوري المصري" />
      )}
      <nav aria-label="البطولات المصرية والإفريقية">
        <ul className="flex flex-wrap gap-2">
          {[...egyptian, ...caf].map((c) => (
            <li key={c.id}>
              <Link href={competitionPath(c)} className="ys-chip">
                {c.nameAr}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Section>
  );
}
