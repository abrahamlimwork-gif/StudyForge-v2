"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
    Layers, 
    Target, 
    Save, 
    Eye, 
    EyeOff, 
    Settings2, 
    Activity, 
    Crosshair,
    LocateFixed,
    Lock,
    Unlock,
    Copy,
    Download,
    ChevronRight,
    ChevronLeft,
    Navigation,
    BookOpen,
    Compass
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MapState, MapOverlay, MapAsset, BiblicalSite, LatLngBounds } from "./types";
import { MAP_ASSETS_LIST, MAP_ASSETS } from "@/config/map-assets";

// Dynamic import for Leaflet-based MapEngine to ensure SSR compatibility
const MapEngine = dynamic(
  () => import("./map-engine").then((mod) => mod.MapEngine),
  { ssr: false, loading: () => (
    <div className="w-full h-full bg-[#02040a] flex items-center justify-center">
        <Activity className="h-8 w-8 text-blue-500 animate-pulse" />
    </div>
  ) }
);

const DEFAULT_OVERLAYS: MapOverlay[] = MAP_ASSETS_LIST.map(asset => ({
  ...asset,
  isVisible: asset.id === "israel_judah_848bc" // Only show regional map by default
}));

const DEFAULT_SITES: BiblicalSite[] = [
  { id: "jer", name: "Jerusalem", lat: 31.7683, lng: 35.2137, description: "Capital of Judea and central site of Biblical history.", category: "MAJOR CITY" },
  { id: "bet", name: "Bethlehem", lat: 31.7054, lng: 35.2024, description: "Birthplace of David and Jesus.", category: "HISTORICAL" },
  { id: "naz", name: "Nazareth", lat: 32.7019, lng: 35.3033, description: "Home city of Joseph and Mary.", category: "HISTORICAL" },
  { id: "gal", name: "Sea of Galilee", lat: 32.8213, lng: 35.5878, description: "Central location of several miracles and early ministry.", category: "GEOGRAPHICAL" },
];

const CALIBRATION_STORAGE_KEY = "studyforge_map_calibrations_v1";

/** Merge any saved calibrations from localStorage into the registry defaults */
function getInitialOverlays(): MapOverlay[] {
  try {
    const saved = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (!saved) return DEFAULT_OVERLAYS;
    const savedMap: Record<string, { calibration: any; bounds: any; opacity: number }> = JSON.parse(saved);
    return DEFAULT_OVERLAYS.map(o =>
      savedMap[o.id] ? { ...o, ...savedMap[o.id] } : o
    );
  } catch {
    return DEFAULT_OVERLAYS;
  }
}

