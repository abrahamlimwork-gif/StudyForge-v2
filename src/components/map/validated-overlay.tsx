"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ImageOverlay, Rectangle, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { MapOverlay, Calibration } from "./types";
import { cn } from "@/lib/utils";

interface ValidatedOverlayProps {
  overlay: MapOverlay;
  globalOpacity: number;
  /** When true, clicking anywhere on image starts a whole-image drag */
  isCalibrationTarget?: boolean;
  onCalibrationChange?: (newCalib: Calibration) => void;
}

export function ValidatedOverlay({ overlay, globalOpacity, isCalibrationTarget, onCalibrationChange }: ValidatedOverlayProps) {
  const [hasError, setHasError] = useState(false);
  const isDev = process.env.NODE_ENV === "development";
  const map = useMap();

  // Refs for sticky drag state (never stale inside window listeners)
  const calibRef       = useRef<Calibration>(overlay.calibration);
  const startLatLngRef = useRef<L.LatLng | null>(null);
  const startCalibRef  = useRef<Calibration | null>(null);
  calibRef.current = overlay.calibration;

  const onGlobalUp = useCallback(() => {
    startLatLngRef.current = null;
    startCalibRef.current  = null;
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    document.body.style.cursor = "";
    window.removeEventListener("mousemove", onGlobalMove);
    window.removeEventListener("mouseup",   onGlobalUp);
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  const onGlobalMove = useCallback((e: MouseEvent) => {
    if (!startLatLngRef.current || !startCalibRef.current || !onCalibrationChange) return;
    const cur    = map.mouseEventToLatLng(e);
    const start  = startLatLngRef.current;
    const sc     = startCalibRef.current;
    const dLat   = cur.lat - start.lat;
    const dLng   = cur.lng - start.lng;
    onCalibrationChange({
      nw: [sc.nw[0] + dLat, sc.nw[1] + dLng],
      ne: [sc.ne[0] + dLat, sc.ne[1] + dLng],
      sw: [sc.sw[0] + dLat, sc.sw[1] + dLng],
      se: [sc.se[0] + dLat, sc.se[1] + dLng],
    });
  }, [map, onCalibrationChange]);

  const onImageMouseDown = useCallback((e: L.LeafletMouseEvent) => {
    if (!isCalibrationTarget || !onCalibrationChange) return;
    L.DomEvent.stopPropagation(e as unknown as Event);
    L.DomEvent.preventDefault(e as unknown as Event);
    startLatLngRef.current = e.latlng;
    startCalibRef.current  = { ...calibRef.current };
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    document.body.style.cursor = "grabbing";
    window.addEventListener("mousemove", onGlobalMove);
    window.addEventListener("mouseup",   onGlobalUp);
  }, [isCalibrationTarget, onCalibrationChange, map, onGlobalMove, onGlobalUp]);

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onGlobalMove);
      window.removeEventListener("mouseup",   onGlobalUp);
      map.dragging.enable();
    };
  }, [map, onGlobalMove, onGlobalUp]);

  // Reset error state if URL changes
  useEffect(() => {
    setHasError(false);
  }, [overlay.url]);

  if (!overlay.isVisible) return null;

  const currentOpacity = overlay.opacity * (globalOpacity / 100);

  if (hasError) {
    return (
      <Rectangle
        bounds={overlay.bounds}
        pathOptions={{
          color: isDev ? "#ef4444" : "#3b82f6",
          weight: 1,
          dashArray: "5, 10",
          fillColor: isDev ? "#ef4444" : "#02040a",
          fillOpacity: 0.1,
        }}
      >
        <Marker 
          position={L.latLngBounds(overlay.bounds).getCenter()} 
          icon={L.divIcon({
            className: "fallback-marker",
            html: `
              <div class="flex flex-col items-center justify-center p-2 rounded border bg-black/80 backdrop-blur-sm ${isDev ? 'border-red-500/50' : 'border-blue-500/20'}" style="min-width: 120px;">
                <span class="text-[8px] font-black uppercase tracking-widest ${isDev ? 'text-red-500' : 'text-blue-400/50'}">
                  ${isDev ? 'Asset Load Failure' : 'Syncing Archive...'}
                </span>
                <span class="text-[6px] font-mono text-white/20 mt-1 uppercase tracking-tighter">
                  ${overlay.name}
                </span>
                ${isDev ? `<span class="text-[6px] font-mono text-red-500 animate-pulse mt-1">Bypass Required</span>` : ''}
              </div>
            `,
            iconSize: [120, 60],
            iconAnchor: [60, 30],
          })}
        />
      </Rectangle>
    );
  }

  return (
    <ImageOverlay
      url={overlay.url}
      bounds={overlay.bounds}
      opacity={currentOpacity}
      zIndex={overlay.zIndex}
      eventHandlers={{
        error: () => {
          console.error(`[MapEngine] Asset visualization failed for: ${overlay.name} (${overlay.url})`);
          setHasError(true);
        },
        mousedown: isCalibrationTarget ? onImageMouseDown : undefined,
      }}
    />
  );
}
