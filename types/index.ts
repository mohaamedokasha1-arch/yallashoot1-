/**
 * Public domain types of the project (re-exported for convenience).
 * The source of truth lives next to the code that produces them:
 *  - football data model: lib/football/types.ts
 *  - editorial content:   lib/content/articles.ts, lib/content/feeds.ts
 *  - competition registry: data/competitions.ts
 */
export type {
  DataResult,
  League,
  LeagueRef,
  LeagueSeason,
  Lineup,
  LineupPlayer,
  Match,
  MatchDetails,
  MatchEvent,
  MatchStatistic,
  MatchStatus,
  PlayerProfile,
  SquadPlayer,
  Standings,
  StandingsGroup,
  StandingRow,
  StatusCode,
  StatusGroup,
  Team,
  TeamRef,
  TopScorer,
} from "@/lib/football/types";
export type { Article, ArticleCategory } from "@/lib/content/articles";
export type { FeedItem } from "@/lib/content/feeds";
export type { CompetitionEntry, Region } from "@/data/competitions";
