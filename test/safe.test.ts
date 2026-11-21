import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  guard,
  installGlobalErrorHandlers,
  startFeature
} from '../src/core/safe';

describe('fault tolerance helpers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reports a feature that throws while loading and keeps going', async () => {
    const order: string[] = [];
    const results = await Promise.all([
      startFeature('broken', () => {
        throw new Error('boom');
      }),
      startFeature('rejected', () => Promise.reject(new Error('later'))),
      startFeature('working', () => {
        order.push('working');
      })
    ]);
    expect(results).toEqual([false, false, true]);
    expect(order).toEqual(['working']);
    expect(console.error).toHaveBeenCalledWith(
      '[ClearTube] broken failed to start:',
      expect.stringContaining('boom')
    );
    expect(console.error).toHaveBeenCalledWith(
      '[ClearTube] rejected failed to start:',
      expect.stringContaining('later')
    );
  });

  it('guard swallows and reports callback errors', () => {
    const fn = guard('listener', (x: number) => {
      if (x < 0) throw new Error('negative');
      return x * 2;
    });
    expect(fn(2)).toBe(4);
    expect(fn(-1)).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      '[ClearTube] listener failed:',
      expect.stringContaining('negative')
    );
  });

  it('logs uncaught errors and rejections', () => {
    const target = new EventTarget() as Window;
    installGlobalErrorHandlers(target);
    const error = new Event('error') as ErrorEvent;
    Object.defineProperty(error, 'error', { value: new Error('uncaught') });
    target.dispatchEvent(error);
    const rejection = new Event('unhandledrejection');
    Object.defineProperty(rejection, 'reason', { value: 'nope' });
    target.dispatchEvent(rejection);
    expect(console.error).toHaveBeenCalledWith(
      '[ClearTube] uncaught error:',
      expect.stringContaining('uncaught')
    );
    expect(console.error).toHaveBeenCalledWith(
      '[ClearTube] unhandled promise rejection:',
      'nope'
    );
  });
});
