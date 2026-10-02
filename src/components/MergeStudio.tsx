import React, { useState, useRef, useEffect } from 'react';
import { VideoClip, AspectRatio, TransitionType, TextOverlay } from '../types';
import { INITIAL_SAMPLE_CLIPS } from '../data/sampleMedia';
import { AUDIO_PRESETS } from '../utils/audioSynth';
import { VideoMergerEngine, RenderProgress } from '../utils/videoMerger';
import { 
  Layers, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Scissors, 
  Music, 
  Sliders, 
  Play, 
  Pause, 
  Download, 
  Upload, 
  Type, 
  Film, 
  Sparkles,
  Maximize2,
  Volume2,
  VolumeX,
  Copy,
  CheckCircle2,
  X,
  RefreshCw
} from 'lucide-react';

interface MergeStudioProps {
  timelineClips: VideoClip[];
  setTimelineClips: React.Dispatch<React.SetStateAction<VideoClip[]>>;
}

export const MergeStudio: React.FC<MergeStudioProps> = ({
  timelineClips,
  setTimelineClips,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [soundtrackPreset, setSoundtrackPreset] = useState<string>('cinematic');
  const [activeClipId, setActiveClipId] = useState<string | null>(timelineClips[0]?.id || null);

  // Playback & preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  // Text Overlays
  const [overlays, setOverlays] = useState<TextOverlay[]>([
    {
      id: 'ov-1',
      text: 'CINEAI STUDIO PRODUCTION',
      startTime: 0.5,
      endTime: 3.5,
      position: 'bottom',
      fontSize: 22,
      color: '#ffffff',
      bgColor: 'rgba(0, 0, 0, 0.75)',
      animation: 'slide-up',
    },
  ]);
  const [showOverlayEditor, setShowOverlayEditor] = useState<boolean>(false);

  // Export state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<RenderProgress | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mergerEngineRef = useRef<VideoMergerEngine | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Merger Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new VideoMergerEngine(canvasRef.current);
    engine.setDimensions(aspectRatio);
    mergerEngineRef.current = engine;

    if (timelineClips.length > 0) {
      engine.preloadClips(timelineClips).catch(console.warn);
      const total = engine.calculateTotalDuration(timelineClips);
      setTotalDuration(total);
    }

    return () => {
      engine.stopPreview();
    };
  }, [aspectRatio]);

  // Recalculate duration whenever clips change
  useEffect(() => {
    if (mergerEngineRef.current && timelineClips.length > 0) {
      mergerEngineRef.current.preloadClips(timelineClips).catch(console.warn);
      const total = mergerEngineRef.current.calculateTotalDuration(timelineClips);
      setTotalDuration(total);
    }
  }, [timelineClips]);

  // Transport toggle
  const togglePlay = () => {
    if (!mergerEngineRef.current || timelineClips.length === 0) return;

    if (isPreviewPlaying) {
      mergerEngineRef.current.stopPreview();
      setIsPreviewPlaying(false);
    } else {
      mergerEngineRef.current.startPreview(timelineClips, overlays, (curr, tot) => {
        setCurrentTime(curr);
        setTotalDuration(tot);
      });
      setIsPreviewPlaying(true);
    }
  };

  // Move clip left/right
  const moveClip = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= timelineClips.length) return;

    const updated = [...timelineClips];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setTimelineClips(updated);
  };

  // Delete clip
  const removeClip = (id: string) => {
    setTimelineClips((prev) => prev.filter((c) => c.id !== id));
  };

  // Duplicate clip
  const duplicateClip = (clip: VideoClip) => {
    const copy: VideoClip = {
      ...clip,
      id: `clip-copy-${Date.now()}`,
      title: `${clip.title} (Copy)`,
    };
    setTimelineClips((prev) => [...prev, copy]);
  };

  // Add stock clip
  const addStockClip = () => {
    const sample = INITIAL_SAMPLE_CLIPS[timelineClips.length % INITIAL_SAMPLE_CLIPS.length];
    const newClip: VideoClip = {
      ...sample,
      id: `stock-${Date.now()}`,
      title: `${sample.title} #${timelineClips.length + 1}`,
    };
    setTimelineClips((prev) => [...prev, newClip]);
  };

  // Upload user video file
  const handleUserVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const dur = Math.min(60, Math.max(1, Math.round(video.duration || 8)));
      const newClip: VideoClip = {
        id: `upload-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        sourceUrl: url,
        duration: dur,
        trimStart: 0,
        trimEnd: Math.min(dur, 6),
        volume: 1,
        transition: 'crossfade',
        transitionDuration: 0.8,
        generatedBy: 'upload',
      };
      setTimelineClips((prev) => [...prev, newClip]);
    };
    video.src = url;
  };

  // Update specific clip property
  const updateClip = (id: string, updates: Partial<VideoClip>) => {
    setTimelineClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Export Merged Video
  const handleExport = async () => {
    if (!mergerEngineRef.current || timelineClips.length === 0) return;

    if (isPreviewPlaying) {
      mergerEngineRef.current.stopPreview();
      setIsPreviewPlaying(false);
    }

    setIsExporting(true);
    setExportedVideoUrl(null);

    try {
      const blob = await mergerEngineRef.current.exportMergedVideo(
        timelineClips,
        overlays,
        aspectRatio,
        soundtrackPreset,
        (progress) => {
          setExportProgress(progress);
        }
      );

      const url = URL.createObjectURL(blob);
      setExportedVideoUrl(url);
    } catch (err: any) {
      console.error('Export error:', err);
      alert(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${m.toString().padStart(2, '0')}:${parseFloat(s) < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Studio Header & Project Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-pink-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Timeline Video Merger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Merge, Trim & Transition Video Clips
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Combine AI-generated videos, camera clips, and stock clips with transitions, soundtrack, and title overlays.
          </p>
        </div>

        {/* Global Toolbar Options */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Aspect Ratio */}
          <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
            {(['16:9', '9:16', '1:1'] as AspectRatio[]).map((r) => (
              <button
                key={r}
                onClick={() => setAspectRatio(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  aspectRatio === r
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Soundtrack Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs">
            <Music className="w-4 h-4 text-pink-400" />
            <select
              value={soundtrackPreset}
              onChange={(e) => setSoundtrackPreset(e.target.value)}
              className="bg-transparent text-neutral-200 text-xs focus:outline-none cursor-pointer"
            >
              {AUDIO_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                  Music: {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export Action Button */}
          <button
            onClick={handleExport}
            disabled={timelineClips.length === 0 || isExporting}
            className="py-2.5 px-5 rounded-xl font-bold text-xs bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white shadow-lg shadow-pink-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export Merged Video</span>
          </button>
        </div>
      </div>

      {/* Main Preview Player Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Canvas Monitor Player (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Film className="w-4 h-4 text-pink-400" />
                <span>Unified Studio Monitor ({aspectRatio})</span>
              </span>
              <span className="font-mono text-neutral-400">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>

            {/* Screen */}
            <div
              className={`relative w-full rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center ${
                aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[500px]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'
              }`}
            >
              <canvas ref={canvasRef} className="w-full h-full object-contain" />

              {timelineClips.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-neutral-500">
                  <Layers className="w-12 h-12 mb-3 stroke-1 text-neutral-600" />
                  <p className="text-sm font-semibold text-neutral-400">Timeline is currently empty</p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                    Add video clips below, or generate new ones from the Text-to-Video and Photo-to-Video tabs!
                  </p>
                </div>
              )}
            </div>

            {/* Scrub & Transport Bar */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={togglePlay}
                disabled={timelineClips.length === 0}
                className="w-10 h-10 rounded-full bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/25 transition-all shrink-0 cursor-pointer disabled:opacity-40"
              >
                {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              {/* Progress bar */}
              <div className="flex-1 relative flex items-center">
                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden cursor-pointer">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-rose-400 h-full rounded-full transition-all"
                    style={{
                      width: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => setShowOverlayEditor(!showOverlayEditor)}
                className={`p-2 rounded-lg text-xs flex items-center gap-1.5 border transition-all ${
                  showOverlayEditor
                    ? 'bg-pink-950/80 border-pink-500 text-pink-300'
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text Titles</span>
              </button>
            </div>
          </div>
        </div>

        {/* Selected Clip Inspector / Overlay Editor (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {showOverlayEditor ? (
            /* Text Overlay Manager */
            <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                  <Type className="w-4 h-4 text-pink-400" />
                  <span>Text Overlays & Titles</span>
                </h3>
                <button
                  onClick={() => setShowOverlayEditor(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {overlays.map((ov, idx) => (
                  <div key={ov.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-300">Title Layer #{idx + 1}</span>
                      <button
                        onClick={() => setOverlays((prev) => prev.filter((o) => o.id !== ov.id))}
                        className="text-neutral-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={ov.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOverlays((prev) =>
                          prev.map((o) => (o.id === ov.id ? { ...o, text: val } : o))
                        );
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500"
                    />

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-1">Position</label>
                        <select
                          value={ov.position}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setOverlays((prev) =>
                              prev.map((o) => (o.id === ov.id ? { ...o, position: val } : o))
                            );
                          }}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200"
                        >
                          <option value="top">Top</option>
                          <option value="center">Center</option>
                          <option value="bottom">Bottom</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-1">Animation</label>
                        <select
                          value={ov.animation}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setOverlays((prev) =>
                              prev.map((o) => (o.id === ov.id ? { ...o, animation: val } : o))
                            );
                          }}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200"
                        >
                          <option value="none">None</option>
                          <option value="fade">Fade In/Out</option>
                          <option value="slide-up">Slide Up</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-1">Font Size</label>
                        <input
                          type="number"
                          value={ov.fontSize}
                          min={12}
                          max={48}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 20;
                            setOverlays((prev) =>
                              prev.map((o) => (o.id === ov.id ? { ...o, fontSize: val } : o))
                            );
                          }}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    const newOv: TextOverlay = {
                      id: `ov-${Date.now()}`,
                      text: 'NEW SCENE TITLE',
                      startTime: 3.5,
                      endTime: 6.5,
                      position: 'bottom',
                      fontSize: 22,
                      color: '#ffffff',
                      bgColor: 'rgba(0, 0, 0, 0.75)',
                      animation: 'fade',
                    };
                    setOverlays((prev) => [...prev, newOv]);
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New Title Card</span>
                </button>
              </div>
            </div>
          ) : (
            /* Clip Settings Inspector */
            <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-pink-400" />
                <span>Clip Inspector & Trimmer</span>
              </h3>

              {(() => {
                const activeClip = timelineClips.find((c) => c.id === activeClipId) || timelineClips[0];
                if (!activeClip) {
                  return (
                    <div className="text-xs text-neutral-500 py-6 text-center">
                      Select a clip from the timeline below to edit its in/out points and transition.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-white truncate">{activeClip.title}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Original: {activeClip.duration}s • Trimmed: {(activeClip.trimEnd - activeClip.trimStart).toFixed(1)}s
                      </div>
                    </div>

                    {/* In-point and Out-point Trim Sliders */}
                    <div className="space-y-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                      <div>
                        <div className="flex justify-between text-xs text-neutral-400 mb-1">
                          <span>Trim Start (In Point)</span>
                          <span className="font-mono text-neutral-200">{activeClip.trimStart.toFixed(1)}s</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, activeClip.trimEnd - 0.5)}
                          step={0.1}
                          value={activeClip.trimStart}
                          onChange={(e) => updateClip(activeClip.id, { trimStart: parseFloat(e.target.value) })}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-neutral-400 mb-1">
                          <span>Trim End (Out Point)</span>
                          <span className="font-mono text-neutral-200">{activeClip.trimEnd.toFixed(1)}s</span>
                        </div>
                        <input
                          type="range"
                          min={activeClip.trimStart + 0.5}
                          max={activeClip.duration}
                          step={0.1}
                          value={activeClip.trimEnd}
                          onChange={(e) => updateClip(activeClip.id, { trimEnd: parseFloat(e.target.value) })}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Transition Selector */}
                    <div>
                      <label className="text-xs font-medium text-neutral-400 block mb-1.5">
                        Entrance Transition
                      </label>
                      <select
                        value={activeClip.transition}
                        onChange={(e) => updateClip(activeClip.id, { transition: e.target.value as TransitionType })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-pink-500 cursor-pointer"
                      >
                        <option value="none">Cut (No Transition)</option>
                        <option value="crossfade">Cross-Dissolve (Fade Blend)</option>
                        <option value="fade-black">Dip to Black</option>
                        <option value="fade-white">Dip to White</option>
                        <option value="slide-left">Slide Push Left</option>
                        <option value="wipe-right">Horizontal Wipe</option>
                        <option value="zoom-in">Zoom In / Optical Flow</option>
                        <option value="glitch">Digital Glitch</option>
                      </select>
                    </div>

                    {/* Clip Volume */}
                    <div>
                      <div className="flex justify-between text-xs text-neutral-400 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          {activeClip.volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-neutral-500" /> : <Volume2 className="w-3.5 h-3.5 text-pink-400" />}
                          <span>Clip Audio Volume</span>
                        </span>
                        <span className="font-mono text-neutral-200">{Math.round(activeClip.volume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={activeClip.volume}
                        onChange={(e) => updateClip(activeClip.id, { volume: parseFloat(e.target.value) })}
                        className="w-full accent-pink-500 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Track Visual Timeline Sequence */}
      <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-pink-400" />
              <span>Multi-Clip Timeline Sequence ({timelineClips.length} Clips)</span>
            </h3>
            <span className="text-xs text-neutral-500 font-mono">
              Total Duration: {formatTime(totalDuration)}
            </span>
          </div>

          {/* Add Clip Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => uploadFileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-pink-400" />
              <span>Upload Video</span>
            </button>
            <input
              ref={uploadFileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleUserVideoUpload}
            />

            <button
              onClick={addStockClip}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-pink-600/30 to-rose-600/30 text-pink-300 border border-pink-500/40 hover:bg-pink-600/40 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Stock Clip</span>
            </button>
          </div>
        </div>

        {/* Timeline Tracks Ribbon */}
        <div className="relative overflow-x-auto pb-4 pt-2">
          <div className="flex items-center gap-2 min-w-max">
            {timelineClips.map((clip, idx) => {
              const isActive = clip.id === activeClipId;
              const clipDur = (clip.trimEnd - clip.trimStart).toFixed(1);

              return (
                <React.Fragment key={clip.id}>
                  {/* Transition Indicator Pill between clips */}
                  {idx > 0 && (
                    <div className="flex flex-col items-center justify-center px-1">
                      <div className="text-[10px] uppercase font-bold text-pink-400 bg-pink-950/80 border border-pink-800/80 px-2 py-0.5 rounded-full shadow-sm">
                        {clip.transition !== 'none' ? clip.transition : 'cut'}
                      </div>
                    </div>
                  )}

                  {/* Clip Card */}
                  <div
                    onClick={() => setActiveClipId(clip.id)}
                    className={`relative w-48 rounded-xl border-2 overflow-hidden bg-neutral-950 shadow-md transition-all cursor-pointer group ${
                      isActive
                        ? 'border-pink-500 shadow-pink-500/20 scale-[1.02]'
                        : 'border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-24 bg-neutral-900 flex items-center justify-center overflow-hidden">
                      {clip.thumbnailUrl ? (
                        <img
                          src={clip.thumbnailUrl}
                          alt={clip.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Film className="w-8 h-8 text-neutral-600" />
                      )}

                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white font-semibold">
                        #{idx + 1}
                      </div>

                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-pink-300 font-bold">
                        {clipDur}s
                      </div>
                    </div>

                    {/* Clip Info & Fast Actions */}
                    <div className="p-2.5 space-y-1.5">
                      <div className="text-xs font-semibold text-neutral-200 truncate">{clip.title}</div>

                      <div className="flex items-center justify-between pt-1 border-t border-neutral-900 text-neutral-400">
                        {/* Reorder controls */}
                        <div className="flex items-center gap-1">
                          <button
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveClip(idx, 'left');
                            }}
                            className="p-1 hover:text-white disabled:opacity-20"
                            title="Move Left"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={idx === timelineClips.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveClip(idx, 'right');
                            }}
                            className="p-1 hover:text-white disabled:opacity-20"
                            title="Move Right"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Duplicate & Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateClip(clip);
                            }}
                            className="p-1 hover:text-white"
                            title="Duplicate Clip"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeClip(clip.id);
                            }}
                            className="p-1 hover:text-red-400"
                            title="Remove Clip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Export Progress Modal */}
      {(isExporting || exportedVideoUrl) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            {isExporting ? (
              <div className="text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full border-4 border-t-pink-500 border-pink-500/20 animate-spin" />
                  <Film className="w-6 h-6 text-pink-400 absolute" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">Rendering Merged Video</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    {exportProgress?.status || 'Stitching clips, transitions, and audio...'}
                  </p>
                </div>

                <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 h-full rounded-full transition-all duration-150"
                    style={{ width: `${exportProgress?.percent || 0}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs font-mono text-neutral-500">
                  <span>Clip {exportProgress?.currentClipIndex} of {exportProgress?.totalClips}</span>
                  <span>{exportProgress?.percent || 0}%</span>
                </div>
              </div>
            ) : exportedVideoUrl ? (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">Video Successfully Exported!</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    All clips, transitions, and audio tracks have been merged into a single high-quality video.
                  </p>
                </div>

                {/* Video Preview */}
                <div className="rounded-xl overflow-hidden bg-black aspect-video border border-neutral-800">
                  <video src={exportedVideoUrl} controls autoPlay className="w-full h-full object-contain" />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={exportedVideoUrl}
                    download="cineai-merged-master.webm"
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Final Video</span>
                  </a>

                  <button
                    onClick={() => setExportedVideoUrl(null)}
                    className="py-3 px-4 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
