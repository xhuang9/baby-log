/**
 * Baby Operations Types
 *
 * Input types for baby CRUD operations.
 */

/**
 * Input for creating a new baby
 */
export type CreateBabyInput = {
  name: string;
  birthDate?: Date | null;
  gender?: 'male' | 'female' | 'other' | 'unknown' | null;
  birthWeightG?: number | null;
  caregiverLabel?: string | null;
};

/**
 * Input for updating a baby profile
 */
export type UpdateBabyInput = {
  name?: string;
  birthDate?: Date | null;
  gender?: 'male' | 'female' | 'other' | 'unknown' | null;
  birthWeightG?: number | null;
  caregiverLabel?: string | null;
};
