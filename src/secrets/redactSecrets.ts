/**
 * Redacts secret-like values from strings before they are logged or printed.
 *
 * Redaction patterns cover:
 *   - Bearer tokens
 *   - API keys (common prefixes)
 *   - Long high-entropy strings
 *   - Common header values
 *   - Passwords in connection strings
 *   - Base64-encoded blobs
 */

const REDACTED = '[REDACTED]';

type RedactionRule = {
  name: string;
  pattern: RegExp;
  replacement: string;
};

const RULES: RedactionRule[] = [
  // Authorization header values
  {
    name: 'bearer-header',
    pattern: /Bearer\s+[A-Za-z0-9._\-+/]{10,}/gi,
    replacement: `Bearer ${REDACTED}`,
  },
  {
    name: 'basic-header',
    pattern: /Basic\s+[A-Za-z0-9+/=]{10,}/gi,
    replacement: `Basic ${REDACTED}`,
  },

  // OpenAI-style keys
  {
    name: 'openai-key',
    pattern: /sk-[A-Za-z0-9]{20,}/g,
    replacement: `sk-${REDACTED}`,
  },

  // GitHub tokens
  {
    name: 'github-token',
    pattern: /ghp_[A-Za-z0-9]{36}/g,
    replacement: `ghp_${REDACTED}`,
  },
  {
    name: 'github-oauth',
    pattern: /gho_[A-Za-z0-9]{36}/g,
    replacement: `gho_${REDACTED}`,
  },

  // Generic API keys (common label patterns in JSON/YAML output)
  {
    name: 'api-key-label',
    pattern: /(["']?(?:api[-_]?key|token|secret|password|credential|auth)["']?\s*[:=]\s*["']?)([A-Za-z0-9._\-+/]{12,})(['";\s]|$)/gi,
    replacement: '$1[REDACTED]$3',
  },

  // Long high-entropy strings (32+ chars, mixed alphanum + special)
  {
    name: 'high-entropy',
    pattern: /[A-Za-z0-9+/=_\-]{48,}/g,
    replacement: REDACTED,
  },

  // Connection strings with passwords: postgres://user:pass@host
  {
    name: 'connection-string-password',
    pattern: /((?:postgres|mysql|mongodb|redis|amqp):\/\/[^:]+:)([^@]{4,})(@)/gi,
    replacement: '$1[REDACTED]$3',
  },

  // Private key blocks
  {
    name: 'private-key-block',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: `-----BEGIN PRIVATE KEY-----\n${REDACTED}\n-----END PRIVATE KEY-----`,
  },
];

/** Redact secret-like patterns from a string. */
export function redactString(input: string): string {
  let result = input;
  for (const rule of RULES) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}

/** Redact an object's string values (shallow — for log objects). */
export function redactSecrets<T>(value: T): T {
  if (typeof value === 'string') {
    return redactString(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(redactSecrets) as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactSecrets(v);
    }
    return out as T;
  }
  return value;
}

/** Run redaction on a sample and show what was changed — for connect:redact-test. */
export function redactDemo(): void {
  const samples: Array<{ label: string; input: string }> = [
    {
      label: 'Bearer token in Authorization header',
      input: 'Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.supersecretpart',
    },
    {
      label: 'OpenAI API key',
      input: 'Using key sk-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF',
    },
    {
      label: 'GitHub token',
      input: 'TOKEN=ghp_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8',
    },
    {
      label: 'API key in JSON',
      input: '{"api_key": "my-super-secret-api-key-12345678"}',
    },
    {
      label: 'Password in connection string',
      input: 'postgres://admin:s3cr3tPassw0rd@localhost:5432/mydb',
    },
    {
      label: 'High-entropy blob',
      input: 'value=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789==',
    },
    {
      label: 'Safe text (should not change)',
      input: 'Connection local-llm is healthy. Status: 200 OK.',
    },
  ];

  console.log('\n=== Redaction Demo ===\n');
  for (const { label, input } of samples) {
    const output = redactString(input);
    const changed = output !== input;
    console.log(`[${changed ? 'REDACTED' : 'SAFE    '}] ${label}`);
    if (changed) {
      console.log(`  Before: ${input}`);
      console.log(`  After:  ${output}`);
    } else {
      console.log(`  Value:  ${input}`);
    }
    console.log();
  }
}
