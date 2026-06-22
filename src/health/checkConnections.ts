import type { Connection } from '../config/schemas.js';
import { createAdapter } from '../adapters/genericApiAdapter.js';

export type HealthStatus = 'healthy' | 'unhealthy' | 'skipped' | 'no-health-config';

export interface ConnectionHealthResult {
  id: string;
  type: string;
  adapter: string;
  status: HealthStatus;
  httpStatus?: number;
  message: string;
  durationMs?: number;
}

async function checkOne(connection: Connection): Promise<ConnectionHealthResult> {
  const base = {
    id: connection.id,
    type: connection.type,
    adapter: connection.adapter,
  };

  if (!connection.health?.enabled) {
    return {
      ...base,
      status: 'no-health-config',
      message: 'Health check not configured',
    };
  }

  const healthPath = connection.health.path ?? '/health';
  const adapter = createAdapter(connection);
  const start = Date.now();

  try {
    const response = await adapter.request({
      method: connection.health.method ?? 'GET',
      path: healthPath,
      timeoutMs: connection.health.timeout_ms ?? 5000,
    });

    const durationMs = Date.now() - start;

    if (response.ok) {
      return {
        ...base,
        status: 'healthy',
        httpStatus: response.status,
        message: `OK (${response.status})`,
        durationMs,
      };
    }

    return {
      ...base,
      status: 'unhealthy',
      httpStatus: response.status,
      message: `HTTP ${response.status}: ${response.statusText}`,
      durationMs,
    };
  } catch (err) {
    return {
      ...base,
      status: 'unhealthy',
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

export async function checkConnections(
  connections: Connection[]
): Promise<ConnectionHealthResult[]> {
  return Promise.all(connections.map(checkOne));
}
