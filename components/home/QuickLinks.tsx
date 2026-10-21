import Link from "next/link";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { Section } from "@/components/ui/Section";
import { competitionPath, featuredCompetitionsByRegion, notableTeams } from "@/lib/football/featured";
import { qLeagues } from "@/lib/football/queries";

/** Featured competitions; when the provider list is available, only those currently running are linked. */
export async function QuickLeagues() {
  const res = await qLeagues();
  const active = res.data ? new Set(res.data.map((l) => l.id)) : null;
  const groups = featuredCompetitionsByRegion()
    .map((g) => ({ ...g, items: active ? g.items.filter((c) => active.has(c.id)) : g.items }))
    .filter((g) => g.items.length > 0);
  return (
    <Section id="quick-leagues" title="أهم البطولات" action={{ href: "/leagues", label: "كل البطولات" }} bodyClassName="ys-block-body space-y-3">
      {groups.map((g) => (
        <div key={g.region}>
          <h3 className="mb-2 text-sm text-slate-500">{g.label}</h3>
          <ul className="flex flex-wrap gap-2">
            {g.items.map((c) => (
              <li key={c.id}>
                <Link href={competitionPath(c)} prefetch={false} className="ys-chip">
                  <TeamLogo src={`https://media.api-sports.io/football/leagues/${c.id}.png`} name={c.apiName} size={18} />
                  {c.nameAr}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Section>
  );
}

export function NotableTeams() {
  const teams = notableTeams();
  return (
    <Section id="notable-teams" title="أندية ومنتخبات بارزة" bodyClassName="ys-block-body">
      <ul className="ys-grid [--ys-item:150px]">
        {teams.map((t) => (
          <li key={t.id}>
            <Link href={t.href} prefetch={false} className="ys-tile">
              <TeamLogo src={t.logo} name={t.name} size={26} />
              <span className="name">{t.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
