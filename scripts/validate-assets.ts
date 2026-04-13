import { MAP_ASSETS_LIST } from "../src/config/map-assets";

/**
 * Coordinate Integrity Check
 * Ensures that the 4-point calibration is geometrically sound.
 * Rule 1: North (nw, ne) must be higher than South (sw, se).
 * Rule 2: East (ne, se) must be higher (more positive) than West (nw, sw).
 */
function validateAssets() {
  console.log("[Validation] Starting Coordinate Integrity Check...");
  let errorCount = 0;

  MAP_ASSETS_LIST.forEach((asset) => {
    const { nw, ne, sw, se } = asset.calibration;
    const issues: string[] = [];

    // Rule 1: Latitude Check (N > S)
    if (nw[0] <= sw[0]) issues.push(`Latitude flip: NW (${nw[0]}) <= SW (${sw[0]})`);
    if (ne[0] <= se[0]) issues.push(`Latitude flip: NE (${ne[0]}) <= SE (${se[0]})`);

    // Rule 2: Longitude Check (E > W)
    if (ne[1] <= nw[1]) issues.push(`Longitude flip: NE (${ne[1]}) <= NW (${nw[1]})`);
    if (se[1] <= sw[1]) issues.push(`Longitude flip: SE (${se[1]}) <= SW (${sw[1]})`);

    if (issues.length > 0) {
      console.error(`\n[CRITICAL] Asset "${asset.id}" has calibration errors:`);
      issues.forEach(msg => console.error(`  - ${msg}`));
      errorCount++;
    }
  });

  if (errorCount === 0) {
    console.log("\n[SUCCESS] All assets passed Coordinate Integrity Check.");
    process.exit(0);
  } else {
    console.error(`\n[FAILURE] ${errorCount} assets failed validation.`);
    process.exit(1);
  }
}

validateAssets();
