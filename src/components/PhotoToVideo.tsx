import React, { useState, useRef, useEffect } from 'react';
import { CameraMotion, AtmosphereEffect, VideoClip, AspectRatio } from '../types';
import { SAMPLE_IMAGES, SampleImage } from '../data/sampleMedia';
import { PhotoAnimator } from '../utils/photoAnimator';
import { 
  ImagePlay, 
  Upload, 
  Sparkles, 
  Film, 
  Play, 
  Pause, 
  Download, 
  PlusCircle, 
  Check, 
  RefreshCw,
  Eye,
  Sliders,
  AlertCircle
} from 'lucide-react';

interface PhotoToVideoProps {
  onAddToTimeline: (clip: VideoClip) => void;
  onNavigateToMerge: () => void;
}

export const PhotoToVideo: React.FC<PhotoToVideoProps> = ({
  onAddToTimeline,
  onNavigateToMerge,
}) => {
  const [selectedImage, setSelectedImage] = useState<string>(SAMPLE_IMAGES[0].url);
  const [selectedImageTitle, setSelectedImageTitle] = useState<string>(SAMPLE_IMAGES[0].title);
  const [prompt, setPrompt] = useState<string>(SAMPLE_IMAGES[0].suggestedPrompt);
  
  const [motion, setMotion] = useState<CameraMotion>('dolly-in');
  const [atmosphere, setAtmosphere] = useState<AtmosphereEffect>('dust-particles');
  const [durationSec, setDurationSec] = useState<number>(5);
  const [renderMode, setRenderMode] = useState<'instant' | 'veo'>('instant');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasAddedToTimeline, setHasAddedToTimeline] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animatorRef = useRef<PhotoAnimator | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Animator on canvas mount or image change
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 1280;
    canvas.height = 720;

    const animator = new PhotoAnimator(canvas);
    animatorRef.current = animator;

    animator.loadImage(selectedImage)
      .then(() => {
        animator.setConfig(motion, atmosphere, durationSec);
        animator.startAnimation();
      })
      .catch((err) => console.warn('Failed to load image in canvas', err));

    return () => {
      animator.stopAnimation();
    };
  }, [selectedImage]);

  // Update animator config when motion or atmosphere changes
  useEffect(() => {
    if (animatorRef.current) {
      animatorRef.current.setConfig(motion, atmosphere, durationSec);
    }
  }, [motion, atmosphere, durationSec]);

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setSelectedImage(result);
        setSelectedImageTitle(file.name.replace(/\.[^/.]+$/, ''));
        setPrompt(`Cinematic high-definition motion video of ${file.name}, smooth camera drift with atmospheric lighting.`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Select Sample Image
  const handleSelectSample = (sample: SampleImage) => {
    setSelectedImage(sample.url);
    setSelectedImageTitle(sample.title);
    setPrompt(sample.suggestedPrompt);
    setMotion(sample.suggestedMotion);
  };

  // Generate Video
  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setHasAddedToTimeline(false);
    setGenerationProgress(5);
    setStatusMessage('Preparing image layers and camera projection...');

    if (renderMode === 'instant') {
      // Instant Motion Generation using Canvas and MediaRecorder
      try {
        if (!animatorRef.current) {
          throw new Error('Animator engine is not ready');
        }

        setStatusMessage('Recording 60fps high-bitrate video stream...');
        const blob = await animatorRef.current.recordToVideoBlob((pct) => {
          setGenerationProgress(pct);
          setStatusMessage(`Rendering camera animation: ${pct}%`);
        });

        const url = URL.createObjectURL(blob);
        setGeneratedVideoUrl(url);
        setStatusMessage('Render complete!');
        // Restart preview loop
        animatorRef.current.startAnimation();
      } catch (err: any) {
        console.error('Instant render failed', err);
        setErrorMessage(err.message || 'Render failed');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Cloud Veo Generation
    try {
      setStatusMessage('Uploading image and parameters to Veo 3.1...');
      setGenerationProgress(15);

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageBase64: selectedImage,
          aspectRatio: '16:9',
          resolution: '720p',
          model: 'veo-3.1-lite-generate-preview',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to start image-to-video generation');
      }

      const operationName = data.operationName;
      setStatusMessage('Veo AI is synthesizing photo-to-video frames...');

      let done = false;
      let attempts = 0;
      const maxAttempts = 60;
      let pollProgress = 20;

      while (!done && attempts < maxAttempts) {
        attempts++;
        await new Promise((r) => setTimeout(r, 3000));
        pollProgress = Math.min(92, pollProgress + 3);
        setGenerationProgress(pollProgress);
        setStatusMessage(`Veo AI diffusion in progress (${pollProgress}%)...`);

        const pollRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });

        const pollData = await pollRes.json();
        if (pollData.error) throw new Error(pollData.error.message || 'Polling error');
        if (pollData.done) {
          done = true;
          break;
        }
      }

      if (!done) {
        throw new Error('Video generation timed out.');
      }

      setStatusMessage('Downloading finalized video...');
      setGenerationProgress(96);

      const dlRes = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });

      if (!dlRes.ok) throw new Error('Failed to retrieve video file');

      const blob = await dlRes.blob();
      const localUrl = URL.createObjectURL(blob);
      setGeneratedVideoUrl(localUrl);
      setGenerationProgress(100);
      setStatusMessage('Completed!');
    } catch (err: any) {
      console.error('Veo Photo-to-Video error:', err);
      setErrorMessage(
        err.message || 'Veo generation failed. Switch to Instant 60fps Motion Render for immediate output.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToTimeline = () => {
    if (!generatedVideoUrl) return;

    const newClip: VideoClip = {
      id: `ai-photo-${Date.now()}`,
      title: `${selectedImageTitle} (${motion})`,
      sourceUrl: generatedVideoUrl,
      thumbnailUrl: selectedImage,
      duration: durationSec,
      trimStart: 0,
      trimEnd: durationSec,
      volume: 1,
      transition: 'wipe-right',
      transitionDuration: 0.8,
      aspectRatio: '16:9',
      generatedBy: 'photo',
    };

    onAddToTimeline(newClip);
    setHasAddedToTimeline(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <ImagePlay className="w-3.5 h-3.5" />
          <span>Generative Photo to Video</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Bring Any Photo to Life with Cinematic Motion
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 mt-1 max-w-3xl">
          Upload any photo or pick a high-res sample. Apply 3D dolly pushes, orbit pans, Ken Burns drifts, and atmospheric particles, or use Veo 3.1 AI diffusion.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Image Selection Card */}
          <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-neutral-200">Starting Photo</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-violet-400" />
                <span>Upload Custom Photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Selected Image Thumbnail Bar */}
            <div className="grid grid-cols-5 gap-2.5 mb-4">
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all ${
                    selectedImage === sample.url
                      ? 'border-violet-500 shadow-md shadow-violet-500/30 scale-[1.02]'
                      : 'border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-600'
                  }`}
                >
                  <img src={sample.url} alt={sample.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
                    <span className="text-[10px] font-semibold text-white truncate">{sample.title}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Optional Guidance Prompt */}
            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1">
                Motion & Atmosphere Guidance (Optional)
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Slow cinematic zoom, gentle floating embers in the air..."
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Motion & Atmosphere Controls */}
          <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neutral-400" />
              <span>Camera Movement & Atmosphere</span>
            </h3>

            {/* Camera Motion Styles */}
            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-2">Camera Motion Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'dolly-in', name: '3D Dolly In & Push', desc: 'Forward cinematic push' },
                  { id: 'orbit-pan', name: 'Orbit Pan & Sweep', desc: 'Curved tracking pan' },
                  { id: 'ken-burns', name: 'Ken Burns Drift', desc: 'Diagonal documentary glide' },
                  { id: 'crane-tilt', name: 'Crane Tilt / Pedestal', desc: 'Dramatic vertical elevation' },
                  { id: 'vortex-zoom', name: 'Vortex Spiral', desc: 'Hypnotic rotation zoom' },
                  { id: 'action-pulse', name: 'Action Pulse', desc: 'Dynamic breathing cadence' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setMotion(item.id as CameraMotion)}
                    className={`p-2.5 text-left rounded-xl border transition-all ${
                      motion === item.id
                        ? 'bg-violet-950/60 border-violet-500 text-white shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.name}</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Atmosphere Effects */}
            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-2">Atmospheric Particle FX</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { id: 'dust-particles', label: 'Dust Motes' },
                  { id: 'golden-embers', label: 'Embers' },
                  { id: 'light-leaks', label: 'Light Leaks' },
                  { id: 'rain-mist', label: 'Rain Mist' },
                  { id: 'bokeh-sparks', label: 'Bokeh' },
                  { id: 'none', label: 'Clean' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAtmosphere(item.id as AtmosphereEffect)}
                    className={`py-1.5 px-2 text-center rounded-lg text-xs font-medium transition-all ${
                      atmosphere === item.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration and Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1.5">Video Duration</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[3, 5, 8].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setDurationSec(sec)}
                      className={`py-2 text-center rounded-lg text-xs font-semibold transition-all ${
                        durationSec === sec
                          ? 'bg-violet-600 text-white'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      {sec} Seconds
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1.5">Generation Engine</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setRenderMode('instant')}
                    className={`py-2 text-center rounded-lg text-xs font-semibold transition-all ${
                      renderMode === 'instant'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                    }`}
                  >
                    Instant 60fps Render
                  </button>
                  <button
                    onClick={() => setRenderMode('veo')}
                    className={`py-2 text-center rounded-lg text-xs font-semibold transition-all ${
                      renderMode === 'veo'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                    }`}
                  >
                    Veo 3.1 AI
                  </button>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">Notice</div>
                  <div className="text-red-300/90 mt-0.5">{errorMessage}</div>
                  {renderMode === 'veo' && (
                    <button
                      onClick={() => {
                        setRenderMode('instant');
                        setErrorMessage(null);
                      }}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-xs text-violet-300 underline"
                    >
                      Switch to Instant 60fps Motion Render (Fast & Free)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{statusMessage || 'Rendering Video...'}</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>Animate Photo into Video ({durationSec}s)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output & Live Preview Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <Eye className="w-4 h-4 text-violet-400" />
                <span>Live Motion Preview & Output</span>
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                60 FPS Real-time
              </span>
            </div>

            {/* Canvas / Video Container */}
            <div className="relative w-full aspect-video rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center">
              {/* The Live Interactive Canvas */}
              <canvas
                ref={canvasRef}
                className={`w-full h-full object-cover ${generatedVideoUrl ? 'hidden' : 'block'}`}
              />

              {/* Once rendered into a real video file, show video player */}
              {generatedVideoUrl && (
                <video
                  ref={videoRef}
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}

              {/* Progress Overlay during export */}
              {isGenerating && (
                <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                  <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full border-4 border-t-violet-500 border-violet-500/20 animate-spin" />
                    <Film className="w-6 h-6 text-violet-400 absolute" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Rendering Video</h4>
                  <p className="text-xs text-neutral-400 max-w-xs mb-3">{statusMessage}</p>
                  <div className="w-full max-w-xs bg-neutral-800 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-pink-500 h-full rounded-full transition-all duration-200"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">{generationProgress}%</span>
                </div>
              )}
            </div>

            {/* Video Action Bar */}
            <div className="mt-4 pt-4 border-t border-neutral-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span>Motion: <b className="text-neutral-200">{motion}</b></span>
                <span>Particles: <b className="text-neutral-200">{atmosphere}</b></span>
                <span>Length: <b className="text-neutral-200">{durationSec}s</b></span>
              </div>

              {generatedVideoUrl && (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    onClick={handleAddToTimeline}
                    disabled={hasAddedToTimeline}
                    className={`flex-1 w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      hasAddedToTimeline
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-md shadow-pink-500/20'
                    }`}
                  >
                    {hasAddedToTimeline ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added to Timeline</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ Add to Merge Studio Timeline</span>
                      </>
                    )}
                  </button>

                  <a
                    href={generatedVideoUrl}
                    download={`cineai-${motion}.mp4`}
                    className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              )}

              {hasAddedToTimeline && (
                <button
                  onClick={onNavigateToMerge}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-neutral-800/60 hover:bg-neutral-800 text-pink-300 border border-pink-500/20 transition-all text-center"
                >
                  View in Merge Studio Timeline →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
