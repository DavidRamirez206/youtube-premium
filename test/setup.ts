// Globals that YouTube TV defines before our user script runs.
import { beforeEach } from 'vitest';

declare global {
  interface Window {
    __spatialNavigation__: { keyMode: string };
  }
}

window.__spatialNavigation__ = { keyMode: 'AUTO' };

beforeEach(() => {
  window.localStorage.clear();
});
