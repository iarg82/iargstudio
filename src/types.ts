export type AppTab = 'text-to-video' | 'photo-to-video' | 'merge-studio';

export type AspectRatio = '16:9' | '9:16' | '1:1';

export type TransitionType = 
  | 'none'
  | 'crossfade'
  | 'fade-black'
  | 'fade-white'
  | 'slide-left'
  | 'wipe-right'
  | 'zoom-in'
  | 'glitch';

export type CameraMotion = 
  | 'dolly-in'
  | 'orbit-pan'
  | 'ken-burns'
  | 'crane-tilt'
  | 'vortex-zoom'
  | 'action-pulse';

export type AtmosphereEffect = 
  | 'none'
  | 'dust-particles'
  | 'golden-embers'
  | 'light-leaks'
  | 'rain-mist'
  | 'bokeh-sparks';

export interface VideoClip {
  id: string;
  title: string;
  sourceUrl: string;
  thumbnailUrl?: string;
  duration: number; // total duration in seconds
  trimStart: number; // start offset in seconds
  trimEnd: number; // end timestamp in seconds
  volume: number; // 0 to 1
  transition: TransitionType; // transition TO this clip
  transitionDuration: number; // in seconds (default ~0.8s)
  aspectRatio?: AspectRatio;
  generatedBy?: 'text' | 'photo' | 'upload' | 'sample';
}

export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  position: 'top' | 'center' | 'bottom';
  fontSize: number; // px
  color: string;
  bgColor: string;
  animation: 'none' | 'fade' | 'slide-up';
}

export interface AudioTrackOption {
  id: string;
  name: string;
  category: 'cinematic' | 'synthwave' | 'lofi' | 'epic' | 'custom';
  duration: number;
  url?: string;
  isProcedural?: boolean;
}

export interface VideoGenerationJob {
  id: string;
  mode: 'text-to-video' | 'photo-to-video';
  prompt: string;
  imageUrl?: string;
  status: 'idle' | 'enhancing' | 'rendering' | 'polling' | 'completed' | 'error';
  progress: number; // 0 - 100
  statusMessage: string;
  operationName?: string;
  videoUrl?: string;
  blob?: Blob;
  aspectRatio: AspectRatio;
  model: string;
  createdAt: number;
  error?: string;
}
