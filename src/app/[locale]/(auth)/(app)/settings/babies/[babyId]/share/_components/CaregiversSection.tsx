'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Crown, RefreshCw, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCaregivers, removeCaregiver } from '@/actions/babyActions';
import { localDb } from '@/lib/local-db/database';

type CaregiversSectionProps = {
  babyId: number;
};

type CaregiverInfo = {
  userId: number;
  email: string | null;
  firstName: string | null;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
  lastAccessedAt: string | null;
  isCurrentUser: boolean;
};

export function CaregiversSection({ babyId }: CaregiversSectionProps) {
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverCaregivers, setServerCaregivers] = useState<CaregiverInfo[] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch caregivers from server
  const fetchFromServer = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const result = await getCaregivers(babyId);

      if (result.success) {
        setServerCaregivers(result.caregivers);
      } else {
        setError(result.error);
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch caregivers');
    }
    finally {
      setIsRefreshing(false);
    }
  };

  // Fetch from server on mount
  useEffect(() => {
    fetchFromServer();
  }, [babyId]);

  // Fetch caregivers from IndexedDB (fallback)
  const caregivers = useLiveQuery(async () => {
    const currentUser = await localDb.users.toCollection().first();
    if (!currentUser) return [];

    const accesses = await localDb.babyAccess
      .where('babyId')
      .equals(babyId)
      .toArray();

    // Get user details for each access
    const caregiversWithDetails: CaregiverInfo[] = [];

    for (const access of accesses) {
      // For current user, use cached data
      if (access.userId === currentUser.id) {
        caregiversWithDetails.push({
          userId: access.userId,
          email: currentUser.email,
          firstName: currentUser.firstName,
          accessLevel: access.accessLevel,
          caregiverLabel: access.caregiverLabel,
          lastAccessedAt: access.lastAccessedAt ? access.lastAccessedAt.toISOString() : null,
          isCurrentUser: true,
        });
        continue;
      }

      // For other users, fetch from local DB
      // Note: In a full implementation, we'd fetch from server
      // For now, we'll show placeholder data
      caregiversWithDetails.push({
        userId: access.userId,
        email: null,
        firstName: null,
        accessLevel: access.accessLevel,
        caregiverLabel: access.caregiverLabel,
        lastAccessedAt: access.lastAccessedAt ? access.lastAccessedAt.toISOString() : null,
        isCurrentUser: false,
      });
    }

    // Sort: owners first, then by last accessed
    return caregiversWithDetails.sort((a, b) => {
      if (a.accessLevel === 'owner' && b.accessLevel !== 'owner') return -1;
      if (a.accessLevel !== 'owner' && b.accessLevel === 'owner') return 1;

      const aTime = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
      const bTime = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [babyId]);

  const handleRemove = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this caregiver?')) {
      return;
    }

    setRemovingId(userId);
    setError(null);

    try {
      const result = await removeCaregiver({ babyId, userId });

      if (!result.success) {
        setError(result.error);
      } else {
        // Refresh caregivers list from server
        await fetchFromServer();
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove caregiver');
    }
    finally {
      setRemovingId(null);
    }
  };

  const formatLastAccessed = (lastAccessedAt: string | null) => {
    if (!lastAccessedAt) return 'Never';

    const date = new Date(lastAccessedAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'owner':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
      case 'editor':
        return 'bg-primary/10 text-primary';
      case 'viewer':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Use server data if available, otherwise use IndexedDB
  const displayCaregivers = serverCaregivers ?? caregivers;

  if (displayCaregivers === undefined) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Caregivers</h2>
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Caregivers</h2>
          <p className="text-sm text-muted-foreground">
            {displayCaregivers.length} {displayCaregivers.length === 1 ? 'person has' : 'people have'} access
          </p>
        </div>
        <button
          type="button"
          onClick={fetchFromServer}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          title="Refresh caregivers list"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {displayCaregivers.map(caregiver => (
          <div
            key={caregiver.userId}
            className="flex items-center justify-between rounded-lg border bg-background p-4"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="rounded-full bg-primary/10 p-2">
                {caregiver.accessLevel === 'owner' ? (
                  <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {caregiver.caregiverLabel || 'Caregiver'}
                    {caregiver.isCurrentUser && (
                      <span className="ml-1 text-xs text-muted-foreground">(You)</span>
                    )}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getAccessLevelColor(caregiver.accessLevel)}`}>
                    {caregiver.accessLevel}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {caregiver.email || `User #${caregiver.userId}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last active: {formatLastAccessed(caregiver.lastAccessedAt)}
                </p>
              </div>
            </div>

            {/* Remove Button (only for non-owners and non-self) */}
            {caregiver.accessLevel !== 'owner' && !caregiver.isCurrentUser && (
              <button
                type="button"
                onClick={() => handleRemove(caregiver.userId)}
                disabled={removingId === caregiver.userId}
                className="rounded-md p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                title="Remove caregiver"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
