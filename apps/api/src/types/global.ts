export interface HealthResponse {
  ok: true;
  uptime: number;
  attio: boolean;
  tavily: boolean;
  openai: boolean;
  slng: boolean;
  sie: string;
}

export interface NotImplementedResponse {
  error: "not_implemented";
  layer: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}
