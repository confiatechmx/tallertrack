const fs = require('fs');
const path = require('path');
const sharp = require('C:\\Users\\eduar\\Repositorios\\autolisto\\node_modules\\sharp');

const repoDir = 'C:\\Users\\eduar\\Repositorios\\autolisto';
const brandDir = path.join(repoDir, 'public', 'brand');
if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

// 1. Isotipo Inner Elements (Symbol)
function getSymbolSvg(size = 64, isMono = false) {
  const bgFill = isMono ? 'url(#monoBg)' : 'url(#ttBadgeBg)';
  const whiteFill = 'url(#ttTrackWhite)';
  const cyanFill = isMono ? '#94A3B8' : 'url(#ttCyanTrack)';
  const sipeStroke = isMono ? '#0F172A' : '#1C3EFF';

  return `
    <defs>
      <linearGradient id="ttBadgeBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#1C3EFF"/>
        <stop offset="100%" stop-color="#0722C7"/>
      </linearGradient>
      <linearGradient id="monoBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#020617"/>
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
    <rect x="2" y="2" width="60" height="60" rx="14" fill="${bgFill}"/>
    <rect x="2" y="2" width="60" height="60" rx="14" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/>
    <g filter="url(#subtleShadow)">
      <!-- Aerodynamic Precision Crossbar with 45deg Speed Chamfer -->
      <path d="M12 15C12 13.3431 13.3431 12 15 12H46.5L52 18V21C52 22.6569 50.6569 24 49 24H15C13.3431 24 12 22.6569 12 21V15Z" fill="${whiteFill}"/>
      <!-- Tire Tread Sipes on Crossbar Wings -->
      <line x1="17" y1="14.5" x2="19.5" y2="21.5" stroke="${sipeStroke}" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="22" y1="14.5" x2="24.5" y2="21.5" stroke="${sipeStroke}" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="42" y1="14.5" x2="39.5" y2="21.5" stroke="${sipeStroke}" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="47" y1="14.5" x2="44.5" y2="21.5" stroke="${sipeStroke}" stroke-width="2.2" stroke-linecap="round"/>
      <!-- Dual Telemetry & Chassis Rails -->
      <path d="M22.5 24H29V48C29 49.6569 27.6569 51 26 51H25.5C23.8431 51 22.5 49.6569 22.5 48V24Z" fill="${whiteFill}"/>
      <path d="M33.5 24H40V44.5C40 46.1569 38.6569 47.5 37 47.5H36.5C34.8431 47.5 33.5 46.1569 33.5 44.5V24Z" fill="${cyanFill}"/>
      <!-- Forward Velocity Chevron Notch -->
      <path d="M26.5 32L31.5 37L26.5 42" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;
}

// 2. Horizontal Corporate Logo (Light Theme)
// Dimensions: 440 x 100
const horizontalLightSvg = `<svg viewBox="0 0 440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(16, 16) scale(1.0625)">
    ${getSymbolSvg(64, false)}
  </g>
  <!-- Wordmark -->
  <text x="102" y="55" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, sans-serif" font-size="38" font-weight="800" letter-spacing="-1.2">
    <tspan fill="#1D2030">Taller</tspan><tspan fill="#1C3EFF">Track</tspan>
  </text>
  <!-- Category Tagline -->
  <text x="103" y="75" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="10" font-weight="700" fill="#64748B" letter-spacing="2.2">
    SISTEMA OPERATIVO PARA TALLERES
  </text>
</svg>`;

// 3. Horizontal Corporate Logo (Dark Theme)
// Dimensions: 440 x 100
const horizontalDarkSvg = `<svg viewBox="0 0 440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(16, 16) scale(1.0625)">
    ${getSymbolSvg(64, false)}
  </g>
  <!-- Wordmark -->
  <text x="102" y="55" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, sans-serif" font-size="38" font-weight="800" letter-spacing="-1.2">
    <tspan fill="#FFFFFF">Taller</tspan><tspan fill="#38BDF8">Track</tspan>
  </text>
  <!-- Category Tagline -->
  <text x="103" y="75" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="10" font-weight="700" fill="#94A3B8" letter-spacing="2.2">
    SISTEMA OPERATIVO PARA TALLERES
  </text>
</svg>`;

// 4. Horizontal Corporate Logo (Monochrome / Print)
// Dimensions: 440 x 100
const horizontalMonoSvg = `<svg viewBox="0 0 440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(16, 16) scale(1.0625)">
    ${getSymbolSvg(64, true)}
  </g>
  <!-- Wordmark -->
  <text x="102" y="55" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, sans-serif" font-size="38" font-weight="800" letter-spacing="-1.2">
    <tspan fill="#0F172A">TallerTrack</tspan>
  </text>
  <!-- Category Tagline -->
  <text x="103" y="75" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="10" font-weight="700" fill="#475569" letter-spacing="2.2">
    SISTEMA OPERATIVO PARA TALLERES
  </text>
</svg>`;

// 5. Stacked / Vertical Centered Logo (Square Lockup)
// Dimensions: 360 x 360
const stackedLightSvg = `<svg viewBox="0 0 360 360" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Symbol Centered -->
  <g transform="translate(120, 60) scale(1.875)">
    ${getSymbolSvg(64, false)}
  </g>
  <!-- Wordmark Centered -->
  <text x="180" y="235" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, sans-serif" font-size="44" font-weight="800" letter-spacing="-1.5">
    <tspan fill="#1D2030">Taller</tspan><tspan fill="#1C3EFF">Track</tspan>
  </text>
  <!-- Tagline Centered -->
  <text x="180" y="265" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="11.5" font-weight="700" fill="#64748B" letter-spacing="2.5">
    SISTEMA OPERATIVO PARA TALLERES
  </text>
</svg>`;

const stackedDarkSvg = `<svg viewBox="0 0 360 360" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Symbol Centered -->
  <g transform="translate(120, 60) scale(1.875)">
    ${getSymbolSvg(64, false)}
  </g>
  <!-- Wordmark Centered -->
  <text x="180" y="235" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, sans-serif" font-size="44" font-weight="800" letter-spacing="-1.5">
    <tspan fill="#FFFFFF">Taller</tspan><tspan fill="#38BDF8">Track</tspan>
  </text>
  <!-- Tagline Centered -->
  <text x="180" y="265" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="11.5" font-weight="700" fill="#94A3B8" letter-spacing="2.5">
    SISTEMA OPERATIVO PARA TALLERES
  </text>
</svg>`;

// 6. OpenGraph Marketing Banner (1200 x 630 px)
const ogImageSvg = `<svg viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ogGlow" cx="600" cy="200" r="600" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1C3EFF" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#0B132B" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ogBorder" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="50%" stop-color="#38BDF8" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>
  </defs>

  <!-- Deep Midnight Canvas -->
  <rect width="1200" height="630" fill="#0B132B"/>
  <rect width="1200" height="630" fill="url(#ogGlow)"/>

  <!-- Subtle Precision Grid Pattern -->
  <g opacity="0.12" stroke="#FFFFFF" stroke-width="1">
    <line x1="0" y1="126" x2="1200" y2="126"/>
    <line x1="0" y1="252" x2="1200" y2="252"/>
    <line x1="0" y1="378" x2="1200" y2="378"/>
    <line x1="0" y1="504" x2="1200" y2="504"/>
    <line x1="240" y1="0" x2="240" y2="630"/>
    <line x1="480" y1="0" x2="480" y2="630"/>
    <line x1="720" y1="0" x2="720" y2="630"/>
    <line x1="960" y1="0" x2="960" y2="630"/>
  </g>

  <!-- Centered Logo Lockup -->
  <g transform="translate(420, 110) scale(1.6)">
    <g transform="translate(0, 0) scale(1.25)">
      ${getSymbolSvg(64, false)}
    </g>
    <text x="100" y="54" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="44" font-weight="800" letter-spacing="-1.5">
      <tspan fill="#FFFFFF">Taller</tspan><tspan fill="#38BDF8">Track</tspan>
    </text>
    <text x="102" y="74" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="11" font-weight="700" fill="#94A3B8" letter-spacing="2.6">
      SISTEMA OPERATIVO PARA TALLERES
    </text>
  </g>

  <!-- Headline & Value Proposition -->
  <text x="600" y="325" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="48" font-weight="800" fill="#FFFFFF" letter-spacing="-1.2">
    El software todo en uno para hacer crecer tu taller
  </text>
  <text x="600" y="375" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="22" font-weight="500" fill="#94A3B8">
    Flujo de Bahías • Inspección Digital DVI • Punto de Venta &amp; Caja • Facturación SAT
  </text>

  <!-- High-Tech Feature Badges Bar -->
  <g transform="translate(230, 435)">
    <!-- Badge 1 -->
    <rect x="0" y="0" width="160" height="42" rx="8" fill="#131E3A" stroke="#232F48" stroke-width="1.2"/>
    <text x="80" y="26" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif" font-size="13" font-weight="600" fill="#F1F5F9">Workflow en Bahías</text>

    <!-- Badge 2 -->
    <rect x="180" y="0" width="180" height="42" rx="8" fill="#131E3A" stroke="#232F48" stroke-width="1.2"/>
    <text x="270" y="26" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif" font-size="13" font-weight="600" fill="#38BDF8">DVI con Fotos WhatsApp</text>

    <!-- Badge 3 -->
    <rect x="380" y="0" width="160" height="42" rx="8" fill="#131E3A" stroke="#232F48" stroke-width="1.2"/>
    <text x="460" y="26" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif" font-size="13" font-weight="600" fill="#F1F5F9">Terminal POS &amp; Caja</text>

    <!-- Badge 4 -->
    <rect x="560" y="0" width="180" height="42" rx="8" fill="#131E3A" stroke="#232F48" stroke-width="1.2"/>
    <text x="650" y="26" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif" font-size="13" font-weight="600" fill="#F1F5F9">Llanteras &amp; Suspensión</text>
  </g>

  <!-- URL Footer -->
  <text x="600" y="555" text-anchor="middle" font-family="monospace" font-size="16" font-weight="700" fill="#38BDF8" letter-spacing="2">
    WWW.TALLERTRACK.COM
  </text>
</svg>`;

async function run() {
  console.log('Rendering full corporate logo assets...');

  // Save SVG files
  fs.writeFileSync(path.join(brandDir, 'tallertrack-logo-horizontal-light.svg'), horizontalLightSvg);
  fs.writeFileSync(path.join(brandDir, 'tallertrack-logo-horizontal-dark.svg'), horizontalDarkSvg);
  fs.writeFileSync(path.join(brandDir, 'tallertrack-logo-horizontal-mono.svg'), horizontalMonoSvg);
  fs.writeFileSync(path.join(brandDir, 'tallertrack-logo-stacked-light.svg'), stackedLightSvg);
  fs.writeFileSync(path.join(brandDir, 'tallertrack-logo-stacked-dark.svg'), stackedDarkSvg);

  // Render High-Resolution PNGs for marketing, docs, presentations
  // Horizontal 1760 x 400 (4x)
  await sharp(Buffer.from(horizontalLightSvg)).resize(1760, 400).png().toFile(path.join(brandDir, 'tallertrack-logo-horizontal-light.png'));
  await sharp(Buffer.from(horizontalDarkSvg)).resize(1760, 400).png().toFile(path.join(brandDir, 'tallertrack-logo-horizontal-dark.png'));
  await sharp(Buffer.from(horizontalMonoSvg)).resize(1760, 400).png().toFile(path.join(brandDir, 'tallertrack-logo-horizontal-mono.png'));

  // Standard web sizes (880 x 200)
  await sharp(Buffer.from(horizontalLightSvg)).resize(880, 200).png().toFile(path.join(brandDir, 'tallertrack-logo-horizontal-light-880.png'));
  await sharp(Buffer.from(horizontalDarkSvg)).resize(880, 200).png().toFile(path.join(brandDir, 'tallertrack-logo-horizontal-dark-880.png'));

  // Stacked 1080 x 1080 (3x)
  await sharp(Buffer.from(stackedLightSvg)).resize(1080, 1080).png().toFile(path.join(brandDir, 'tallertrack-logo-stacked-light.png'));
  await sharp(Buffer.from(stackedDarkSvg)).resize(1080, 1080).png().toFile(path.join(brandDir, 'tallertrack-logo-stacked-dark.png'));

  // OpenGraph Image 1200 x 630
  const ogBuf = await sharp(Buffer.from(ogImageSvg)).resize(1200, 630).png().toBuffer();
  fs.writeFileSync(path.join(brandDir, 'og-image.png'), ogBuf);
  fs.writeFileSync(path.join(repoDir, 'public', 'og-image.png'), ogBuf);
  fs.writeFileSync(path.join(repoDir, 'src', 'app', 'opengraph-image.png'), ogBuf);

  console.log('All full logo assets and OpenGraph card successfully created!');
}

run().catch(err => {
  console.error('Error rendering full logo assets:', err);
  process.exit(1);
});
