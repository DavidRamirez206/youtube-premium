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

// 1920x1080 splash/background: white canvas with the logo and the name.
const inner = mark.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '');
const background = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <rect width="1920" height="1080" fill="#ffffff"/>
  <g transform="translate(840 330) scale(0.46875)">${inner}</g>
  <text x="960" y="680" text-anchor="middle" font-family="Roboto, 'Noto Sans', 'DejaVu Sans', sans-serif" font-size="72" font-weight="700" fill="#0f0f0f">YouTube <tspan fill="#ff0000">Premium</tspan></text>
</svg>`;
for (const name of [
  'splashBackground-v1.png',
  'bgImage.png',
  'imageForRecents.png'
]) {
  render(background, `assets/${name}`, 1920);
}
