import { describe, expect, it, vi } from 'vitest';

import { onBodyReady } from '../src/core/dom';

describe('onBodyReady', () => {
  it('runs immediately when body exists', () => {
    const cb = vi.fn();
    onBodyReady(cb);
    expect(cb).toHaveBeenCalledWith(document.body);
  });

  it('waits for body to be added', async () => {
    const body = document.body;
    body.remove();
    expect(document.body).toBeNull();

    const cb = vi.fn();
    onBodyReady(cb);
    expect(cb).not.toHaveBeenCalled();

    document.documentElement.appendChild(body);
    await new Promise((r) => setTimeout(r, 0));
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(body);
  });
});
