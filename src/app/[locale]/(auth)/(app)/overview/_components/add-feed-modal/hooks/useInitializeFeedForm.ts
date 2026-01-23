import type { FeedMethod } from '@/lib/local-db';
import { useEffect } from 'react';
import { getUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useTimerStore } from '@/stores/useTimerStore';
import { useUserStore } from '@/stores/useUserStore';
import type { InputMode } from '../types';
import { getBreastFeedStartTime } from '../utils';

type UseInitializeFeedFormOptions = {
  method: FeedMethod;
  isTimerHydrated: boolean;
  setInputMode: (mode: InputMode) => void;
  setStartTime: (time: Date) => void;
  setEndTime: (time: Date) => void;
  setHandMode: (mode: 'left' | 'right') => void;
};

export function useInitializeFeedForm({
  method,
  isTimerHydrated,
  setInputMode,
  setStartTime,
  setEndTime,
  setHandMode,
}: UseInitializeFeedFormOptions) {
  const user = useUserStore(s => s.user);
  const hydrateTimer = useTimerStore(s => s.hydrate);

  // Hydrate timer store when user is available
  useEffect(() => {
    if (user?.localId && !isTimerHydrated) {
      hydrateTimer(user.localId);
    }
  }, [user?.localId, isTimerHydrated, hydrateTimer]);

  // When method changes, adjust input mode and times
  useEffect(() => {
    if (method === 'breast') {
      // Breast feeding: use timer by default
      setInputMode('timer');

      const twentyMinutesAgo = getBreastFeedStartTime();
      setStartTime(twentyMinutesAgo);

      // Set end time to now (5 minutes after the 20 minutes ago start)
      const now = new Date();
      setEndTime(now);
    } else {
      // Bottle feeding: always use manual entry
      setInputMode('manual');
      setStartTime(new Date());
    }
  }, [method, setInputMode, setStartTime, setEndTime]);

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
