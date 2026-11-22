import { describe, expect, it } from 'vitest';
import {
  fixBackgroundUrl,
  installBackgroundUrlFix
} from '../src/features/background-urls';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('background urls', () => {
  it('turns file://host addresses into https', () => {
    expect(fixBackgroundUrl('url("file://i.ytimg.com/sb/x/M1.jpg")')).toBe(
      'url("https://i.ytimg.com/sb/x/M1.jpg")'
    );
    expect(fixBackgroundUrl('url(file://i.ytimg.com/a.jpg)')).toBe(
      'url(https://i.ytimg.com/a.jpg)'
    );
  });

  it('leaves local files and other addresses alone', () => {
    const local = 'url("file:///opt/usr/apps/x/res/wgt/logo.png")';
    expect(fixBackgroundUrl(local)).toBe(local);
    const remote = 'url("https://i.ytimg.com/a.jpg")';
    expect(fixBackgroundUrl(remote)).toBe(remote);
  });

  it('fixes the seek preview thumbnail when YouTube sets it', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const observer = installBackgroundUrlFix(root);
    const thumb = document.createElement('div');
    root.appendChild(thumb);
    thumb.style.backgroundImage = 'url("file://i.ytimg.com/sb/x/M1.jpg")';
    await flush();
    expect(thumb.style.backgroundImage).toContain(
      'https://i.ytimg.com/sb/x/M1.jpg'
    );
    observer.disconnect();
    root.remove();
  });
});
