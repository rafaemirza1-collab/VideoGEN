'use client';

import { useProjectStore } from '@/stores/project-store';
import { useTimelineStore } from '@/stores/timeline-store';
import { ASPECT_RATIOS } from '@/lib/types';
import type { Clip, AnimationProperties } from '@/lib/types';

function getAnimationStyle(clip: Clip, playheadTime: number): React.CSSProperties {
  const anim = clip.properties.animation;
  if (!anim) return {};

  const elapsed = playheadTime - clip.startTime;
  const remaining = clip.duration - elapsed;
  const style: React.CSSProperties = {};

  // Entrance
  if (anim.entrance !== 'none' && elapsed < anim.entranceDuration) {
    const progress = elapsed / anim.entranceDuration;
    switch (anim.entrance) {
      case 'fade-in':
        style.opacity = progress;
        break;
      case 'slide-up':
        style.transform = `translateY(${(1 - progress) * 30}px)`;
        style.opacity = progress;
        break;
      case 'slide-left':
        style.transform = `translateX(${(1 - progress) * -30}px)`;
        style.opacity = progress;
        break;
      case 'scale-in':
        style.transform = `scale(${0.5 + progress * 0.5})`;
        style.opacity = progress;
        break;
      case 'typewriter':
        // Handled in text rendering
        break;
    }
  }

  // Exit
  if (anim.exit !== 'none' && remaining < anim.exitDuration) {
    const progress = remaining / anim.exitDuration;
    switch (anim.exit) {
      case 'fade-out':
        style.opacity = progress;
        break;
      case 'slide-down':
        style.transform = `translateY(${(1 - progress) * 30}px)`;
        style.opacity = progress;
        break;
      case 'slide-right':
        style.transform = `translateX(${(1 - progress) * 30}px)`;
        style.opacity = progress;
        break;
      case 'scale-out':
        style.transform = `scale(${progress})`;
        style.opacity = progress;
        break;
    }
  }

  return style;
}

function getTypewriterText(content: string, clip: Clip, playheadTime: number): string {
  const anim = clip.properties.animation;
  if (!anim || anim.entrance !== 'typewriter') return content;
  const elapsed = playheadTime - clip.startTime;
  if (elapsed >= anim.entranceDuration) return content;
  const progress = elapsed / anim.entranceDuration;
  const chars = Math.floor(progress * content.length);
  return content.slice(0, chars);
}

export default function PreviewCanvas() {
  const project = useProjectStore((s) => s.project);
  const playheadTime = useTimelineStore((s) => s.playheadTime);
  const { width: nativeW, height: nativeH } = ASPECT_RATIOS[project.aspectRatio];
  const aspect = nativeW / nativeH;

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
          const animStyle = getAnimationStyle(clip, playheadTime);

          if (clip.type === 'image' || clip.type === 'website-capture') {
            const src = clip.source.startsWith('../uploads')
              ? clip.source.replace('..', '')
              : `/output/${clip.source.replace(/\\/g, '/')}`;
            return (
              <img
                key={clip.id}
                src={src}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
                style={{ opacity: clip.properties.opacity, ...animStyle }}
              />
            );
          }

          if (clip.type === 'text' && clip.properties.text) {
            const t = clip.properties.text;
            const displayText = getTypewriterText(t.content, clip, playheadTime);
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
                  ...animStyle,
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
                    padding: t.backgroundColor ? '4px 12px' : undefined,
                    borderRadius: t.backgroundColor ? '4px' : undefined,
                  }}
                >
                  {displayText}
                </span>
              </div>
            );
          }

          if (clip.type === 'audio') {
            return null; // Audio doesn't render visually
          }

          return null;
        })}

        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
          {project.aspectRatio}
        </div>
      </div>
    </div>
  );
}
