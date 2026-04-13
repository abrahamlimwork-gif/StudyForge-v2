// ── StudyForge Map Calibrations Export ──
// Generated: 2026-04-13T20:17:59.623Z
import { MapAsset } from "../components/map/types";

export const MAP_ASSETS_LIST: MapAsset[] = [
  {
    id: "paul_journeys",
    name: "Missionary Journeys of the Apostle Paul",
    type: "HISTORICAL",
    url: "/maps/paul-journeys.png",
    bounds: [[26.31311263768267, 8.701171875000002], [43.100982876188546, 39.19921875000001]],
    calibration: {
      nw: [43.100982876188546, 10.019531250000002],
      ne: [42.98857645832184, 39.19921875000001],
      sw: [26.31311263768267, 8.701171875000002],
      se: [26.352497858154024, 38.54003906250001]
    },
    opacity: 0.7,
    isVisible: false,
    zIndex: 15
  },
  {
    id: "israel_judah_848bc",
    name: "Kingdoms of Israel and Judah (848 B.C.)",
    type: "HISTORICAL",
    url: "/maps/israel-judah-848bc.png",
    bounds: [[29.38217507514529, 33.58520507812501], [33.65578083204094, 37.01843261718751]],
    calibration: {
      nw: [33.422272258866045, 33.82690429687501],
      ne: [33.65578083204094, 37.01843261718751],
      sw: [29.38217507514529, 33.58520507812501],
      se: [29.4865, 36.9985]
    },
    opacity: 0.7,
    isVisible: false,
    zIndex: 30
  },
  {
    id: "jerusalem_nehemiah",
    name: "Jerusalem (Walls of Nehemiah)",
    type: "ARCHAEOLOGICAL",
    url: "/maps/jerusalem-nehemiah.png",
    bounds: [[31.765409704780126, 35.24115800857545], [31.77330882116651, 35.24811029434205]],
    calibration: {
      nw: [31.77330882116651, 35.24115800857545],
      ne: [31.7729622228168, 35.24753093719483],
      sw: [31.76805498052404, 35.24139404296876],
      se: [31.765409704780126, 35.24811029434205]
    },
    opacity: 0.7,
    isVisible: false,
    zIndex: 90
  },
  {
    id: "eastern_judah",
    name: "Tribe of Judah (Eastern Territories)",
    type: "HISTORICAL",
    url: "/maps/eastern-judah.png",
    bounds: [[31.098805882350682, 34.83352661132813], [31.88222220265971, 35.56686401367188]],
    calibration: {
      nw: [31.88222220265971, 35.01480102539063],
      ne: [31.771375150628398, 35.54489135742188],
      sw: [31.098805882350682, 34.83352661132813],
      se: [31.213975956122024, 35.56686401367188]
    },
    opacity: 0.7,
    isVisible: false,
    zIndex: 45,
    needsManualCalibration: true
  },
  {
    id: "manasseh_west",
    name: "Tribe of Manasseh (West)",
    type: "HISTORICAL",
    url: "/maps/manasseh-west.png",
    bounds: [[31.683770377276034, 34.70581054687501], [32.88189375925038, 35.59570312500001]],
    calibration: {
      nw: [32.75494243654723, 34.70581054687501],
      ne: [32.88189375925038, 35.59570312500001],
      sw: [32.0865, 34.7985],
      se: [31.683770377276034, 35.48309326171876]
    },
    opacity: 0.7,
    isVisible: false,
    zIndex: 45,
    needsManualCalibration: true
  },
  {
    id: "tribe_benjamin",
    name: "Territory of the Tribe of Benjamin",
    type: "HISTORICAL",
    url: "/maps/tribe-benjamin.png",
    bounds: [[31.62765988554525, 34.9985], [31.9865, 35.56823730468751]],
    calibration: {
      nw: [31.9865, 34.9985],
      ne: [31.9865, 35.4985],
      sw: [31.7865, 34.9985],
      se: [31.62765988554525, 35.56823730468751]
    },
    opacity: 1,
    isVisible: false,
    zIndex: 45,
    needsManualCalibration: true
  },
  {
    id: "tribe_zebulun",
    name: "Region of the Tribe of Zebulun",
    type: "HISTORICAL",
    url: "/maps/tribe-zebulun.png",
    bounds: [[32.52828936482526, 34.90905761718751], [32.94645379269273, 35.58197021484376]],
    calibration: {
      nw: [32.90726224488304, 34.90905761718751],
      ne: [32.94645379269273, 35.58197021484376],
      sw: [32.5865, 34.9985],
      se: [32.52828936482526, 35.57373046875001]
    },
    opacity: 0.7,
    isVisible: true,
    zIndex: 45,
    needsManualCalibration: true
  },
  {
    id: "transjordan_east",
    name: "Transjordan Tribal Territories",
    type: "HISTORICAL",
    url: "/maps/transjordan-east.png",
    bounds: [[31.31844779444928, 35.38970947265626], [33.43373345341701, 36.96624755859376]],
    calibration: {
      nw: [33.408516828002675, 35.44464111328126],
      ne: [33.43373345341701, 36.96624755859376],
      sw: [31.31844779444928, 35.38970947265626],
      se: [31.374744111977954, 36.43615722656251]
    },
    opacity: 0.7,
    isVisible: true,
    zIndex: 45,
    needsManualCalibration: true
  }
];

export const MAP_ASSETS: Record<string, MapAsset> = MAP_ASSETS_LIST.reduce((acc, asset) => {
  acc[asset.id] = asset;
  return acc;
}, {} as Record<string, MapAsset>);
