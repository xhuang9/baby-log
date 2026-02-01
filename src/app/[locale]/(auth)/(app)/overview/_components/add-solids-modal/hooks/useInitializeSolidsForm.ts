'use client';

import { useEffect } from 'react';
import { getUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useUserStore } from '@/stores/useUserStore';

type UseInitializeSolidsFormProps = {
  setHandMode: (mode: 'left' | 'right') => void;
};

export function useInitializeSolidsForm({
  setHandMode,
}: UseInitializeSolidsFormProps) {
  const user = useUserStore(s => s.user);

  // Load hand preference from IndexedDB
  useEffect(() => {
    async function loadHandMode() {
      if (!user?.localId) {
        return;
      }
      try {
        const config = await getUIConfig(user.localId);
        setHandMode(config.data.handMode ?? 'right');
      } catch (err) {
        console.error('Failed to load hand mode:', err);
      }
    }
    loadHandMode();
  }, [user?.localId, setHandMode]);
}
