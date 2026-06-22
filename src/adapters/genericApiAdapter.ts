import type { Connection } from '../config/schemas.js';
import { HttpAdapter } from './httpAdapter.js';
import type { Adapter } from './types.js';

/** Factory: returns the right adapter for a given connection. */
export function createAdapter(connection: Connection): Adapter {
  // All connection types use HttpAdapter for now.
  // LLM-specific routing can be layered on later without changing callers.
  return new HttpAdapter(connection);
}
