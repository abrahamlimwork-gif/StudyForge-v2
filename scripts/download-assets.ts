const https = require('https');
const fs = require('fs');
const path = require('path');

const ASSETS = [
  {
    name: "exodus.png",
    url: "https://images.unsplash.com/photo-15994017325-a41111624467?q=80&w=2048",
  },
  {
    name: "paul-journey.png",
    url: "https://images.unsplash.com/photo-1548115184-bc6544d06a58?q=80&w=2048",
  },
  {
    name: "base-biblical.png",
    url: "https://images.unsplash.com/photo-1501265976582-c1e1b0bbaf63?q=80&w=2048",
  }
];

const TARGET_DIR = path.join(__dirname, '../public/maps');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  console.log(`[AssetPipeline] Created directory: ${TARGET_DIR}`);
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        // Post-download validation: non-zero size
        const stats = fs.statSync(dest);
        if (stats.size > 0) {
          resolve(stats.size);
        } else {
          fs.unlinkSync(dest);
          reject(new Error("Downloaded file is empty."));
        }
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function run() {
  console.log("[AssetPipeline] Starting high-fidelity asset synchronization...");
  let successCount = 0;

  for (const asset of ASSETS) {
    const dest = path.join(TARGET_DIR, asset.name);
    
    // Check if valid file already exists
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log(`[AssetPipeline] Skipping existing asset: ${asset.name}`);
      successCount++;
      continue;
    }

    try {
      console.log(`[AssetPipeline] Syncing: ${asset.name} (Source: ${asset.url.substring(0, 40)}...)`);
      const size = await downloadFile(asset.url, dest);
      console.log(`[AssetPipeline] Successfully synchronized ${asset.name} (${(size / 1024 / 1024).toFixed(2)} MB)`);
      successCount++;
    } catch (err) {
      console.error(`[AssetPipeline] CRITICAL FAILURE for ${asset.name}:`, err.message);
    }
  }

  console.log(`\n[AssetPipeline] Sync Complete. Status: ${successCount}/${ASSETS.length} assets ready.`);
  if (successCount < ASSETS.length) {
    console.warn("[AssetPipeline] WARNING: Some assets failed to synchronize. Adaptive Fallback HUD will engage at runtime.");
  }
}

run();
