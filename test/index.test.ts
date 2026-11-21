import { beforeEach, describe, expect, it, vi } from 'vitest';

const runTizenLoader = vi.fn();
const handleLaunch = vi.fn();

vi.mock('../src/loader/tizen-loader', () => ({ runTizenLoader }));
vi.mock('../src/core/utils', () => ({
  extractLaunchParams: () => ({}),
  handleLaunch
}));

describe('index entry point', () => {
  beforeEach(() => {
    vi.resetModules();
    runTizenLoader.mockReset();
    handleLaunch.mockReset();
  });

  it('runs the Tizen loader once even if appcontrol fires while loading', async () => {
    window.tizen = {};
    await import('../src/index.js');
    window.dispatchEvent(new Event('appcontrol'));
    window.dispatchEvent(new Event('appcontrol'));
    expect(runTizenLoader).toHaveBeenCalledOnce();
    expect(handleLaunch).toHaveBeenCalledTimes(3);
    delete window.tizen;
  });

  it('does not run the Tizen loader on webOS', async () => {
    await import('../src/index.js');
    expect(runTizenLoader).not.toHaveBeenCalled();
    expect(handleLaunch).toHaveBeenCalledOnce();
  });
});
