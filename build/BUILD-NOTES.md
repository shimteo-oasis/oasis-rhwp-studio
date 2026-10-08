# RHWP Studio 0.8.7 pinned OASIS release

This directory contains a local build prepared from public upstream source only. Nothing here has been uploaded or deployed by these scripts.

## Pinned inputs

- Upstream: https://github.com/edwardkim/rhwp
- Tag: `v0.8.7`
- Commit: `1a76570e833917d15817415a53c09ad61ab3203f`
- Official Pages workflow: https://github.com/edwardkim/rhwp/actions/runs/37428632702
- Official successful deployment ID: `6878229778`; source SHA matches the commit above.
- Official deployment completed 2026-10-06 07:28:12 UTC. Retrieved index and WASM reported Last-Modified 2026-10-06 07:28:03 GMT.
- `rhwp.js` SHA-256: `70cde06a369fa7fd4fc8bc8f3d6acaee158596ba1a116a2c72159002b0b5654e`. It also matches the Git blob at the pinned commit.
- `rhwp_bg.wasm` SHA-256: `54cf95014312e605c51b98eb9021247ea79ef2bbd0a7080e11c011d0246e3989` (11,821,756 bytes). The official hashed asset and public root copy matched.

The WASM is the retained official deployment binary, not a locally rebuilt Rust artifact. Public GitHub deployment records, matching binding source, download receipts and checksums establish this capture's provenance; they are not a cryptographic upstream signature.

## Build

The verified environment was Windows, Node 24.19.0, npm 11.17.0, Git 2.55.0. Studio uses the committed package-lock (`npm ci`); installed Vite is 8.3.2. No Rust or Docker installation is needed for this retained-WASM path. The normal from-source WASM path instead requires Rust 1.93.1 and wasm-pack 0.15.0.

`prepare.mjs` is the initial capture tool: it checks the live official deployment before/after download and refuses if the official deployment changed. Do not use it to refresh this release later.

For later builds, keep the exact release `rhwp.js` and `rhwp_bg.wasm` together and run:

```powershell
pwsh -File ./rebuild.ps1 -PinnedAssets ./releases/rhwp-0.8.7-1a76570e -BuildRoot ./build-rhwp-0.8.7
```

This invokes `configure-offline.mjs`, which verifies both fixed SHA-256 hashes and the binding Git blob without contacting upstream Pages. Git source and npm dependencies may still need network access unless already present/cached. The binary inputs are also retained under `provenance/` in this original build folder.

The recipe clones only the fixed tag, checks the exact commit, installs the original npm lock, materializes the Windows `public/fonts` symlink, and builds with:

```text
RHWP_DISABLE_EXTERNAL_WEBFONTS=1
node node_modules/vite/bin/vite.js build --base=/oasis-rhwp-studio/releases/rhwp-0.8.7-1a76570e/
```

The SDK is plain source in `npm/editor/` (`index.js`, `transport.js`, `document-agent-contract.js`); it requires no separate compilation. The Studio plugin is resolved to `npm/hwpctrl-ocx/src/studio-plugin.mjs` during Vite build. Host code must pass this release's explicit `studioUrl`; the SDK default points to the upstream live demo.

## Local configuration change

Only `rhwp-studio/vite.config.ts` is patched: remove the `VitePWA` import and plugin configuration. The unchanged upstream plugin generates automatic service-worker registration, `/rhwp/` manifest scope, and a 30-day CacheFirst WASM cache. This fixed-version deployment uses no SW, registration or PWA manifest. Before/after files and `disable-pwa.patch` are under `provenance/`.

The existing upstream external-webfont build switch is set to `1`. Normal web use loads bundled fallback fonts; proprietary Hancom/Microsoft fonts are not added. This can affect font fidelity compared with a machine that has original fonts. No editor/parser/rendering logic is patched.

## Distribution and verification

Copy only `upstream/rhwp-studio/dist/` to the release URL path above. It includes `LICENSE`, `THIRD_PARTY_LICENSES.md`, upstream font notices, additional upstream-provided Noto/Source Han/Happiness license documents, CanvasKit/noble-hashes licenses, `BUILD-MANIFEST.json` and `SHA256SUMS.txt`. `provenance/dist-files.json` records every asset and its checksum.

The final build passed static asset/base-path/SW absence/WASM hash/npm-lock checks. `verify-local.mjs` serves a temporary loopback host and uses an isolated Chrome profile. The official SDK connected, public upstream `KTX.hwp` opened (1 page), generated SVG, exported HWP and reopened it (1 page). External network requests, SW registrations, HTTP failures and JS runtime errors were all zero. The screenshot and detailed requests are in `provenance/browser-smoke.*`.

This is a hosting/integration smoke test, not a complete HWP/HWPX compatibility test or a claim of pixel-identical Hancom rendering. No private intranet documents or source are inputs. No online service, upload endpoint, scheduled updater or deployment is created by this build.
