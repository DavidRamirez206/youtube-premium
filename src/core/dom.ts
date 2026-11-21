/**
 * Runs `callback` once document.body exists. The user script is injected at
 * the top of <head>, so at module evaluation time body is usually null.
 */
export function onBodyReady(callback: (body: HTMLElement) => void): void {
  if (document.body) {
    callback(document.body);
    return;
  }
  const obs = new MutationObserver(() => {
    if (!document.body) return;
    obs.disconnect();
    callback(document.body);
  });
  obs.observe(document.documentElement, { childList: true });
}
