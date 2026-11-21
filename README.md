<p align="center">
  <img src="assets/brand/logo.svg" alt="ClearTube TV logo" width="128" height="128">
</p>

<h1 align="center">ClearTube TV</h1>

<p align="center">
  An unofficial, open-source client for YouTube on Samsung Tizen and LG webOS
  televisions, with ad blocking, SponsorBlock, DeArrow and additional playback options.
</p>

<p align="center">
  <a href="https://github.com/DavidRamirez206/ClearTube-TV/actions/workflows/ci.yml"><img src="https://github.com/DavidRamirez206/ClearTube-TV/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="https://github.com/DavidRamirez206/ClearTube-TV/releases/latest"><img src="https://img.shields.io/github/v/release/DavidRamirez206/ClearTube-TV" alt="Latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0--only-blue" alt="License: GPL-3.0-only"></a>
</p>

> [!IMPORTANT]
> ClearTube TV is an independent project. It is not affiliated with, endorsed
> by or sponsored by Google LLC, YouTube, Samsung Electronics or LG
> Electronics. "YouTube" is a trademark of Google LLC. Read the
> [disclaimer and terms of use](DISCLAIMER.md) before installing.

## Contents

- [Overview](#overview)
- [Features](#features)
- [Compatibility](#compatibility)
- [Installation on Samsung (Tizen)](#installation-on-samsung-tizen)
- [Installation on LG (webOS)](#installation-on-lg-webos)
- [Usage](#usage)
- [Settings](#settings)
- [Older Tizen TVs (3.0 to 5.5)](#older-tizen-tvs-30-to-55)
- [Privacy](#privacy)
- [Known issues](#known-issues)
- [Building from source](#building-from-source)
- [Contributing](#contributing)
- [Credits](#credits)
- [License](#license)

## Overview

ClearTube TV opens the official YouTube TV interface (`youtube.com/tv`), the
same one used by the stock television app, and applies its modifications on
the device: your account, subscriptions, history and recommendations work as
usual. No video content is hosted, copied or redistributed by this project.

## Features

| Feature                                   | Description                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Ad blocking                               | Removes video ads, home page banners and sponsored tiles.                                          |
| [SponsorBlock](https://sponsor.ajay.app/) | Skips sponsored segments, interaction reminders and self-promotion. Other categories are optional. |
| Maximum video quality                     | Selects the highest resolution available for each video.                                           |
| High-quality thumbnails                   | Replaces low-resolution thumbnails with higher-quality versions.                                   |
| End screen removal                        | Hides the end-of-video cards that cover the last seconds.                                          |
| [DeArrow](https://dearrow.ajay.app/)      | Replaces clickbait titles and thumbnails with community-submitted ones (optional).                 |
| Playback speed                            | Starts every video at a chosen speed, from 0.75x to 2x.                                            |
| Hide Shorts                               | Removes Shorts from home, subscriptions, search and the side menu (optional).                      |
| Disable previews                          | Stops videos from playing automatically when a tile is focused (optional).                         |
| Audio-only mode                           | Hides the picture and keeps the audio playing (Blue button).                                       |
| On-screen clock                           | Shows the current time over the interface (optional).                                              |
| Logo removal                              | Hides the YouTube logo from the interface (optional).                                              |
| Account selector bypass                   | Skips the "Who's watching?" screen on start-up (optional).                                         |
| Settings menu                             | Every option, grouped by section, can be changed from the remote with the Green button.            |

## Compatibility

| Platform      | Versions      | Status                                                                          |
| ------------- | ------------- | ------------------------------------------------------------------------------- |
| Samsung Tizen | 6.0 and later | Supported. Tested on Tizen 10.0 (UN43M70HAKXZL).                                |
| Samsung Tizen | 3.0 to 5.5    | Supported with a local proxy. See [Older Tizen TVs](#older-tizen-tvs-30-to-55). |
| LG webOS      | 3.0 and later | Supported through the original youtube-webos code base.                         |

## Installation on Samsung (Tizen)

Samsung televisions only run applications signed with a certificate that
includes the television's device ID. Release packages are therefore
published **unsigned**: you sign them once with your own free Samsung
certificate.

### 1. Download the package

Download `ClearTubeTV_<version>_tizen_unsigned.wgt` from the
[latest release](https://github.com/DavidRamirez206/ClearTube-TV/releases/latest)
and, optionally, verify it as described in [SECURITY.md](SECURITY.md#release-integrity).

### 2. Enable Developer Mode on the television

1. Open the **Apps** panel on the television.
2. Enter `1`, `2`, `3`, `4`, `5` with the remote to open the Developer Mode dialog.
3. Turn **Developer Mode** on and enter the local IP address of your computer.
4. Restart the television by holding the power button until it turns off and on again.

The television's IP address is shown in **Settings > General > Network >
Network Status > IP Settings**.

### 3. Sign and install

Choose one of the following methods.

**Option A: Tizen Studio command line**

1. Install [Tizen Studio](https://developer.tizen.org/development/tizen-studio/download)
   with the **TV Extensions** and **Samsung Certificate Extension** packages.
2. Connect to the television:

   ```sh
   sdb connect <tv-ip>:26101
   sdb devices
   ```

3. In the **Certificate Manager**, create a **Samsung** certificate profile
   (for example `MyTV`) for the **TV** device type. Sign in with a Samsung
   account when prompted; the device ID of the connected television is added
   automatically.
4. Sign and install the package:

   ```sh
   mkdir cleartube && cd cleartube
   unzip ../ClearTubeTV_<version>_tizen_unsigned.wgt
   tizen package -t wgt -s MyTV -- .
   tizen install -n ClearTube*.wgt -s <tv-ip>:26101
   ```

**Option B: graphical installers**

Community tools such as Apps2Samsung can generate the certificate, sign the
package and install it without Tizen Studio. These tools are maintained by
third parties; review them before use.

### 4. Open the application

ClearTube TV appears in the **Apps** list of the television. Developer Mode
can be turned off afterwards; the application keeps working until the
certificate expires, after which it must be signed and installed again.

### Updating

Install the new release over the existing one using the same certificate
profile. Settings and the signed-in account are preserved. A package signed
with a different certificate must be installed after uninstalling the
previous version.

## Installation on LG (webOS)

1. Download `ClearTubeTV_<version>_webos.ipk` from the
   [latest release](https://github.com/DavidRamirez206/ClearTube-TV/releases/latest).
2. Install it with [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop),
   the [Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel)
   or the webOS CLI (`ares-install`).

## Usage

| Remote key | Action                                                          |
| ---------- | --------------------------------------------------------------- |
| Green      | Open or close the ClearTube TV settings menu.                   |
| Up / Down  | Move through the settings menu.                                 |
| OK         | Toggle the selected option or cycle through its values.         |
| Left/Right | Change the value of options such as playback speed.             |
| Back       | Close the settings menu.                                        |
| Blue       | Toggle audio-only mode while a video is playing.                |
| Red        | Show or hide the on-screen debug console.                       |
| Yellow     | Show or hide the interface element inspector (for development). |

## Settings

The menu groups the options in four sections. Options marked with an
asterisk are applied immediately; the others are applied when the menu
closes, which reloads the application.

| Section          | Option                               | Default |
| ---------------- | ------------------------------------ | ------- |
| Ads and sponsors | Block ads                            | On      |
|                  | SponsorBlock                         | On      |
|                  | Skip sponsor segments                | On      |
|                  | Skip interaction reminders           | On      |
|                  | Skip self-promotion                  | On      |
|                  | Skip intros                          | Off     |
|                  | Skip outros and credits              | Off     |
|                  | Skip non-music parts of music videos | Off     |
|                  | Skip recaps and previews             | Off     |
| Playback         | Maximum video quality                | On      |
|                  | Default playback speed \*            | 1x      |
|                  | Remove end screens                   | On      |
|                  | Disable autoplay previews            | Off     |
| Content          | Hide Shorts                          | Off     |
|                  | DeArrow                              | Off     |
|                  | Use DeArrow thumbnails               | On      |
|                  | High-quality thumbnails \*           | On      |
| Interface        | Hide the YouTube logo \*             | Off     |
|                  | Show clock \*                        | Off     |
|                  | Skip account selection               | Off     |

The SponsorBlock categories only apply while SponsorBlock is on, and the
DeArrow thumbnails option only while DeArrow is on.

Settings are stored on the television only.

## Older Tizen TVs (3.0 to 5.5)

On Tizen 5.5 and earlier, YouTube rejects API requests coming from local
applications. ClearTube TV can route those requests through a small proxy
that runs on a computer on the same network:

```sh
pnpm install
pnpm proxy
```

The application finds the proxy automatically on start-up and shows a
notice while it is in use. The proxy only forwards HTTPS requests to
`youtube.com`. The computer must stay on while the television is in use.
Tizen 6.0 and later do not need it.

## Privacy

ClearTube TV contains no analytics and does not collect personal data.
Besides YouTube, the application only contacts the services you enable:

| Service                                               | Data sent                                   | When                       |
| ----------------------------------------------------- | ------------------------------------------- | -------------------------- |
| SponsorBlock (`sponsor.ajay.app`, mirror as fallback) | First characters of a hash of the video ID  | SponsorBlock enabled       |
| DeArrow (`sponsor.ajay.app`)                          | First characters of a hash of each video ID | DeArrow enabled            |
| DeArrow thumbnails (`dearrow-thumb.ajay.app`)         | ID of each video with a community thumbnail | DeArrow thumbnails enabled |
| Local proxy                                           | YouTube API requests                        | Tizen 5.5 and earlier only |

See [DISCLAIMER.md](DISCLAIMER.md) for details.

## Known issues

- Preview thumbnails on the progress bar may render black while seeking.

Report problems through the
[issue tracker](https://github.com/DavidRamirez206/ClearTube-TV/issues).
Report security issues privately as described in [SECURITY.md](SECURITY.md).

## Building from source

Requirements: Node.js 22 or later and Corepack (included with Node.js).

```sh
git clone https://github.com/DavidRamirez206/ClearTube-TV.git
cd ClearTube-TV
corepack enable
pnpm install
```

| Command              | Result                                             |
| -------------------- | -------------------------------------------------- |
| `pnpm build:tizen`   | Builds the application into `dist/`.               |
| `pnpm package:tizen` | Creates an unsigned Tizen `.wgt` from `dist/`.     |
| `pnpm package:webos` | Creates a webOS `.ipk` from `dist/`.               |
| `pnpm test`          | Runs the unit tests.                               |
| `pnpm test:coverage` | Runs the unit tests with a coverage report.        |
| `pnpm lint:all`      | Runs ESLint, the TypeScript compiler and Prettier. |
| `pnpm test:compat`   | Checks that the bundles are ES5 compatible.        |
| `pnpm icons`         | Regenerates the icons from `assets/brand/`.        |

Project layout:

```text
src/
  index.js           Loader entry point (runs in index.html)
  userScript.ts      Entry point injected into YouTube TV
  core/              Configuration and shared utilities
  loader/            Tizen loader, URL handling and proxy discovery
  hooks/             fetch and JSON interception
  app_api/           YouTube TV command registry integration
  player_api/        Video player integration
  features/          One module per feature
  ui/                Settings menu, notifications and debug console
  styles/            Interface style fixes
  polyfills/         Polyfills for older TV browsers
test/                Unit tests (Vitest and jsdom)
tools/               Packaging, release and proxy scripts
assets/              Icons, splash images and platform manifests
```

## Contributing

Contributions are welcome. Commits follow
[Conventional Commits](https://www.conventionalcommits.org/) in English, and
every change must pass `pnpm lint:all`, `pnpm test` and `pnpm build:tizen`.
New features and bug fixes should include unit tests.

## Credits

ClearTube TV is a modified version of
[youtube-tizenos](https://github.com/TheMysticle/youtube-tizenos) by
TheMysticle, which is a Tizen port of
[youtube-webos](https://github.com/webosbrew/youtube-webos) by the webOS
Homebrew project and its contributors. The complete list of authors is
available in the Git history.

Third-party services and projects:

- [SponsorBlock](https://sponsor.ajay.app/) and [DeArrow](https://dearrow.ajay.app/)
  by Ajay Ramachandran and contributors. Uses SponsorBlock and DeArrow data
  from https://sponsor.ajay.app/, licensed under
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
- Ad filtering rules based on [uBlock Origin](https://github.com/gorhill/uBlock) filters.

## License

ClearTube TV is free software licensed under the
[GNU General Public License v3.0 only](LICENSE), with the
[additional terms](ADDITIONAL-TERMS.md) permitted by its section 7. The
ClearTube TV name and logo are covered by the [trademark policy](TRADEMARKS.md)
and may not be used by forks or modified versions. See [NOTICE](NOTICE) for
copyright information.
