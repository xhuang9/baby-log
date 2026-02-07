/**
 * Conflict Resolution
 *
 * Applies server data to local database for LWW (Last Write Wins) conflict resolution.
 */

import type {
  ActivityLogCategory,
  FeedMethod,
  FeedSide,
  LocalActivityLog,
  LocalBaby,
  LocalBabyAccess,
  LocalBathLog,
  LocalFeedLog,
  LocalGrowthLog,
  LocalMedicationLog,
  LocalNappyLog,
  LocalPumpingLog,
  LocalSleepLog,
  LocalSolidsLog,
  MedicationUnit,
  NappyColour,
  NappyConsistency,
  NappyType,
  SolidsReaction,
} from '@/lib/local-db';
import {
  saveActivityLogs,
  saveBabies,
  saveBabyAccess,
  saveBathLogs,
  saveFeedLogs,
  saveGrowthLogs,
  saveMedicationLogs,
  saveNappyLogs,
  savePumpingLogs,
  saveSleepLogs,
  saveSolidsLogs,
} from '@/lib/local-db';

/**
 * Apply server data to local database (for conflict resolution - LWW)
 */
export async function applyServerData(
  serverData: Record<string, unknown>,
): Promise<void> {
  // Determine entity type from the data structure
  if ('name' in serverData && 'ownerUserId' in serverData && !('babyId' in serverData)) {
    // Baby (has 'name' and 'ownerUserId' but no 'babyId' field)
    const baby: LocalBaby = {
      id: serverData.id as number,
      name: serverData.name as string,
      birthDate: serverData.birthDate ? new Date(serverData.birthDate as string) : null,
      gender: (serverData.gender as 'male' | 'female' | 'other' | 'unknown' | null) ?? null,
      birthWeightG: (serverData.birthWeightG as number | null) ?? null,
      archivedAt: serverData.archivedAt ? new Date(serverData.archivedAt as string) : null,
      ownerUserId: serverData.ownerUserId as number,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveBabies([baby]);

    // If babyAccess data is included, save it too
    if (serverData.access && Array.isArray(serverData.access)) {
      const accessRecords: LocalBabyAccess[] = (serverData.access as Array<Record<string, unknown>>).map(
        acc => ({
          userId: acc.userId as number,
          babyId: acc.babyId as number,
          accessLevel: acc.accessLevel as 'owner' | 'editor' | 'viewer',
          caregiverLabel: acc.caregiverLabel as string | null,
          lastAccessedAt: acc.lastAccessedAt ? new Date(acc.lastAccessedAt as string) : null,
          createdAt: new Date(acc.createdAt as string),
          updatedAt: new Date(acc.updatedAt as string),
        }),
      );
      await saveBabyAccess(accessRecords);
    }
  } else if ('method' in serverData) {
    // Feed log
    const feedLog: LocalFeedLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      method: serverData.method as FeedMethod,
      startedAt: new Date(serverData.startedAt as string),
      endedAt: serverData.endedAt ? new Date(serverData.endedAt as string) : null,
      durationMinutes: serverData.durationMinutes as number | null,
      amountMl: serverData.amountMl as number | null,
      isEstimated: serverData.isEstimated as boolean,
      endSide: serverData.endSide as FeedSide | null,
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveFeedLogs([feedLog]);
  } else if ('type' in serverData && serverData.type !== undefined) {
    // Nappy log (has 'type' field for nappy type)
    const nappyLog: LocalNappyLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      type: serverData.type as NappyType | null,
      colour: (serverData.colour as NappyColour | null) ?? null,
      consistency: (serverData.consistency as NappyConsistency | null) ?? null,
      startedAt: new Date(serverData.startedAt as string),
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveNappyLogs([nappyLog]);
  } else if ('food' in serverData && 'reaction' in serverData) {
    // Solids log (has 'food' and 'reaction' fields)
    const solidsLog: LocalSolidsLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      food: serverData.food as string,
      foodTypeIds: (serverData.foodTypeIds as string[]) ?? [],
      reaction: serverData.reaction as SolidsReaction,
      startedAt: new Date(serverData.startedAt as string),
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveSolidsLogs([solidsLog]);
  } else if ('totalMl' in serverData) {
    // Pumping log (has 'totalMl')
    const pumpingLog: LocalPumpingLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      startedAt: new Date(serverData.startedAt as string),
      endedAt: serverData.endedAt ? new Date(serverData.endedAt as string) : null,
      leftMl: (serverData.leftMl as number | null) ?? null,
      rightMl: (serverData.rightMl as number | null) ?? null,
      totalMl: serverData.totalMl as number,
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await savePumpingLogs([pumpingLog]);
  } else if ('weightG' in serverData || 'heightMm' in serverData || 'headCircumferenceMm' in serverData) {
    // Growth log (has 'weightG', 'heightMm', or 'headCircumferenceMm')
    const growthLog: LocalGrowthLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      startedAt: new Date(serverData.startedAt as string),
      weightG: (serverData.weightG as number | null) ?? null,
      heightMm: (serverData.heightMm as number | null) ?? null,
      headCircumferenceMm: (serverData.headCircumferenceMm as number | null) ?? null,
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveGrowthLogs([growthLog]);
  } else if ('medicationTypeId' in serverData) {
    // Medication log (has 'medicationTypeId')
    const medicationLog: LocalMedicationLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      medicationType: serverData.medicationType as string,
      medicationTypeId: serverData.medicationTypeId as string,
      amount: serverData.amount as number,
      unit: serverData.unit as MedicationUnit,
      startedAt: new Date(serverData.startedAt as string),
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveMedicationLogs([medicationLog]);
  } else if ('activityType' in serverData) {
    // Activity log
    const activityLog: LocalActivityLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      activityType: serverData.activityType as ActivityLogCategory,
      startedAt: new Date(serverData.startedAt as string),
      endedAt: serverData.endedAt ? new Date(serverData.endedAt as string) : null,
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveActivityLogs([activityLog]);
  } else if ('startedAt' in serverData && 'endedAt' in serverData) {
    // Sleep log (has 'startedAt' + 'endedAt' but no other distinguishing fields)
    const sleepLog: LocalSleepLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      startedAt: new Date(serverData.startedAt as string),
      endedAt: serverData.endedAt ? new Date(serverData.endedAt as string) : null,
      durationMinutes: serverData.durationMinutes as number | null,
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveSleepLogs([sleepLog]);
  } else if ('babyId' in serverData && 'startedAt' in serverData) {
    // Bath log (has 'babyId' + 'startedAt' but no other distinguishing fields - fallback)
    const bathLog: LocalBathLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      startedAt: new Date(serverData.startedAt as string),
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveBathLogs([bathLog]);
  }
}
