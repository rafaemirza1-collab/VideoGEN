export interface Project {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  fps: number;
  duration: number;
  tracks: Track[];
  brandKit?: BrandKit;
  createdAt: string;
  updatedAt: string;
}

export type AspectRatio = '9:16' | '1:1' | '16:9';
export type Resolution = '720p' | '1080p' | '4k';

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  locked: boolean;
  visible: boolean;
  clips: Clip[];
}

export type TrackType = 'video' | 'image' | 'text' | 'audio';

export interface Clip {
  id: string;
  trackId: string;
  type: ClipType;
  startTime: number;
  duration: number;
  source: string;
  properties: ClipProperties;
}

export type ClipType = 'image' | 'video' | 'text' | 'audio' | 'website-capture';

export interface ClipProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  text?: TextProperties;
  animation?: AnimationProperties;
}

export interface TextProperties {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  backgroundColor: string;
  alignment: 'left' | 'center' | 'right';
  lineHeight: number;
}

export interface AnimationProperties {
  entrance: 'none' | 'fade-in' | 'slide-up' | 'slide-left' | 'scale-in' | 'typewriter';
  exit: 'none' | 'fade-out' | 'slide-down' | 'slide-right' | 'scale-out';
  entranceDuration: number;
  exitDuration: number;
}

export interface BrandKit {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
}

export const ASPECT_RATIOS: Record<AspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

export const RESOLUTIONS: Record<Resolution, number> = {
  '720p': 720,
  '1080p': 1080,
  '4k': 2160,
};
