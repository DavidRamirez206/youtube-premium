// Writes dist/config.xml from assets/tizen/config.xml, taking the widget
// version from package.json so there is a single source of truth.
//
// Usage: node tools/write-tizen-config.js

import { readFileSync, writeFileSync } from 'node:fs';

import pkgJson from '../package.json' with { type: 'json' };

/**
 * Tizen widget versions are "x.y.z" with x, y <= 255 and z <= 65535.
 * @param {string} version
 */
export function toTizenVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);
  if (!match) throw new Error(`Invalid version: ${version}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (
    major === undefined ||
    minor === undefined ||
    patch === undefined ||
    major > 255 ||
    minor > 255 ||
    patch > 65535
  ) {
    throw new Error(`Version out of Tizen range: ${version}`);
  }
  return `${major}.${minor}.${patch}`;
}

/**
 * @param {string} xml
 * @param {string} version
 */
export function setWidgetVersion(xml, version) {
  const out = xml.replace(
    /(<widget\s[^>]*?\sversion=")[^"]*(")/,
    `$1${toTizenVersion(version)}$2`
  );
  if (out === xml && !xml.includes(`version="${toTizenVersion(version)}"`)) {
    throw new Error('config.xml has no <widget version="..."> attribute');
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const xml = readFileSync('assets/tizen/config.xml', 'utf8');
  writeFileSync('dist/config.xml', setWidgetVersion(xml, pkgJson.version));
  console.info(`dist/config.xml written (version ${pkgJson.version})`);
}
