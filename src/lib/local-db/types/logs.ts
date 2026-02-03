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
