import { VideoClip, TextOverlay, AspectRatio, TransitionType } from '../types';
import { generateSoundtrackBuffer } from './audioSynth';

export interface RenderProgress {
  currentClipIndex: number;
  totalClips: number;
  percent: number;
  currentTime: number;
  totalTime: number;
  status: string;
}

export class VideoMergerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElements: Map<string, HTMLVideoElement> = new Map();
  private isCancelled: boolean = false;
  private isPreviewPlaying: boolean = false;
  private previewAnimId: number | null = null;
  private previewStartTime: number = 0;
  private audioCtx: AudioContext | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;
  }

  public setDimensions(aspectRatio: AspectRatio) {
    if (aspectRatio === '9:16') {
      this.canvas.width = 720;
      this.canvas.height = 1280;
    } else if (aspectRatio === '1:1') {
      this.canvas.width = 1080;
      this.canvas.height = 1080;
    } else {
      // 16:9
      this.canvas.width = 1280;
      this.canvas.height = 720;
    }
  }

  public async preloadClips(clips: VideoClip[]): Promise<void> {
    for (const clip of clips) {
      if (this.videoElements.has(clip.id)) continue;

      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.muted = true; // prevent browser autoplay block
      video.playsInline = true;

      await new Promise<void>((resolve) => {
        let isResolved = false;
        video.onloadedmetadata = () => {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        };
        video.onerror = () => {
          console.warn(`Video load error for clip ${clip.id}, retrying without crossOrigin`);
          video.removeAttribute('crossorigin');
          video.src = clip.sourceUrl;
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        };
        video.src = clip.sourceUrl;
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        }, 3000); // 3s timeout per clip metadata
      });

      this.videoElements.set(clip.id, video);
    }
  }

  public calculateTotalDuration(clips: VideoClip[]): number {
    return clips.reduce((acc, clip) => {
      const clipDur = Math.max(0.5, clip.trimEnd - clip.trimStart);
      return acc + clipDur;
    }, 0);
  }

  /**
   * Draw a video frame onto canvas with proper scaling (letterboxing/pillarboxing)
   */
  public drawVideoFit(
    video: HTMLVideoElement,
    opacity: number = 1,
    offsetX: number = 0,
    offsetY: number = 0,
    scale: number = 1
  ) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

    if (offsetX !== 0 || offsetY !== 0 || scale !== 1) {
      ctx.translate(cw / 2 + offsetX, ch / 2 + offsetY);
      ctx.scale(scale, scale);
      ctx.translate(-cw / 2, -ch / 2);
    }

    const vw = video.videoWidth || cw;
    const vh = video.videoHeight || ch;
    const videoRatio = vw / vh;
    const canvasRatio = cw / ch;

    let drawW = cw;
    let drawH = ch;
    let dx = 0;
    let dy = 0;

    // Center contain
    if (videoRatio > canvasRatio) {
      drawW = cw;
      drawH = cw / videoRatio;
      dy = (ch - drawH) / 2;
    } else {
      drawH = ch;
      drawW = ch * videoRatio;
      dx = (cw - drawW) / 2;
    }

    try {
      ctx.drawImage(video, dx, dy, drawW, drawH);
    } catch (e) {
      // In case video is not ready
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, cw, ch);
    }

    ctx.restore();
  }

  /**
   * Render transition blend between previous clip and next clip
   */
  public renderTransition(
    prevVideo: HTMLVideoElement,
    nextVideo: HTMLVideoElement,
    transition: TransitionType,
    progress: number // 0 to 1
  ) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, cw, ch);

    switch (transition) {
      case 'crossfade':
        // Smooth dissolve
        this.drawVideoFit(prevVideo, 1 - progress);
        this.drawVideoFit(nextVideo, progress);
        break;

      case 'fade-black':
        // Dip to black at midpoint
        if (progress < 0.5) {
          const fadeOut = 1 - progress * 2;
          this.drawVideoFit(prevVideo, fadeOut);
          ctx.fillStyle = `rgba(0, 0, 0, ${1 - fadeOut})`;
          ctx.fillRect(0, 0, cw, ch);
        } else {
          const fadeIn = (progress - 0.5) * 2;
          this.drawVideoFit(nextVideo, fadeIn);
          ctx.fillStyle = `rgba(0, 0, 0, ${1 - fadeIn})`;
          ctx.fillRect(0, 0, cw, ch);
        }
        break;

      case 'fade-white':
        // Flash to white
        if (progress < 0.5) {
          this.drawVideoFit(prevVideo, 1);
          ctx.fillStyle = `rgba(255, 255, 255, ${progress * 2})`;
          ctx.fillRect(0, 0, cw, ch);
        } else {
          this.drawVideoFit(nextVideo, 1);
          ctx.fillStyle = `rgba(255, 255, 255, ${(1 - progress) * 2})`;
          ctx.fillRect(0, 0, cw, ch);
        }
        break;

      case 'slide-left':
        // Push left
        this.drawVideoFit(prevVideo, 1, -progress * cw, 0);
        this.drawVideoFit(nextVideo, 1, (1 - progress) * cw, 0);
        break;

      case 'wipe-right':
        // Horizontal wipe
        this.drawVideoFit(prevVideo, 1);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, progress * cw, ch);
        ctx.clip();
        this.drawVideoFit(nextVideo, 1);
        ctx.restore();

        // Wipe edge glowing line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(progress * cw - 2, 0, 4, ch);
        break;

      case 'zoom-in':
        // Zoom optical push
        this.drawVideoFit(prevVideo, 1 - progress, 0, 0, 1 + progress * 0.4);
        this.drawVideoFit(nextVideo, progress, 0, 0, 0.7 + progress * 0.3);
        break;

      case 'glitch':
        // Digital glitch displacement
        const isGlitch = Math.random() > 0.3;
        const offset = isGlitch ? (Math.random() - 0.5) * 40 : 0;
        if (progress < 0.5) {
          this.drawVideoFit(prevVideo, 1, offset, 0);
        } else {
          this.drawVideoFit(nextVideo, 1, -offset, 0);
        }
        // RGB split line
        ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.fillRect(0, Math.random() * ch, cw, 6);
        break;

      default:
        // Hard cut
        if (progress < 0.5) {
          this.drawVideoFit(prevVideo, 1);
        } else {
          this.drawVideoFit(nextVideo, 1);
        }
        break;
    }
  }

  /**
   * Draw text overlays at the current project timestamp
   */
  public drawOverlays(overlays: TextOverlay[], projectTime: number) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    for (const ov of overlays) {
      if (projectTime >= ov.startTime && projectTime <= ov.endTime) {
        const duration = ov.endTime - ov.startTime;
        const elapsed = projectTime - ov.startTime;
        let alpha = 1;
        let offsetY = 0;

        if (ov.animation === 'fade') {
          if (elapsed < 0.4) alpha = elapsed / 0.4;
          if (duration - elapsed < 0.4) alpha = (duration - elapsed) / 0.4;
        } else if (ov.animation === 'slide-up') {
          if (elapsed < 0.4) {
            const p = elapsed / 0.4;
            alpha = p;
            offsetY = (1 - p) * 20;
          }
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.font = `bold ${ov.fontSize}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const metrics = ctx.measureText(ov.text);
        const paddingX = 24;
        const paddingY = 12;
        const boxW = metrics.width + paddingX * 2;
        const boxH = ov.fontSize + paddingY * 2;

        let y = ch / 2;
        if (ov.position === 'top') y = ch * 0.15;
        if (ov.position === 'bottom') y = ch * 0.85;
        y += offsetY;

        // Background pill
        ctx.fillStyle = ov.bgColor || 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        const r = 8;
        ctx.roundRect(cw / 2 - boxW / 2, y - boxH / 2, boxW, boxH, r);
        ctx.fill();

        // Text
        ctx.fillStyle = ov.color || '#ffffff';
        ctx.fillText(ov.text, cw / 2, y);

        ctx.restore();
      }
    }
  }

  /**
   * Seek video element to timestamp reliably
   */
  private seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve) => {
      // If already close, avoid redundant seek
      if (Math.abs(video.currentTime - time) < 0.04) {
        resolve();
        return;
      }

      let resolved = false;
      const onSeeked = () => {
        if (!resolved) {
          resolved = true;
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }
      };

      video.addEventListener('seeked', onSeeked, { once: true });
      video.currentTime = Math.max(0, time);

      // Failsafe timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }
      }, 250);
    });
  }

  /**
   * Exports the entire sequence into a single merged video blob
   */
  public async exportMergedVideo(
    clips: VideoClip[],
    overlays: TextOverlay[],
    aspectRatio: AspectRatio,
    soundtrackPreset: string,
    onProgress: (p: RenderProgress) => void
  ): Promise<Blob> {
    this.isCancelled = false;
    this.setDimensions(aspectRatio);
    await this.preloadClips(clips);

    const totalDuration = this.calculateTotalDuration(clips);
    const fps = 30; // 30fps ensures fast and smooth export
    const totalFrames = Math.ceil(totalDuration * fps);

    // Audio setup
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const dest = audioCtx.createMediaStreamDestination();

    // Prepare procedural soundtrack if chosen
    if (soundtrackPreset && soundtrackPreset !== 'none') {
      try {
        const sndBuffer = await generateSoundtrackBuffer(audioCtx, soundtrackPreset, totalDuration);
        if (sndBuffer) {
          const sndSource = audioCtx.createBufferSource();
          sndSource.buffer = sndBuffer;
          sndSource.connect(dest);
          sndSource.start(0);
        }
      } catch (err) {
        console.warn('Audio generation failed, continuing video-only', err);
      }
    }

    // Combine video stream and audio destination stream
    const canvasStream = this.canvas.captureStream(fps);
    const tracks = [...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
    const combinedStream = new MediaStream(tracks);

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const recordedChunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 8000000, // 8 Mbps high bitrate
      });
    } catch (e) {
      recorder = new MediaRecorder(combinedStream);
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    const completionPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        try {
          audioCtx.close();
        } catch (_) {}
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        resolve(finalBlob);
      };
      recorder.onerror = (err) => reject(err);
    });

    recorder.start(100);

    // Frame-by-frame rendering timeline
    let currentClipIdx = 0;
    let clipStartProjectTime = 0;

    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.isCancelled) {
        recorder.stop();
        throw new Error('Export cancelled by user');
      }

      const projectTime = frame / fps;

      // Find current clip
      while (
        currentClipIdx < clips.length - 1 &&
        projectTime >= clipStartProjectTime + (clips[currentClipIdx].trimEnd - clips[currentClipIdx].trimStart)
      ) {
        clipStartProjectTime += clips[currentClipIdx].trimEnd - clips[currentClipIdx].trimStart;
        currentClipIdx++;
      }

      const currentClip = clips[currentClipIdx];
      const nextClip = clips[currentClipIdx + 1];
      const currentVideo = this.videoElements.get(currentClip.id);

      const timeInCurrentClip = projectTime - clipStartProjectTime;
      const currentClipDuration = currentClip.trimEnd - currentClip.trimStart;
      const timeRemainingInClip = currentClipDuration - timeInCurrentClip;

      // Check for transition to next clip
      const transitionDuration = nextClip ? Math.min(nextClip.transitionDuration, 1.5) : 0;
      const isInTransition = nextClip && nextClip.transition !== 'none' && timeRemainingInClip <= transitionDuration;

      if (isInTransition && currentVideo) {
        const nextVideo = this.videoElements.get(nextClip.id);
        const transProgress = 1 - timeRemainingInClip / transitionDuration;

        // Seek both
        const curSeek = currentClip.trimStart + timeInCurrentClip;
        const nextSeek = nextClip.trimStart + (transProgress * transitionDuration);

        await Promise.all([
          this.seekVideo(currentVideo, curSeek),
          nextVideo ? this.seekVideo(nextVideo, nextSeek) : Promise.resolve(),
        ]);

        if (nextVideo) {
          this.renderTransition(currentVideo, nextVideo, nextClip.transition, transProgress);
        } else {
          this.drawVideoFit(currentVideo, 1);
        }
      } else if (currentVideo) {
        const seekTime = currentClip.trimStart + timeInCurrentClip;
        await this.seekVideo(currentVideo, seekTime);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawVideoFit(currentVideo, 1);
      }

      // Render text overlays
      this.drawOverlays(overlays, projectTime);

      const percent = Math.min(100, Math.round((frame / totalFrames) * 100));
      onProgress({
        currentClipIndex: currentClipIdx + 1,
        totalClips: clips.length,
        percent,
        currentTime: projectTime,
        totalTime: totalDuration,
        status: `Rendering frame ${frame + 1}/${totalFrames} (${percent}%)`,
      });

      // Small tick to allow MediaRecorder frame capture
      await new Promise((r) => setTimeout(r, 1000 / fps));
    }

    recorder.stop();
    return await completionPromise;
  }

  public cancel() {
    this.isCancelled = true;
    this.stopPreview();
  }

  public stopPreview() {
    this.isPreviewPlaying = false;
    if (this.previewAnimId) {
      cancelAnimationFrame(this.previewAnimId);
      this.previewAnimId = null;
    }
  }

  /**
   * Real-time preview player for the merged timeline in the browser
   */
  public startPreview(
    clips: VideoClip[],
    overlays: TextOverlay[],
    onTimeUpdate: (time: number, total: number) => void
  ) {
    this.stopPreview();
    const totalDuration = this.calculateTotalDuration(clips);
    this.isPreviewPlaying = true;
    this.previewStartTime = performance.now();

    const loop = (timestamp: number) => {
      if (!this.isPreviewPlaying) return;

      const elapsed = (timestamp - this.previewStartTime) / 1000;
      const projectTime = elapsed % totalDuration;
      onTimeUpdate(projectTime, totalDuration);

      // Find active clip
      let clipStart = 0;
      let activeIdx = 0;
      for (let i = 0; i < clips.length; i++) {
        const dur = clips[i].trimEnd - clips[i].trimStart;
        if (projectTime < clipStart + dur || i === clips.length - 1) {
          activeIdx = i;
          break;
        }
        clipStart += dur;
      }

      const activeClip = clips[activeIdx];
      const video = this.videoElements.get(activeClip.id);
      if (video) {
        const timeInClip = projectTime - clipStart;
        video.currentTime = activeClip.trimStart + timeInClip;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawVideoFit(video, 1);
      }

      this.drawOverlays(overlays, projectTime);
      this.previewAnimId = requestAnimationFrame(loop);
    };

    this.previewAnimId = requestAnimationFrame(loop);
  }
}
