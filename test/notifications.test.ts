import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let showNotification: typeof import('../src/ui/ui.js').showNotification;

const toasts = () =>
  [...document.querySelectorAll('.ctv-toast')].map((n) => n.textContent);

describe('notifications', () => {
  beforeAll(async () => {
    vi.useFakeTimers();
    ({ showNotification } = await import('../src/ui/ui.js'));
  });

  beforeEach(() => {
    vi.runAllTimers();
    document.querySelector('.ctv-toasts')?.replaceChildren();
  });

  it('shows a message with its colour and hides it after the time', () => {
    showNotification('Hello', 1000, 'blue');
    const toast = document.querySelector('.ctv-toast')!;
    expect(toast.classList).toContain('ctv-toast-blue');
    vi.advanceTimersByTime(50);
    expect(toast.classList).not.toContain('ctv-toast-hidden');
    vi.advanceTimersByTime(1400);
    expect(toasts()).toEqual([]);
  });

  it('replaces an identical message instead of stacking it', () => {
    showNotification('Same');
    showNotification('Same');
    expect(toasts()).toEqual(['Same']);
  });

  it('shows at most three messages', () => {
    for (const text of ['1', '2', '3', '4']) showNotification(text);
    expect(toasts()).toEqual(['2', '3', '4']);
  });

  it('treats text as text, not HTML', () => {
    showNotification('<img src=x onerror=alert(1)>');
    expect(document.querySelector('.ctv-toast img')).toBeNull();
  });
});
