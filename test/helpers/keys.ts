export const KEY = {
  ENTER: 13,
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  RED: 403,
  GREEN: 404,
  YELLOW: 405,
  BLUE: 406,
  BACK: 10009
} as const;

/**
 * Presses a remote key: dispatches keydown and keyup on the focused element
 * and reports whether each reached a listener registered by "YouTube" on
 * document.
 */
export function press(keyCode: number) {
  const reached: string[] = [];
  const spy = (evt: KeyboardEvent) => {
    if (evt.keyCode === keyCode) reached.push(evt.type);
  };
  document.addEventListener('keydown', spy);
  document.addEventListener('keyup', spy);
  for (const type of ['keydown', 'keyup']) {
    document.body.dispatchEvent(
      new KeyboardEvent(type, { keyCode, bubbles: true, cancelable: true })
    );
  }
  document.removeEventListener('keydown', spy);
  document.removeEventListener('keyup', spy);
  return reached;
}
