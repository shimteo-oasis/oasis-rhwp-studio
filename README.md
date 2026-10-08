# RHWP Studio — pinned releases

Self-hosted, versioned builds of the open-source [RHWP project](https://github.com/edwardkim/rhwp).

## Current release

- Studio: `v0.8.7`
- Source commit: `1a76570e833917d15817415a53c09ad61ab3203f`
- Release URL: https://shimteo-oasis.github.io/oasis-rhwp-studio/releases/rhwp-0.8.7-1a76570e/
- Tested embed SDK: `@rhwp/editor@0.8.6`

This repository contains public editor assets, build metadata, and license notices. Documents are opened in the browser; this static site has no document storage API.

## Update policy

Releases are updated manually. There is no upstream synchronization job, scheduled upgrade, or `latest` dependency. Existing release directories must not be replaced. Build a new source revision into a new directory, test it, and explicitly switch the application's `studioUrl` to that directory. Keep the previous directory available for rollback.

The release disables the PWA/service-worker plugin and external webfont loading. Fonts packaged with the release are retained. The WebAssembly engine is the checksum-verified official binary associated with the pinned upstream deployment; it is not claimed to have been rebuilt locally from Rust.

For input checksums, see `releases/rhwp-0.8.7-1a76570e/BUILD-MANIFEST.json` and `SHA256SUMS.txt`. Rebuilding the same revision reuses its saved JavaScript/WASM inputs without depending on the current contents of the upstream demo site:

```powershell
./build/rebuild.ps1 -PinnedAssets ./releases/rhwp-0.8.7-1a76570e/ -BuildRoot ../rhwp-rebuild
```

The script verifies the exact source commit and binary checksums, installs the locked npm dependencies, applies the PWA configuration change, builds the versioned path, and attaches the license notices. Git, Node.js, npm, and PowerShell are required; Git/npm downloads still need network access. The initial build used Node.js 24.19.0 and npm 11.17.0. Repeat browser acceptance tests before publishing any newly built artifact. Browser tests recorded in the manifest describe the initial qualification, not a substitute for testing a rebuild.

## Embed

```js
import { createEditor } from 'https://cdn.jsdelivr.net/npm/@rhwp/editor@0.8.6/index.js';

const editor = await createEditor(document.getElementById('editor'), {
  studioUrl: 'https://shimteo-oasis.github.io/oasis-rhwp-studio/releases/rhwp-0.8.7-1a76570e/'
});
```

The SDK version and the Studio release are separate, explicitly selected inputs. Test their compatibility when changing either one.

## License

RHWP is distributed under its upstream MIT license. Bundled dependencies and fonts retain their individual licenses; see the release's license files and third-party notices.
