"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Crosshair, 
  Map as MapIcon, 
  Satellite, 
  MousePointer2, 
  Plus, 
  Trash2, 
  Maximize, 
  Target,
  Layers,
  Activity,
  History,
  Globe,
  BookOpen,
  Sword,
  Clock,
  Settings2,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Category = 'HISTORICAL' | 'GEOGRAPHICAL' | 'LITERARY' | 'THEOLOGICAL';
type Era = 'OT' | 'NT';

interface Marker {
  id: string;
  x: number;
  y: number;
  label: string;
  type: 'base' | 'target' | 'hazard';
}

const mapConfig = {
  MODERN: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?q=80&w=2000",
  ANCIENT_OT: "https://images.unsplash.com/photo-1599394017325-1e0467770877?q=80&w=2000",
  ANCIENT_NT: "https://images.unsplash.com/photo-1548115184-bc6544d06a58?q=80&w=2000",
};

export function TacticalMap({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'schematic' | 'satellite'>('schematic');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  
  // States for Layer Management
  const [activeEras, setActiveEras] = useState<Record<Category, Era>>({
    HISTORICAL: 'OT',
    GEOGRAPHICAL: 'OT',
    LITERARY: 'OT',
    THEOLOGICAL: 'NT'
  });
  const [globalOpacity, setGlobalOpacity] = useState(50);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Phase 3: Image Loading State
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  const isSyncComplete = useMemo(() => {
    const totalAssets = 3;
    return (loadedImages.size + failedImages.size) >= totalAssets;
  }, [loadedImages, failedImages]);

  // Constants
  const GRID_SIZE = 50;
  const ZOOM_SPEED = 0.002; // Slightly increased for better response
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 5;

  const handleImageLoad = (key: string) => {
    setLoadedImages(prev => new Set(prev).add(key));
  };

  const handleImageError = (key: string) => {
    console.warn(`[MapEngine] Failed to load asset: ${key}`);
    setFailedImages(prev => new Set(prev).add(key));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAddingMarker) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - (isSidebarOpen ? (rect.width - 240) / 2 : rect.width / 2) - offset.x) / scale;
        const y = (e.clientY - rect.top - rect.height / 2 - offset.y) / scale;
        const newMarker: Marker = {
          id: Math.random().toString(36).substr(2, 9),
          x,
          y,
          label: `POI-${markers.length + 1}`,
          type: 'target'
        };
        setMarkers([...markers, newMarker]);
        setIsAddingMarker(false);
      }
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = Math.round((e.clientX - rect.left - (isSidebarOpen ? (rect.width - 240) / 2 : rect.width / 2) - offset.x) / scale);
      const y = Math.round((e.clientY - rect.top - rect.height / 2 - offset.y) / scale);
      setMousePos({ x, y });
    }

    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * ZOOM_SPEED;
    const newScale = Math.min(Math.max(MIN_ZOOM, scale + delta), MAX_ZOOM);
    setScale(newScale);
  };

  const resetViewport = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const removeMarker = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMarkers(markers.filter(m => m.id !== id));
  };

  // Generate grid lines
  const renderGrid = () => {
    const lines = [];
    const size = 3000;
    for (let i = -size; i <= size; i += GRID_SIZE) {
      lines.push(
        <line 
          key={`v-${i}`} 
          x1={i} y1={-size} x2={i} y2={size} 
          stroke="currentColor" 
          strokeWidth={i === 0 ? "2" : "0.5"} 
          className={cn(
            i === 0 ? "text-blue-500/50" : "text-white/5",
            "transition-opacity duration-500"
          )}
          style={{ opacity: viewMode === 'schematic' ? (100 - globalOpacity) / 100 : 0.1 }}
        />
      );
      lines.push(
        <line 
          key={`h-${i}`} 
          x1={-size} y1={i} x2={size} y2={i} 
          stroke="currentColor" 
          strokeWidth={i === 0 ? "2" : "0.5"} 
          className={cn(
            i === 0 ? "text-blue-500/50" : "text-white/5",
            "transition-opacity duration-500"
          )}
          style={{ opacity: viewMode === 'schematic' ? (100 - globalOpacity) / 100 : 0.1 }}
        />
      );
    }
    return lines;
  };

  const categories: { key: Category; label: string; icon: any }[] = [
    { key: 'HISTORICAL', label: 'Historical', icon: History },
    { key: 'GEOGRAPHICAL', label: 'Geographical', icon: Globe },
    { key: 'LITERARY', label: 'Literary', icon: BookOpen },
    { key: 'THEOLOGICAL', label: 'Theological', icon: Sword },
  ];

  // Determine which ancient era is globally prioritized for the main image layer
  const dominantEra = activeEras['HISTORICAL']; // Historical era takes visual precedence for the image layer

  return (
    <div className={cn("flex w-full h-full bg-[#02040a] overflow-hidden select-none relative", className)}>
      
      {/* HUD Loading Overlay */}
      {!isSyncComplete && (
        <div className="absolute inset-0 z-[100] bg-[#02040a]/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 pointer-events-none">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Mission Assets Synchronizing</span>
                <span className="text-[8px] font-mono text-white/20 uppercase mt-2">Fetching Grid Archives...</span>
            </div>
            {/* Progress indicators */}
            <div className="flex gap-2 mt-4">
                {['MODERN', 'ANCIENT_OT', 'ANCIENT_NT'].map(key => (
                    <div key={key} className={cn(
                        "h-1 w-8 rounded-full transition-colors duration-500",
                        loadedImages.has(key) ? "bg-blue-500 shadow-[0_0_10px_#3b82f6]" : 
                        failedImages.has(key) ? "bg-red-500/50" : "bg-white/5"
                    )} />
                ))}
            </div>
        </div>
      )}

      {/* Map Engine Layer Container */}
      <div 
        ref={containerRef}
        className="flex-grow relative overflow-hidden flex flex-col group cursor-crosshair h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Transform Wrapper for Images and SVG */}
        <div 
            className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-out"
            style={{ 
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'center center'
            }}
        >
          {/* Layer 0: MODERN Base Map */}
          <img 
            src={mapConfig.MODERN} 
            alt="Modern Map" 
            crossOrigin="anonymous"
            onLoad={() => handleImageLoad('MODERN')}
            onError={() => handleImageError('MODERN')}
            className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
                failedImages.has('MODERN') ? "opacity-0" : "opacity-60"
            )}
          />

          {/* Layer 1: ANCIENT Overlay (OT) */}
          <img 
            src={mapConfig.ANCIENT_OT} 
            alt="Ancient OT" 
            crossOrigin="anonymous"
            onLoad={() => handleImageLoad('ANCIENT_OT')}
            onError={() => handleImageError('ANCIENT_OT')}
            className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
                dominantEra === 'OT' && !failedImages.has('ANCIENT_OT') ? "visible" : "invisible"
            )}
            style={{ opacity: (100 - globalOpacity) / 100 }}
          />

          {/* Layer 1: ANCIENT Overlay (NT) */}
          <img 
            src={mapConfig.ANCIENT_NT} 
            alt="Ancient NT" 
            crossOrigin="anonymous"
            onLoad={() => handleImageLoad('ANCIENT_NT')}
            onError={() => handleImageError('ANCIENT_NT')}
            className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
                dominantEra === 'NT' && !failedImages.has('ANCIENT_NT') ? "visible" : "invisible"
            )}
            style={{ opacity: (100 - globalOpacity) / 100 }}
          />

          {/* SVG Overlay (Grid & Markers) */}
          <svg 
            className="absolute inset-0 w-full h-full"
            viewBox="-500 -500 1000 1000"
            preserveAspectRatio="xMidYMid slice"
          >
            <g>
              {/* Grid */}
              {renderGrid()}

              {/* Markers */}
              {markers.map((marker) => (
                <g 
                  key={marker.id} 
                  transform={`translate(${marker.x}, ${marker.y})`}
                  className="cursor-pointer group/marker"
                >
                  <circle r="15" fill="rgba(59, 130, 246, 0.2)" className="animate-ping" />
                  <circle r="4" fill="#3b82f6" className="shadow-[0_0_10px_#3b82f6]" />
                  <g transform="translate(10, -10)">
                    <rect x="0" y="-14" width="60" height="18" rx="4" className="fill-black/80 stroke-blue-500/30" />
                    <text x="5" y="-1" className="fill-blue-400 font-mono text-[8px] font-black uppercase tracking-tighter">
                      {marker.label}
                    </text>
                    <circle 
                      cx="52" cy="-5" r="5" 
                      className="fill-red-500/20 hover:fill-red-500 transition-colors pointer-events-auto" 
                      onClick={(e) => removeMarker(marker.id, e as any)}
                    />
                  </g>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* HUD UI Elements (Non-transformed) */}
        
        {/* HUD Main Toggles */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          <div className="flex bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-1 gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setViewMode('schematic')}
              className={cn(
                "h-8 px-3 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                viewMode === 'schematic' ? "bg-blue-600 text-white" : "text-white/40 hover:text-white"
              )}
            >
              <MapIcon className="mr-2 h-3.5 w-3.5" /> Schematic
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setViewMode('satellite')}
              className={cn(
                "h-8 px-3 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                viewMode === 'satellite' ? "bg-blue-600 text-white" : "text-white/40 hover:text-white"
              )}
            >
              <Satellite className="mr-2 h-3.5 w-3.5" /> Satellite
            </Button>
          </div>

          <div className="flex bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-1 gap-1 w-fit">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsAddingMarker(!isAddingMarker)}
              className={cn(
                "h-8 w-8 p-0 rounded-lg transition-all",
                isAddingMarker ? "bg-red-600 text-white" : "text-white/40 hover:text-white"
              )}
            >
              <Target className="h-3.5 w-3.5" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={resetViewport}
              className="h-8 w-8 p-0 text-white/40 hover:text-white rounded-lg"
            >
              <Maximize className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Live Data Overlay */}
        <div className={cn(
            "absolute bottom-4 left-4 right-4 flex items-end justify-between transition-all duration-500 pointer-events-none",
            isSidebarOpen ? "pr-[240px]" : "pr-0"
        )}>
          <div className="flex flex-col gap-1">
            <div className="bg-black/60 backdrop-blur-md border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-3">
               <div className="flex flex-col">
                 <span className="text-[7px] font-black uppercase text-blue-500/50 leading-none mb-1">Grid Coordinates</span>
                 <div className="flex gap-4 font-mono text-[10px] font-black text-blue-400 tabular-nums">
                   <span>X: {mousePos.x}</span>
                   <span>Y: {mousePos.y}</span>
                 </div>
               </div>
               <div className="h-6 w-px bg-white/10" />
               <div className="flex flex-col">
                 <span className="text-[7px] font-black uppercase text-blue-500/50 leading-none mb-1">Zoom Factor</span>
                 <span className="font-mono text-[10px] font-black text-blue-400">{(scale * 100).toFixed(0)}%</span>
               </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {isAddingMarker && (
              <div className="bg-red-600/20 border border-red-500/50 px-3 py-1 rounded-full animate-pulse">
                <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Awaiting Deployment Point...</span>
              </div>
            )}
            <div className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-lg px-3 py-1">
              <div className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-blue-500 animate-pulse" />
                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Anti-Gravity Engine Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/60 border border-white/10 p-1.5 rounded-l-lg text-white/40 hover:text-white transition-all z-20"
        >
          {isSidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Decorative Borders */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500/20 rounded-tl-xl z-20" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-500/20 rounded-tr-xl z-20" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-500/20 rounded-bl-xl z-20" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500/20 rounded-br-xl z-20" />

        {/* Crosshair Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 z-10">
           <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/50" />
           <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/50" />
        </div>
      </div>

      {/* Layer Management Sidebar */}
      <aside className={cn(
        "bg-[#02040a] border-l border-white/10 flex flex-col transition-all duration-500 ease-in-out relative overflow-hidden",
        isSidebarOpen ? "w-[240px] opacity-100" : "w-0 opacity-0"
      )}>
        {/* ... Sidebar Content remains the same ... */}
        <div className="p-4 border-b border-white/5 bg-slate-950/50">
            <div className="flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-blue-500" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Layer Management</h3>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {categories.map((cat) => (
                <div key={cat.key} className="space-y-3">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <cat.icon className="h-3 w-3 text-white/30 group-hover:text-blue-500 transition-colors" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{cat.label}</span>
                        </div>
                        <div className="h-1 w-1 bg-blue-500 rounded-full animate-pulse shadow-[0_0_5px_#3b82f6]" />
                    </div>

                    <div className="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-lg border border-white/5">
                        <button 
                            onClick={() => setActiveEras(prev => ({ ...prev, [cat.key]: 'OT' }))}
                            className={cn(
                                "py-1 text-[8px] font-black uppercase tracking-tighter rounded transition-all",
                                activeEras[cat.key] === 'OT' ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-white/20 hover:bg-white/5"
                            )}
                        >
                            Old Era
                        </button>
                        <button 
                            onClick={() => setActiveEras(prev => ({ ...prev, [cat.key]: 'NT' }))}
                            className={cn(
                                "py-1 text-[8px] font-black uppercase tracking-tighter rounded transition-all",
                                activeEras[cat.key] === 'NT' ? "bg-red-600/20 text-red-400 border border-red-500/30" : "text-white/20 hover:bg-white/5"
                            )}
                        >
                            New Era
                        </button>
                    </div>
                </div>
            ))}
        </div>

        {/* Global Opacity Slider (Then vs Now) */}
        <div className="p-5 border-t border-white/10 bg-black/40 space-y-4">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.2em]">
                <span className="text-blue-500">Ancient Era</span>
                <span className="text-red-500">Modern View</span>
            </div>
            
            <div className="relative h-6 flex items-center">
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={globalOpacity}
                    onChange={(e) => setGlobalOpacity(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-red-500 transition-all"
                />
                <div 
                    className="absolute top-0 bottom-0 w-px bg-white/20 pointer-events-none" 
                    style={{ left: '50%' }}
                />
            </div>

            <div className="flex items-center justify-between">
                <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.3em] font-black">Temporal Blend</span>
                <span className="text-[9px] font-mono font-black text-blue-400">{100 - globalOpacity}% / {globalOpacity}%</span>
            </div>
        </div>
      </aside>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
}
