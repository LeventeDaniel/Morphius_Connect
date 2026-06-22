/**
 * Morphius Connect UI module
 *
 * Safe read-only view of Connect status, connection metadata, and health.
 * Never reads secrets, tokens, API keys, env vars, or raw config.
 * Calls only the three safe Morphius backend endpoints:
 *   GET /api/connect/status
 *   GET /api/connect/connections
 *   GET /api/connect/health
 * Falls back to mock data when running outside Morphius.
 */

import { useState, useEffect, useCallback } from 'react';
import './styles.css';

// ─── Response types (matching Morphius backend safe shapes) ──────────────────

interface ConnectStatus {
  available: boolean;
  configLoaded: boolean;
  connectionCount: number;
  rulesLoaded: boolean;
  errorCount: number;
}

interface SafeConnectionMeta {
  id: string;
  type: string;
  adapter: string;
  authMode: string;
  hasAuth: boolean;
  healthEnabled: boolean;
  approvalRequired: boolean;
  approvalReason?: string;
  description?: string;
  tags?: string[];
}

interface SafeHealthResult {
  id: string;
  type: string;
  status: string;
  responseTimeMs?: number;
  message: string;
}

// ─── Mock fallback data (development / outside Morphius) ─────────────────────

const MOCK_STATUS: ConnectStatus = {
  available: false,
  configLoaded: false,
  connectionCount: 0,
  rulesLoaded: false,
  errorCount: 0,
};

const MOCK_CONNECTIONS: SafeConnectionMeta[] = [
  {
    id: 'example-llm',
    type: 'llm',
    adapter: 'ollama',
    authMode: 'none',
    hasAuth: false,
    healthEnabled: true,
    approvalRequired: false,
    description: 'Mock connection — Connect not running',
    tags: ['demo'],
  },
];

