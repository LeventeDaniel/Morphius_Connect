import type { RulesConfig } from '../config/schemas.js';
import type { Connection } from '../config/schemas.js';

export interface RuleEvaluationResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
  approvalReason?: string;
}

export function evaluateConnectionUsage(
  connection: Connection,
  action: string,
  rules: RulesConfig
): RuleEvaluationResult {
  const { rules: r } = rules;

  // Check blocked domains
  try {
    const url = new URL(connection.base_url);
    const hostname = url.hostname;
    if (r.network.blocked_domains.includes(hostname)) {
      return {
        allowed: false,
        reason: `Domain "${hostname}" is in the blocked_domains list`,
      };
    }

    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
    if (isLocal && !r.network.allow_localhost) {
      return {
        allowed: false,
        reason: 'Localhost connections are disabled by rules.allow_localhost',
      };
    }
    if (!isLocal && !r.network.allow_cloud) {
      return {
        allowed: false,
        reason: 'Cloud connections are disabled by rules.allow_cloud',
      };
    }
  } catch {
    return { allowed: false, reason: 'Invalid base_url in connection' };
  }

  // Check approval requirements
  const requiresApprovalByRules = r.approvals.required_for.includes(action);
  const requiresApprovalByConn = connection.approval?.required === true;

  if (requiresApprovalByRules || requiresApprovalByConn) {
    return {
      allowed: true,
      requiresApproval: true,
      approvalReason:
        connection.approval?.reason ??
        `Action "${action}" requires approval per policy`,
    };
  }

  return { allowed: true };
}
