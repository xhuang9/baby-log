/**
 * Log Types for Local Database
 *
 * Activity log types for tracking baby activities.
 * Each log type has specific fields for its activity.
 */

// ============================================================================
// Feed Log Types
// ============================================================================

export type FeedMethod = 'breast' | 'bottle';
export type FeedSide = 'left' | 'right';

export type LocalFeedLog = {
  id: string; // UUID - client-generated for idempotent creates
  babyId: number;
  loggedByUserId: number;
  method: FeedMethod;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  amountMl: number | null;
  isEstimated: boolean;
  endSide: FeedSide | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Sleep Log Types
// ============================================================================

export type LocalSleepLog = {
  id: string; // UUID - client-generated for idempotent creates
  babyId: number;
  loggedByUserId: number;
  startedAt: Date;
  endedAt: Date | null; // null if ongoing
  durationMinutes: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Nappy Log Types
// ============================================================================

export type NappyType = 'wee' | 'poo' | 'mixed' | 'dry' | 'clean';

export type NappyColour = 'green' | 'yellow' | 'brown' | 'black' | 'red' | 'grey';

export type NappyConsistency = 'watery' | 'runny' | 'mushy' | 'pasty' | 'formed' | 'hardPellets';

export type LocalNappyLog = {
  id: string; // UUID - client-generated for idempotent creates
  babyId: number;
  loggedByUserId: number;
  type: NappyType | null;
  colour: NappyColour | null;
  consistency: NappyConsistency | null;
  startedAt: Date; // instant event, no endedAt
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Solids Log Types
// ============================================================================

export type SolidsReaction = 'allergic' | 'hate' | 'liked' | 'loved';

export type LocalSolidsLog = {
  id: string; // UUID - client-generated for idempotent creates
  babyId: number;
  loggedByUserId: number;
  food: string; // Display text: "Apple, Pear, Carrot"
  foodTypeIds?: string[]; // Array of food type UUIDs for data integrity (optional for legacy logs)
  reaction: SolidsReaction;
  startedAt: Date; // instant event, no endedAt
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Pumping Log Types
// ============================================================================

export type LocalPumpingLog = {
  id: string; // UUID - client-generated for idempotent creates
  babyId: number;
  loggedByUserId: number;
  startedAt: Date;
  endedAt: Date | null;
  leftMl: number | null; // null when Total mode was used
  rightMl: number | null; // null when Total mode was used
  totalMl: number; // always set (L+R sum or user-entered total)
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Growth Log Types
// ============================================================================

export type LocalGrowthLog = {
  id: string; // UUID - client-generated for idempotent creates
  babyId: number;
  loggedByUserId: number;
  startedAt: Date; // measurement date/time
  weightG: number | null; // weight in grams - nullable
  heightMm: number | null; // height in millimeters - nullable
  headCircumferenceMm: number | null; // head circumference in millimeters - nullable
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Bath Log Types
// ============================================================================

export type LocalBathLog = {
  id: string; // UUID - client-generated for idempotent creates
  babyId: number;
  loggedByUserId: number;
  startedAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Activity Log Types
// ============================================================================

export type ActivityLogCategory = 'tummy_time' | 'indoor_play' | 'outdoor_play' | 'screen_time' | 'other';

export type LocalActivityLog = {
  id: string;
  babyId: number;
  loggedByUserId: number;
  activityType: ActivityLogCategory;
  startedAt: Date;
  endedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Medication Log Types
// ============================================================================

export type MedicationUnit = 'ml' | 'drops' | 'tsp' | 'tbsp' | 'tablet' | 'capsule' | 'sachet';

export type LocalMedicationLog = {
  id: string; // UUID - client-generated for idempotent creates
  babyId: number;
  loggedByUserId: number;
  medicationType: string; // Display text: "Tylenol"
  medicationTypeId: string; // UUID reference to medication type
  amount: number; // Numeric amount
  unit: MedicationUnit; // 'ml' | 'drops' | 'tsp'
  startedAt: Date; // instant event, no endedAt
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
