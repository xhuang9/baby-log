/**
 * Food Types - User-created food types for solids logging
 */

export type LocalFoodType = {
  id: string; // UUID
  userId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};
