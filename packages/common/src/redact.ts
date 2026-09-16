/**
 * Redacts secrets from driver error messages before they are rethrown, so a
 * failed connection never leaks credentials into logs.
 */
export function sanitizeErrorMessage(message: string, secrets: (string | undefined)[]): string {
  let out = message;
  for (const secret of secrets) {
    if (!secret || secret.length === 0) continue;
    out = out.split(secret).join("****");
  }
  return out;
}
