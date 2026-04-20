/**
 * Environment variable helpers.
 *
 * `requireEnv` enforces that secrets are set in production.
 * In development, missing secrets are tolerated with a warning so local
 * workflows don't break when `.env.local` is incomplete.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Required env var ${name} is not set`);
    }
    console.warn(`[env] ${name} is not set — using empty string (dev only)`);
    return '';
  }
  return value;
}
