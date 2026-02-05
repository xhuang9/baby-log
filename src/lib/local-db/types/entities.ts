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
  userId: number; // User ID (compound key with babyId)
  babyId: number; // Baby ID (compound key with userId)
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
  lastAccessedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LocalBabyInvite = {
  id: number;
  babyId: number;
  inviterUserId: number;
  invitedEmail: string | null;
  invitedUserId: number | null;
  accessLevel: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  inviteType: 'passkey' | 'email';
  tokenPrefix: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  maxUses: number;
  usesCount: number;
  createdAt: string;
  updatedAt: string;
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
export type DefaultLogView = 'all' | 'feed' | 'sleep';

/**
 * Shape of the UI config data object.
 * This is the flexible JSON structure stored in both Dexie and Postgres.
 */
export type TimerState = {
  elapsedSeconds: number; // Accumulated elapsed time in seconds
  lastStartTime: string | null; // ISO timestamp of when current session started (null if paused)
  babyId: number;
  logType: 'feed' | 'sleep' | 'nappy';
};

export type UIConfigData = {
  handMode?: HandMode;
  useMetric?: boolean; // true = metric (cm, kg, ml), false = imperial (inches, lbs, oz)
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
    magneticFeel?: boolean; // @deprecated - migrated to swipeResistance
    swipeResistance?: 'smooth' | 'default' | 'sticky';
    showCurrentTime?: boolean;
    markerMode?: 'all' | 'now-only';
  };
  amountSlider?: {
    minAmount?: number;
    defaultAmount?: number;
    maxAmount?: number;
    increment?: number;
    dragStep?: number;
    startOnLeft?: boolean;
  };
  pumpingAmount?: {
    defaultAmountMl?: number;
    maxAmountMl?: number;
    maxTotalMl?: number;
    increment?: number;
    dragStep?: number;
    startOnLeft?: boolean;
  };
  timers?: Record<string, TimerState>; // Persistent timer state per activity
  // Allow additional keys for future extensibility
  [key: string]: unknown;
};

/**
 * Default values for UI config
 */
export const DEFAULT_UI_CONFIG_DATA: UIConfigData = {
  handMode: 'right',
  useMetric: true, // Default to metric system
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
