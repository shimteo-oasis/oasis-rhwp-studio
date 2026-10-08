param(
  [Parameter(Mandatory=$true)][string]$PinnedAssets,
  [string]$BuildRoot = (Join-Path $PSScriptRoot '.rebuild')
)
$ErrorActionPreference='Stop'
$buildPath=[IO.Path]::GetFullPath($BuildRoot)
$assetsPath=[IO.Path]::GetFullPath($PinnedAssets)
$sourcePath=Join-Path $buildPath 'upstream'
New-Item -ItemType Directory -Path $buildPath -Force | Out-Null
if(-not(Test-Path -LiteralPath $sourcePath)){
  git -c core.autocrlf=false -c core.symlinks=false clone --filter=blob:none --no-checkout --depth 1 --branch v0.8.7 https://github.com/edwardkim/rhwp.git $sourcePath
  if($LASTEXITCODE -ne 0){throw 'clone failed'}
  git -C $sourcePath sparse-checkout init --cone
  git -C $sourcePath sparse-checkout set rhwp-studio npm/editor npm/hwpctrl-ocx rhwp-shared assets/fonts assets/logo scripts ttfs/opensource ttfs/redistributable/happiness-sans
  git -C $sourcePath checkout --detach 1a76570e833917d15817415a53c09ad61ab3203f
  if($LASTEXITCODE -ne 0){throw 'checkout failed'}
}
node (Join-Path $PSScriptRoot 'configure-offline.mjs') $buildPath $assetsPath
if($LASTEXITCODE -ne 0){throw 'input/configuration verification failed'}
Push-Location (Join-Path $sourcePath 'rhwp-studio')
try {
  npm ci --cache (Join-Path $buildPath 'npm-cache') --no-audit --no-fund
  if($LASTEXITCODE -ne 0){throw 'npm ci failed'}
  $env:RHWP_DISABLE_EXTERNAL_WEBFONTS='1'
  node node_modules/vite/bin/vite.js build --base=/oasis-rhwp-studio/releases/rhwp-0.8.7-1a76570e/
  if($LASTEXITCODE -ne 0){throw 'Vite build failed'}
} finally { Pop-Location }
node (Join-Path $PSScriptRoot 'finalize.mjs') $buildPath
if($LASTEXITCODE -ne 0){throw 'asset verification failed'}
