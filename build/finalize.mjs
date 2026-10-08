import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(process.argv[2] || path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, 'upstream'), dist = path.join(src, 'rhwp-studio/dist');
const sha = '1a76570e833917d15817415a53c09ad61ab3203f';
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const blob = p => execFileSync('git', ['show', sha + ':' + p], { cwd: src, maxBuffer: 16 * 1024 * 1024 });
fs.mkdirSync(path.join(dist, 'licenses'), { recursive: true });
for (const name of ['LICENSE', 'THIRD_PARTY_LICENSES.md']) fs.writeFileSync(path.join(dist, name), blob(name));
for (const [from, to] of [
  ['ttfs/opensource/NotoSansKR-OFL.txt', 'NotoSansKR-OFL.txt'],
  ['ttfs/redistributable/happiness-sans/HapinessSans_License.pdf', 'HapinessSans_License.pdf'],
]) fs.writeFileSync(path.join(dist, 'licenses', to), blob(from));
for (const [from, to] of [ ['canvaskit-wasm/LICENSE', 'CanvasKit-LICENSE'], ['@noble/hashes/LICENSE', 'noble-hashes-LICENSE'] ]) fs.copyFileSync(path.join(src, 'rhwp-studio/node_modules', from), path.join(dist, 'licenses', to));
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
assert(!/registerSW|manifest\.webmanifest/.test(html));
for (const name of ['sw.js', 'registerSW.js', 'manifest.webmanifest']) assert(!fs.existsSync(path.join(dist, name)), 'Unexpected PWA asset: ' + name);
assert(html.includes('/oasis-rhwp-studio/releases/rhwp-0.8.7-1a76570e/assets/'));
assert.equal(hash(fs.readFileSync(path.join(dist, 'rhwp_bg.wasm'))), '54cf95014312e605c51b98eb9021247ea79ef2bbd0a7080e11c011d0246e3989');
assert.equal(hash(fs.readFileSync(path.join(dist, 'rhwp.js'))), '70cde06a369fa7fd4fc8bc8f3d6acaee158596ba1a116a2c72159002b0b5654e');
const lockOriginal = blob('rhwp-studio/package-lock.json').toString('utf8').replaceAll('\r', '');
assert.equal(fs.readFileSync(path.join(src, 'rhwp-studio/package-lock.json'), 'utf8').replaceAll('\r', ''), lockOriginal, 'npm lock changed');
const input = JSON.parse(fs.readFileSync(path.join(root, 'provenance/offline-inputs.json'), 'utf8'));
const metadata = { ...input, upstream: 'https://github.com/edwardkim/rhwp', tag: 'v0.8.7', officialDeploymentId: 6878229778, officialWorkflowRun: 37428632702, node: process.version, npm: '11.17.0', buildCommand: 'RHWP_DISABLE_EXTERNAL_WEBFONTS=1 node node_modules/vite/bin/vite.js build --base=/oasis-rhwp-studio/releases/rhwp-0.8.7-1a76570e/', buildKind: 'Pinned official WASM + local Vite rebuild; Rust WASM is not rebuilt locally', patch: 'Remove VitePWA import and plugin configuration; retain editor/renderer code', fonts: '36 upstream woff2 files; bundled fallback fonts only in normal web runtime; external webfont switch enabled', runtime: 'No server-side document service, telemetry, or auto-updater was added', initialQualification: 'Performed on 2026-10-08 for the initial release; not automatically repeated by rebuild.ps1. SDK connects, public upstream KTX HWP opens, SVG renders, export reopens at same page count; zero external requests/SW/HTTP failures/runtime errors. Not a complete HWP compatibility or layout-fidelity certification.' };
fs.writeFileSync(path.join(dist, 'BUILD-MANIFEST.json'), JSON.stringify(metadata, null, 2) + '\n');
function files(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
const list = files(dist).filter(p => path.basename(p) !== 'SHA256SUMS.txt').sort().map(p => {const b = fs.readFileSync(p);return {path:path.relative(dist,p).split(path.sep).join('/'),bytes:b.length,sha256:hash(b)};});
fs.writeFileSync(path.join(dist, 'SHA256SUMS.txt'), list.map(x => x.sha256 + '  ' + x.path).join('\n') + '\n');
const all = files(dist); const result = { files:all.length, bytes:all.reduce((n,p)=>n+fs.statSync(p).size,0), assetHashes:list, sourceSha:sha, staticChecks:'passed' };
fs.writeFileSync(path.join(root, 'provenance/dist-files.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({files:result.files,bytes:result.bytes,staticChecks:result.staticChecks,dist},null,2));
