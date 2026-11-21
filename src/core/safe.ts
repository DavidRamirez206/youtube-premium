// Fault tolerance helpers: a failure in one feature is logged and never
// stops the others or YouTube itself.

type Loader = () => unknown;

function describe(error: unknown) {
  return error instanceof Error ? error.stack || error.message : String(error);
}

export function reportError(scope: string, error: unknown) {
  try {
    console.error(`[ClearTube] ${scope}:`, describe(error));
  } catch {
    // Logging must never throw.
  }
}

/**
 * Starts a feature. `load` may return a promise (e.g. a dynamic import);
 * synchronous throws and rejections are both reported. Resolves to whether
 * the feature started.
 */
export function startFeature(name: string, load: Loader): Promise<boolean> {
  try {
    return Promise.resolve(load()).then(
      () => true,
      (error: unknown) => {
        reportError(`${name} failed to start`, error);
        return false;
      }
    );
  } catch (error) {
    reportError(`${name} failed to start`, error);
    return Promise.resolve(false);
  }
}

/** Wraps a callback (event listener, observer, timer) so it cannot throw. */
export function guard<A extends unknown[], R>(
  scope: string,
  fn: (...args: A) => R
): (...args: A) => R | undefined {
  return function guarded(this: unknown, ...args: A) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      reportError(`${scope} failed`, error);
      return undefined;
    }
  };
}

/**
 * Logs uncaught errors and rejections coming from ClearTube TV code so they
 * show up in the debug console (Red button). They are never re-thrown or
 * shown as dialogs.
 */
export function installGlobalErrorHandlers(target: Window = window) {
  target.addEventListener('error', (event) => {
    reportError('uncaught error', event.error ?? event.message);
  });
  target.addEventListener('unhandledrejection', (event) => {
    reportError('unhandled promise rejection', event.reason);
  });
}
