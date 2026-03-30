'use client';

import { useTimelineStore } from '@/stores/timeline-store';

export default function Playhead() {
  const { playheadTime, msToPixels } = useTimelineStore();
  const left = msToPixels(playheadTime);

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-timeline-playhead z-20 pointer-events-none"
      style={{ left: left + 176 }}
    >
      <div className="w-3 h-3 bg-timeline-playhead rounded-full -ml-[5px] -mt-1" />
    </div>
  );
}
