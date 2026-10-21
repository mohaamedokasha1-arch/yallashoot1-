/**
 * Provider-independent football domain model.
 *
 * Rules enforced by the types:
 *  - Unknown values are `null`, never a made-up default (e.g. goals of a match
 *    that has not started are `null`, not 0).
 *  - `home` is always the home team as reported by the provider.
 *  - `kickoff` is an ISO-8601 UTC instant; `cairoDate` is its Cairo calendar day.
 */

export type ProviderId = "api-football";

export type StatusCode =
  | "TBD"
  | "NS"
  | "1H"
  | "HT"
  | "2H"
  | "ET"
  | "BT"
  | "P"
  | "SUSP"
  | "INT"
  | "LIVE"
  | "FT"
  | "AET"
  | "PEN"
  | "PST"
  | "CANC"
  | "ABD"
  | "AWD"
  | "WO"
  | "UNKNOWN";

export type StatusGroup = "upcoming" | "live" | "finished" | "interrupted" | "postponed" | "cancelled";

export interface MatchStatus {
  code: StatusCode;
  group: StatusGroup;
  /** Minutes played (live only). */
  elapsed: number | null;
  /** Stoppage-time minutes (live only, when provided). */
  extra: number | null;
  /** Provider's own long label (English), kept for diagnostics. */
  providerLong: string | null;
}

export interface TeamRef {
  id: number;
  name: string;
  nameAr: string | null;
  logo: string | null;
  slug: string;
}

export interface LeagueRef {
  id: number;
  name: string;
  nameAr: string | null;
  country: string | null;
  countryAr: string | null;
  logo: string | null;
  flag: string | null;
  season: number | null;
  round: string | null;
  slug: string;
}

export interface ScorePair {
  home: number | null;
  away: number | null;
}

export interface Venue {
  id: number | null;
  name: string | null;
  city: string | null;
}

export interface Match {
  id: number;
  provider: ProviderId;
  slug: string;
  kickoff: string;
  timestamp: number;
  cairoDate: string;
  status: MatchStatus;
  league: LeagueRef;
  home: TeamRef;
  away: TeamRef;
  /** Current (live) or final score; null for both when not applicable. */
  goals: ScorePair;
  score: {
    halftime: ScorePair;
    fulltime: ScorePair;
    extratime: ScorePair;
    penalty: ScorePair;
  };
  winner: "home" | "away" | "draw" | null;
  venue: Venue | null;
  referee: string | null;
}

export type EventType = "goal" | "card" | "subst" | "var" | "other";

export interface PersonRef {
  id: number | null;
  name: string;
}

export interface MatchEvent {
  minute: number | null;
  extra: number | null;
  teamId: number | null;
  side: "home" | "away" | null;
  type: EventType;
  detail: string;
  player: PersonRef | null;
  assist: PersonRef | null;
  comments: string | null;
}

export interface LineupPlayer {
  id: number | null;
  name: string;
  number: number | null;
  pos: string | null;
  grid: string | null;
}

export interface Lineup {
  teamId: number;
  side: "home" | "away";
  formation: string | null;
  coach: { id: number | null; name: string; photo: string | null } | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface MatchStatistic {
  type: string;
  home: string | number | null;
  away: string | number | null;
}

export interface MatchDetails extends Match {
  /** `null` = provider did not include this block; `[]` = provided but empty. */
  events: MatchEvent[] | null;
  lineups: Lineup[] | null;
  statistics: MatchStatistic[] | null;
}

export interface StandingRecord {
  played: number | null;
  win: number | null;
  draw: number | null;
  lose: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
}

export interface StandingRow {
  rank: number;
  team: TeamRef;
  points: number | null;
  goalsDiff: number | null;
  group: string | null;
  form: string | null;
  description: string | null;
  all: StandingRecord;
  home: StandingRecord | null;
  away: StandingRecord | null;
  updatedAt: string | null;
}

export interface StandingsGroup {
  name: string | null;
  rows: StandingRow[];
}

export interface Standings {
  league: LeagueRef;
  groups: StandingsGroup[];
}

export interface SeasonCoverage {
  standings: boolean;
  events: boolean;
  lineups: boolean;
  statistics: boolean;
  players: boolean;
  topScorers: boolean;
}

export interface LeagueSeason {
  year: number;
  start: string | null;
  end: string | null;
  current: boolean;
  coverage: SeasonCoverage;
}

export interface Country {
  name: string;
  nameAr: string | null;
  code: string | null;
  flag: string | null;
}

export interface League {
  id: number;
  name: string;
  nameAr: string | null;
  type: "league" | "cup" | null;
  logo: string | null;
  country: Country;
  seasons: LeagueSeason[];
  slug: string;
}

export interface PlayerRef {
  id: number;
  name: string;
  photo: string | null;
  nationality: string | null;
  slug: string;
}

export interface TopScorer {
  player: PlayerRef;
  team: TeamRef | null;
  goals: number | null;
  assists: number | null;
  appearances: number | null;
  penalties: number | null;
}

export interface Team {
  id: number;
  name: string;
  nameAr: string | null;
  code: string | null;
  country: string | null;
  countryAr: string | null;
  founded: number | null;
  national: boolean;
  logo: string | null;
  venue: { name: string | null; city: string | null; capacity: number | null } | null;
  slug: string;
}

export interface TeamCompetition {
  league: LeagueRef;
  currentSeason: number | null;
}

export interface SquadPlayer {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string | null;
  photo: string | null;
  slug: string;
}

export interface PlayerSeasonStats {
  team: TeamRef | null;
  league: LeagueRef | null;
  appearances: number | null;
  lineups: number | null;
  minutes: number | null;
  position: string | null;
  rating: string | null;
  goals: number | null;
  assists: number | null;
  yellow: number | null;
  red: number | null;
}

export interface PlayerProfile {
  id: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  age: number | null;
  birthDate: string | null;
  birthPlace: string | null;
  birthCountry: string | null;
  nationality: string | null;
  height: string | null;
  weight: string | null;
  photo: string | null;
  injured: boolean | null;
  season: number | null;
  statistics: PlayerSeasonStats[];
  slug: string;
}

export type DataErrorKind =
  | "not_configured"
  | "auth"
  | "plan_restricted"
  | "rate_limited"
  | "quota_exceeded"
  | "server"
  | "network"
  | "timeout"
  | "invalid_response"
  | "not_found"
  | "budget_guard"
  | "circuit_open"
  | "suspicious_empty"
  | "unknown";

export interface DataError {
  kind: DataErrorKind;
  message: string;
}

/**
 * Envelope returned by every data-layer function. `data` may be present even
 * when `error` is set (last-known-good copy served while the provider fails).
 */
export interface DataResult<T> {
  data: T | null;
  /** When the data was fetched from the provider (ISO), null if never. */
  fetchedAt: string | null;
  /** True when serving an older copy because a refresh failed or was skipped. */
  stale: boolean;
  source: "provider" | "cache" | "fallback" | "none";
  error: DataError | null;
  /** True when the provider base URL is not the official one (sample data server). */
  testData: boolean;
}

export interface SearchResults {
  query: string;
  teams: Array<TeamRef & { country: string | null; countryAr: string | null }>;
  leagues: Array<LeagueRef>;
  players: Array<PlayerRef & { teamName: string | null }>;
  matches: Match[];
  /** Whether the provider's own search was consulted (budget permitting). */
  providerSearched: boolean;
}
