export interface WorldState {
  readonly worldlineId: string;
  readonly simulationTime: string;
  readonly setting?: { title: string; description: string };
  readonly persons: Record<
    string,
    {
      id: string;
      name: string;
      role?: string;
      status?: string;
      factionId?: string;
      locationId?: string;
    }
  >;
  readonly factions: Record<
    string,
    { id: string; name: string; strength?: number }
  >;
  readonly resources: Record<
    string,
    {
      id: string;
      name: string;
      type: string;
      quantity: number;
      attributes?: Record<string, string | number | boolean>;
    }
  >;
  readonly locations: Record<
    string,
    { id: string; name: string; type?: string }
  >;
  readonly relations: Record<
    string,
    { id: string; type: string; strength?: number }
  >;
}

export interface DeductionEvent {
  readonly id: string;
  readonly commandId?: string;
  readonly rewrite: { text: string; submittedAt: string };
  readonly narrative: { text: string };
  readonly stateChanges: readonly unknown[];
  readonly simulationTime: string;
  readonly recordedAt: string;
}

export interface DeduceSuccess {
  readonly outcome: "applied" | "duplicate";
  readonly event: DeductionEvent;
  readonly worldState: WorldState;
}

export interface ApiErrorBody {
  readonly error?: string;
  readonly code?: string;
  readonly retryable?: boolean;
}
