// Packages ./dist into an unsigned Tizen widget (.wgt).
//
// A .wgt is a zip archive with config.xml at its root. The output is
// unsigned: sign it with your own Samsung certificate (Tizen Studio,
// apps2Samsung, ...) before installing it on a TV.
//
// Usage: node tools/package-wgt.js [output-path]

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { zipSync } from 'fflate';

import pkgJson from '../package.json' with { type: 'json' };

const DIST = 'dist';
// Source maps are for debugging only; appinfo.json is the webOS manifest.
// *.LICENSE.txt files carry third-party notices and must be shipped.
const EXCLUDE = [/\.map$/, /^appinfo\.json$/];

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const output = process.argv[2] ?? `ClearTubeTV_${pkgJson.version}_unsigned.wgt`;

/** @type {Record<string, Uint8Array>} */
const files = {};
for (const path of walk(DIST)) {
  const name = relative(DIST, path).split(sep).join('/');
  if (EXCLUDE.some((re) => re.test(name))) continue;
  files[name] = readFileSync(path);
}

if (!files['config.xml']) {
  console.error('dist/config.xml is missing. Run `pnpm build:tizen` first.');
  process.exit(1);
}

writeFileSync(output, zipSync(files, { level: 9 }));
console.info(`Wrote ${output} (${Object.keys(files).length} files)`);
