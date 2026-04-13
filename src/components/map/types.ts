export type OverlayType = 'HISTORICAL' | 'THEOLOGICAL' | 'ARCHAEOLOGICAL';

export interface LatLng {
  lat: number;
  lng: number;
}

export type LatLngBounds = [[number, number], [number, number]];

export interface Calibration {
  nw: [number, number];
  ne: [number, number];
  sw: [number, number];
  se: [number, number];
}

export interface MapOverlay {
  id: string;
  name: string;
  type: OverlayType;
  url: string;
  bounds: LatLngBounds;
  calibration: Calibration;
  opacity: number;
  isVisible: boolean;
  zIndex: number;
  needsManualCalibration?: boolean;
}

export type MapAsset = MapOverlay;

export interface BiblicalSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  category: string;
}

export interface MapState {
  overlays: MapOverlay[];
  activeOverlayId: string | null;
  sites: BiblicalSite[];
  isAlignmentMode: boolean;
  isLocked: boolean;
  globalOpacity: number;
}
