import React, { useState } from 'react';
import { AppTab, VideoClip } from './types';
import { INITIAL_SAMPLE_CLIPS } from './data/sampleMedia';
import { Navbar } from './components/Navbar';
import { TextToVideo } from './components/TextToVideo';
import { PhotoToVideo } from './components/PhotoToVideo';
import { MergeStudio } from './components/MergeStudio';
import { Film, Sparkles, ImagePlay, Layers, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('text-to-video');
  const [timelineClips, setTimelineClips] = useState<VideoClip[]>(INITIAL_SAMPLE_CLIPS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleAddToTimeline = (newClip: VideoClip) => {
    setTimelineClips((prev) => [...prev, newClip]);
    showToast(`"${newClip.title}" added to Merge Studio Timeline!`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        timelineClipCount={timelineClips.length}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'text-to-video' && (
          <TextToVideo
            onAddToTimeline={handleAddToTimeline}
            onNavigateToMerge={() => setActiveTab('merge-studio')}
          />
        )}

        {activeTab === 'photo-to-video' && (
          <PhotoToVideo
            onAddToTimeline={handleAddToTimeline}
            onNavigateToMerge={() => setActiveTab('merge-studio')}
          />
        )}

        {activeTab === 'merge-studio' && (
          <MergeStudio
            timelineClips={timelineClips}
            setTimelineClips={setTimelineClips}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl text-xs text-white animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setActiveTab('merge-studio')}
            className="ml-2 font-bold text-pink-400 hover:text-pink-300 underline underline-offset-2"
          >
            Go to Timeline →
          </button>
        </div>
      )}

      {/* Modern Studio Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950/60 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-indigo-400" />
            <span className="text-neutral-400 font-medium">CineAI Studio</span>
            <span>•</span>
            <span>AI Text to Video, Photo to Video & Multi-Clip Merger</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Veo 3.1 & Gemini 3.8
            </span>
            <span>•</span>
            <span>HTML5 MediaRecorder 60fps</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
