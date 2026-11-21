import { describe, expect, it, vi } from 'vitest';

import { installAppNavigationGuard } from '../src/hooks/app-navigation';
import { resolveAppNavigation } from '../src/loader/tizen-url';

const LOCAL = 'file:///opt/usr/apps/ClearTubTV/res/wgt/index.html';

describe('resolveAppNavigation', () => {
  it('reloads the local app after signing in', () => {
    const decision = resolveAppNavigation(
      new URL('https://www.youtube.com/index.html?is_account_switch=1&hrld=1'),
      `${LOCAL}?env_hideWatermark=1#/browse`
    );
    expect(decision).toEqual({
      action: 'reload',
      url: `${LOCAL}?is_account_switch=1&hrld=1#/`
    });
  });

  it('turns hash-only navigations into a hash change', () => {
    expect(
      resolveAppNavigation(
        new URL('https://www.youtube.com/#/watch?v=a'),
        LOCAL
      )
    ).toEqual({ action: 'hash', hash: '#/watch?v=a' });
  });

  it('ignores other destinations', () => {
    expect(
      resolveAppNavigation(new URL('https://accounts.google.com/x'), LOCAL)
    ).toEqual({ action: 'ignore' });
  });
});

describe('installAppNavigationGuard', () => {
  function fakeWindow(protocol: string) {
    const navigation = new EventTarget();
    const location = {
      protocol,
      href: `${LOCAL}#/`,
      hash: '',
      replace: vi.fn()
    };
    return { win: { navigation, location } as never, navigation, location };
  }

  function navigate(target: EventTarget, url: string) {
    const evt = Object.assign(new Event('navigate', { cancelable: true }), {
      destination: { url }
    });
    target.dispatchEvent(evt);
    return evt;
  }

  it('redirects a post-login reload to the local app', () => {
    const { win, navigation, location } = fakeWindow('file:');
    expect(installAppNavigationGuard(win)).toBe(true);
    const evt = navigate(
      navigation,
      'https://www.youtube.com/index.html?is_account_switch=1'
    );
    expect(evt.defaultPrevented).toBe(true);
    expect(location.replace).toHaveBeenCalledWith(
      `${LOCAL}?is_account_switch=1#/`
    );
  });

  it('is not installed outside file://', () => {
    const { win } = fakeWindow('https:');
    expect(installAppNavigationGuard(win)).toBe(false);
  });
});
