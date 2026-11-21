import './ui/debug-console';
import './features/watch.js';
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
