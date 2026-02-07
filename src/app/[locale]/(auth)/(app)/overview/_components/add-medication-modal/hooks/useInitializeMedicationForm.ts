'use client';

import { useEffect } from 'react';
import { getUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useUserStore } from '@/stores/useUserStore';

type UseInitializeMedicationFormProps = {
  setHandMode: (mode: 'left' | 'right') => void;
  setUseMetric: (useMetric: boolean) => void;
};

export function useInitializeMedicationForm({
  setHandMode,
  setUseMetric,
}: UseInitializeMedicationFormProps) {
  const user = useUserStore(s => s.user);

  // Load hand preference and metric setting from IndexedDB
  useEffect(() => {
    async function loadConfig() {
      if (!user?.localId) {
        return;
      }
      try {
        const config = await getUIConfig(user.localId);
        setHandMode(config.data.handMode ?? 'right');
        setUseMetric(config.data.useMetric ?? true);
      } catch (err) {
        console.error('Failed to load UI config:', err);
      }
    }
    loadConfig();
  }, [user?.localId, setHandMode, setUseMetric]);
}
