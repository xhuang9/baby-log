import { useEffect } from 'react';
import { getUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useTimerStore } from '@/stores/useTimerStore';
import { useUserStore } from '@/stores/useUserStore';

type UseInitializeSleepFormOptions = {
  isTimerHydrated: boolean;
  setHandMode: (mode: 'left' | 'right') => void;
};

export function useInitializeSleepForm({
  isTimerHydrated,
  setHandMode,
}: UseInitializeSleepFormOptions) {
  const user = useUserStore(s => s.user);
  const hydrateTimer = useTimerStore(s => s.hydrate);

  // Hydrate timer store when user is available
  useEffect(() => {
    if (user?.localId && !isTimerHydrated) {
      hydrateTimer(user.localId);
    }
  }, [user?.localId, isTimerHydrated, hydrateTimer]);

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