const MOCK_HEALTH: SafeHealthResult[] = [
  {
    id: 'example-llm',
    type: 'llm',
    status: 'unknown',
    responseTimeMs: undefined,
    message: 'Connect not available — mock data',
  },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

function resolveApiBase(): string {
  try {
    // Vite injects import.meta.env; outside Vite this may not exist
    const env = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env;
    return env?.VITE_API_URL ?? 'http://localhost:7900';
  } catch {
    return 'http://localhost:7900';
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const base = resolveApiBase();
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KV({ k, v, valueClass }: { k: string; v: string; valueClass?: string }) {
  return (
    <div className="mc-kv">
      <span className="mc-key">{k}</span>
      <span className={`mc-value ${valueClass ?? ''}`}>{v}</span>
    </div>
  );
}

function StatusSection({ status, isMock }: { status: ConnectStatus; isMock: boolean }) {
  const dot = !status.available ? 'mc-dot--grey'
    : status.configLoaded ? 'mc-dot--green'
    : 'mc-dot--grey';

  return (
    <div className="mc-section">
      <div className="mc-section-label">Status{isMock ? ' (mock)' : ''}</div>
      <KV k="available"        v={status.available    ? 'yes' : 'no'}    valueClass={status.available ? 'mc-value--ok' : 'mc-value--dim'} />
      <KV k="config loaded"    v={status.configLoaded  ? 'yes' : 'no'}   valueClass={status.configLoaded ? 'mc-value--ok' : 'mc-value--dim'} />
      <KV k="connection count" v={String(status.connectionCount)}        valueClass="mc-value--mono" />
      <KV k="rules loaded"     v={status.rulesLoaded   ? 'yes' : 'no'}   valueClass={status.rulesLoaded ? 'mc-value--ok' : 'mc-value--dim'} />
      <KV k="error count"      v={String(status.errorCount)}              valueClass={status.errorCount > 0 ? 'mc-value--warn' : 'mc-value--dim'} />
      <div style={{ display: 'none' }}>
        {/* dot used in header only */}
        <span className={`mc-dot ${dot}`} />
      </div>
    </div>
  );
}

function ConnectionsSection({ connections, isMock }: { connections: SafeConnectionMeta[]; isMock: boolean }) {
  if (connections.length === 0) {
    return (
      <div className="mc-section">
        <div className="mc-section-label">Connections{isMock ? ' (mock)' : ''}</div>
        <div style={{ color: '#2a2a2a', fontSize: 14, padding: '4px 0' }}>no connections configured</div>
      </div>
    );
  }

  return (
    <div className="mc-section">
      <div className="mc-section-label">Connections{isMock ? ' (mock)' : ''}</div>
      <div className="mc-conn-list">
        {connections.map((conn) => (
          <div key={conn.id} className="mc-conn-card">
            <div className="mc-conn-id">{conn.id}</div>
            <div className="mc-conn-rows">
              <KV k="type"              v={conn.type}     valueClass="mc-value--mono" />
              <KV k="adapter"           v={conn.adapter}  valueClass="mc-value--mono" />
              <KV k="auth mode"         v={conn.authMode} valueClass="mc-value--mono" />
              <KV k="has auth"          v={conn.hasAuth ? 'yes' : 'no'} valueClass={conn.hasAuth ? '' : 'mc-value--dim'} />
              <KV k="health enabled"    v={conn.healthEnabled ? 'yes' : 'no'} valueClass={conn.healthEnabled ? 'mc-value--ok' : 'mc-value--dim'} />
              <KV k="approval required" v={conn.approvalRequired ? 'yes' : 'no'} valueClass={conn.approvalRequired ? 'mc-value--warn' : 'mc-value--dim'} />
              {conn.description && (
                <KV k="description" v={conn.description} valueClass="mc-value--dim" />
              )}
              {conn.tags && conn.tags.length > 0 && (
                <KV k="tags" v={conn.tags.join(', ')} valueClass="mc-value--dim" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthSection({ health, isMock }: { health: SafeHealthResult[]; isMock: boolean }) {
  if (health.length === 0) {
    return (
      <div className="mc-section">
        <div className="mc-section-label">Health{isMock ? ' (mock)' : ''}</div>
        <div style={{ color: '#2a2a2a', fontSize: 14, padding: '4px 0' }}>no health data</div>
      </div>
    );
  }

  return (
    <div className="mc-section">
      <div className="mc-section-label">Health{isMock ? ' (mock)' : ''}</div>
      <div className="mc-health-list">
        {health.map((h) => {
          const statusClass = h.status === 'ok' ? 'mc-health-status--ok'
            : h.status === 'error' ? 'mc-health-status--error'
            : 'mc-health-status--unknown';
          return (
            <div key={h.id} className="mc-health-row">
              <span className="mc-health-id">{h.id}</span>
              <span className={`mc-health-status ${statusClass}`}>{h.status}</span>
              <span className="mc-health-ms">
                {h.responseTimeMs !== undefined ? `${h.responseTimeMs}ms` : '—'}
              </span>
              <span className="mc-health-msg">{h.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function ConnectUIModule() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [connections, setConnections] = useState<SafeConnectionMeta[]>([]);
  const [health, setHealth] = useState<SafeHealthResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [lastFetched, setLastFetched] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, connRes, healthRes] = await Promise.allSettled([
        fetchJson<ConnectStatus>('/api/connect/status'),
        fetchJson<{ connections: SafeConnectionMeta[] }>('/api/connect/connections'),
        fetchJson<{ results: SafeHealthResult[] }>('/api/connect/health'),
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value);
      } else {
        setStatus(MOCK_STATUS);
        setIsMock(true);
      }

      if (connRes.status === 'fulfilled') {
        setConnections(connRes.value.connections);
      } else {
        setConnections(MOCK_CONNECTIONS);
        setIsMock(true);
      }

      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value.results);
      } else {
        setHealth(MOCK_HEALTH);
        setIsMock(true);
      }

      setLastFetched(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dotClass = !status ? 'mc-dot--grey'
    : !status.available ? 'mc-dot--grey'
    : status.configLoaded ? 'mc-dot--green'
    : 'mc-dot--grey';

  return (
    <div className="mc-root">
      {/* Header */}
      <div className="mc-header">
        <span className="mc-title">Morphius Connect</span>
        <span className="mc-version">v1.0.0</span>
        <div className="mc-spacer" />
        {isMock && (
          <span style={{ fontSize: 11, color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            mock
          </span>
        )}
        <span className={`mc-dot ${dotClass}`} />
      </div>

      {/* Body */}
      {loading ? (
        <div className="mc-state">loading…</div>
      ) : (
        <div className="mc-body">
          {status && <StatusSection status={status} isMock={isMock} />}
          <ConnectionsSection connections={connections} isMock={isMock} />
          <HealthSection health={health} isMock={isMock} />
        </div>
      )}

      {/* Footer */}
      <div className="mc-footer">
        <span className="mc-footer-label">
          {lastFetched ? `updated ${lastFetched}` : 'connect ui module'}
        </span>
        <div className="mc-spacer" />
        <button className="mc-refresh-btn" onClick={load}>
          refresh
        </button>
      </div>
    </div>
  );
}
