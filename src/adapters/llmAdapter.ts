import type { Connection } from '../config/schemas.js';
import { HttpAdapter } from './httpAdapter.js';

/**
 * LLM adapter — thin wrapper over HttpAdapter with LLM-specific helpers.
 * Supports both Ollama and OpenAI-compatible APIs.
 */
export class LlmAdapter extends HttpAdapter {
  constructor(connection: Connection) {
    if (connection.type !== 'llm' && connection.type !== 'reasoning') {
      throw new Error(`LlmAdapter requires type llm or reasoning, got: ${connection.type}`);
    }
    super(connection);
  }

  /** Returns the health path based on adapter type. */
  healthPath(): string {
    if (this.connection.adapter === 'ollama') {
      return '/api/tags';
    }
    // OpenAI-compatible default
    return '/models';
  }
}
