import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ConnectConfigSchema, RulesSchema } from './schemas.js';
import type { ConnectConfig, RulesConfig } from './schemas.js';

const CONNECT_CANDIDATES = ['connect.yaml', 'connect.example.yaml'];
const RULES_CANDIDATES = ['rules.yaml', 'rules.example.yaml'];

function findFile(candidates: string[]): string | null {
  for (const name of candidates) {
    const p = path.resolve(process.cwd(), name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function readYaml(filePath: string): unknown {
  return parseYaml(fs.readFileSync(filePath, 'utf-8'));
}

export function loadConnectConfigRaw(): { raw: unknown; filePath: string } {
  const filePath = findFile(CONNECT_CANDIDATES);
  if (!filePath) {
    throw new Error(
      `No connect config found.\n` +
      `Create connect.yaml from connect.example.yaml.\n` +
      `Searched: ${CONNECT_CANDIDATES.join(', ')}`
    );
  }
  return { raw: readYaml(filePath), filePath };
}

export function loadRulesConfigRaw(): { raw: unknown; filePath: string } | null {
  const filePath = findFile(RULES_CANDIDATES);
  if (!filePath) return null;
  return { raw: readYaml(filePath), filePath };
}

export function loadConnectConfig(): { config: ConnectConfig; filePath: string } {
  const filePath = findFile(CONNECT_CANDIDATES);
  if (!filePath) {
    throw new Error(
      `No connect config found.\n` +
      `Create connect.yaml from connect.example.yaml.\n` +
      `Searched: ${CONNECT_CANDIDATES.join(', ')}`
    );
  }

  const raw = readYaml(filePath);
  const result = ConnectConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid connect config at ${filePath}:\n${result.error.toString()}`
    );
  }

  return { config: result.data, filePath };
}

export function loadRulesConfig(): { config: RulesConfig; filePath: string } | null {
  const filePath = findFile(RULES_CANDIDATES);
  if (!filePath) return null;

  const raw = readYaml(filePath);
  const result = RulesSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid rules config at ${filePath}:\n${result.error.toString()}`
    );
  }

  return { config: result.data, filePath };
}
