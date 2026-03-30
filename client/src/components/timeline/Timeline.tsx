'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useTimelineStore } from '@/stores/timeline-store';
import TimelineRuler from './TimelineRuler';
import TimelineTrack from './TimelineTrack';
import Playhead from './Playhead';

export default function Timeline() {
  const project = useProjectStore((s) => s.project);
  const { addTrack } = useProjectStore();
  const {
    zoom,
    zoomIn,
    zoomOut,
    isPlaying,
    togglePlaying,
    playheadTime,
    setPlayheadTime,
    msToPixels,
  } = useTimelineStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animRef.current);
      return;
    }
    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      const newTime = playheadTime + delta;
      if (newTime >= project.duration) {
        setPlayheadTime(0);
        useTimelineStore.getState().setIsPlaying(false);
        return;
      }
      setPlayheadTime(newTime);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlaying();
      }
      if (e.ctrlKey && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) {
          useProjectStore.temporal.getState().redo();
        } else {
          useProjectStore.temporal.getState().undo();
        }
      }
      if (e.code === 'Delete') {
        const { selectedClipIds } = useTimelineStore.getState();
        const { project, removeClip } = useProjectStore.getState();
        selectedClipIds.forEach((clipId) => {
          project.tracks.forEach((track) => {
            if (track.clips.some((c) => c.id === clipId)) {
              removeClip(track.id, clipId);
            }
          });
        });
        useTimelineStore.getState().deselectAll();
      }
      if (e.code === 'Equal' || e.code === 'NumpadAdd') zoomIn();
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoomOut();
    },
    [togglePlaying, zoomIn, zoomOut]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const totalWidth = msToPixels(project.duration);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const frac = Math.floor((ms % 1000) / 10);
    return `${m}:${String(sec).padStart(2, '0')}.${String(frac).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col bg-bg-card border-t border-border h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-bg-card">
        <button
          onClick={togglePlaying}
          className="px-3 py-1 bg-bg-hover rounded text-sm font-medium text-white hover:bg-border-hover"
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <span className="text-xs text-text-muted font-mono">{formatTime(playheadTime)}</span>
        <div className="flex-1" />
        <button onClick={zoomOut} className="px-2 py-1 bg-bg-hover rounded text-sm text-text-muted hover:text-white">
          −
        </button>
        <span className="text-xs text-text-dim w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={zoomIn} className="px-2 py-1 bg-bg-hover rounded text-sm text-text-muted hover:text-white">
          +
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={() => addTrack('image')}
          className="px-2 py-1 bg-bg-hover rounded text-xs text-text-muted hover:text-white"
        >
          + Image
        </button>
        <button
          onClick={() => addTrack('text')}
          className="px-2 py-1 bg-bg-hover rounded text-xs text-text-muted hover:text-white"
        >
          + Text
        </button>
        <button
          onClick={() => addTrack('audio')}
          className="px-2 py-1 bg-bg-hover rounded text-xs text-text-muted hover:text-white"
        >
          + Audio
        </button>
      </div>

      {/* Scrollable tracks area */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative">
        {/* Ruler */}
        <div className="flex">
          <div className="w-44 min-w-[176px] bg-bg-card border-r border-b border-border shrink-0" />
          <TimelineRuler />
        </div>

        {/* Tracks */}
        <div className="relative">
          <Playhead />
          {project.tracks.length === 0 ? (
            <div className="py-12 text-center text-text-dim text-sm">
              No tracks yet. Add a track or capture a website to get started.
            </div>
          ) : (
            project.tracks.map((track) => <TimelineTrack key={track.id} track={track} />)
          )}
        </div>
      </div>
    </div>
  );
}
