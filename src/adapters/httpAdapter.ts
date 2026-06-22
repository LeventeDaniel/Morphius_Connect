import type { Connection, Auth } from '../config/schemas.js';
import type { Adapter, AdapterRequestOptions, AdapterResponse } from './types.js';
import { resolveSecretForInternalUse } from '../secrets/resolveSecretRef.js';
import { logger } from '../utils/safeLogger.js';

function buildAuthHeaders(auth: Auth): Record<string, string> {
  switch (auth.mode) {
    case 'none':
    case 'env-only':
    case 'custom-placeholder':
      return {};

    case 'bearer': {
      const token = resolveSecretForInternalUse(auth.token_ref);
      return { Authorization: `Bearer ${token}` };
    }

    case 'api-key-header': {
      const key = resolveSecretForInternalUse(auth.token_ref);
      return { [auth.header_name]: key };
    }

    case 'basic': {
      const username = resolveSecretForInternalUse(auth.username_ref);
      const password = resolveSecretForInternalUse(auth.password_ref);
      const encoded = Buffer.from(`${username}:${password}`).toString('base64');
      return { Authorization: `Basic ${encoded}` };
    }
  }
}

export class HttpAdapter implements Adapter {
  readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async request(options: AdapterRequestOptions): Promise<AdapterResponse> {
    const { method = 'GET', path, body, timeoutMs = 10_000 } = options;
    const url = `${this.connection.base_url}${path}`;

    logger.debug(`[${this.connection.id}] ${method} ${url}`);

    let authHeaders: Record<string, string>;
    try {
      authHeaders = buildAuthHeaders(this.connection.auth);
    } catch (err) {
      return {
        ok: false,
        status: 0,
        statusText: `Auth setup failed: ${err instanceof Error ? err.message : String(err)}`,
        body: null,
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      let responseBody: unknown = null;
      try {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }
      } catch {
        // body read failure is non-fatal for health checks
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.debug(`[${this.connection.id}] Request failed: ${message}`);
      return {
        ok: false,
        status: 0,
        statusText: message,
        body: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
