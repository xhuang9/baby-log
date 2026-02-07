/**
 * Access Revoked Helper
 *
 * Functions to handle when a user's access to a baby has been revoked.
 * Cleans up local data and mutations for the revoked baby.
 */

import { localDb } from '../database';

/**
 * Clear all local data for a baby when access is revoked
 */
export async function clearRevokedBabyData(babyId: number, userId: number): Promise<void> {
  // eslint-disable-next-line no-console -- Debug logging for access revocation
  console.log(`[Access Revoked] Clearing local data for baby ${babyId}`);

  await localDb.transaction('rw', [
    localDb.babies,
    localDb.babyAccess,
    localDb.feedLogs,
    localDb.sleepLogs,
    localDb.nappyLogs,
    localDb.solidsLogs,
    localDb.pumpingLogs,
    localDb.growthLogs,
    localDb.bathLogs,
    localDb.medicationLogs,
    localDb.activityLogs,
    localDb.babyInvites,
    localDb.foodTypes,
    localDb.syncMeta,
    localDb.outbox,
  ], async () => {
    // Remove baby access record
    await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([userId, babyId])
      .delete();

    // eslint-disable-next-line no-console -- Debug logging for access revocation
    console.log(`[Access Revoked] Deleted baby access record`);

    // Check if there are other users with access to this baby
    const otherAccess = await localDb.babyAccess
      .where('babyId')
      .equals(babyId)
      .count();

    // If no other users have access, delete the baby and all its data
    if (otherAccess === 0) {
      // Delete baby
      await localDb.babies.delete(babyId);
      // eslint-disable-next-line no-console -- Debug logging for access revocation
      console.log(`[Access Revoked] Deleted baby record`);

      // Delete all logs for this baby
      await localDb.feedLogs.where('babyId').equals(babyId).delete();
      await localDb.sleepLogs.where('babyId').equals(babyId).delete();
      await localDb.nappyLogs.where('babyId').equals(babyId).delete();
      await localDb.solidsLogs.where('babyId').equals(babyId).delete();
      await localDb.pumpingLogs.where('babyId').equals(babyId).delete();
      await localDb.growthLogs.where('babyId').equals(babyId).delete();
      await localDb.bathLogs.where('babyId').equals(babyId).delete();
      await localDb.medicationLogs.where('babyId').equals(babyId).delete();
      await localDb.activityLogs.where('babyId').equals(babyId).delete();
      await localDb.babyInvites.where('babyId').equals(babyId).delete();
      await localDb.syncMeta.delete(babyId);
      // eslint-disable-next-line no-console -- Debug logging for access revocation
      console.log(`[Access Revoked] Deleted all logs for baby`);
    }

    // Delete all pending mutations for this baby
    const allLogEntityTypes = [
      'feed_log', 'sleep_log', 'nappy_log', 'solids_log',
      'pumping_log', 'growth_log', 'bath_log', 'medication_log', 'activity_log',
    ];
    const deletedMutations = await localDb.outbox
      .filter((m) => {
        if (m.entityType === 'baby' && m.entityId === String(babyId)) {
          return true;
        }
        if (allLogEntityTypes.includes(m.entityType)) {
          const payload = m.payload as { babyId?: number };
          return payload.babyId === babyId;
        }
        return false;
      })
      .delete();

    // eslint-disable-next-line no-console -- Debug logging for access revocation
    console.log(`[Access Revoked] Deleted ${deletedMutations} pending mutations`);
  });

  // eslint-disable-next-line no-console -- Debug logging for access revocation
  console.log(`[Access Revoked] Cleanup complete for baby ${babyId}`);
}

/**
 * Check if there are any failed mutations with "Access denied" error for a baby
 */
export async function getAccessDeniedMutations(babyId: number): Promise<{
  mutationId: string;
  entityType: string;
  errorMessage: string;
}[]> {
  const failedMutations = await localDb.outbox
    .where('status')
    .equals('failed')
    .filter((m) => {
      // Check if error is "Access denied"
      if (!m.errorMessage?.includes('Access denied')) {
        return false;
      }

      // Check if mutation is for this baby
      if (m.entityType === 'baby' && m.entityId === String(babyId)) {
        return true;
      }

      const allLogEntityTypes = [
        'feed_log', 'sleep_log', 'nappy_log', 'solids_log',
        'pumping_log', 'growth_log', 'bath_log', 'medication_log', 'activity_log',
      ];
      if (allLogEntityTypes.includes(m.entityType)) {
        const payload = m.payload as { babyId?: number };
        return payload.babyId === babyId;
      }

      return false;
    })
    .toArray();

  return failedMutations.map(m => ({
    mutationId: m.mutationId,
    entityType: m.entityType,
    errorMessage: m.errorMessage || '',
  }));
}
