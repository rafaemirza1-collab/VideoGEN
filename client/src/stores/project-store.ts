'use client';

import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Project, Track, Clip, AspectRatio, Resolution, ClipProperties } from '@/lib/types';
import { nanoid } from 'nanoid';

interface ProjectState {
  project: Project;
  setProject: (project: Project) => void;
  setName: (name: string) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setResolution: (res: Resolution) => void;
  setDuration: (ms: number) => void;
  addTrack: (type: Track['type'], name?: string) => string;
  removeTrack: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  addClip: (trackId: string, clip: Omit<Clip, 'id' | 'trackId'>) => string;
  removeClip: (trackId: string, clipId: string) => void;
  moveClip: (trackId: string, clipId: string, newStartTime: number) => void;
  resizeClip: (trackId: string, clipId: string, newDuration: number) => void;
  updateClipProperties: (trackId: string, clipId: string, props: Partial<ClipProperties>) => void;
  moveClipToTrack: (fromTrackId: string, toTrackId: string, clipId: string) => void;
}

const defaultProject: Project = {
  id: '',
  name: 'Untitled Project',
  aspectRatio: '9:16',
  resolution: '1080p',
  fps: 30,
  duration: 30000,
  tracks: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useProjectStore = create<ProjectState>()(
  temporal(
    (set) => ({
      project: defaultProject,

      setProject: (project) => set({ project }),

      setName: (name) =>
        set((s) => ({ project: { ...s.project, name, updatedAt: new Date().toISOString() } })),

      setAspectRatio: (aspectRatio) =>
        set((s) => ({ project: { ...s.project, aspectRatio, updatedAt: new Date().toISOString() } })),

      setResolution: (resolution) =>
        set((s) => ({ project: { ...s.project, resolution, updatedAt: new Date().toISOString() } })),

      setDuration: (duration) =>
        set((s) => ({ project: { ...s.project, duration, updatedAt: new Date().toISOString() } })),

      addTrack: (type, name) => {
        const id = nanoid(8);
        set((s) => ({
          project: {
            ...s.project,
            tracks: [
              ...s.project.tracks,
              {
                id,
                name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${s.project.tracks.length + 1}`,
                type,
                locked: false,
                visible: true,
                clips: [],
              },
            ],
            updatedAt: new Date().toISOString(),
          },
        }));
        return id;
      },

      removeTrack: (trackId) =>
        set((s) => ({
          project: {
            ...s.project,
            tracks: s.project.tracks.filter((t) => t.id !== trackId),
            updatedAt: new Date().toISOString(),
          },
        })),

      toggleTrackVisibility: (trackId) =>
        set((s) => ({
          project: {
            ...s.project,
            tracks: s.project.tracks.map((t) =>
              t.id === trackId ? { ...t, visible: !t.visible } : t
            ),
          },
        })),

      toggleTrackLock: (trackId) =>
        set((s) => ({
          project: {
            ...s.project,
            tracks: s.project.tracks.map((t) =>
              t.id === trackId ? { ...t, locked: !t.locked } : t
            ),
          },
        })),

      addClip: (trackId, clipData) => {
        const id = nanoid(8);
        set((s) => ({
          project: {
            ...s.project,
            tracks: s.project.tracks.map((t) =>
              t.id === trackId
                ? { ...t, clips: [...t.clips, { ...clipData, id, trackId }] }
                : t
            ),
            updatedAt: new Date().toISOString(),
          },
        }));
        return id;
      },

      removeClip: (trackId, clipId) =>
        set((s) => ({
          project: {
            ...s.project,
            tracks: s.project.tracks.map((t) =>
              t.id === trackId
                ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
                : t
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      moveClip: (trackId, clipId, newStartTime) =>
        set((s) => ({
          project: {
            ...s.project,
            tracks: s.project.tracks.map((t) =>
              t.id === trackId
                ? {
                    ...t,
                    clips: t.clips.map((c) =>
                      c.id === clipId ? { ...c, startTime: Math.max(0, newStartTime) } : c
                    ),
                  }
                : t
            ),
          },
        })),

      resizeClip: (trackId, clipId, newDuration) =>
        set((s) => ({
          project: {
            ...s.project,
            tracks: s.project.tracks.map((t) =>
              t.id === trackId
                ? {
                    ...t,
                    clips: t.clips.map((c) =>
                      c.id === clipId ? { ...c, duration: Math.max(100, newDuration) } : c
                    ),
                  }
                : t
            ),
          },
        })),

      updateClipProperties: (trackId, clipId, props) =>
        set((s) => ({
          project: {
            ...s.project,
            tracks: s.project.tracks.map((t) =>
              t.id === trackId
                ? {
                    ...t,
                    clips: t.clips.map((c) =>
                      c.id === clipId ? { ...c, properties: { ...c.properties, ...props } } : c
                    ),
                  }
                : t
            ),
          },
        })),

      moveClipToTrack: (fromTrackId, toTrackId, clipId) =>
        set((s) => {
          let clip: Clip | undefined;
          const tracks = s.project.tracks.map((t) => {
            if (t.id === fromTrackId) {
              clip = t.clips.find((c) => c.id === clipId);
              return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
            }
            return t;
          });
          if (!clip) return s;
          return {
            project: {
              ...s.project,
              tracks: tracks.map((t) =>
                t.id === toTrackId
                  ? { ...t, clips: [...t.clips, { ...clip!, trackId: toTrackId }] }
                  : t
              ),
              updatedAt: new Date().toISOString(),
            },
          };
        }),
    }),
    { limit: 50 }
  )
);
