import * as z from 'zod';

// Access level enum values (reuse from AccessRequestValidation)
export const AccessLevelSchema = z.enum(['owner', 'editor', 'viewer']);

// Invite type enum
export const InviteTypeSchema = z.enum(['passkey', 'email']);

// Create passkey invite (6-digit numeric code, 1-hour expiry)
export const CreatePasskeyInviteSchema = z.object({
  babyId: z.number().positive('Invalid baby ID'),
  accessLevel: AccessLevelSchema.default('editor'),
  expiresInHours: z.number().positive().max(24).default(1),
});

// Create email invite (JWT link, 24-hour expiry)
export const CreateEmailInviteSchema = z.object({
  babyId: z.number().positive('Invalid baby ID'),
  invitedEmail: z.string().email('Please enter a valid email address').toLowerCase(),
  accessLevel: AccessLevelSchema.default('editor'),
  expiresInHours: z.number().positive().max(168).default(24), // max 1 week
});

// Accept invite by passkey code
export const AcceptInviteByCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only numbers'),
});

// Accept invite by JWT token
export const AcceptInviteByTokenSchema = z.object({
  token: z.string().min(10, 'Invalid token'),
});

// Revoke invite
export const RevokeInviteSchema = z.object({
  inviteId: z.number().positive('Invalid invite ID'),
});

// Regenerate invite (creates new invite with same parameters)
export const RegenerateInviteSchema = z.object({
  inviteId: z.number().int().positive('Invalid invite ID'),
});

// Remove caregiver access
export const RemoveCaregiverSchema = z.object({
  babyId: z.number().positive('Invalid baby ID'),
  userId: z.number().positive('Invalid user ID'),
});

// Type exports
export type CreatePasskeyInviteInput = z.infer<typeof CreatePasskeyInviteSchema>;
export type CreateEmailInviteInput = z.infer<typeof CreateEmailInviteSchema>;
export type AcceptInviteByCodeInput = z.infer<typeof AcceptInviteByCodeSchema>;
export type AcceptInviteByTokenInput = z.infer<typeof AcceptInviteByTokenSchema>;
export type RevokeInviteInput = z.infer<typeof RevokeInviteSchema>;
export type RegenerateInviteInput = z.infer<typeof RegenerateInviteSchema>;
export type RemoveCaregiverInput = z.infer<typeof RemoveCaregiverSchema>;
