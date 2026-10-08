import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || scriptRoot);
const src = path.join(root, 'upstream');
const inputs = path.resolve(process.argv[3] || path.join(root, 'provenance'));
const sha = '1a76570e833917d15817415a53c09ad61ab3203f';
const expected = { 'rhwp.js': '70cde06a369fa7fd4fc8bc8f3d6acaee158596ba1a116a2c72159002b0b5654e', 'rhwp_bg.wasm': '54cf95014312e605c51b98eb9021247ea79ef2bbd0a7080e11c011d0246e3989' };
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: src, encoding: 'utf8' }).trim() !== sha) throw new Error('Source SHA mismatch');
const readBlob = name => execFileSync('git', ['show', sha + ':' + name], { cwd: src, maxBuffer: 8 * 1024 * 1024 });
const pkg = path.join(src, 'pkg'); fs.mkdirSync(pkg, { recursive: true });
for (const name of Object.keys(expected)) {
  const bytes = fs.readFileSync(path.join(inputs, name));
  if (hash(bytes) !== expected[name]) throw new Error(name + ' checksum mismatch');
  if (name === 'rhwp.js' && hash(readBlob('rhwp-studio/public/' + name)) !== expected[name]) throw new Error('Binding mismatch with source');
  fs.writeFileSync(path.join(pkg, name), bytes);
  fs.writeFileSync(path.join(src, 'rhwp-studio/public', name), bytes);
}
for (const name of ['rhwp.d.ts', 'rhwp_bg.wasm.d.ts']) fs.writeFileSync(path.join(pkg, name), readBlob('rhwp-studio/public/' + name));
const fonts = path.join(src, 'rhwp-studio/public/fonts');
if (fs.lstatSync(fonts).isFile()) {
  if (fs.readFileSync(fonts, 'utf8').trim() !== '../../assets/fonts') throw new Error('Unexpected fonts link');
  fs.unlinkSync(fonts); fs.cpSync(path.join(src, 'assets/fonts'), fonts, { recursive: true });
}
const configPath = path.join(src, 'rhwp-studio/vite.config.ts');
const original = readBlob('rhwp-studio/vite.config.ts').toString('utf8');
const begin = original.indexOf('    VitePWA({'), end = original.lastIndexOf('    }),');
if (begin < 0 || end < begin || !/^\s*\],\s*\}\);\s*$/.test(original.slice(end + 7))) throw new Error('Unexpected PWA config');
const patched = (original.slice(0, begin) + '    // OASIS pinned release: no service worker or automatic PWA update.\n' + original.slice(end + 7)).replace("import { VitePWA } from 'vite-plugin-pwa';", '');
const current = fs.readFileSync(configPath, 'utf8').replaceAll('\r', '');
if (current !== original.replaceAll('\r', '') && current !== patched.replaceAll('\r', '')) throw new Error('Unexpected local Vite edits');
fs.writeFileSync(configPath, patched);
const notes = path.join(root, 'provenance'); fs.mkdirSync(notes, { recursive: true });
fs.writeFileSync(path.join(notes, 'vite.config.before.ts'), original);
fs.writeFileSync(path.join(notes, 'vite.config.after.ts'), patched);
fs.writeFileSync(path.join(notes, 'disable-pwa.patch'), execFileSync('git', ['diff', '--', 'rhwp-studio/vite.config.ts'], { cwd: src }));
fs.writeFileSync(path.join(notes, 'offline-inputs.json'), JSON.stringify({ sourceSha: sha, binarySha256: expected, packageLockGitBlobSha256: hash(readBlob('rhwp-studio/package-lock.json')), base: '/oasis-rhwp-studio/releases/rhwp-0.8.7-1a76570e/', disableExternalWebFonts: true, pwa: false, note: 'No upstream Pages request. Supply the retained release rhwp.js and rhwp_bg.wasm; Git/npm dependencies may still require their normal network downloads.' }, null, 2));
console.log('Pinned local WASM/binding verified; source configured without Pages access.');
