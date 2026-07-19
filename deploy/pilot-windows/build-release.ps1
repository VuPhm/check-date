[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $NodeExe,
  [Parameter(Mandatory)] [string] $CloudflaredExe,
  [Parameter(Mandatory)] [string] $WinSwExe
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$scriptRoot = Split-Path -Parent $PSCommandPath
$repoRoot = Resolve-Path (Join-Path $scriptRoot '..\..')
Set-Location $repoRoot

function Require-Command([string] $name) { if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "Thiếu $name. Xem WINDOWS-HANDOFF.md." } }
function Require-File([string] $path) { if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Không tìm thấy file: $path" } }

Require-Command npm
Require-Command dotnet
Require-Command iscc
Require-File $NodeExe
Require-File $CloudflaredExe
Require-File $WinSwExe

$vendorRoot = Join-Path $scriptRoot 'vendor'
New-Item -ItemType Directory -Force -Path (Join-Path $vendorRoot 'node'), (Join-Path $vendorRoot 'cloudflared'), (Join-Path $vendorRoot 'winsw') | Out-Null
Copy-Item -LiteralPath $NodeExe -Destination (Join-Path $vendorRoot 'node\node.exe') -Force
Copy-Item -LiteralPath $CloudflaredExe -Destination (Join-Path $vendorRoot 'cloudflared\cloudflared.exe') -Force
Copy-Item -LiteralPath $WinSwExe -Destination (Join-Path $vendorRoot 'winsw\CoopFoodPilotService.exe') -Force

Write-Host '1/5 Installing and testing Node project...'
& npm ci
& npm test
& npm run build
Write-Host '2/5 Staging Windows runtime...'
& npm run pilot:windows:stage
Write-Host '3/5 Publishing native Control Center...'
& dotnet publish .\pilot-control-center\CoopFoodPilot.ControlCenter.csproj -c Release -r win-x64 --self-contained true
Write-Host '4/5 Building installer...'
& iscc .\deploy\pilot-windows\installer\CoopFoodPilot.iss

$installer = Join-Path $repoRoot 'out\pilot-windows\installer\CoopFoodPilotSetup.exe'
if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) { throw "Không tạo được installer: $installer" }
Write-Host "5/5 Complete: $installer"
