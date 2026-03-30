'use client';

import { useProjectStore } from '@/stores/project-store';
import { useTimelineStore } from '@/stores/timeline-store';
import type { Clip } from '@/lib/types';

export default function PropertiesPanel() {
  const project = useProjectStore((s) => s.project);
  const { setAspectRatio, setDuration, setName, updateClipProperties } = useProjectStore();
  const selectedClipIds = useTimelineStore((s) => s.selectedClipIds);

  // Find selected clip
  let selectedClip: Clip | null = null;
  let selectedTrackId: string | null = null;
  if (selectedClipIds.length === 1) {
    for (const track of project.tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipIds[0]);
      if (clip) {
        selectedClip = clip;
        selectedTrackId = track.id;
        break;
      }
    }
  }

  return (
    <div className="w-64 bg-bg-card border-l border-border overflow-y-auto">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
          Project
        </h3>
        <input
          type="text"
          value={project.name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-white focus:outline-none focus:border-border-focus mb-2"
        />
        <label className="text-xs text-text-dim block mb-1">Aspect Ratio</label>
        <select
          value={project.aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value as any)}
          className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-white focus:outline-none focus:border-border-focus mb-2"
        >
          <option value="9:16">9:16 Vertical (Reels)</option>
          <option value="1:1">1:1 Square</option>
          <option value="16:9">16:9 Landscape</option>
        </select>
        <label className="text-xs text-text-dim block mb-1">Duration (seconds)</label>
        <input
          type="number"
          value={project.duration / 1000}
          onChange={(e) => setDuration(Number(e.target.value) * 1000)}
          min={5}
          max={120}
          className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-white focus:outline-none focus:border-border-focus"
        />
      </div>

      {selectedClip && selectedTrackId ? (
        <div className="p-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
            Clip Properties
          </h3>
          <label className="text-xs text-text-dim block mb-1">Opacity</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={selectedClip.properties.opacity}
            onChange={(e) =>
              updateClipProperties(selectedTrackId!, selectedClip!.id, {
                opacity: Number(e.target.value),
              })
            }
            className="w-full mb-2"
          />
          <label className="text-xs text-text-dim block mb-1">Start (ms)</label>
          <input
            type="number"
            value={Math.round(selectedClip.startTime)}
            readOnly
            className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-text-muted mb-2"
          />
          <label className="text-xs text-text-dim block mb-1">Duration (ms)</label>
          <input
            type="number"
            value={Math.round(selectedClip.duration)}
            readOnly
            className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-text-muted mb-2"
          />

          {selectedClip.type === 'text' && selectedClip.properties.text && (
            <>
              <label className="text-xs text-text-dim block mb-1 mt-3">Text Content</label>
              <textarea
                value={selectedClip.properties.text.content}
                onChange={(e) =>
                  updateClipProperties(selectedTrackId!, selectedClip!.id, {
                    text: { ...selectedClip!.properties.text!, content: e.target.value },
                  })
                }
                rows={3}
                className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-white resize-none focus:outline-none focus:border-border-focus mb-2"
              />
              <label className="text-xs text-text-dim block mb-1">Font Size</label>
              <input
                type="number"
                value={selectedClip.properties.text.fontSize}
                onChange={(e) =>
                  updateClipProperties(selectedTrackId!, selectedClip!.id, {
                    text: { ...selectedClip!.properties.text!, fontSize: Number(e.target.value) },
                  })
                }
                min={8}
                max={200}
                className="w-full px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-white focus:outline-none focus:border-border-focus mb-2"
              />
              <label className="text-xs text-text-dim block mb-1">Color</label>
              <input
                type="color"
                value={selectedClip.properties.text.color}
                onChange={(e) =>
                  updateClipProperties(selectedTrackId!, selectedClip!.id, {
                    text: { ...selectedClip!.properties.text!, color: e.target.value },
                  })
                }
                className="w-full h-8 bg-bg-input border border-border rounded cursor-pointer"
              />
            </>
          )}
        </div>
      ) : (
        <div className="p-3 text-text-dim text-xs text-center mt-4">
          Select a clip to edit its properties
        </div>
      )}
    </div>
  );
}
