'use client';

import { useProjectStore } from '@/stores/project-store';
import { useTimelineStore } from '@/stores/timeline-store';
import TimelineClip from './TimelineClip';
import type { Track } from '@/lib/types';

const TRACK_ICONS: Record<string, string> = {
  video: '🎬',
  image: '🖼',
  text: '✏️',
  audio: '🔊',
};

interface TimelineTrackProps {
  track: Track;
}

export default function TimelineTrack({ track }: TimelineTrackProps) {
  const { toggleTrackVisibility, toggleTrackLock, removeTrack } = useProjectStore();
  const { msToPixels, deselectAll } = useTimelineStore();
  const duration = useProjectStore((s) => s.project.duration);

  const totalWidth = msToPixels(duration);

  return (
    <div className="flex border-b border-border">
      {/* Track header */}
      <div className="w-44 min-w-[176px] bg-bg-card border-r border-border p-2 flex items-center gap-2 shrink-0">
        <span className="text-sm">{TRACK_ICONS[track.type] || '📁'}</span>
        <span className="text-xs text-text-muted font-medium truncate flex-1">{track.name}</span>
        <button
          onClick={() => toggleTrackVisibility(track.id)}
          className={`text-xs px-1 rounded ${track.visible ? 'text-text-muted' : 'text-error'}`}
          title={track.visible ? 'Hide' : 'Show'}
        >
          {track.visible ? '👁' : '🚫'}
        </button>
        <button
          onClick={() => toggleTrackLock(track.id)}
          className={`text-xs px-1 rounded ${track.locked ? 'text-warning' : 'text-text-dim'}`}
          title={track.locked ? 'Unlock' : 'Lock'}
        >
          {track.locked ? '🔒' : '🔓'}
        </button>
      </div>

      {/* Track clips area */}
      <div
        className="relative h-12 bg-bg/50"
        style={{ width: totalWidth }}
        onClick={() => deselectAll()}
      >
        {track.clips.map((clip) => (
          <TimelineClip key={clip.id} clip={clip} trackType={track.type} />
        ))}
      </div>
    </div>
  );
}
