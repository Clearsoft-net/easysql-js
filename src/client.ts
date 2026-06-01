import createClient from 'openapi-fetch';
import type { paths } from './types';

export type EasySQLClient = ReturnType<typeof createClient<paths>>;

export interface EasySQLClientOptions {
  baseUrl?: string;
  accessToken?: string;
}

export function createEasySQLClient(options: EasySQLClientOptions = {}): EasySQLClient {
  return createClient<paths>({
    baseUrl: options.baseUrl ?? 'https://api.easysql.net',
    headers: options.accessToken
      ? { Authorization: `Bearer ${options.accessToken}` }
      : undefined,
  });
}
