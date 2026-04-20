import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

/**
 * Hash a password using bcrypt with a secure cost factor.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a stored hash.
 *
 * Supports two hash formats:
 * - Legacy SHA256 hex (64 chars, no `$` prefix) — pre-launch scheme.
 * - bcrypt (`$2a$` / `$2b$` / `$2y$` prefix) — current scheme.
 *
 * Legacy comparison uses constant-time equality to avoid timing leaks.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!hash) return false;

  if (!hash.startsWith('$2')) {
    const crypto = await import('crypto');
    const sha256 = crypto.createHash('sha256').update(password).digest('hex');
    const a = Buffer.from(sha256);
    const b = Buffer.from(hash);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  return bcrypt.compare(password, hash);
}

/**
 * Detect whether a stored hash is the legacy (SHA256) format and should be
 * upgraded to bcrypt on the next successful login.
 */
export function isLegacyHash(hash: string): boolean {
  return !!hash && !hash.startsWith('$2') && hash.length === 64;
}
