"use client";

import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { BiblicalSite } from "./types";

interface SiteMarkerProps {
  site: BiblicalSite;
}

// Custom icon for Biblical Sites
const siteIcon = L.divIcon({
  className: "site-marker-icon",
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-6 h-6 bg-blue-500/20 rounded-full animate-ping"></div>
      <div class="w-2.5 h-2.5 bg-blue-500 rounded-full border border-white shadow-[0_0_10px_#3b82f6]"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export function SiteMarker({ site }: SiteMarkerProps) {
  return (
    <Marker position={[site.lat, site.lng]} icon={siteIcon}>
      <Popup className="custom-popup">
        <div className="p-2 min-w-[150px] bg-slate-900 text-white rounded-lg border border-blue-500/30">
          <h4 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-1">{site.name}</h4>
          <p className="text-[10px] text-white/70 leading-relaxed font-medium">
            {site.description}
          </p>
          <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center">
            <span className="text-[8px] font-mono text-white/30 uppercase tracking-tighter">
              {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
            </span>
            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase rounded border border-blue-500/20">
              {site.category}
            </span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
