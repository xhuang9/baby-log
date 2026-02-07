/**
 * Medication Types - User-created medication types for medication logging
 */

export type LocalMedicationType = {
  id: string; // UUID
  userId: number;
  name: string; // e.g., "Tylenol", "Vitamin D"
  createdAt: Date;
  updatedAt: Date;
};
