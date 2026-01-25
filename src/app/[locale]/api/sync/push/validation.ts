/**
 * Request Validation Module
 *
 * Validates incoming push requests for the sync API.
 * Extracts validation logic to make it testable in isolation.
 */

import type { NextRequest } from 'next/server';
import type { PushRequest } from './types';

export type ValidationResult
  = | { success: true; data: PushRequest }
    | { success: false; status: number; error: string };

/**
 * Validate push request body
 * @returns Validation result with parsed data or error
 */
export async function validatePushRequest(
  request: NextRequest,
): Promise<ValidationResult> {
  // Parse JSON
  let body: PushRequest;
  try {
    body = await request.json() as PushRequest;
  } catch {
    return { success: false, status: 400, error: 'Invalid JSON body' };
  }

  // Validate mutations array
  if (!body.mutations || !Array.isArray(body.mutations)) {
    return { success: false, status: 400, error: 'mutations array is required' };
  }

  return { success: true, data: body };
}
