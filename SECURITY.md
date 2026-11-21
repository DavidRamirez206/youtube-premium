# Security Policy

## Supported versions

Only the latest release of ClearTube TV receives security fixes. Please
update before reporting a problem.

## Reporting a vulnerability

Do not open a public issue for security problems.

Report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/DavidRamirez206/ClearTube-TV/security/advisories/new).
Include:

- the affected version and platform (Tizen or webOS, with OS version);
- a description of the problem and its impact;
- steps to reproduce or a proof of concept.

You will receive an acknowledgement within seven days. Once the issue is
confirmed, a fix is prepared and released, and the advisory is published
with credit to the reporter unless anonymity is requested.

## Scope

In scope:

- the application code in this repository (`src/`);
- the build, packaging and release tooling (`tools/`, `.github/`);
- the optional proxy server for older Tizen TVs (`tools/proxy-server.cjs`).

Out of scope:

- YouTube, SponsorBlock, DeArrow or other third-party services;
- vulnerabilities in the TV firmware or browser engine;
- issues that require a modified build or a compromised device.

## Release integrity

Release packages are built only by GitHub Actions from a version tag. Each
release includes a `SHA256SUMS` file and a signed build provenance
attestation. To verify a downloaded package:

```sh
sha256sum --check --ignore-missing SHA256SUMS
gh attestation verify ClearTubeTV_<version>_tizen_unsigned.wgt --repo DavidRamirez206/ClearTube-TV
```

Never install packages from other sources claiming to be ClearTube TV.
