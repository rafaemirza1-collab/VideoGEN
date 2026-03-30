'use client';

import { useProjectStore } from '@/stores/project-store';
import { useTimelineStore } from '@/stores/timeline-store';
import { ASPECT_RATIOS } from '@/lib/types';

export default function PreviewCanvas() {
  const project = useProjectStore((s) => s.project);
  const playheadTime = useTimelineStore((s) => s.playheadTime);
  const { width: nativeW, height: nativeH } = ASPECT_RATIOS[project.aspectRatio];
  const aspect = nativeW / nativeH;

  // Find all visible clips at current playhead time
  const visibleClips = project.tracks
    .filter((t) => t.visible)
    .flatMap((t) =>
      t.clips.filter(
        (c) => playheadTime >= c.startTime && playheadTime < c.startTime + c.duration
      )
    );

  return (
    <div className="flex-1 flex items-center justify-center bg-bg p-4 overflow-hidden">
      <div
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
        style={{
          aspectRatio: `${nativeW}/${nativeH}`,
          maxWidth: aspect > 1 ? '100%' : `${aspect * 100}%`,
          maxHeight: '100%',
          width: aspect >= 1 ? '100%' : 'auto',
          height: aspect < 1 ? '100%' : 'auto',
        }}
      >
        {visibleClips.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-text-dim text-sm">
            No content at current time
          </div>
        )}

        {visibleClips.map((clip) => {
          if (clip.type === 'image' || clip.type === 'website-capture') {
            return (
              <img
                key={clip.id}
                src={`/output/${clip.source.replace(/\\/g, '/')}`}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
                style={{ opacity: clip.properties.opacity }}
              />
            );
          }

          if (clip.type === 'text' && clip.properties.text) {
            const t = clip.properties.text;
            return (
              <div
                key={clip.id}
                className="absolute flex items-center justify-center"
                style={{
                  left: `${clip.properties.x}%`,
                  top: `${clip.properties.y}%`,
                  width: `${clip.properties.width}%`,
                  height: `${clip.properties.height}%`,
                  opacity: clip.properties.opacity,
                  transform: `rotate(${clip.properties.rotation}deg)`,
                }}
              >
                <span
                  style={{
                    fontFamily: t.fontFamily,
                    fontSize: `${t.fontSize}px`,
                    fontWeight: t.fontWeight,
                    color: t.color,
                    backgroundColor: t.backgroundColor || 'transparent',
                    textAlign: t.alignment,
                    lineHeight: t.lineHeight,
                  }}
                >
                  {t.content}
                </span>
              </div>
            );
          }

          return null;
        })}

        {/* Aspect ratio badge */}
        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
          {project.aspectRatio}
        </div>
      </div>
    </div>
  );
}
