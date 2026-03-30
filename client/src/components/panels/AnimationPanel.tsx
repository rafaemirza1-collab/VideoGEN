'use client';

import { useProjectStore } from '@/stores/project-store';
import { useTimelineStore } from '@/stores/timeline-store';
import type { AnimationProperties } from '@/lib/types';

const ENTRANCES = [
  { value: 'none', label: 'None' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'scale-in', label: 'Scale In' },
  { value: 'typewriter', label: 'Typewriter' },
] as const;

const EXITS = [
  { value: 'none', label: 'None' },
  { value: 'fade-out', label: 'Fade Out' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'slide-right', label: 'Slide Right' },
  { value: 'scale-out', label: 'Scale Out' },
] as const;

export default function AnimationPanel() {
  const project = useProjectStore((s) => s.project);
  const { updateClipProperties } = useProjectStore();
  const selectedClipIds = useTimelineStore((s) => s.selectedClipIds);

  let clip: any = null;
  let trackId: string | null = null;
  if (selectedClipIds.length === 1) {
    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === selectedClipIds[0]);
      if (found) {
        clip = found;
        trackId = track.id;
        break;
      }
    }
  }

  if (!clip || !trackId) {
    return (
      <div className="p-3 text-text-dim text-xs text-center mt-4">
        Select a clip to edit animations
      </div>
    );
  }

  const anim: AnimationProperties = clip.properties.animation || {
    entrance: 'none',
    exit: 'none',
    entranceDuration: 500,
    exitDuration: 500,
  };

  const update = (changes: Partial<AnimationProperties>) => {
    updateClipProperties(trackId!, clip.id, {
      animation: { ...anim, ...changes },
    });
  };

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
        Animation
      </h3>

      <label className="text-xs text-text-dim block mb-1">Entrance</label>
      <div className="grid grid-cols-2 gap-1 mb-3">
        {ENTRANCES.map((e) => (
          <button
            key={e.value}
            onClick={() => update({ entrance: e.value as any })}
            className={`py-1.5 rounded text-[11px] font-medium border ${
              anim.entrance === e.value
                ? 'bg-timeline-text/20 border-timeline-text text-timeline-text'
                : 'border-border text-text-muted hover:border-border-hover'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {anim.entrance !== 'none' && (
        <>
          <label className="text-xs text-text-dim block mb-1">
            Entrance Duration: {anim.entranceDuration}ms
          </label>
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={anim.entranceDuration}
            onChange={(e) => update({ entranceDuration: Number(e.target.value) })}
            className="w-full mb-3"
          />
        </>
      )}

      <label className="text-xs text-text-dim block mb-1">Exit</label>
      <div className="grid grid-cols-2 gap-1 mb-3">
        {EXITS.map((e) => (
          <button
            key={e.value}
            onClick={() => update({ exit: e.value as any })}
            className={`py-1.5 rounded text-[11px] font-medium border ${
              anim.exit === e.value
                ? 'bg-timeline-text/20 border-timeline-text text-timeline-text'
                : 'border-border text-text-muted hover:border-border-hover'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {anim.exit !== 'none' && (
        <>
          <label className="text-xs text-text-dim block mb-1">
            Exit Duration: {anim.exitDuration}ms
          </label>
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={anim.exitDuration}
            onChange={(e) => update({ exitDuration: Number(e.target.value) })}
            className="w-full mb-3"
          />
        </>
      )}
    </div>
  );
}
