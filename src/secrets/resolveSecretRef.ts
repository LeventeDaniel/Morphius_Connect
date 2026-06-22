import { ensureSecretsLoaded } from './loadSecrets.js';

export interface SecretResolution {
  found: boolean;
  ref: string;
  /** Value is available only internally — never pass to logs or user output */
  _internalValue: string | undefined;
}

/**
 * Resolve a secret reference to its env var value.
 * The returned value must never be logged or printed.
 */
export function resolveSecretRef(ref: string): SecretResolution {
  ensureSecretsLoaded();
  const value = process.env[ref];
  return {
    found: value !== undefined && value.trim().length > 0,
    ref,
    _internalValue: value,
  };
}

/**
 * Check whether a ref exists without returning its value.
 * Safe to use in doctor/validation output.
 */
export function secretRefExists(ref: string): boolean {
  return resolveSecretRef(ref).found;
}

/**
 * Return the internal value for use in HTTP headers etc.
 * This function has "internal" in the name as a reminder that
 * callers must not log or expose the return value.
 */
export function resolveSecretForInternalUse(ref: string): string {
  const { found, _internalValue } = resolveSecretRef(ref);
  if (!found || _internalValue === undefined) {
    throw new Error(`Secret ref "${ref}" is not set in environment`);
  }
  return _internalValue;
}
