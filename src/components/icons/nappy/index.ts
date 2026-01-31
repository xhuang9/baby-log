import { Circle, CircleDot, Droplet, Droplets, Waves, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NappyConsistency } from '@/lib/local-db';

export const CONSISTENCY_ICONS: Record<NappyConsistency, LucideIcon> = {
  watery: Droplets,
  runny: Droplet,
  mushy: Waves,
  pasty: Wind,
  formed: Circle,
  hardPellets: CircleDot,
};
