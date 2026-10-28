const fs = require('fs');
const path = require('path');
const sharp = require('C:\\Users\\eduar\\Repositorios\\autolisto\\node_modules\\sharp');

const repoDir = 'C:\\Users\\eduar\\Repositorios\\autolisto';

// Master Badge SVG for Favicon and PWA App Icons
const masterBadgeSvg = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ttBadgeBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1C3EFF"/>
      <stop offset="100%" stop-color="#0722C7"/>
    </linearGradient>
    <linearGradient id="ttTrackWhite" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F1F5F9"/>
    </linearGradient>
    <linearGradient id="ttCyanTrack" x1="32" y1="20" x2="44" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#0EA5E9"/>
    </linearGradient>
    <filter id="subtleShadow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#00127A" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Industrial Engineering Squircle Container -->
  <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#ttBadgeBg)"/>
  <rect x="2" y="2" width="60" height="60" rx="14" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/>

  <g filter="url(#subtleShadow)">
    <!-- Aerodynamic Precision Crossbar with 45deg Speed Chamfer -->
    <path d="M12 15C12 13.3431 13.3431 12 15 12H46.5L52 18V21C52 22.6569 50.6569 24 49 24H15C13.3431 24 12 22.6569 12 21V15Z" fill="url(#ttTrackWhite)"/>

    <!-- High-Performance Tire Tread Sipes on Crossbar Wings -->
    <line x1="17" y1="14.5" x2="19.5" y2="21.5" stroke="#1C3EFF" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="22" y1="14.5" x2="24.5" y2="21.5" stroke="#1C3EFF" stroke-width="2.2" stroke-linecap="round"/>

    <line x1="42" y1="14.5" x2="39.5" y2="21.5" stroke="#1C3EFF" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="47" y1="14.5" x2="44.5" y2="21.5" stroke="#1C3EFF" stroke-width="2.2" stroke-linecap="round"/>

    <!-- Dual Telemetry & Chassis Rails (The Twin Track Stem) -->
    <!-- Left Rail: Solid Heavy Mechanical Pillar -->
    <path d="M22.5 24H29V48C29 49.6569 27.6569 51 26 51H25.5C23.8431 51 22.5 49.6569 22.5 48V24Z" fill="url(#ttTrackWhite)"/>

    <!-- Right Rail: High-Velocity Cyan Telemetry Track -->
    <path d="M33.5 24H40V44.5C40 46.1569 38.6569 47.5 37 47.5H36.5C34.8431 47.5 33.5 46.1569 33.5 44.5V24Z" fill="url(#ttCyanTrack)"/>

    <!-- The Apex Forward Chevron Notch in the Central Track Channel -->
    <path d="M26.5 32L31.5 37L26.5 42" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

// Helper function to build a multi-resolution ICO file containing PNG streams
function createIco(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalDirSize = count * dirEntrySize;
  let offset = headerSize + totalDirSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width === 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height === 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    dirEntries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(x => x.buffer)]);
}

async function build() {
  console.log('Generating master brand assets for TallerTrack...');
  const svgBuf = Buffer.from(masterBadgeSvg);

  // 1. Generate buffers at various sizes
  const p16 = await sharp(svgBuf).resize(16, 16).png().toBuffer();
  const p32 = await sharp(svgBuf).resize(32, 32).png().toBuffer();
  const p48 = await sharp(svgBuf).resize(48, 48).png().toBuffer();
  const p64 = await sharp(svgBuf).resize(64, 64).png().toBuffer();
  const p180 = await sharp(svgBuf).resize(180, 180).png().toBuffer();
  const p192 = await sharp(svgBuf).resize(192, 192).png().toBuffer();
  const p512 = await sharp(svgBuf).resize(512, 512).png().toBuffer();

  // Create valid multi-resolution ICO file
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: p16 },
    { width: 32, height: 32, buffer: p32 },
    { width: 48, height: 48, buffer: p48 }
  ]);

  // Ensure directories exist
  const publicIconsDir = path.join(repoDir, 'public', 'icons');
  if (!fs.existsSync(publicIconsDir)) fs.mkdirSync(publicIconsDir, { recursive: true });

  // 2. Write Next.js App Router metadata icon files in src/app/
  fs.writeFileSync(path.join(repoDir, 'src', 'app', 'icon.svg'), masterBadgeSvg);
  fs.writeFileSync(path.join(repoDir, 'src', 'app', 'icon.png'), p32);
  fs.writeFileSync(path.join(repoDir, 'src', 'app', 'apple-icon.png'), p180);
  fs.writeFileSync(path.join(repoDir, 'src', 'app', 'favicon.ico'), icoBuffer);

  // 3. Write public root assets
  fs.writeFileSync(path.join(repoDir, 'public', 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(repoDir, 'public', 'favicon.svg'), masterBadgeSvg);
  fs.writeFileSync(path.join(repoDir, 'public', 'favicon-16x16.png'), p16);
  fs.writeFileSync(path.join(repoDir, 'public', 'favicon-32x32.png'), p32);
  fs.writeFileSync(path.join(repoDir, 'public', 'apple-touch-icon.png'), p180);

  // 4. Write PWA manifest icons
  fs.writeFileSync(path.join(publicIconsDir, 'icon-192x192.png'), p192);
  fs.writeFileSync(path.join(publicIconsDir, 'icon-512x512.png'), p512);
  fs.writeFileSync(path.join(publicIconsDir, 'icon-maskable-512x512.png'), p512);

  console.log('All brand & favicon files successfully written to src/app and public!');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
