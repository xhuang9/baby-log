'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBaby } from '@/services/operations';

type BootstrapNoBabyProps = {
  redirectPath: string;
};

export function BootstrapNoBaby(props: BootstrapNoBabyProps) {
  const { redirectPath } = props;
  const router = useRouter();

  const [name, setName] = useState('My Baby');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'unknown'>('unknown');
  const [birthWeightG, setBirthWeightG] = useState('');
  const [caregiverLabel, setCaregiverLabel] = useState('Parent');
  const [showDetails, setShowDetails] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createBaby({
        name: name.trim() || 'My Baby',
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
      router.replace(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create baby');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome to Baby Log</h1>
        <p className="text-sm text-muted-foreground">
          Let's start by adding your baby's information
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
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
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              You can always change this later
            </p>
          </div>

          {/* Baby Details Section */}
          <div className="rounded-lg border">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-medium hover:bg-muted/50"
            >
              <span>Baby Details (Optional)</span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showDetails && (
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
              </div>
            )}
          </div>

          {/* Preferences Section */}
          <div className="rounded-lg border">
            <button
              type="button"
              onClick={() => setShowPreferences(!showPreferences)}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-medium hover:bg-muted/50"
            >
              <span>Your Preferences (Optional)</span>
              {showPreferences ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showPreferences && (
              <div className="space-y-4 border-t p-4">
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    This label will be used when sharing the baby with others
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Continue to Overview'}
        </button>

      </form>
    </div>
  );
}
