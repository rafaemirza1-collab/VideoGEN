'use client';

import { useState, useRef } from 'react';
import { useTimelineStore } from '@/stores/timeline-store';
import { useProjectStore } from '@/stores/project-store';
import type { Clip, TrackType } from '@/lib/types';

const CLIP_COLORS: Record<string, string> = {
  image: 'bg-timeline-image',
  video: 'bg-timeline-clip',
  text: 'bg-timeline-text',
  audio: 'bg-timeline-audio',
  'website-capture': 'bg-timeline-clip',
};

interface TimelineClipProps {
  clip: Clip;
  trackType: TrackType;
}

export default function TimelineClip({ clip, trackType }: TimelineClipProps) {
  const { msToPixels, pixelsToMs, selectedClipIds, selectClip, snapEnabled, gridSize } =
    useTimelineStore();
  const { moveClip, resizeClip } = useProjectStore();
  const isSelected = selectedClipIds.includes(clip.id);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startTime: number }>({ startX: 0, startTime: 0 });
  const resizeRef = useRef<{ startX: number; startDuration: number }>({ startX: 0, startDuration: 0 });

  const left = msToPixels(clip.startTime);
  const width = Math.max(msToPixels(clip.duration), 20);
  const colorClass = CLIP_COLORS[clip.type] || 'bg-timeline-clip';

  const snapTime = (ms: number) => {
    if (!snapEnabled) return ms;
    return Math.round(ms / gridSize) * gridSize;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectClip(clip.id, e.shiftKey);
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startTime: clip.startTime };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragRef.current.startX;
      const dMs = pixelsToMs(dx);
      const newTime = snapTime(dragRef.current.startTime + dMs);
      moveClip(clip.trackId, clip.id, newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = { startX: e.clientX, startDuration: clip.duration };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeRef.current.startX;
      const dMs = pixelsToMs(dx);
      const newDuration = snapTime(resizeRef.current.startDuration + dMs);
      resizeClip(clip.trackId, clip.id, newDuration);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const label =
    clip.type === 'text'
      ? clip.properties.text?.content?.slice(0, 20) || 'Text'
      : clip.source?.split('/').pop() || clip.type;

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-md flex items-center overflow-hidden cursor-grab select-none
        ${colorClass} ${isSelected ? 'ring-2 ring-white' : ''}
        ${isDragging ? 'opacity-80 cursor-grabbing' : ''}`}
      style={{ left, width }}
      onMouseDown={handleMouseDown}
    >
      <span className="text-[11px] text-white font-medium px-2 truncate pointer-events-none">
        {label}
      </span>
      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/20"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}
