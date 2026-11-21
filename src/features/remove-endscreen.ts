import kindOf from 'which-builtin-type';

import { configRead } from '../core/config';
import { addJsonTransformer } from '../hooks/json-parse';

function isObject(value: unknown): value is object {
  // @ts-expect-error - bad types
  return kindOf(value) === 'Object';
}

export function removeEndscreen(res: Record<string, unknown>) {
  if (!configRead('removeEndscreen')) return;

  if (
    'endscreen' in res &&
    isObject(res.endscreen) &&
    'endscreenRenderer' in res.endscreen
  ) {
    console.debug('Removed endscreen from JSON response', res.endscreen);
    delete res.endscreen;
  }
}

addJsonTransformer('remove-endscreen', removeEndscreen, {
  innertubeOnly: false
});
