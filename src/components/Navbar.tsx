import React from 'react';
import { AppTab } from '../types';
import { Film, Sparkles, ImagePlay, Layers, Video } from 'lucide-react';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  timelineClipCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  timelineClipCount,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 shadow-lg shadow-indigo-500/20 text-white">
            <Film className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-neutral-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                Cine<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">AI</span>
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Veo 3.1 & Studio
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">AI Video Generation & Timeline Merger</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
          <button
            onClick={() => setActiveTab('text-to-video')}
            className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'text-to-video'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-300" />
            <span>Text to Video</span>
          </button>

          <button
            onClick={() => setActiveTab('photo-to-video')}
            className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'photo-to-video'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <ImagePlay className="w-4 h-4 text-purple-300" />
            <span>Photo to Video</span>
          </button>

          <button
            onClick={() => setActiveTab('merge-studio')}
            className={`relative flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'merge-studio'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/25'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <Layers className="w-4 h-4 text-pink-300" />
            <span>Merge Videos</span>
            {timelineClipCount > 0 && (
              <span className="flex items-center justify-center ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-pink-500 text-white">
                {timelineClipCount}
              </span>
            )}
          </button>
        </nav>

        {/* Status Indicator */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[11px] text-neutral-400">Gemini 3.8 / Veo Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};