export function MapSystem({ className }: { className?: string }) {
  const [state, setState] = useState<MapState>(() => ({
    overlays: getInitialOverlays(),
    activeOverlayId: "israel_judah_848bc",
    sites: DEFAULT_SITES,
    isAlignmentMode: false,
    isLocked: false,
    globalOpacity: 80,
  }));
  
  const [lastInteraction, setLastInteraction] = useState<{ lat: number; lng: number } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const updateOverlay = useCallback((id: string, updates: Partial<MapOverlay>) => {
    setState(prev => {
      const next = {
        ...prev,
        overlays: prev.overlays.map(o => o.id === id ? { ...o, ...updates } : o)
      };
      // ── Auto-save calibrations to localStorage on every change ──────────
      try {
        const toSave: Record<string, object> = {};
        next.overlays.forEach(o => {
          toSave[o.id] = { calibration: o.calibration, bounds: o.bounds, opacity: o.opacity };
        });
        localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(toSave));
      } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  const saveConfig = () => {
    const activeOverlay = state.overlays.find(o => o.id === state.activeOverlayId);
    if (!activeOverlay) return;
    const exportObject = { ...activeOverlay, timestamp: new Date().toISOString() };
    navigator.clipboard.writeText(JSON.stringify(exportObject, null, 2))
        .then(() => alert("Active overlay config copied!"))
        .catch(err => console.error("Clipboard failure:", err));
  };

  /** Export full TypeScript MAP_ASSETS_LIST with ALL current calibrations */
  const exportAllCalibrations = () => {
    const lines: string[] = [
      `// ── StudyForge Map Calibrations Export ──`,
      `// Generated: ${new Date().toISOString()}`,
      `import { MapAsset } from "../components/map/types";`,
      ``,
      `export const MAP_ASSETS_LIST: MapAsset[] = [`,
    ];
    state.overlays.forEach((o, i) => {
      const comma = i < state.overlays.length - 1 ? "," : "";
      lines.push(`  {`);
      lines.push(`    id: "${o.id}",`);
      lines.push(`    name: "${o.name}",`);
      lines.push(`    type: "${o.type}",`);
      lines.push(`    url: "${o.url}",`);
      lines.push(`    bounds: [[${o.bounds[0][0]}, ${o.bounds[0][1]}], [${o.bounds[1][0]}, ${o.bounds[1][1]}]],`);
      lines.push(`    calibration: {`);
      lines.push(`      nw: [${o.calibration.nw[0]}, ${o.calibration.nw[1]}],`);
      lines.push(`      ne: [${o.calibration.ne[0]}, ${o.calibration.ne[1]}],`);
      lines.push(`      sw: [${o.calibration.sw[0]}, ${o.calibration.sw[1]}],`);
      lines.push(`      se: [${o.calibration.se[0]}, ${o.calibration.se[1]}]`);
      lines.push(`    },`);
      lines.push(`    opacity: ${o.opacity},`);
      lines.push(`    isVisible: ${o.isVisible},`);
      lines.push(`    zIndex: ${o.zIndex}${o.needsManualCalibration ? "," : ""}`);
      if (o.needsManualCalibration) lines.push(`    needsManualCalibration: true`);
      lines.push(`  }${comma}`);
    });
    lines.push(`];`);
    lines.push(``);
    lines.push(`export const MAP_ASSETS: Record<string, MapAsset> = MAP_ASSETS_LIST.reduce((acc, asset) => {`);
    lines.push(`  acc[asset.id] = asset;`);
    lines.push(`  return acc;`);
    lines.push(`}, {} as Record<string, MapAsset>);`);

    const fullTs = lines.join("\n");
    navigator.clipboard.writeText(fullTs)
      .then(() => alert(`✅ All ${state.overlays.length} calibrations copied!\n\nPaste into src/config/map-assets.ts to save permanently.`))
      .catch(err => console.error("Clipboard failure:", err));
  };

  return (
    <div className={cn("flex w-full h-full bg-[#02040a] overflow-hidden select-none relative", className)}>
      {/* Primary Map Engine */}
      <div className="flex-grow relative h-full">
        <MapEngine 
            state={state} 
            onOverlayUpdate={updateOverlay}
            onInteraction={(latlng) => setLastInteraction({ lat: latlng.lat, lng: latlng.lng })}
        />

        {/* HUD UI Elements */}
        
        {/* Top Control Bar */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-[1000]">
           <div className="flex bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-1 gap-1">
             <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setState(s => ({ ...s, isAlignmentMode: !s.isAlignmentMode }))}
                className={cn(
                    "h-8 px-3 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                    state.isAlignmentMode ? "bg-red-600 text-white" : "text-white/40 hover:text-white"
                )}
             >
                <Target className="mr-2 h-3.5 w-3.5" /> 
                {state.isAlignmentMode ? "Calibration Active" : "Aligner Off"}
             </Button>
             <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setState(s => ({ ...s, isLocked: !s.isLocked }))}
                className={cn(
                    "h-8 px-3 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                    state.isLocked ? "text-amber-500" : "text-white/40 hover:text-white"
                )}
             >
                {state.isLocked ? <Lock className="mr-2 h-3.5 w-3.5" /> : <Unlock className="mr-2 h-3.5 w-3.5" />}
                {state.isLocked ? "Map Locked" : "Unlocked"}
             </Button>
             <Button 
                size="sm" 
                variant="ghost" 
                onClick={saveConfig}
                className="h-8 px-3 text-[9px] font-black uppercase tracking-widest rounded-lg text-white/40 hover:text-white"
             >
                <Copy className="mr-2 h-3.5 w-3.5" /> Copy Active
             </Button>
             <Button 
                size="sm" 
                variant="ghost" 
                onClick={exportAllCalibrations}
                className="h-8 px-3 text-[9px] font-black uppercase tracking-widest rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40"
             >
                <Download className="mr-2 h-3.5 w-3.5" /> Export All
             </Button>
           </div>

           {/* Calibration Mode Active Indicator */}
           {state.isAlignmentMode && state.activeOverlayId && (() => {
             const activeOverlay = state.overlays.find(o => o.id === state.activeOverlayId);
             return (
               <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/40 rounded-lg px-3 py-1.5">
                 <Crosshair className="h-3 w-3 text-red-400 animate-pulse" />
                 <div className="flex flex-col">
                   <span className="text-[7px] font-black uppercase text-red-400/60 leading-none">Calibration Mode</span>
                   <span className="text-[9px] font-black text-red-300 leading-tight truncate max-w-[200px]">
                     {activeOverlay?.name ?? state.activeOverlayId}
                   </span>
                 </div>
                 {!activeOverlay?.isVisible && (
                   <span className="text-[7px] font-black uppercase text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5">HIDDEN</span>
                 )}
               </div>
             );
           })()}
        </div>

        {/* Live Coordinate Overlay */}
        <div className={cn(
            "absolute bottom-4 left-4 flex items-end justify-between transition-all duration-500 pointer-events-none z-[1000]",
            isSidebarOpen ? "w-[calc(100%-256px)]" : "w-[calc(100%-32px)]"
        )}>
          <div className="flex flex-col gap-1">
            <div className="bg-black/60 backdrop-blur-md border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-3">
               <div className="flex flex-col">
                 <span className="text-[7px] font-black uppercase text-blue-500/50 leading-none mb-1">Global Telemetry</span>
                 <div className="flex gap-4 font-mono text-[10px] font-black text-blue-400 tabular-nums">
                   <span>LAT: {lastInteraction?.lat.toFixed(4) || "0.0000"}</span>
                   <span>LNG: {lastInteraction?.lng.toFixed(4) || "0.0000"}</span>
                 </div>
               </div>
               <div className="h-6 w-px bg-white/10" />
               <div className="flex flex-col">
                 <span className="text-[7px] font-black uppercase text-blue-500/50 leading-none mb-1">Status</span>
                 <div className="flex items-center gap-1.5">
                    <Activity className="h-2.5 w-2.5 text-blue-500 animate-pulse" />
                    <span className="font-mono text-[9px] font-black text-white/40 uppercase">Hybrid Map Active</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/60 border border-white/10 p-1.5 rounded-l-lg text-white/40 hover:text-white transition-all z-[1000]"
        >
          {isSidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Layer Management Sidebar */}
      <aside className={cn(
        "bg-[#02040a] border-l border-white/10 flex flex-col transition-all duration-500 ease-in-out relative overflow-hidden z-[1001]",
        isSidebarOpen ? "w-[240px] opacity-100" : "w-0 opacity-0"
      )}>
        <div className="p-4 border-b border-white/5 bg-slate-950/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-blue-500" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Apostolic HUD</h3>
            </div>
            <Settings2 className="h-3 w-3 text-white/20" />
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {/* Layer Stack */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Navigation className="h-3 w-3 text-blue-500/50" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Active Layers</span>
                </div>
                {state.overlays.map((overlay) => (
                    <div key={overlay.id} className={cn(
                        "p-3 rounded-xl border transition-all duration-300",
                        state.activeOverlayId === overlay.id ? "bg-blue-600/5 border-blue-500/40" : "bg-black/40 border-white/5"
                    )}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-white/80">{overlay.name}</span>
                                <span className={cn(
                                    "px-1.5 py-0.5 text-[6px] font-black uppercase rounded",
                                    overlay.type === 'HISTORICAL' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                )}>
                                    {overlay.type}
                                </span>
                            </div>
                            <button 
                                onClick={() => updateOverlay(overlay.id, { isVisible: !overlay.isVisible })}
                                className={cn("p-1 rounded hover:bg-white/10 transition-colors", overlay.isVisible ? "text-blue-500" : "text-white/20")}
                            >
                                {overlay.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[7px] font-mono text-white/30 uppercase tracking-tighter">Layer Opacity</span>
                                <span className="text-[8px] font-mono text-blue-400">{Math.round(overlay.opacity * 100)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" max="1" step="0.01"
                                value={overlay.opacity}
                                onChange={(e) => updateOverlay(overlay.id, { opacity: parseFloat(e.target.value) })}
                                className="w-full h-1 bg-white/5 rounded-full appearance-none accent-blue-500 cursor-pointer"
                            />
                        </div>

                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setState(s => ({
                              ...s,
                              activeOverlayId: overlay.id,
                              isAlignmentMode: true,
                            }))}
                            className={cn(
                                "w-full mt-3 h-6 text-[7px] font-black uppercase tracking-widest",
                                state.activeOverlayId === overlay.id && state.isAlignmentMode
                                  ? "bg-red-600/20 text-red-400 border border-red-500/20"
                                  : "text-white/20"
                            )}
                        >
                            <Crosshair className="mr-1 h-2.5 w-2.5" />
                            {state.activeOverlayId === overlay.id && state.isAlignmentMode ? "Calibrating..." : "Focus Calibration"}
                        </Button>
                    </div>
                ))}
            </div>

            {/* Sites Legend */}
            <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <LocateFixed className="h-3 w-3 text-blue-500/50" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Mission Points</span>
                </div>
                {state.sites.map(site => (
                    <div key={site.id} className="flex items-center gap-2 group cursor-help">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:shadow-[0_0_5px_#3b82f6] transition-all" />
                        <span className="text-[8px] font-bold text-white/50 group-hover:text-white/90 transition-colors">{site.name}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Global Controls */}
        <div className="p-5 border-t border-white/10 bg-black/40 space-y-4">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.2em]">
                <span className="text-white/30">Master Temporal Blend</span>
                <span className="text-blue-500">{state.globalOpacity}%</span>
            </div>
            <input 
                type="range" 
                min="0" max="100"
                value={state.globalOpacity}
                onChange={(e) => setState(s => ({ ...s, globalOpacity: parseInt(e.target.value) }))}
                className="w-full h-1 bg-white/5 rounded-full appearance-none accent-blue-500 cursor-pointer"
            />
            <div className="flex items-center justify-between">
                <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.3em] font-black">Hybrid Core v3.0</span>
                <BookOpen size={10} className="text-white/10" />
            </div>
        </div>
      </aside>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.2); }
      `}</style>
    </div>
  );
}
