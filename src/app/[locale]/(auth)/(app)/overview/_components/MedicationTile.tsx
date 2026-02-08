'use client';

import type { LocalMedicationLog } from '@/lib/local-db';
import { useState } from 'react';
import { ActivityTile } from './ActivityTile';
import { AddMedicationModal } from './add-medication-modal';

type MedicationTileProps = {
  babyId: number;
  latestMedication: (LocalMedicationLog & { caregiverLabel: string | null }) | null | undefined;
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return remainingHours > 0 ? `${diffDays}d ${remainingHours}h ago` : `${diffDays}d ago`;
  }

  if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m ago` : `${diffHours}h ago`;
  }

  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }

  return 'Just now';
}

function getMedicationStatusText(
  medication: LocalMedicationLog & { caregiverLabel: string | null },
): string {
  return `${medication.amount} ${medication.unit} of ${medication.medicationType}`;
}

export function MedicationTile({ babyId, latestMedication }: MedicationTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <ActivityTile
        title="Medication"
        statusText={latestMedication ? getMedicationStatusText(latestMedication) : 'Tap to log medication'}
        timeAgo={latestMedication ? formatTimeAgo(latestMedication.startedAt) : undefined}
        caregiver={latestMedication?.caregiverLabel}
        notes={latestMedication?.notes}
        activity="medication"
        onClick={() => setIsModalOpen(true)}
      />
      <AddMedicationModal
        babyId={babyId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}
