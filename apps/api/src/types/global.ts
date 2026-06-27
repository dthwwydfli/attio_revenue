export interface HealthResponse {
  ok: true;
  uptime: number;
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
