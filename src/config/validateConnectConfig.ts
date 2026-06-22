import { ConnectConfigSchema, RulesSchema } from './schemas.js';
import type { ConnectConfig } from './schemas.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Check for obvious plaintext secrets in YAML values (simple heuristic). */
function detectPlaintextSecrets(raw: unknown): string[] {
  const warnings: string[] = [];
  const text = JSON.stringify(raw);

  const suspiciousPatterns: [RegExp, string][] = [
    [/sk-[A-Za-z0-9]{20,}/g, 'Possible OpenAI API key'],
    [/ghp_[A-Za-z0-9]{36}/g, 'Possible GitHub personal access token'],
    [/Bearer\s+[A-Za-z0-9._\-]{20,}/g, 'Possible inline bearer token'],
    [/"[A-Za-z0-9+/]{40,}={0,2}"/g, 'Possible base64-encoded secret'],
  ];

  for (const [pattern, label] of suspiciousPatterns) {
    if (pattern.test(text)) {
      warnings.push(`${label} detected — ensure this is a placeholder, not a real credential`);
    }
  }

  return warnings;
}

/** Validate connection IDs are unique. */
function checkUniqueIds(config: ConnectConfig): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const conn of config.connections) {
    if (seen.has(conn.id)) {
      errors.push(`Duplicate connection id: "${conn.id}"`);
    }
    seen.add(conn.id);
  }
  return errors;
}

export function validateConnectConfig(raw: unknown): ValidationResult {
  const result = ConnectConfigSchema.safeParse(raw);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(
        (e) => `[${e.path.join('.')}] ${e.message}`
      ),
      warnings: [],
    };
  }

  const errors: string[] = checkUniqueIds(result.data);
  const warnings: string[] = detectPlaintextSecrets(raw);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateRulesConfig(raw: unknown): ValidationResult {
  const result = RulesSchema.safeParse(raw);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(
        (e) => `[${e.path.join('.')}] ${e.message}`
      ),
      warnings: [],
    };
  }

  return { valid: true, errors: [], warnings: [] };
}
