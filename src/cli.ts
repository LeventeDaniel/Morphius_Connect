#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  loadConnectConfig,
  loadRulesConfig,
  loadConnectConfigRaw,
  loadRulesConfigRaw,
} from './config/loadConnectConfig.js';
import { validateConnectConfig, validateRulesConfig } from './config/validateConnectConfig.js';
import { secretRefExists } from './secrets/resolveSecretRef.js';
import { redactDemo } from './secrets/redactSecrets.js';
import { checkConnections } from './health/checkConnections.js';
import type { Connection } from './config/schemas.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok(msg: string): void { console.log(`  ✓ ${msg}`); }
function fail(msg: string): void { console.log(`  ✗ ${msg}`); }
function warn(msg: string): void { console.log(`  ! ${msg}`); }
function section(title: string): void { console.log(`\n── ${title} ──`); }
function hr(): void { console.log('─'.repeat(60)); }

function authSummary(conn: Connection): string {
  const { auth } = conn;
  switch (auth.mode) {
    case 'none': return 'none';
    case 'bearer': return `bearer (ref: ${auth.token_ref})`;
    case 'api-key-header': return `api-key-header "${auth.header_name}" (ref: ${auth.token_ref})`;
    case 'basic': return `basic (refs: ${auth.username_ref} / ${auth.password_ref})`;
    case 'env-only': return `env-only (ref: ${auth.token_ref})`;
    case 'custom-placeholder': return 'custom-placeholder';
  }
}

// ─── Commands ────────────────────────────────────────────────────────────────

