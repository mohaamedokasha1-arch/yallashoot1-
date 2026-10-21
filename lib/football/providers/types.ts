import type {
  League,
  Match,
  MatchDetails,
  PlayerProfile,
  ProviderId,
  SquadPlayer,
  Standings,
  Team,
  TopScorer,
} from "../types";

export interface ProviderAccountStatus {
  plan: string | null;
  active: boolean | null;
  requestsToday: number | null;
  dailyLimit: number | null;
  subscriptionEnd: string | null;
}

/**
 * Contract every football data provider must implement. Methods return
 * normalised domain objects and throw `ProviderError` on failure. Swapping the
 * provider means adding a new implementation and selecting it in
 * `providers/index.ts` via FOOTBALL_API_PROVIDER.
 */
export interface FootballProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly website: string;
  isConfigured(): boolean;
  getAccountStatus(): Promise<ProviderAccountStatus>;
  /** Fixtures whose Cairo calendar day is `date` (YYYY-MM-DD). */
  getFixturesByDate(date: string): Promise<Match[]>;
  getLiveFixtures(): Promise<Match[]>;
  getFixture(id: number): Promise<MatchDetails | null>;
  getHeadToHead(teamA: number, teamB: number, last: number): Promise<Match[]>;
  getLeagues(params: { current?: boolean; country?: string; search?: string; id?: number; team?: number }): Promise<League[]>;
  getStandings(leagueId: number, season: number): Promise<Standings | null>;
  getLeagueFixtures(leagueId: number, season: number): Promise<Match[]>;
  getTopScorers(leagueId: number, season: number): Promise<TopScorer[]>;
  getTeams(params: { league?: number; season?: number; id?: number; search?: string }): Promise<Team[]>;
  getTeamFixtures(teamId: number, season: number): Promise<Match[]>;
  getSquad(teamId: number): Promise<SquadPlayer[]>;
  getPlayer(playerId: number, season: number): Promise<PlayerProfile | null>;
  getPlayerSeasons(playerId: number): Promise<number[]>;
}
