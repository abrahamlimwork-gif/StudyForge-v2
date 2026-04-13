"use client";

import React from "react";
import { 
  MapContainer, 
  TileLayer, 
  ImageOverlay, 
  LayersControl, 
  useMapEvents 
} from "react-leaflet";
import L from "leaflet";
import { MapState, MapOverlay, LatLngBounds } from "./types";
import { AlignmentController } from "./alignment-controller";
import { SiteMarker } from "./site-marker";

import { ValidatedOverlay } from "./validated-overlay";

// Fix for default Leaflet marker icons in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapEngineProps {
  state: MapState;
  onOverlayUpdate: (id: string, updates: Partial<MapOverlay>) => void;
  onInteraction: (latlng: L.LatLng) => void;
}

function InteractionHandler({ onInteraction }: { onInteraction: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onInteraction(e.latlng);
    },
  });
  return null;
}

export function MapEngine({ state, onOverlayUpdate, onInteraction }: MapEngineProps) {
  const center: [number, number] = [31.5, 34.8];
  const zoom = 7;

  // Shared calibration update handler — used by both image-drag and handle-drag
  const handleCalibrationChange = React.useCallback((newCalibration: import("./types").Calibration) => {
    if (!state.activeOverlayId) return;
    onOverlayUpdate(state.activeOverlayId, {
      calibration: newCalibration,
      bounds: [
        [
          Math.min(newCalibration.nw[0], newCalibration.ne[0], newCalibration.sw[0], newCalibration.se[0]),
          Math.min(newCalibration.nw[1], newCalibration.ne[1], newCalibration.sw[1], newCalibration.se[1]),
        ],
        [
          Math.max(newCalibration.nw[0], newCalibration.ne[0], newCalibration.sw[0], newCalibration.se[0]),
          Math.max(newCalibration.nw[1], newCalibration.ne[1], newCalibration.sw[1], newCalibration.se[1]),
        ],
      ] as any,
    });
  }, [state.activeOverlayId, onOverlayUpdate]);

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      className="w-full h-full bg-[#02040a]"
      zoomControl={false} // Custom controls in HUD
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <InteractionHandler onInteraction={onInteraction} />

      {/* Overlays Stack */}
      {state.overlays.map((overlay) => {
        const isTarget = state.isAlignmentMode && !state.isLocked && overlay.id === state.activeOverlayId;
        return (
          <ValidatedOverlay
            key={overlay.id}
            overlay={overlay}
            globalOpacity={state.globalOpacity}
            isCalibrationTarget={isTarget}
            onCalibrationChange={isTarget ? handleCalibrationChange : undefined}
          />
        );
      })}

      {/* Alignment System — corner handles for active overlay */}
      {state.isAlignmentMode && state.activeOverlayId && (
        <AlignmentController
          isVisible={true}
          isLocked={state.isLocked}
          calibration={
            state.overlays.find(o => o.id === state.activeOverlayId)?.calibration ||
            { nw: [0,0], ne: [0,0], se: [1,1], sw: [1,1] }
          }
          onChange={handleCalibrationChange}
        />
      )}

      {/* Markers */}
      {state.sites.map((site) => (
        <SiteMarker key={site.id} site={site} />
      ))}
    </MapContainer>
  );
}