function cmdValidate(): void {
  console.log('\nMorphius Connect — Validation\n');
  hr();

  // Connect config
  let connectRaw: unknown;
  let connectFile: string;
  try {
    const loaded = loadConnectConfigRaw();
    connectRaw = loaded.raw;
    connectFile = loaded.filePath;
  } catch (err) {
    fail(`Could not load connect config: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  console.log(`Connect config: ${connectFile}`);
  const connectResult = validateConnectConfig(connectRaw);
  if (connectResult.valid) {
    ok('Connect config schema is valid');
  } else {
    for (const e of connectResult.errors) fail(e);
  }
  for (const w of connectResult.warnings) warn(w);

  // Rules config
  const rulesLoaded = loadRulesConfigRaw();
  if (rulesLoaded) {
    console.log(`\nRules config: ${rulesLoaded.filePath}`);
    const rulesResult = validateRulesConfig(rulesLoaded.raw);
    if (rulesResult.valid) {
      ok('Rules config schema is valid');
    } else {
      for (const e of rulesResult.errors) fail(e);
    }
  } else {
    warn('No rules.yaml or rules.example.yaml found — skipping rules validation');
  }

  hr();
  if (!connectResult.valid) {
    console.log('\nValidation FAILED.');
    process.exit(1);
  }
  console.log('\nValidation PASSED.');
}

function cmdList(): void {
  console.log('\nMorphius Connect — Connection List\n');
  hr();

  let config: ReturnType<typeof loadConnectConfig>['config'];
  try {
    ({ config } = loadConnectConfig());
  } catch (err) {
    fail(`Could not load config: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const pad = (s: string, n: number) => s.padEnd(n);

  console.log(
    `${pad('ID', 24)} ${pad('TYPE', 12)} ${pad('ADAPTER', 20)} AUTH`
  );
  console.log('─'.repeat(80));

  for (const conn of config.connections) {
    const approval = conn.approval?.required ? ' [requires-approval]' : '';
    console.log(
      `${pad(conn.id, 24)} ${pad(conn.type, 12)} ${pad(conn.adapter, 20)} ${authSummary(conn)}${approval}`
    );
  }

  console.log(`\nTotal: ${config.connections.length} connection(s)`);
}

async function cmdHealth(): Promise<void> {
  console.log('\nMorphius Connect — Health Checks\n');
  hr();

  let config: ReturnType<typeof loadConnectConfig>['config'];
  try {
    ({ config } = loadConnectConfig());
  } catch (err) {
    fail(`Could not load config: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const results = await checkConnections(config.connections);

  for (const r of results) {
    const duration = r.durationMs !== undefined ? ` (${r.durationMs}ms)` : '';
    const statusIcon =
      r.status === 'healthy' ? '✓' :
      r.status === 'no-health-config' ? '–' :
      r.status === 'skipped' ? '–' : '✗';

    console.log(`  ${statusIcon} [${r.id}] ${r.status}${duration} — ${r.message}`);
  }

  const healthy = results.filter((r) => r.status === 'healthy').length;
  const unhealthy = results.filter((r) => r.status === 'unhealthy').length;
  const skipped = results.filter((r) => r.status !== 'healthy' && r.status !== 'unhealthy').length;

  console.log(`\nHealthy: ${healthy}  Unhealthy: ${unhealthy}  Skipped/N/A: ${skipped}`);
}

function cmdDoctor(): void {
  console.log('\nMorphius Connect — Doctor\n');
  hr();

  // .gitignore check
  section('Git Safety');
  const gitignorePath = path.resolve(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const checks: Array<[string, string]> = [
      ['.env', '.env is gitignored'],
      ['connect.yaml', 'connect.yaml is gitignored'],
      ['rules.yaml', 'rules.yaml is gitignored'],
    ];
    for (const [entry, label] of checks) {
      if (content.includes(entry)) {
        ok(label);
      } else {
        fail(`${entry} is NOT in .gitignore — add it`);
      }
    }
  } else {
    fail('.gitignore not found — create one before committing');
  }

  // .env presence
  section('Environment');
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    ok('.env file exists');
  } else {
    warn('.env file not found — copy .env.example to .env and fill in secrets');
  }

  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  if (fs.existsSync(envExamplePath)) {
    ok('.env.example exists (safe to commit)');
  } else {
    warn('.env.example not found');
  }

  // Example files
  section('Example Files');
  for (const name of ['connect.example.yaml', 'rules.example.yaml']) {
    const p = path.resolve(process.cwd(), name);
    if (fs.existsSync(p)) {
      ok(`${name} exists`);
    } else {
      warn(`${name} not found`);
    }
  }

  // Validate config
  section('Config Validation');
  let configValid = false;
  let connectConfig: ReturnType<typeof loadConnectConfig>['config'] | null = null;
  try {
    const loaded = loadConnectConfigRaw();
    const result = validateConnectConfig(loaded.raw);
    if (result.valid) {
      ok('Connect config is valid');
      configValid = true;
      connectConfig = loadConnectConfig().config;
    } else {
      for (const e of result.errors) fail(e);
    }
    for (const w of result.warnings) warn(w);
  } catch (err) {
    fail(`Config load error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Secret refs
  section('Secret References');
  if (connectConfig) {
    for (const conn of connectConfig.connections) {
      const { auth } = conn;
      let ref: string | null = null;
      if (auth.mode === 'bearer') ref = auth.token_ref;
      else if (auth.mode === 'api-key-header') ref = auth.token_ref;
      else if (auth.mode === 'env-only') ref = auth.token_ref;

      if (ref) {
        if (secretRefExists(ref)) {
          ok(`[${conn.id}] ${ref} — found in environment`);
        } else {
          warn(`[${conn.id}] ${ref} — NOT set (connection will fail at runtime)`);
        }
      }
    }
  } else {
    warn('Skipping secret ref checks — config not valid');
  }

  hr();
  console.log('\nDoctor complete.');
}

function cmdRedactTest(): void {
  redactDemo();
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const cmd = process.argv[2];

  switch (cmd) {
    case 'validate':
      cmdValidate();
      break;
    case 'list':
      cmdList();
      break;
    case 'health':
      await cmdHealth();
      break;
    case 'doctor':
      cmdDoctor();
      break;
    case 'redact-test':
      cmdRedactTest();
      break;
    default:
      console.log(`
Morphius Connect CLI

Usage:
  npm run connect:validate    Validate connect.yaml and rules.yaml
  npm run connect:list        List configured connections (no secrets)
  npm run connect:health      Check health endpoints
  npm run connect:doctor      Full system diagnostic
  npm run connect:redact-test Demo log redaction

Or via tsx:
  tsx src/cli.ts <command>
`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
