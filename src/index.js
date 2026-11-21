// Entry point of index.html. Runs before YouTube TV is loaded: it resolves
// the launch URL and, on Tizen, fetches YouTube and writes it into this
// document. Everything that customises YouTube lives in userScript.ts.
import { extractLaunchParams, handleLaunch } from './core/utils';
import { runTizenLoader } from './loader/tizen-loader';

let loaderStarted = false;

export function launch() {
  handleLaunch(extractLaunchParams());

  // The loader patches prototypes and rewrites the document, so it must run
  // exactly once. A relaunch that arrives while it is still loading only
  // updates the launch URL, which the loader reads when it writes YouTube.
  if (window.tizen && !loaderStarted) {
    loaderStarted = true;
    runTizenLoader();
  }
}

window.addEventListener('appcontrol', launch);
launch();
