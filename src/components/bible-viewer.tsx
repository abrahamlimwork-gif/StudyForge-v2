"use client";

import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, ExternalLink, Search, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { getYouVersionUrl } from '@/lib/bible-utils';

interface BibleViewerProps {
  initialUrl?: string;
  isFocused: boolean;
  sidebarWidth?: number;
  onToggleFocus: () => void;
}

export function BibleViewer({ 
  initialUrl = "https://www.bible.com/bible/111/JHN.1.NIV", 
  isFocused, 
  sidebarWidth = 400,
  onToggleFocus 
}: BibleViewerProps) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    const newUrl = getYouVersionUrl(searchQuery);
    setCurrentUrl(newUrl);
  };

  // Adaptive Scaling Logic
  const isWide = sidebarWidth >= 550;
  
  // Compact Mode: Optimized for fitting parallel columns into small width
  // Wide Mode: Native resolution for immersive study
  const scale = isWide ? 1.0 : 0.78;
  const width = isWide ? "100%" : "155%";
  const left = isWide ? "0%" : "-28%";

  return (
    <div className={cn(
      "flex flex-col bg-slate-950 transition-all duration-500 ease-in-out border-l-2 border-slate-800",
      isFocused ? "fixed inset-0 z-[100] m-12 rounded-[2rem] shadow-2xl border-4 border-slate-800" : "h-full w-full"
    )}>
      {/* Search Bar / Header (Flush Tight) */}
      <div className="h-12 flex items-center justify-between px-6 border-b border-white/5 bg-slate-900/60 backdrop-blur-xl shrink-0 gap-4">
        <form onSubmit={handleSearch} className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Verse (e.g. John 3)" 
            className="h-8 pl-10 text-[10px] bg-black/40 border-white/10 text-white rounded-lg focus:ring-blue-500/50"
          />
        </form>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.open(currentUrl, '_blank')}
            className="h-8 w-8 text-white/20 hover:text-white hover:bg-white/5 rounded-lg"
            title="Open Outside"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button 
            onClick={onToggleFocus}
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 font-black text-[9px] uppercase tracking-widest text-slate-400 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5"
          >
            {isFocused ? <Minimize2 className="h-3.5 w-3.5 mr-2" /> : <Maximize2 className="h-3.5 w-3.5 mr-2" />}
            {isFocused ? "Exit" : "Focus"}
          </Button>
        </div>
      </div>

      {/* Precision Cut Container */}
      <div className="flex-grow relative overflow-hidden bg-slate-950">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-white/40">Opening Scroll...</span>
          </div>
        )}
        
        <div 
          className="absolute left-0 right-0 bottom-[-200px] transition-all duration-300 ease-in-out"
          style={{ 
            top: '-56px',
            left: left,
            height: 'calc(130% + 500px)',
            width: width,
          }}
        >
          <iframe 
            src={currentUrl} 
            onLoad={() => setLoading(false)}
            style={{ 
              width: '100%', 
              height: '100%', 
              transform: `scale(${scale})`, 
              transformOrigin: 'top left',
              filter: 'brightness(0.9) contrast(1.1)'
            }}
            className="border-none opacity-90 transition-opacity duration-700"
            title="YouVersion Bible"
          />
        </div>
        
        {/* Protective Vignette (Lightened for Parallel Mode) */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] z-10" />
      </div>

      {isFocused && (
        <div className="h-12 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 px-6 flex items-center justify-center">
          <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em]">StudyForge v4.1 • YouVersion Precision Stream</span>
        </div>
      )}
    </div>
  );
}
