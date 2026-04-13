"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Marker, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import { Calibration } from "./types";

interface AlignmentControllerProps {
  calibration: Calibration;
  onChange: (newCalibration: Calibration) => void;
  /** Show/hide the entire controller (respects overlay visibility) */
  isVisible: boolean;
  /** When true, all handles are hidden and map interactions are untouched */
  isLocked: boolean;
  /** Name of the overlay being calibrated (for label) */
  overlayName?: string;
}

type HandleKey = keyof Calibration | "center";

// ─── Icons ────────────────────────────────────────────────────────────────────
const createHandleIcon = (color: string, size = 10) =>
  L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      width:${size}px;height:${size}px;
      border:2.5px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 2px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.6);
      cursor:crosshair;
      pointer-events:auto;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const createCenterIcon = () =>
  L.divIcon({
    className: "",
    html: `<div style="
      position:relative;
      width:20px;height:20px;
      cursor:move;
      pointer-events:auto;
    ">
      <div style="position:absolute;left:9px;top:0;width:2px;height:20px;background:#fff;border-radius:1px;"></div>
      <div style="position:absolute;top:9px;left:0;width:20px;height:2px;background:#fff;border-radius:1px;"></div>
      <div style="position:absolute;top:5px;left:5px;width:10px;height:10px;background:#3b82f6;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.4);"></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getOpposite(key: keyof Calibration): keyof Calibration {
  return ({ nw: "se", ne: "sw", sw: "ne", se: "nw" } as const)[key];
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AlignmentController({
  calibration,
  onChange,
  isVisible,
  isLocked,
}: AlignmentControllerProps) {
  const map = useMap();

  // ── Refs (no re-render cost, always current inside window listeners) ──────
  const activeHandleRef = useRef<HandleKey | null>(null);
  const startLatLngRef  = useRef<L.LatLng | null>(null);
  const startCalibRef   = useRef<Calibration | null>(null);
  const calibRef        = useRef<Calibration>(calibration);

  // Keep calibRef current on every render
  calibRef.current = calibration;

  // ── Global UP ─────────────────────────────────────────────────────────────
  const onGlobalUp = useCallback(() => {
    activeHandleRef.current = null;
    startLatLngRef.current  = null;
    startCalibRef.current   = null;

    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoom.enable();

    window.removeEventListener("mousemove", onGlobalMove);
    window.removeEventListener("mouseup",   onGlobalUp);
    window.removeEventListener("touchmove", onGlobalTouchMove);
    window.removeEventListener("touchend",  onGlobalUp);
    // Reset cursor
    document.body.style.cursor = "";
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Global MOVE ───────────────────────────────────────────────────────────
  const onGlobalMove = useCallback((e: MouseEvent | TouchEvent) => {
    const handle    = activeHandleRef.current;
    const startLL   = startLatLngRef.current;
    const startCalib = startCalibRef.current;
    if (!handle || !startLL || !startCalib) return;

    // Convert raw mouse/touch position to Leaflet LatLng
    const raw = e instanceof TouchEvent ? e.touches[0] : e;
    const currentLL = map.mouseEventToLatLng(raw as MouseEvent);

    const dLat = currentLL.lat - startLL.lat;
    const dLng = currentLL.lng - startLL.lng;
    let next: Calibration = { ...startCalib };

    if (handle === "center") {
      next = {
        nw: [startCalib.nw[0] + dLat, startCalib.nw[1] + dLng],
        ne: [startCalib.ne[0] + dLat, startCalib.ne[1] + dLng],
        sw: [startCalib.sw[0] + dLat, startCalib.sw[1] + dLng],
        se: [startCalib.se[0] + dLat, startCalib.se[1] + dLng],
      };
    } else {
      // Free‑form corner — keep opposite corner fixed (pivot-point)
      const opp   = getOpposite(handle);
      const pivot = startCalib[opp];
      const newLat = startCalib[handle][0] + dLat;
      const newLng = startCalib[handle][1] + dLng;

      // Anti-flip: ensure we don't cross the pivot
      const tooClose =
        Math.abs(newLat - pivot[0]) < 0.0001 ||
        Math.abs(newLng - pivot[1]) < 0.0001;

      if (!tooClose) {
        next[handle] = [newLat, newLng];
      }
    }

    onChange(next);
  }, [map, onChange]);

  const onGlobalTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    onGlobalMove(e);
  }, [onGlobalMove]);

  // ── MOUSEDOWN on a handle ─────────────────────────────────────────────────
  const onHandleDown = useCallback(
    (handleKey: HandleKey, e: L.LeafletMouseEvent) => {
      if (isLocked || !isVisible) return;

      // Hard kill — stop everything before map sees it
      L.DomEvent.stopPropagation(e as unknown as Event);
      L.DomEvent.preventDefault(e as unknown as Event);

      activeHandleRef.current = handleKey;
      startLatLngRef.current  = e.latlng;
      startCalibRef.current   = { ...calibRef.current };

      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
      document.body.style.cursor = "crosshair";

      window.addEventListener("mousemove", onGlobalMove,     { passive: true });
      window.addEventListener("mouseup",   onGlobalUp);
      window.addEventListener("touchmove", onGlobalTouchMove, { passive: false });
      window.addEventListener("touchend",  onGlobalUp);
    },
    [isLocked, isVisible, map, onGlobalMove, onGlobalUp, onGlobalTouchMove]
  );

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onGlobalMove);
      window.removeEventListener("mouseup",   onGlobalUp);
      window.removeEventListener("touchmove", onGlobalTouchMove);
      window.removeEventListener("touchend",  onGlobalUp);
      map.dragging.enable();
      map.scrollWheelZoom.enable();
    };
  }, [map, onGlobalMove, onGlobalUp, onGlobalTouchMove]);

  // ── Early exit: hidden or locked → render nothing ─────────────────────────
  if (!isVisible || isLocked) return null;

  const { nw, ne, sw, se } = calibration;
  const polygonPositions = [nw, ne, se, sw] as [number, number][];
  const centerLat = (nw[0] + ne[0] + sw[0] + se[0]) / 4;
  const centerLng = (nw[1] + ne[1] + sw[1] + se[1]) / 4;

  return (
    <>
      {/* Dashed border guide */}
      <Polygon
        positions={polygonPositions}
        pathOptions={{
          color: "#ef4444",
          weight: 1.5,
          fill: false,
          dashArray: "8 6",
          interactive: false,
        }}
      />

      {/* Center — global slide handle */}
      <Marker
        position={[centerLat, centerLng]}
        icon={createCenterIcon()}
        zIndexOffset={10000}
        eventHandlers={{ mousedown: (e) => onHandleDown("center", e) }}
      />

      {/* Four corner handles */}
      {(["nw", "ne", "sw", "se"] as const).map((key) => (
        <Marker
          key={key}
          position={calibration[key]}
          icon={createHandleIcon(
            key === "nw" || key === "se" ? "#3b82f6" : "#f97316",
            12
          )}
          zIndexOffset={9000}
          eventHandlers={{ mousedown: (e) => onHandleDown(key, e) }}
        />
      ))}
    </>
  );
}
