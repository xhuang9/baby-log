/**
 * Access Revocation Handler
 *
 * Centralized logic for handling access revocation events.
 * Used when sync operations detect that a user's access to a baby has been revoked.
 */

import { toast } from 'sonner';
import { notifySystem } from '@/lib/notify';
import { useBabyStore } from '@/stores/useBabyStore';

type AccessRevocationParams = {
  /** The ID of the baby whose access was revoked */
  revokedBabyId: number;
  /** The local user ID for notification logging */
  userLocalId?: number;
  /** Custom message to display (optional) */
  message?: string;
};

/**
 * Handles access revocation by:
 * 1. Removing the revoked baby from allBabies in the store
 * 2. Switching to another baby if the active baby was revoked
 * 3. Showing a toast notification
 * 4. Logging to the notification system
 */
export function handleAccessRevocation({
  revokedBabyId,
  userLocalId,
  message = 'Your access to this baby has been removed by the owner.',
}: AccessRevocationParams): void {
  const { activeBaby, allBabies, setActiveBaby, setAllBabies } = useBabyStore.getState();

  // Remove the revoked baby from allBabies
  const updatedBabies = allBabies.filter(b => b.babyId !== revokedBabyId);
  setAllBabies(updatedBabies);

  // If the active baby was revoked, switch to another baby
  if (activeBaby?.babyId === revokedBabyId) {
    const nextBaby = updatedBabies[0] ?? null;
    if (nextBaby) {
      setActiveBaby(nextBaby);
    }
  }

  // Show toast notification
  toast.error('Access Revoked', {
    description: message,
  });

  // Log to notification system
  if (userLocalId) {
    void notifySystem.access('error', {
      userId: userLocalId,
      title: 'Access Revoked',
      message,
      babyId: revokedBabyId,
      dedupeKey: `access-revoked-${revokedBabyId}`,
    });
  }
}
