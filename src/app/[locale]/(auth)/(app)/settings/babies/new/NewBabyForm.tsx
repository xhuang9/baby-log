'use client';

import type { HandMode } from '@/lib/local-db/types/entities';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { JoinWithCodeSection } from '@/components/baby-access/JoinWithCodeSection';
import { RequestAccessSection } from '@/components/baby-access/RequestAccessSection';
import { FormFooter } from '@/components/input-controls/FormFooter';
import { getUIConfig } from '@/lib/local-db/helpers/ui-config';
import { createBaby } from '@/services/operations';
import { useUserStore } from '@/stores/useUserStore';

export function NewBabyForm(props: {
  redirectPath: string;
  bootstrapPath?: string;
}) {
  const { redirectPath, bootstrapPath } = props;
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

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'unknown'>('unknown');
  const [birthWeightG, setBirthWeightG] = useState('');
  const [caregiverLabel, setCaregiverLabel] = useState('Parent');
  const [showOptional, setShowOptional] = useState(false);
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
      const result = await createBaby({
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

      // Operation already updated the store, just redirect
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create baby');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
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
          primaryLabel={isSubmitting ? 'Adding...' : 'Add Baby'}
          onSecondary={() => router.push(redirectPath)}
          secondaryLabel="Cancel"
          isLoading={isSubmitting}
          handMode={handMode}
        />
      </form>

      {/* OR Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">OR</span>
        </div>
      </div>

      {/* Join with Code Section - redirect to bootstrap to sync data */}
      <JoinWithCodeSection redirectPath={bootstrapPath ?? redirectPath} />

      {/* Request Access Section */}
      <RequestAccessSection redirectPath={redirectPath} />
    </div>
  );
}
