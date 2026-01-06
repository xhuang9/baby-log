import * as z from 'zod';

// Access level enum values
export const AccessLevelSchema = z.enum(['owner', 'editor', 'viewer']);

// Create access request
export const CreateAccessRequestSchema = z.object({
  targetEmail: z.string().email('Please enter a valid email address').toLowerCase(),
  message: z.string().max(500, 'Message must be 500 characters or less').optional(),
  requestedAccessLevel: AccessLevelSchema.default('viewer'),
});

// Approve access request
export const ApproveAccessRequestSchema = z.object({
  requestId: z.number().positive('Invalid request ID'),
  babyId: z.number().positive('Please select a baby'),
  accessLevel: AccessLevelSchema,
});

// Reject access request
export const RejectAccessRequestSchema = z.object({
  requestId: z.number().positive('Invalid request ID'),
});

// Cancel access request
export const CancelAccessRequestSchema = z.object({
  requestId: z.number().positive('Invalid request ID'),
});

// Type exports
export type CreateAccessRequestInput = z.infer<typeof CreateAccessRequestSchema>;
export type ApproveAccessRequestInput = z.infer<typeof ApproveAccessRequestSchema>;
export type RejectAccessRequestInput = z.infer<typeof RejectAccessRequestSchema>;
export type CancelAccessRequestInput = z.infer<typeof CancelAccessRequestSchema>;
