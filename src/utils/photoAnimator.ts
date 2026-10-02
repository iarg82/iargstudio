import { CameraMotion, AtmosphereEffect } from '../types';

export interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
  color: string;
  twinkleSpeed: number;
}

export class PhotoAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  private animFrameId: number | null = null;
  private particles: Particle[] = [];
  private startTime: number = 0;
  private durationSec: number = 5;
  private motion: CameraMotion = 'dolly-in';
  private atmosphere: AtmosphereEffect = 'dust-particles';
  private isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
  }

  public async loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.image = img;
        this.initParticles();
        this.drawFrame(0);
        resolve();
      };
      img.onerror = () => {
        // Retry without crossOrigin if CORS fails
        const fallback = new Image();
        fallback.onload = () => {
          this.image = fallback;
          this.initParticles();
          this.drawFrame(0);
          resolve();
        };
        fallback.onerror = (err) => reject(err);
        fallback.src = src;
      };
      img.src = src;
    });
  }

  public setConfig(motion: CameraMotion, atmosphere: AtmosphereEffect, durationSec: number = 5) {
    this.motion = motion;
    this.atmosphere = atmosphere;
    this.durationSec = durationSec;
    this.initParticles();
  }

  private initParticles() {
    this.particles = [];
    const count = this.atmosphere === 'none' ? 0 : 45;
    for (let i = 0; i < count; i++) {
      let color = 'rgba(255, 255, 255, ';
      let size = Math.random() * 2.5 + 1;
      let speedY = (Math.random() - 0.5) * 0.4;
      let speedX = (Math.random() - 0.5) * 0.4;

      if (this.atmosphere === 'golden-embers') {
        color = 'rgba(255, 190, 70, ';
        size = Math.random() * 3 + 1.5;
        speedY = -Math.random() * 1.5 - 0.5; // rise upwards
        speedX = (Math.random() - 0.5) * 0.8;
      } else if (this.atmosphere === 'light-leaks') {
        color = 'rgba(255, 210, 150, ';
        size = Math.random() * 40 + 30; // large soft glow orbs
        speedX = (Math.random() - 0.5) * 0.3;
      } else if (this.atmosphere === 'rain-mist') {
        color = 'rgba(180, 220, 255, ';
        size = Math.random() * 2 + 1;
        speedY = Math.random() * 4 + 3; // fall downwards
        speedX = -0.5;
      } else if (this.atmosphere === 'bokeh-sparks') {
        color = 'rgba(120, 210, 255, ';
        size = Math.random() * 8 + 3;
      }

      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size,
        speedX,
        speedY,
        alpha: Math.random() * 0.6 + 0.2,
        color,
        twinkleSpeed: Math.random() * 0.05 + 0.02,
      });
    }
  }

  public drawFrame(progress: number) {
    if (!this.image || !this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // Calculate motion transform
    ctx.save();

    // Pivot at center
    ctx.translate(w / 2, h / 2);

    let scale = 1.05;
    let translateX = 0;
    let translateY = 0;
    let rotation = 0;

    switch (this.motion) {
      case 'dolly-in':
        // Smooth push in from 1.05 to 1.30
        scale = 1.05 + progress * 0.25;
        translateY = -progress * (h * 0.04);
        break;

      case 'orbit-pan':
        // Sweep horizontally with slight zoom
        scale = 1.15;
        translateX = (progress - 0.5) * (w * 0.1);
        rotation = (progress - 0.5) * 0.025;
        break;

      case 'ken-burns':
        // Classic documentary drift
        scale = 1.1 + progress * 0.15;
        translateX = (progress - 0.5) * (w * 0.06);
        translateY = (progress - 0.5) * (h * 0.06);
        break;

      case 'crane-tilt':
        // Vertical cinematic pedestal
        scale = 1.18;
        translateY = (0.5 - progress) * (h * 0.12);
        break;

      case 'vortex-zoom':
        // Slow hypnotic twist
        scale = 1.08 + progress * 0.22;
        rotation = progress * 0.08;
        break;

      case 'action-pulse':
        // Rhythmic breathing motion
        const pulse = Math.sin(progress * Math.PI * 4) * 0.04;
        scale = 1.1 + pulse;
        break;
    }

    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.translate(translateX, translateY);

    // Draw the source image preserving aspect ratio (cover mode)
    const imgRatio = this.image.width / this.image.height;
    const canvasRatio = w / h;
    let drawW = w;
    let drawH = h;

    if (imgRatio > canvasRatio) {
      drawH = h;
      drawW = h * imgRatio;
    } else {
      drawW = w;
      drawH = w / imgRatio;
    }

    ctx.drawImage(this.image, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Atmosphere overlay
    this.renderAtmosphere(progress);
  }

  private renderAtmosphere(progress: number) {
    if (this.atmosphere === 'none') return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Draw particles
    for (const p of this.particles) {
      p.x += p.speedX;
      p.y += p.speedY;

      // Wrap around edges
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      const alpha = Math.abs(Math.sin(progress * 10 + p.x)) * 0.4 + 0.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${alpha})`;
      ctx.fill();
    }

    // Vignette & subtle film tone
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  public startAnimation(onProgress?: (progress: number) => void) {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.startTime = performance.now();

    const loop = (time: number) => {
      const elapsed = (time - this.startTime) / 1000;
      const progress = (elapsed % this.durationSec) / this.durationSec;
      this.drawFrame(progress);
      if (onProgress) onProgress(progress);
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public stopAnimation() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Records a full cycle of the animated photo into a playable video blob (WebM or MP4)
   */
  public async recordToVideoBlob(
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.stopAnimation();
      this.recordedChunks = [];

      const stream = this.canvas.captureStream(60);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      try {
        this.mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 6000000, // 6 Mbps
        });
      } catch (e) {
        this.mediaRecorder = new MediaRecorder(stream);
      }

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        resolve(blob);
      };

      this.mediaRecorder.start(100);

      const totalFrames = Math.round(this.durationSec * 60);
      let currentFrame = 0;

      const recordStep = () => {
        const progress = currentFrame / totalFrames;
        this.drawFrame(progress);
        if (onProgress) onProgress(Math.min(100, Math.round(progress * 100)));

        currentFrame++;
        if (currentFrame <= totalFrames) {
          setTimeout(recordStep, 1000 / 60);
        } else {
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
          }
        }
      };

      recordStep();
    });
  }
}
