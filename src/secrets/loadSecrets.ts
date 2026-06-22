import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

let _loaded = false;

export function ensureSecretsLoaded(): void {
  if (_loaded) return;
  _loaded = true;

  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    loadDotenv({ path: envPath });
  }
  // Always falls back to process.env (OS-level env vars work without .env)
}

export function getEnvKeys(): string[] {
  ensureSecretsLoaded();
  return Object.keys(process.env);
}
