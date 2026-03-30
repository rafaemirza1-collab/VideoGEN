'use client';

import { create } from 'zustand';

interface TimelineState {
  zoom: number;
  scrollX: number;
  playheadTime: number;
  isPlaying: boolean;
  selectedClipIds: string[];
  snapEnabled: boolean;
  gridSize: number;

  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setScrollX: (x: number) => void;
  setPlayheadTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  selectClip: (clipId: string, multi?: boolean) => void;
  deselectAll: () => void;
  setSnapEnabled: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  msToPixels: (ms: number) => number;
  pixelsToMs: (px: number) => number;
}

const PX_PER_MS_BASE = 0.1;

export const useTimelineStore = create<TimelineState>()((set, get) => ({
  zoom: 1,
  scrollX: 0,
  playheadTime: 0,
  isPlaying: false,
  selectedClipIds: [],
  snapEnabled: true,
  gridSize: 500,

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(5, s.zoom * 1.2) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.1, s.zoom / 1.2) })),
  setScrollX: (scrollX) => set({ scrollX: Math.max(0, scrollX) }),
  setPlayheadTime: (playheadTime) => set({ playheadTime: Math.max(0, playheadTime) }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlaying: () => set((s) => ({ isPlaying: !s.isPlaying })),

  selectClip: (clipId, multi = false) =>
    set((s) => ({
      selectedClipIds: multi
        ? s.selectedClipIds.includes(clipId)
          ? s.selectedClipIds.filter((id) => id !== clipId)
          : [...s.selectedClipIds, clipId]
        : [clipId],
    })),

  deselectAll: () => set({ selectedClipIds: [] }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setGridSize: (gridSize) => set({ gridSize }),

  msToPixels: (ms) => ms * PX_PER_MS_BASE * get().zoom,
  pixelsToMs: (px) => px / (PX_PER_MS_BASE * get().zoom),
}));
