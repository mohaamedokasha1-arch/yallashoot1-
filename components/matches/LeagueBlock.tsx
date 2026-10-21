import Link from "next/link";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { roundLabelAr } from "@/lib/football/labels";
import { displayName } from "@/lib/football/names";
import type { LeagueRef, Match } from "@/lib/football/types";
import { MatchRow } from "./MatchRow";

/** One competition inside the fixtures block: title bar + match cards. */
export function LeagueBlock({
  league,
  matches,
  headingLevel = 3,
}: {
  league: LeagueRef;
  matches: readonly Match[];
  compact?: boolean;
  headingLevel?: 3 | 4;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const rounds = [...new Set(matches.map((m) => m.league.round).filter(Boolean))] as string[];
  const round = rounds.length === 1 ? roundLabelAr(rounds[0]) : null;
  const country = league.country && league.country !== "World" ? (league.countryAr ?? league.country) : null;
  return (
    <section className="league-block">
      <div className="ys-league-bar">
        <TeamLogo src={league.logo} name={league.name} size={24} />
        <Heading className="min-w-0">
          <Link href={`/leagues/${league.slug}`} prefetch={false}>
            {displayName(league)}
          </Link>
          {country ? <span className="country ms-2">{country}</span> : null}
        </Heading>
        {round ? <span className="meta">{round}</span> : null}
      </div>
      <ul className="ys-matches">
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} />
        ))}
      </ul>
    </section>
  );
}
