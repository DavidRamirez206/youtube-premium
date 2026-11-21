import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { isAllowedTarget } = require('../tools/proxy-server.cjs') as {
  isAllowedTarget: (target: URL) => boolean;
};

describe('proxy target allow-list', () => {
  it.each([
    'https://www.youtube.com/youtubei/v1/browse?key=x',
    'https://youtube.com/youtubei/v1/player',
    'https://m.youtube.com:443/x'
  ])('allows %s', (url) => {
    expect(isAllowedTarget(new URL(url))).toBe(true);
  });

  it.each([
    'http://www.youtube.com/youtubei/v1/browse',
    'https://192.168.1.1/admin',
    'https://localhost/',
    'https://evil.com/?www.youtube.com',
    'https://youtube.com.evil.com/',
    'https://notyoutube.com/',
    'https://www.youtube.com:8443/'
  ])('rejects %s', (url) => {
    expect(isAllowedTarget(new URL(url))).toBe(false);
  });
});
