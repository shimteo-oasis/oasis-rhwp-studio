// Build-only candidate. Never overwrites a published release or deploys assets.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const source = path.resolve(process.argv[2] || '');
const target = path.resolve(process.argv[3] || '');
if (!process.argv[2] || !process.argv[3] || source === target) throw Error('Provide distinct source and new target directories');
if (fs.existsSync(target)) throw Error('Target already exists');
const oldName = 'rhwp-0.8.7-1a76570e-cell-wrap-20261012';
const newName = 'rhwp-0.8.7-1a76570e-recovery-20261124';
if (path.basename(source) !== oldName || path.basename(target) !== newName) throw Error('Unexpected release names');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const bundlePath = 'assets/index-cell-wrap-20261012.js';
const bundle = fs.readFileSync(path.join(source, bundlePath), 'utf8');
if (hash(Buffer.from(bundle)) !== '5944101c70f2a72380dcc023b5b9925e31dc2796960099fd5190e73dd846b396') throw Error('Unexpected source bundle');
for (const line of fs.readFileSync(path.join(source, 'SHA256SUMS.txt'), 'utf8').trim().split(/\r?\n/)) {
  const m = line.match(/^([a-f0-9]{64})\s+(.+)$/);
  if (!m || path.isAbsolute(m[2]) || m[2].split(/[\\/]/).includes('..')) throw Error('Unsafe checksum entry');
  if (hash(fs.readFileSync(path.join(source, m[2]))) !== m[1]) throw Error('Source checksum mismatch: ' + m[2]);
}
const before = 'function NP(){return new URLSearchParams(window.location.search).has(`url`)}';
const after = 'function NP(){const p=new URLSearchParams(window.location.search);return p.has(`url`)||p.get(`recovery`)===`manual`}';
if (bundle.split(before).length !== 2) throw Error('Recovery guard is not unique');
const patched = bundle.replace(before, after);
// Explicit host mode skips only the startup prompt. Standalone recovery retains
// the unmodified draft listing, restore, deletion and later actions.
const files = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory()
  ? files(path.join(dir,e.name)).map(p=>e.name+'/'+p) : [e.name]);
fs.cpSync(source, target, {recursive:true});
for (const file of files(target)) {
  if (!/\.(js|css|html|json)$/.test(file)) continue;
  const text = file === bundlePath ? patched : fs.readFileSync(path.join(target,file),'utf8');
  fs.writeFileSync(path.join(target,file), text.replaceAll('/'+oldName+'/', '/'+newName+'/'));
}
// Prior browser acceptance belongs to the input release, not this candidate.
const buildManifest=JSON.parse(fs.readFileSync(path.join(target,'BUILD-MANIFEST.json'),'utf8'));
buildManifest.inputRelease=oldName;
buildManifest.inputBundleSha256=hash(Buffer.from(bundle));
buildManifest.outputBundleSha256=hash(fs.readFileSync(path.join(target,bundlePath)));
buildManifest.buildCommand='node tools/rhwp-recovery-candidate.mjs <source> <new-target>';
buildManifest.patch='Explicit host recovery mode skips startup dialog; draft storage and recovery actions unchanged.';
buildManifest.qualification='UNQUALIFIED candidate. Previous cell-wrap acceptance applies only to the input release. Recovery and browser usability must be tested before adoption.';
fs.writeFileSync(path.join(target,'BUILD-MANIFEST.json'),JSON.stringify(buildManifest,null,2)+'\n');
const priorCheck=path.join(target,'CELL-WRAP-VERIFICATION.json');
if(fs.existsSync(priorCheck)){
  const historical=fs.readFileSync(path.join(source,'CELL-WRAP-VERIFICATION.json'),'utf8');
  fs.writeFileSync(priorCheck,JSON.stringify({historicalOnly:true,sourceRelease:oldName,candidateQualified:false,inputReleaseVerification:JSON.parse(historical)},null,2)+'\n');
}
const manifest = {candidate:true, qualified:false, sourceRelease:oldName, release:newName,
  change:'Only explicit recovery=manual skips automatic startup recovery. Separate standalone recovery URL must remain accessible from host.',
  sourceBundleSha256:hash(Buffer.from(bundle)), bundleSha256:hash(fs.readFileSync(path.join(target,bundlePath))),
  unchanged:'Draft storage, restore actions, document parsing, WASM, fonts and server authorization are not modified.'};
fs.writeFileSync(path.join(target,'RECOVERY-CANDIDATE.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(target,'SHA256SUMS.txt'),files(target).filter(p=>p!=='SHA256SUMS.txt').sort().map(p=>hash(fs.readFileSync(path.join(target,p)))+'  '+p).join('\n')+'\n');
console.log(JSON.stringify(manifest));
