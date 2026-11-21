// Keeps YouTube TV inside the local app when it navigates or reloads itself.
// See resolveAppNavigation() for the details.

import { resolveAppNavigation } from '../loader/tizen-url';

interface NavigateEvent extends Event {
  readonly destination: { readonly url: string };
  readonly cancelable: boolean;
}

type GuardWindow = {
  navigation?: EventTarget;
  location: Pick<Location, 'protocol' | 'href' | 'hash' | 'replace'>;
};

export function installAppNavigationGuard(
  win: GuardWindow = window as unknown as GuardWindow
) {
  if (win.location.protocol !== 'file:' || !win.navigation) return false;

  const localUrl = win.location.href;
  win.navigation.addEventListener('navigate', (event) => {
    const evt = event as NavigateEvent;
    let destination: URL;
    try {
      destination = new URL(evt.destination.url);
    } catch {
      return;
    }
    const decision = resolveAppNavigation(destination, localUrl);
    if (decision.action === 'ignore' || !evt.cancelable) return;

    evt.preventDefault();
    console.info('[navigation] keeping YouTube inside the app:', decision);
    if (decision.action === 'hash') {
      win.location.hash = decision.hash;
    } else {
      win.location.replace(decision.url);
    }
  });
  return true;
}

installAppNavigationGuard();
