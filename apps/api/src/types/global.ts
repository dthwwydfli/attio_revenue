export interface HealthResponse {
  ok: true;
  uptime: number;
  attio: boolean;
  tavily: boolean;
  serper: boolean;
  gemini: boolean;
  openai: boolean;
  anthropic: boolean;
  slng: boolean;
  sie: boolean;
  n8n: boolean;
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
