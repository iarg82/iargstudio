import React, { useState, useRef } from 'react';
import { AspectRatio, VideoClip } from '../types';
import { SAMPLE_PROMPTS } from '../data/sampleMedia';
import { 
  Sparkles, 
  Wand2, 
  Play, 
  Pause, 
  Download, 
  PlusCircle, 
  Film, 
  RefreshCw, 
  Sliders, 
  Check, 
  AlertCircle,
  Video,
  MonitorPlay,
  RotateCcw
} from 'lucide-react';

interface TextToVideoProps {
  onAddToTimeline: (clip: VideoClip) => void;
  onNavigateToMerge: () => void;
}

export const TextToVideo: React.FC<TextToVideoProps> = ({
  onAddToTimeline,
  onNavigateToMerge,
}) => {
  const [prompt, setPrompt] = useState(
    'Cinematic drone fly-through down futuristic skyscraper canyons in Neo-Tokyo, glowing holographic neon signs, rain reflection on streets, 35mm anamorphic, 60fps.'
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [generationEngine, setGenerationEngine] = useState<'veo' | 'instant'>('veo');
  
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedMeta, setEnhancedMeta] = useState<{
    cameraMotion?: string;
    styleTag?: string;
    tags?: string[];
  } | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAddedToTimeline, setHasAddedToTimeline] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // AI Prompt Enhancer
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode: 'text-to-video' }),
      });

      if (!res.ok) throw new Error('Failed to enhance prompt');
      const data = await res.json();

      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
      }
      setEnhancedMeta({
        cameraMotion: data.cameraMotion,
        styleTag: data.styleTag,
        tags: data.tags || [],
      });
    } catch (err: any) {
      console.warn('Enhance fallback:', err);
      // Client-side fallback enhancement
      setPrompt((prev) => `${prev.trim()}, photorealistic 8k, cinematic anamorphic lens flare, volumetric lighting, motion blur, 60fps.`);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Generate Video Handler
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setHasAddedToTimeline(false);
    setGenerationProgress(5);
    setStatusMessage('Initializing cinematic video parameters...');

    if (generationEngine === 'instant') {
      // Fast Client Kinetic Cinema Synth
      runInstantSynth();
      return;
    }

    // Veo Cloud Generation Workflow
    try {
      setStatusMessage('Sending request to Veo 3.1 model...');
      setGenerationProgress(15);

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          resolution,
          model: 'veo-3.1-lite-generate-preview',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to start video generation');
      }

      const operationName = data.operationName;
      setStatusMessage('Veo AI is rendering video frames (motion vectors & temporal diffusion)...');

      // Poll status
      let done = false;
      let attempts = 0;
      const maxAttempts = 60; // ~2-3 minutes max
      let pollProgress = 20;

      while (!done && attempts < maxAttempts) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        pollProgress = Math.min(92, pollProgress + (attempts % 3 === 0 ? 4 : 2));
        setGenerationProgress(pollProgress);

        if (pollProgress < 40) {
          setStatusMessage('Synthesizing temporal consistency & camera movement...');
        } else if (pollProgress < 75) {
          setStatusMessage('Refining photorealistic textures & lighting reflections...');
        } else {
          setStatusMessage('Encoding final MP4 video stream...');
        }

        const pollRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });

        const pollData = await pollRes.json();
        if (pollData.error) {
          throw new Error(pollData.error.message || 'Error occurred during generation');
        }

        if (pollData.done) {
          done = true;
          break;
        }
      }

      if (!done) {
        throw new Error('Video generation timed out. Please try again or use Instant Motion mode.');
      }

      setStatusMessage('Downloading rendered video...');
      setGenerationProgress(96);

      const downloadRes = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });

      if (!downloadRes.ok) {
        throw new Error('Failed to retrieve finalized video file');
      }

      const videoBlob = await downloadRes.blob();
      const localUrl = URL.createObjectURL(videoBlob);
      setGeneratedVideoUrl(localUrl);
      setGenerationProgress(100);
      setStatusMessage('Generation completed!');
    } catch (err: any) {
      console.error('Generation failed:', err);
      setErrorMessage(
        err.message || 'Generation failed. You can switch to "Instant Motion Synth" for instant generation.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Instant Motion Synth (Canvas simulation & video recording)
  const runInstantSynth = () => {
    setStatusMessage('Generating synthetic kinetic scene...');
    setGenerationProgress(20);

    const canvas = document.createElement('canvas');
    canvas.width = aspectRatio === '9:16' ? 720 : 1280;
    canvas.height = aspectRatio === '9:16' ? 1280 : 720;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(30);
    const recordedChunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setGeneratedVideoUrl(url);
      setGenerationProgress(100);
      setStatusMessage('Video ready!');
      setIsGenerating(false);
    };

    mediaRecorder.start();

    const totalFrames = 150; // 5 seconds at 30fps
    let f = 0;

    const renderLoop = () => {
      const p = f / totalFrames;
      const w = canvas.width;
      const h = canvas.height;

      // Dark cinematic background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Dynamic light beam & neon horizon
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(p * 0.1);

      // Light tunnel / grid effect
      for (let i = 1; i <= 8; i++) {
        const radius = (p * 300 + i * 80) % (w * 0.75);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${210 + i * 15}, 90%, 65%, ${1 - radius / (w * 0.75)})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Floating kinetic particles
      for (let j = 0; j < 35; j++) {
        const angle = j * 0.35 + p * 2;
        const dist = 50 + j * 12 + Math.sin(p * 5 + j) * 30;
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist;
        ctx.beginPath();
        ctx.arc(px, py, 3 + (j % 4), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${270 + j * 5}, 100%, 75%, 0.8)`;
        ctx.fill();
      }
      ctx.restore();

      // Atmospheric text title card
      ctx.font = `600 ${Math.round(w * 0.035)}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      const cleanPrompt = prompt.length > 55 ? prompt.slice(0, 52) + '...' : prompt;
      ctx.fillText(cleanPrompt, w / 2, h * 0.88);

      f++;
      setGenerationProgress(Math.min(95, Math.round((f / totalFrames) * 90) + 10));

      if (f < totalFrames) {
        requestAnimationFrame(renderLoop);
      } else {
        mediaRecorder.stop();
      }
    };

    renderLoop();
  };

  const handleAddVideoToTimeline = () => {
    if (!generatedVideoUrl) return;

    const newClip: VideoClip = {
      id: `ai-text-${Date.now()}`,
      title: prompt.slice(0, 24) || 'AI Generated Video',
      sourceUrl: generatedVideoUrl,
      thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
      duration: 6,
      trimStart: 0,
      trimEnd: 6,
      volume: 1,
      transition: 'crossfade',
      transitionDuration: 0.8,
      aspectRatio,
      generatedBy: 'text',
    };

    onAddToTimeline(newClip);
    setHasAddedToTimeline(true);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cinematic Text to Video</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Turn Prompts into Stunning Cinematic Video
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 mt-1 max-w-3xl">
          Powered by Veo 3.1 and real-time kinetic engines. Create high-resolution video clips with Hollywood camera motion, lighting, and pacing, then export or merge directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Control Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Prompt Card */}
          <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <span>Prompt Description</span>
              </label>

              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || !prompt.trim()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all disabled:opacity-50"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
                <span>{isEnhancing ? 'Enhancing with Gemini...' : 'Enhance Prompt (AI Director)'}</span>
              </button>
            </div>

            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your scene in detail: subject, camera movement, lighting, atmosphere..."
                rows={4}
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Prompt Meta / Tags if enhanced */}
            {enhancedMeta && (
              <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center gap-2 text-xs">
                {enhancedMeta.cameraMotion && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800">
                    Camera: {enhancedMeta.cameraMotion}
                  </span>
                )}
                {enhancedMeta.styleTag && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800">
                    Style: {enhancedMeta.styleTag}
                  </span>
                )}
                {enhancedMeta.tags?.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Quick Inspiration Prompts */}
            <div className="mt-4">
              <div className="text-xs font-medium text-neutral-400 mb-2">Prompt Presets:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAMPLE_PROMPTS.map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(sample.prompt);
                      setAspectRatio(sample.aspectRatio as AspectRatio);
                    }}
                    className="p-2 rounded-lg bg-neutral-950 border border-neutral-800/90 text-left hover:border-indigo-500/50 hover:bg-neutral-800/40 transition-all group"
                  >
                    <div className="text-[11px] font-semibold text-neutral-200 group-hover:text-indigo-300 truncate">
                      {sample.title}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      {sample.aspectRatio} • {sample.motion}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Video Settings */}
          <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neutral-400" />
              <span>Generation Settings</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Aspect Ratio */}
              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1.5">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['16:9', '9:16', '1:1'] as AspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-semibold transition-all ${
                        aspectRatio === ratio
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1.5">Quality Resolution</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['720p', '1080p'] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-semibold transition-all ${
                        resolution === res
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Engine Mode */}
              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1.5">Render Engine</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setGenerationEngine('veo')}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-semibold transition-all ${
                      generationEngine === 'veo'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                    }`}
                  >
                    Veo 3.1 AI
                  </button>
                  <button
                    onClick={() => setGenerationEngine('instant')}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-semibold transition-all ${
                      generationEngine === 'instant'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                    }`}
                  >
                    Instant Synth
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">Notice</div>
                  <div className="text-red-300/90 mt-0.5">{errorMessage}</div>
                  {generationEngine === 'veo' && (
                    <button
                      onClick={() => {
                        setGenerationEngine('instant');
                        setErrorMessage(null);
                      }}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-xs text-indigo-300 underline underline-offset-2 hover:text-indigo-200"
                    >
                      Switch to Instant Motion Synth (No API quota required)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Video...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>Generate Video from Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-indigo-400" />
                <span>Video Output Player</span>
              </h3>
              {generatedVideoUrl && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ready
                </span>
              )}
            </div>

            {/* Video Screen / Canvas Container */}
            <div
              className={`relative w-full rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center ${
                aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[480px]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'
              }`}
            >
              {isGenerating ? (
                /* Generating Live Status View */
                <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center z-20">
                  <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
                    <div className="w-14 h-14 rounded-full border-4 border-t-indigo-500 border-indigo-500/20 animate-spin" />
                    <Film className="w-6 h-6 text-indigo-400 absolute" />
                  </div>

                  <h4 className="text-sm font-bold text-white mb-1">Synthesizing AI Video</h4>
                  <p className="text-xs text-neutral-400 max-w-xs mb-4 min-h-[32px]">{statusMessage}</p>

                  <div className="w-full max-w-xs bg-neutral-800 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-neutral-500">{generationProgress}% Completed</span>
                </div>
              ) : generatedVideoUrl ? (
                /* Player view */
                <>
                  <video
                    ref={videoRef}
                    src={generatedVideoUrl}
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={togglePlay}
                        className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                      </button>

                      <a
                        href={generatedVideoUrl}
                        download="cineai-text-video.mp4"
                        className="p-2 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 text-xs flex items-center gap-1.5 border border-neutral-700 backdrop-blur-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download MP4</span>
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500">
                  <Film className="w-10 h-10 mb-2 stroke-1" />
                  <p className="text-xs">Your generated video will appear here.</p>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            {generatedVideoUrl && !isGenerating && (
              <div className="mt-4 pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center gap-2">
                <button
                  onClick={handleAddVideoToTimeline}
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

                {hasAddedToTimeline && (
                  <button
                    onClick={onNavigateToMerge}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-all"
                  >
                    Open Merge Studio →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
