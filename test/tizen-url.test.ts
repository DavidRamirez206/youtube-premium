import { describe, expect, it } from 'vitest';

import {
  buildLocalSearch,
  fixYouTubeUrl,
  isAppReloadNavigation,
  localAppBase,
  localAppUrl
} from '../src/tizen-url';

describe('fixYouTubeUrl', () => {
  it.each([
    [
      'https:///youtubei/v1/browse',
      'https://www.youtube.com/youtubei/v1/browse'
    ],
    ['http:///api/stats', 'https://www.youtube.com/api/stats'],
    [
      'file://https%3A///youtubei/v1/next',
      'https://www.youtube.com/youtubei/v1/next'
    ],
    [
      'https://api/lounge/bc/bind?device=LOUNGE_SCREEN',
      'https://www.youtube.com/api/lounge/bc/bind?device=LOUNGE_SCREEN'
    ],
    [
      'https://youtubei/v1/browse',
      'https://www.youtube.com/youtubei/v1/browse'
    ],
    ['https://api', 'https://www.youtube.com/api'],
    ['/youtubei/v1/player', 'https://www.youtube.com/youtubei/v1/player'],
    ['s/player/base.js', 'https://www.youtube.com/s/player/base.js'],
    [
      '//i.ytimg.com/vi/x/hqdefault.jpg',
      'https://i.ytimg.com/vi/x/hqdefault.jpg'
    ]
  ])('rewrites %s', (input, expected) => {
    expect(fixYouTubeUrl(input)).toBe(expected);
  });

  it.each([
    'https://www.youtube.com/tv',
    'https://sponsor.ajay.app/api/skipSegments',
    'https://api.example.com/x',
    'http://localhost:3000/proxy',
    'http://192.168.1.20:3000/proxy?url=x',
    'file:///opt/usr/apps/x/res/wgt/index.html',
    'data:image/png;base64,AAAA',
    'blob:https://www.youtube.com/abc',
    ''
  ])('keeps %s', (input) => {
    expect(fixYouTubeUrl(input)).toBe(input);
  });
});

describe('localAppBase', () => {
  const dir = 'file:///opt/usr/apps/ytadfree99/res/wgt/';
  it.each([
    `${dir}index.html`,
    `${dir}index.html#/`,
    `${dir}index.html#/watch?v=abc`,
    `${dir}index.html?env_hideWatermark=1#/browse/a/b`
  ])('resolves the app directory of %s', (href) => {
    expect(localAppBase(href)).toBe(dir);
  });

  it('strips query and hash for the app URL', () => {
    expect(localAppUrl(`${dir}index.html?a=1#/x/y`)).toBe(`${dir}index.html`);
  });
});

describe('buildLocalSearch', () => {
  it('keeps launch params and hides the watermark', () => {
    const search = buildLocalSearch(
      new URL('https://www.youtube.com/tv?env_enableVoice=1&pairingCode=x#/')
    );
    const params = new URLSearchParams(search);
    expect(params.get('env_enableVoice')).toBe('1');
    expect(params.get('pairingCode')).toBe('x');
    expect(params.get('env_hideWatermark')).toBe('1');
  });
});

describe('isAppReloadNavigation', () => {
  it.each([
    'https://www.youtube.com/index.html?is_account_switch=1',
    'https://www.youtube.com/?hrld=1',
    'https://www.youtube.com/tv#/',
    'https://www.youtube.com/tv/'
  ])('detects %s', (url) => {
    expect(isAppReloadNavigation(new URL(url))).toBe(true);
  });

  it.each([
    'https://www.youtube.com/watch?v=abc',
    'https://www.youtube.com/youtubei/v1/browse',
    'file:///opt/usr/apps/x/index.html',
    'https://accounts.google.com/'
  ])('ignores %s', (url) => {
    expect(isAppReloadNavigation(new URL(url))).toBe(false);
  });
});
