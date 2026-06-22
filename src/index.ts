/**
 * Morphius Connect — Public API
 *
 * Import from here to use Morphius Connect programmatically.
 */

export { loadConnectConfig, loadRulesConfig } from './config/loadConnectConfig.js';
export { validateConnectConfig, validateRulesConfig } from './config/validateConnectConfig.js';
export { secretRefExists, resolveSecretForInternalUse } from './secrets/resolveSecretRef.js';
export { redactString, redactSecrets } from './secrets/redactSecrets.js';
export { createAdapter } from './adapters/genericApiAdapter.js';
export { checkConnections } from './health/checkConnections.js';
export { evaluateConnectionUsage } from './policy/evaluateRules.js';
export { logger } from './utils/safeLogger.js';

export type { ConnectConfig, Connection, ConnectionType, Auth, RulesConfig } from './config/schemas.js';
export type { Adapter, AdapterRequestOptions, AdapterResponse } from './adapters/types.js';
export type { ConnectionHealthResult, HealthStatus } from './health/checkConnections.js';
export type { RuleEvaluationResult } from './policy/evaluateRules.js';
