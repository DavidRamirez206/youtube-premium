/**
 * Fixes webosbrew/youtube-webos/issues/343
 */

import { FetchRegistry } from '../hooks';

FetchRegistry.getInstance().addEventListener('request', (evt) => {
  const { url } = evt.detail;
  if (url.pathname === '/wake_cast_core') evt.preventDefault();
});
