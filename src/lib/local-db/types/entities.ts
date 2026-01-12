/**
 * Entity Types for Local Database
 *
 * Core entity types that mirror the server schema.
 * Used for babies, users, and access control.
 */

// ============================================================================
// Baby Types
// ============================================================================

export type LocalBaby = {
  id: number;
  name: string;
  birthDate: Date | null;
  gender: 'male' | 'female' | 'other' | 'unknown' | null;
  birthWeightG: number | null;
  archivedAt: Date | null;
  ownerUserId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type LocalBabyAccess = {
  oduserId: number; // User ID (compound key with babyId)
  babyId: number; // Baby ID (compound key with oduserId)
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
  lastAccessedAt: Date | null;
};

// ============================================================================
// User Types
// ============================================================================

export type LocalUser = {
  id: number; // Local database user ID (primary key)
  clerkId: string; // Clerk ID
  email: string | null;
  firstName: string | null;
  imageUrl: string | null;
  defaultBabyId: number | null;
  locked: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// UI Configuration Types
// ============================================================================

export type HandMode = 'left' | 'right';
export type ThemeMode = 'light' | 'dark' | 'system';

export type LocalUIConfig = {
  userId: number; // Primary key - one config per user
  theme: ThemeMode;
  handMode: HandMode;
  defaultLogView: 'all' | 'feed' | 'sleep';
  dashboardVisibility: {
    feed: boolean;
    sleep: boolean;
    solids: boolean;
    bath: boolean;
    activities: boolean;
  };
  updatedAt: Date;
};
