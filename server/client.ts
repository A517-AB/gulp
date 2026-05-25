import { connect, MissingApiKeyError } from '@google/jules-sdk';
import type { JulesClient } from '@google/jules-sdk';

let client: JulesClient | null = null;

export function getClient(): JulesClient {
  if (client) return client;
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();
  client = connect({ apiKey });
  return client;
}

export function setClient(apiKey: string): void {
  client = connect({ apiKey });
}

export function clearClient(): void {
  client = null;
}

export function isConnected(): boolean {
  return client !== null || !!process.env.JULES_API_KEY;
}
