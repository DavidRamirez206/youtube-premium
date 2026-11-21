// Renders the app icons and TV backgrounds from assets/brand/*.svg.
// Run after changing the logo: node tools/render-icons.js

import { readFileSync, writeFileSync } from 'node:fs';

import { Resvg } from '@resvg/resvg-js';

const logo = readFileSync('assets/brand/logo.svg', 'utf8');
const mark = readFileSync('assets/brand/mark.svg', 'utf8');

/**
 * @param {string} svg
 * @param {string} out
 * @param {number} width
 */
function render(svg, out, width) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    .render()
    .asPng();
  writeFileSync(out, png);
  console.info(`${out} (${width}px)`);
}

for (const [name, size] of /** @type {const} */ ([
  ['icon.png', 80],
  ['mediumLargeIcon.png', 115],
  ['largeIcon.png', 130],
  ['extraLargeIcon.png', 192]
])) {
  render(logo, `assets/${name}`, size);
}

// 33x23 play glyph used by webOS in the launcher bar.
render(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 23" width="33" height="23"><path d="M12 4v15l12-7.5z" fill="#fff"/></svg>',
  'assets/playIcon.png',
  33
);

// 1920x1080 splash/background: dark canvas with the logo and the name.
const inner = mark.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '');
const background = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.6">
      <stop offset="0" stop-color="#16243a"/>
      <stop offset="1" stop-color="#0b0f17"/>
    </radialGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14b8a6"/>
      <stop offset="1" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#glow)"/>
  <g transform="translate(840 330) scale(0.46875)">
    <rect width="512" height="512" rx="116" fill="url(#bg)"/>
    ${inner}
  </g>
  <text x="960" y="680" text-anchor="middle" font-family="Roboto, 'Noto Sans', 'DejaVu Sans', sans-serif" font-size="72" font-weight="700" fill="#ffffff">ClearTube TV</text>
</svg>`;
for (const name of [
  'splashBackground-v1.png',
  'bgImage.png',
  'imageForRecents.png'
]) {
  render(background, `assets/${name}`, 1920);
}
