import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

/**
 * Invite Helper Utilities
 *
 * Provides cryptographic functions for baby invite system:
 * - Passkey generation (6-digit numeric codes)
 * - Token hashing (SHA-256 for secure storage)
 * - JWT creation/verification (email invite links)
 */

// JWT configuration
const JWT_SECRET = process.env.INVITE_JWT_SECRET;
const JWT_EXPIRY = '24h';
const PASSKEY_EXPIRY_HOURS = 1;

if (!JWT_SECRET) {
  throw new Error('INVITE_JWT_SECRET environment variable is required');
}

/**
 * Email invite JWT payload structure
 */
export type EmailInvitePayload = {
  inviteId: number;
  babyId: number;
  email: string;
  jti: string; // JWT ID for tracking/revocation
};

/**
 * Generate a crypto-secure 6-digit numeric passkey
 *
 * Uses crypto.randomInt for true randomness (not Math.random)
 * Range: 100000-999999 (always 6 digits)
 *
 * @returns 6-digit numeric string
 */
export function generatePasskey(): string {
  // Generate random number between 100000 and 999999
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
}

/**
 * Hash a token using SHA-256
 *
 * Used for secure storage of passkeys and JWT jti values.
 * Never store plain-text tokens in the database.
 *
 * @param token - Raw token string
 * @returns SHA-256 hash (hex string)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a display-friendly token prefix
 *
 * Shows first 3 characters followed by ellipsis (e.g., "123...")
 * Used for displaying passkeys without exposing full code
 *
 * @param token - Raw token string
 * @returns Prefix string (e.g., "123...")
 */
export function generateTokenPrefix(token: string): string {
  return `${token.slice(0, 3)}...`;
}

/**
 * Create a signed JWT for email invite links
 *
 * JWT expires in 24 hours. Contains invite metadata.
 * The jti (JWT ID) is hashed and stored in database for validation.
 *
 * @param payload - Invite metadata
 * @returns Signed JWT token
 */
export function createEmailInviteJWT(payload: Omit<EmailInvitePayload, 'jti'>): string {
  if (!JWT_SECRET) {
    throw new Error('INVITE_JWT_SECRET is not configured');
  }

  // Generate unique JWT ID for this token
  const jti = crypto.randomUUID();

  const fullPayload: EmailInvitePayload = {
    ...payload,
    jti,
  };

  return jwt.sign(fullPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: 'baby-log',
    audience: 'invite-acceptance',
  });
}

/**
 * Verify and decode an email invite JWT
 *
 * Checks signature and expiration.
 * Returns null if invalid or expired.
 *
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifyEmailInviteJWT(token: string): EmailInvitePayload | null {
  if (!JWT_SECRET) {
    throw new Error('INVITE_JWT_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'baby-log',
      audience: 'invite-acceptance',
    });

    // Type guard to ensure payload structure
    if (
      typeof decoded === 'object'
      && decoded !== null
      && 'inviteId' in decoded
      && 'babyId' in decoded
      && 'email' in decoded
      && 'jti' in decoded
    ) {
      return decoded as EmailInvitePayload;
    }

    return null;
  } catch {
    // Invalid signature, expired, or malformed
    return null;
  }
}

/**
 * Calculate expiration timestamp for passkey invites
 *
 * @param hours - Number of hours until expiration (default: 1)
 * @returns Date object representing expiration time
 */
export function getPasskeyExpiryDate(hours: number = PASSKEY_EXPIRY_HOURS): Date {
  const now = new Date();
  now.setHours(now.getHours() + hours);
  return now;
}

/**
 * Calculate expiration timestamp for email invites
 *
 * @returns Date object representing expiration time (24 hours)
 */
export function getEmailInviteExpiryDate(): Date {
  const now = new Date();
  now.setHours(now.getHours() + 24);
  return now;
}

/**
 * Check if an invite has expired
 *
 * @param expiresAt - Expiration timestamp
 * @returns True if expired
 */
export function isInviteExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
