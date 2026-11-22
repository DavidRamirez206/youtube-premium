import { getProxyIP } from '../loader/proxy-config';

// On-screen debug console for Tizen TV (Red button).
//
// YouTube writes to the console on every remote key press, so recording a
// line must be cheap: lines are kept in a small buffer and only turned into
// text and DOM while the console is visible.

const MAX_LINES = 150;

interface Line {
  time: number;
  label: string;
  args: readonly unknown[];
}

function describe(value: unknown): string {
  if (typeof value !== 'object' || value === null) return String(value);
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export function formatLine({ time, label, args }: Line): string {
  const clock = new Date(time).toTimeString().slice(0, 8);
  return `[${clock}] ${label}${args.map(describe).join(' ')}`;
}

class OnScreenConsole {
  private container: HTMLDivElement | null = null;
  private lines: Line[] = [];
  private visible = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof document === 'undefined') return;

    const intercept = (name: 'log' | 'info' | 'warn' | 'error' | 'debug') => {
      const original = (console as any)[name];
      const label = `[${name.toUpperCase()}] `;
      (console as any)[name] = (...args: any[]) => {
        if (original) original.apply(console, args);
        this.record(label, args);
      };
    };

    intercept('log');
    intercept('info');
    intercept('warn');
    intercept('error');
    intercept('debug');

    window.addEventListener('error', (evt) => {
      this.log(
        `[UNCAUGHT ERROR] ${evt.message} at ${evt.filename}:${evt.lineno}`
      );
    });

    window.addEventListener('unhandledrejection', (evt) => {
      this.log(`[UNHANDLED REJECTION] ${evt.reason}`);
    });

    const onKey = (evt: KeyboardEvent) => {
      this.record(`[${evt.type.toUpperCase()}] `, [
        `key="${evt.key}" code="${evt.code}" keyCode=${evt.keyCode}`
      ]);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);

    this.log('YouTube Premium debug console');
  }

  private record(label: string, args: readonly unknown[]) {
    try {
      const line: Line = { time: Date.now(), label, args };
      this.lines.push(line);
      if (this.lines.length > MAX_LINES) this.lines.shift();

      // Remote log, only in debug mode and only to a proxy that was
      // discovered on the local network.
      const proxyIP = window.__ytaf_debug__ ? getProxyIP() : null;
      if (proxyIP) {
        const img = new Image();
        img.src = `http://${proxyIP}:3000/?log=${encodeURIComponent(formatLine(line))}`;
      }

      if (this.visible) this.prepend(line);
    } catch {
      // Logging must never break the app.
    }
  }

  public log(text: string) {
    this.record('', [text]);
  }

  public isVisible() {
    return this.visible;
  }

  /** Shows or hides the console; it is only drawn while visible. */
  public setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) {
      this.container?.remove();
      this.container = null;
      return;
    }
    const container = this.createContainer();
    for (const line of this.lines) this.prepend(line, container);
  }

  private createContainer() {
    this.container?.remove();
    const container = document.createElement('div');
    container.id = 'ytaf-debug-console';
    container.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 500px;
      height: 300px;
      background-color: rgba(0, 0, 0, 0.85);
      color: #00ff00;
      font-family: monospace;
      font-size: 11px;
      padding: 10px;
      border: 2px solid #333;
      border-radius: 8px;
      overflow: hidden;
      z-index: 9999999;
      pointer-events: none;
    `;
    (document.body || document.documentElement).appendChild(container);
    this.container = container;
    return container;
  }

  /** Adds a line at the top (newest first). */
  private prepend(line: Line, container = this.container) {
    if (!container) return;
    const row = document.createElement('div');
    row.style.cssText = 'border-bottom:1px solid #222;padding:2px 0';
    row.textContent = formatLine(line);
    container.insertBefore(row, container.firstChild);
    while (container.childNodes.length > MAX_LINES) {
      container.removeChild(container.lastChild!);
    }
  }
}

export const debugConsole = new OnScreenConsole();
