'use client';

import type { TimelineBlock } from './types';
import type { UnifiedLog } from '@/lib/format-log';
import { ActivityBlock } from './ActivityBlock';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';

export type DayColumnProps = {
  blocks: TimelineBlock[];
  /** Show labels inside blocks (true for today view, false for week) */
  showLabels: boolean;
  /** Currently selected log ID */
  selectedLogId?: string;
  /** Callback when a block is clicked */
  onBlockClick: (log: UnifiedLog) => void;
  /** Whether this column represents today (to show current time indicator) */
  isToday: boolean;
  /** Total height of the column */
  totalHeight: number;
  /** Height per hour (for current time indicator) */
  hourHeight: number;
  /** Optional class name */
  className?: string;
};

/**
 * Single day column containing positioned activity blocks
 */
export function DayColumn({
  blocks,
  showLabels,
  selectedLogId,
  onBlockClick,
  isToday,
  totalHeight,
  hourHeight,
  className,
}: DayColumnProps) {
  return (
    <div
      className={`relative flex-1 ${className ?? ''}`}
      style={{ height: totalHeight }}
    >
      {/* Current time indicator (only on today's column) */}
      {isToday && <CurrentTimeIndicator hourHeight={hourHeight} />}

      {/* Activity blocks - simple stacking, larger blocks wrap smaller ones */}
      {blocks.map(block => (
        <ActivityBlock
          key={block.log.id}
          log={block.log}
          top={block.top}
          height={block.height}
          showLabel={showLabels}
          isSelected={selectedLogId === block.log.id}
          onClick={() => onBlockClick(block.log)}
        />
      ))}
    </div>
  );
}
