import type { Connection } from '../config/schemas.js';

export interface AdapterRequestOptions {
  method?: 'GET' | 'POST' | 'HEAD';
  path: string;
  body?: unknown;
  timeoutMs?: number;
}

export interface AdapterResponse {
  ok: boolean;
  status: number;
  statusText: string;
  /** Response body — may be null if request failed at network level */
  body: unknown | null;
}

export interface Adapter {
  connection: Connection;
  request(options: AdapterRequestOptions): Promise<AdapterResponse>;
}
