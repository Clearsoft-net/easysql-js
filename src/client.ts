import createClient from "openapi-fetch";
import type { paths } from "./api-types";

export type EasySQLClient = ReturnType<typeof createClient<paths>>;

export interface CreateClientOptions {
  baseUrl: string;
  accessToken?: string;
}

export function createEasySQLClient(options: CreateClientOptions): EasySQLClient {
  return createClient<paths>({
    baseUrl: options.baseUrl,
    headers: options.accessToken
      ? { Authorization: `Bearer ${options.accessToken}` }
      : {},
  });
}
