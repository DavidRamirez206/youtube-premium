import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  setWidgetVersion,
  toTizenVersion
} from '../tools/write-tizen-config.js';

describe('toTizenVersion', () => {
  it.each([
    ['1.0.0', '1.0.0'],
    ['1.2.3-beta.1', '1.2.3'],
    ['255.255.65535', '255.255.65535']
  ])('%s -> %s', (input, expected) => {
    expect(toTizenVersion(input)).toBe(expected);
  });

  it.each(['1.0', 'v1.0.0', '256.0.0', '1.0.70000'])('rejects %s', (v) => {
    expect(() => toTizenVersion(v)).toThrow();
  });
});

describe('setWidgetVersion', () => {
  it('updates the widget version of the real config.xml', () => {
    const xml = readFileSync('assets/tizen/config.xml', 'utf8');
    const out = setWidgetVersion(xml, '9.8.7');
    expect(out).toMatch(/<widget\s[^>]*?\sversion="9\.8\.7"/);
    expect(out).toContain('required_version="3.0"');
  });
});
