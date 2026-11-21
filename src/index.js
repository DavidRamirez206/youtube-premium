// Entry point of index.html. Runs before YouTube TV is loaded: it resolves
// the launch URL and, on Tizen, fetches YouTube and writes it into this
// document. Everything that customises YouTube lives in userScript.ts.
import { extractLaunchParams, handleLaunch } from './core/utils';
import { runTizenLoader } from './loader/tizen-loader';

window.addEventListener('appcontrol', () => {
  if (typeof window !== 'undefined' && window.tizen) {
    handleLaunch(extractLaunchParams());
    runTizenLoader();
  } else {
    handleLaunch(extractLaunchParams());
  }
});

function main() {
  if (typeof window !== 'undefined' && window.tizen) {
    handleLaunch(extractLaunchParams());
    runTizenLoader();
  } else {
    handleLaunch(extractLaunchParams());
  }
}

main();
