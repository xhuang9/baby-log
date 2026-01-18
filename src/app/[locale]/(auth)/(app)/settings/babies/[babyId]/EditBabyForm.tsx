'use client';

import type { HandMode } from '@/lib/local-db/types/entities';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormFooter } from '@/components/input-controls/FormFooter';
import { getUIConfig } from '@/lib/local-db/helpers/ui-config';
import { updateBabyProfile } from '@/services/operations';
import { useUserStore } from '@/stores/useUserStore';

export function EditBabyForm(props: {
  babyId: number;
  initialData: {
    name: string;
    birthDate: Date | null;
    gender: 'male' | 'female' | 'other' | 'unknown' | null;
    birthWeightG: number | null;
    caregiverLabel: string | null;
  };
  redirectPath: string;
}) {
  const { babyId, initialData, redirectPath } = props;
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const [handMode, setHandMode] = useState<HandMode>('right');

  // Load hand preference from IndexedDB
  useEffect(() => {
    let mounted = true;

    async function loadHandMode() {
      if (!user?.localId) {
        return;
      }

      try {
        const config = await getUIConfig(user.localId);
        if (mounted) {
          setHandMode(config.data.handMode ?? 'right');
        }
      } catch (error) {
        console.error('Failed to load hand mode:', error);
      }
    }

    loadHandMode();

    return () => {
      mounted = false;
    };
  }, [user?.localId]);

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date: Date | null) => {
    if (!date) {
      return '';
    }
    const d = new Date(date);
    return d.toISOString().split('T')[0] ?? '';
  };

  const [name, setName] = useState(initialData.name);
  const [birthDate, setBirthDate] = useState(() => formatDateForInput(initialData.birthDate));
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'unknown'>(
    initialData.gender ?? 'unknown',
  );
  const [birthWeightG, setBirthWeightG] = useState(
    initialData.birthWeightG?.toString() ?? '',
  );
  const [caregiverLabel, setCaregiverLabel] = useState(
    initialData.caregiverLabel ?? 'Parent',
  );

  // Open accordion by default if any optional field has a value
  const hasOptionalData = Boolean(
    initialData.birthDate
    || (initialData.gender && initialData.gender !== 'unknown')
    || initialData.birthWeightG
    || (initialData.caregiverLabel && initialData.caregiverLabel !== 'Parent'),
  );
  const [showOptional, setShowOptional] = useState(hasOptionalData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!name.trim()) {
      setError('Baby name is required');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await updateBabyProfile(babyId, {
        name: name.trim(),
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender === 'unknown' ? null : gender,
        birthWeightG: birthWeightG ? Number.parseInt(birthWeightG, 10) : null,
        caregiverLabel: caregiverLabel.trim() || 'Parent',
      });

      if (!result.success) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Operation already updated IndexedDB and stores, just redirect
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update baby');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Baby Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Baby's Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          placeholder="Enter baby's name"
          required
        />
      </div>

      {/* Optional Accordion */}
      <div className="rounded-lg border bg-background">
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="flex w-full items-center justify-between p-4 text-left text-sm font-medium transition-colors hover:bg-muted/50"
        >
          <span>Optional Settings</span>
          {showOptional
            ? <ChevronUp className="size-4 text-muted-foreground" />
            : <ChevronDown className="size-4 text-muted-foreground" />}
        </button>

        {showOptional && (
          <div className="space-y-4 border-t p-4">
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium">
                Birth Date
              </label>
              <input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium">
                Gender
              </label>
              <select
                id="gender"
                value={gender}
                onChange={e => setGender(e.target.value as typeof gender)}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="unknown">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="birthWeightG" className="block text-sm font-medium">
                Birth Weight (grams)
              </label>
              <input
                id="birthWeightG"
                type="number"
                value={birthWeightG}
                onChange={e => setBirthWeightG(e.target.value)}
                min="0"
                step="1"
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                placeholder="e.g., 3500"
              />
            </div>

            <div>
              <label htmlFor="caregiverLabel" className="block text-sm font-medium">
                Your Name in System
              </label>
              <input
                id="caregiverLabel"
                type="text"
                value={caregiverLabel}
                onChange={e => setCaregiverLabel(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                placeholder="e.g., Mom, Dad, Parent"
              />
              <p className="mt-1 w-full text-xs text-wrap text-muted-foreground">
                This label will be used when sharing the baby with others
              </p>
            </div>
          </div>
        )}
      </div>

      <FormFooter
        primaryType="submit"
        primaryLabel={isSubmitting ? 'Saving...' : 'Save Changes'}
        onSecondary={() => router.push(redirectPath)}
        secondaryLabel="Back"
        isLoading={isSubmitting}
        handMode={handMode}
      />
    </form>
  );
}
