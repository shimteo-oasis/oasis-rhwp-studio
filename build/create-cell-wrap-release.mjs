// Deterministic hotfix of the retained, checksum-pinned Studio distribution.
// This changes the bridge's three capability guards, selecting its existing
// immediate mutation fallback. It does not rebuild or patch the Rust WASM.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const oldName='rhwp-0.8.7-1a76570e';
const newName='rhwp-0.8.7-1a76570e-cell-wrap-20261012';
const source=path.join(root,'releases',oldName),target=path.join(root,'releases',newName);
const oldBase=`/oasis-rhwp-studio/releases/${oldName}/`,newBase=`/oasis-rhwp-studio/releases/${newName}/`;
const oldJs='index-CQqw7NIY.js',newJs='index-cell-wrap-20261012.js';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function files(dir,prefix='') {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]);}
// Refuse an altered input or an overwrite of an immutable release.
for(const line of fs.readFileSync(path.join(source,'SHA256SUMS.txt'),'utf8').trim().split(/\r?\n/)) {
 const m=line.match(/^([a-f0-9]{64})\s+(.+)$/);if(!m)throw Error('Invalid checksum record');
 if(hash(fs.readFileSync(path.join(source,m[2])))!==m[1])throw Error('Input mismatch: '+m[2]);
}
if(fs.existsSync(target))throw Error('Release already exists; do not overwrite');
const bundle=fs.readFileSync(path.join(source,'assets',oldJs),'utf8');
let patched=bundle;
for(const [variable,method] of [['s','insertTextInCellDeferredPagination'],['c','replaceTextInCellDeferredPagination'],['s','deleteTextInCellDeferredPagination']]) {
 const needle=`typeof ${variable}.${method}==\`function\``;
 if(patched.split(needle).length!==2)throw Error('Unexpected bridge: '+method);
 patched=patched.replace(needle,'false/* OASIS: recompute table-cell rows synchronously (2026-10-12) */');
}
fs.cpSync(source,target,{recursive:true});
for(const file of files(target)) {
 if(!/\.(js|css|html|json)$/.test(file))continue;
 const src=path.join(target,file);
 let text=file===`assets/${oldJs}`?patched:fs.readFileSync(src,'utf8');
 text=text.replaceAll(oldBase,newBase).replaceAll(oldJs,newJs);
 fs.writeFileSync(src,text);
}
fs.renameSync(path.join(target,'assets',oldJs),path.join(target,'assets',newJs));
const baseManifest=JSON.parse(fs.readFileSync(path.join(source,'BUILD-MANIFEST.json'),'utf8'));
const manifest={...baseManifest,base:newBase,buildKind:'Deterministic bridge hotfix of retained distribution; official Rust WASM unchanged',
 buildCommand:'node build/create-cell-wrap-release.mjs',
 patch:'Disable deferred cell insert/replace/delete capability guards; existing immediate fallback recomputes rows after each edit. Body/nested-cell paths and document formats unchanged.',
 inputRelease:oldName,inputBundleSha256:hash(Buffer.from(bundle)),outputBundleSha256:hash(fs.readFileSync(path.join(target,'assets',newJs))),
 initialQualification:undefined,baseQualification:baseManifest.initialQualification,
 qualification:'See CELL-WRAP-VERIFICATION.json; baseline comparison and candidate browser tests must pass before publication.',
 limitation:'Correctness fallback recalculates layout for each table-cell edit; large-document responsiveness has not been certified.'};
fs.writeFileSync(path.join(target,'BUILD-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
function checksums(){fs.writeFileSync(path.join(target,'SHA256SUMS.txt'),files(target).filter(p=>p!=='SHA256SUMS.txt').sort().map(p=>hash(fs.readFileSync(path.join(target,p)))+'  '+p).join('\n')+'\n');}
checksums();
console.log(JSON.stringify({release:newName,files:files(target).length,bundleSha256:manifest.outputBundleSha256}));
