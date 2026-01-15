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
export type DefaultLogView = 'all' | 'feed' | 'sleep';

/**
 * Shape of the UI config data object.
 * This is the flexible JSON structure stored in both Dexie and Postgres.
 */
export type UIConfigData = {
  theme?: ThemeMode;
  handMode?: HandMode;
  defaultLogView?: DefaultLogView;
  notificationsEnabled?: boolean;
  dashboardVisibility?: {
    feed?: boolean;
    sleep?: boolean;
    solids?: boolean;
    bath?: boolean;
    activities?: boolean;
  };
  timeSwiper?: {
    use24Hour?: boolean;
    swipeSpeed?: number;
    incrementMinutes?: number;
    magneticFeel?: boolean;
    showCurrentTime?: boolean;
  };
  // Allow additional keys for future extensibility
  [key: string]: unknown;
};

/**
 * Default values for UI config
 */
export const DEFAULT_UI_CONFIG_DATA: UIConfigData = {
  theme: 'system',
  handMode: 'right',
  defaultLogView: 'all',
  notificationsEnabled: true,
  dashboardVisibility: {
    feed: true,
    sleep: true,
    solids: false,
    bath: false,
    activities: false,
  },
};

/**
 * Local UI configuration stored in Dexie.
 * Uses flexible JSON structure with per-key timestamps for LWW merge.
 */
export type LocalUIConfig = {
  userId: number; // Primary key - one config per user
  data: UIConfigData;
  keyUpdatedAt: Record<string, string>; // ISO timestamps by key path
  schemaVersion: number;
  updatedAt: Date;
};
