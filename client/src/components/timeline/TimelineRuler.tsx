'use client';

import { useTimelineStore } from '@/stores/timeline-store';
import { useProjectStore } from '@/stores/project-store';

export default function TimelineRuler() {
  const { zoom, msToPixels, setPlayheadTime } = useTimelineStore();
  const duration = useProjectStore((s) => s.project.duration);

  const totalWidth = msToPixels(duration);
  const interval = zoom > 2 ? 500 : zoom > 0.5 ? 1000 : 5000;
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += interval) {
    ticks.push(t);
  }

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ms = useTimelineStore.getState().pixelsToMs(x);
    setPlayheadTime(Math.max(0, Math.min(duration, ms)));
  };

  return (
    <div
      className="h-7 bg-bg-card border-b border-border relative cursor-pointer select-none"
      style={{ width: totalWidth }}
      onClick={handleClick}
    >
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute top-0 h-full flex flex-col items-start"
          style={{ left: msToPixels(t) }}
        >
          <div className="w-px h-3 bg-border-hover" />
          <span className="text-[10px] text-text-dim ml-1 leading-none mt-0.5">
            {formatTime(t)}
          </span>
        </div>
      ))}
    </div>
  );
}
