export interface ActionState {
  ok: boolean | null;
  message: string;
  fieldErrors?: Record<string, string>;
}

export const INITIAL_ACTION_STATE: ActionState = { ok: null, message: "" };

export interface CoverageReport {
  checkedAt: string;
  groups: Array<{
    query: string;
    leagues: Array<{ id: number; name: string; country: string; type: string | null; currentSeason: number | null; standings: boolean | null }>;
  }>;
  errors: string[];
}
