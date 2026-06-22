import { z } from 'zod';

// ─── Auth Modes ──────────────────────────────────────────────────────────────

const AuthNoneSchema = z.object({
  mode: z.literal('none'),
});

const AuthBearerSchema = z.object({
  mode: z.literal('bearer'),
  token_ref: z.string().min(1),
});

const AuthApiKeyHeaderSchema = z.object({
  mode: z.literal('api-key-header'),
  header_name: z.string().min(1),
  token_ref: z.string().min(1),
});

const AuthBasicSchema = z.object({
  mode: z.literal('basic'),
  username_ref: z.string().min(1),
  password_ref: z.string().min(1),
});

const AuthEnvOnlySchema = z.object({
  mode: z.literal('env-only'),
  token_ref: z.string().min(1),
});

const AuthCustomPlaceholderSchema = z.object({
  mode: z.literal('custom-placeholder'),
  description: z.string().optional(),
});

export const AuthSchema = z.discriminatedUnion('mode', [
  AuthNoneSchema,
  AuthBearerSchema,
  AuthApiKeyHeaderSchema,
  AuthBasicSchema,
  AuthEnvOnlySchema,
  AuthCustomPlaceholderSchema,
]);

// ─── Health Check ─────────────────────────────────────────────────────────────

export const HealthSchema = z.object({
  enabled: z.boolean(),
  path: z.string().optional(),
  method: z.enum(['GET', 'HEAD']).default('GET'),
  timeout_ms: z.number().int().positive().default(5000),
});

// ─── Approval Policy ─────────────────────────────────────────────────────────

export const ApprovalSchema = z.object({
  required: z.boolean(),
  reason: z.string().optional(),
});

// ─── Connection Types ─────────────────────────────────────────────────────────

export const ConnectionTypeSchema = z.enum([
  'llm',
  'reasoning',
  'coding',
  'browser',
  'preview',
  'database',
  'storage',
  'webhook',
  'generic-api',
]);

// ─── Adapter Types ────────────────────────────────────────────────────────────

export const AdapterSchema = z.enum([
  'ollama',
  'openai-compatible',
  'generic-http',
]);

// ─── Connection Entry ─────────────────────────────────────────────────────────

export const ConnectionSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-_]+$/, {
    message: 'Connection id must be lowercase alphanumeric, hyphens, or underscores',
  }),
  type: ConnectionTypeSchema,
  adapter: AdapterSchema,
  base_url: z.string().url(),
  model: z.string().optional(),
  auth: AuthSchema,
  health: HealthSchema.optional(),
  approval: ApprovalSchema.optional(),
  endpoints: z.record(z.string()).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ─── Full Connect Config ──────────────────────────────────────────────────────

export const ConnectConfigSchema = z.object({
  connections: z.array(ConnectionSchema).min(1),
});

// ─── Rules Config ─────────────────────────────────────────────────────────────

export const RulesSchema = z.object({
  rules: z.object({
    secrets: z.object({
      never_store_in_public_repo: z.boolean(),
      redact_logs: z.boolean(),
      allow_plaintext_in_yaml: z.boolean(),
    }),
    approvals: z.object({
      required_for: z.array(z.string()),
    }),
    network: z.object({
      allow_localhost: z.boolean(),
      allow_cloud: z.boolean(),
      blocked_domains: z.array(z.string()).default([]),
    }),
    logging: z.object({
      log_connection_health: z.boolean(),
      log_request_metadata_only: z.boolean(),
      never_log_headers: z.array(z.string()).default([]),
      never_log_env_vars: z.array(z.string()).default([]),
    }),
  }),
});

// ─── Exported Types ───────────────────────────────────────────────────────────

export type ConnectConfig = z.infer<typeof ConnectConfigSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type ConnectionType = z.infer<typeof ConnectionTypeSchema>;
export type Auth = z.infer<typeof AuthSchema>;
export type HealthConfig = z.infer<typeof HealthSchema>;
export type ApprovalPolicy = z.infer<typeof ApprovalSchema>;
export type RulesConfig = z.infer<typeof RulesSchema>;
