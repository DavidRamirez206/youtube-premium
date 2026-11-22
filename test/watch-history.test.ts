import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  accountToken,
  installWatchHistory,
  isHistoryPing
} from '../src/features/watch-history';

const PING = '//www.youtube.com/api/stats/watchtime?ns=yt&el=leanback&cpn=x';

class FakeRequest {
  static sent: FakeRequest[] = [];
  headers: Record<string, string> = {};
  url = '';
  status = 0;
  withCredentials = false;
  onloadend: (() => void) | null = null;
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send() {
    FakeRequest.sent.push(this);
  }
  finish(status: number) {
    this.status = status;
    this.onloadend?.();
  }
}

class FakeImage {
  loaded = '';
}
Object.defineProperty(FakeImage.prototype, 'src', {
  configurable: true,
  enumerable: true,
  get(this: FakeImage) {
    return this.loaded;
  },
  set(this: FakeImage, value: string) {
    this.loaded = value;
  }
});

function setup(enabled = true) {
  class Request extends FakeRequest {}
  class Image extends FakeImage {}
  Object.defineProperty(
    Image.prototype,
    'src',
    Object.getOwnPropertyDescriptor(FakeImage.prototype, 'src')!
  );
  const win = { XMLHttpRequest: Request, HTMLImageElement: Image };
  installWatchHistory(win as never, { enabled: () => enabled });
  const signIn = () =>
    new Request().setRequestHeader('Authorization', 'Bearer abc');
  const ping = (url = PING) => {
    const image = new Image() as FakeImage & { src: string };
    image.src = url;
    return image;
  };
  return { signIn, ping };
}

describe('watch history', () => {
  beforeEach(() => {
    FakeRequest.sent = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('recognizes the history pings only', () => {
    expect(isHistoryPing(PING)).toBe(true);
    expect(
      isHistoryPing('https://www.youtube.com/api/stats/playback?ns=yt')
    ).toBe(true);
    expect(isHistoryPing('https://www.youtube.com/api/stats/qoe?x')).toBe(
      false
    );
    expect(isHistoryPing('https://i.ytimg.com/vi/x/hqdefault.jpg')).toBe(false);
  });

  it('reads the account token from request headers', () => {
    expect(accountToken('Authorization', 'Bearer abc')).toBe('Bearer abc');
    expect(accountToken('authorization', 'Bearer abc')).toBe('Bearer abc');
    expect(accountToken('Content-Type', 'Bearer abc')).toBeNull();
    expect(accountToken('Authorization', 'Basic abc')).toBeNull();
  });

  it('sends the pings with the account token', () => {
    const { signIn, ping } = setup();
    signIn();
    const image = ping();
    const request = FakeRequest.sent.at(-1)!;
    expect(request.url).toBe(`https:${PING}`);
    expect(request.headers.Authorization).toBe('Bearer abc');
    expect(request.withCredentials).toBe(true);
    expect(image.loaded).toBe('');
    request.finish(204);
    expect(image.loaded).toMatch(/^data:image\/gif/);
  });

  it('falls back to the original ping when the request fails', () => {
    const { signIn, ping } = setup();
    signIn();
    const image = ping();
    FakeRequest.sent.at(-1)!.finish(401);
    expect(image.loaded).toBe(PING);
  });

  it('sends the original ping before a token is known', () => {
    const { ping } = setup();
    expect(ping().loaded).toBe(PING);
    expect(FakeRequest.sent).toHaveLength(0);
  });

  it('leaves the pings alone when history saving is off', () => {
    const { signIn, ping } = setup(false);
    signIn();
    expect(ping().loaded).toBe(PING);
    expect(FakeRequest.sent).toHaveLength(0);
  });

  it('leaves other images alone', () => {
    const { signIn, ping } = setup();
    signIn();
    const url = 'https://i.ytimg.com/vi/x/hqdefault.jpg';
    expect(ping(url).loaded).toBe(url);
    expect(FakeRequest.sent).toHaveLength(0);
  });
});
