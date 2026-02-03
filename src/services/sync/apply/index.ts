/**
 * Apply Changes Index
 *
 * Dispatches sync changes to appropriate entity handlers.
 */

import type { SyncChange } from '../types';
import { applyBabyChange } from './baby';
import { applyFeedLogChange } from './feed-log';
import { applyFoodTypeChange } from './food-types';
import { applyNappyLogChange } from './nappy-log';
import { applySleepLogChange } from './sleep-log';
import { applySolidsLogChange } from './solids-log';

export { applyBabyChange } from './baby';
export { applyFeedLogChange } from './feed-log';
export { applyFoodTypeChange, applyFoodTypeSync } from './food-types';
export { applyNappyLogChange } from './nappy-log';
export { applySleepLogChange } from './sleep-log';
export { applySolidsLogChange } from './solids-log';

/**
 * Apply a change from the server to the local database
 */
export async function applyChange(change: SyncChange): Promise<void> {
  const { type, op, id, data } = change;

  switch (type) {
    case 'baby':
      await applyBabyChange(op, id, data);
      break;
    case 'feed_log':
      await applyFeedLogChange(op, id, data);
      break;
    case 'food_type':
      await applyFoodTypeChange(op, String(id), data);
      break;
    case 'sleep_log':
      await applySleepLogChange(op, id, data);
      break;
    case 'nappy_log':
      await applyNappyLogChange(op, id, data);
      break;
    case 'solids_log':
      await applySolidsLogChange(op, id, data);
      break;
    default:
      console.warn(`Unknown entity type: ${type}`);
  }
}
