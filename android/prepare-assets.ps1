$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $PSScriptRoot "assets\web"

Write-Host "=== Preparing Standalone Web Assets for Android APK ==="

if (Test-Path $assetsDir) {
    Remove-Item $assetsDir -Recurse -Force
}
New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null

# 1. Copy _next/static (JS chunks, CSS, fonts)
$staticSrc = Join-Path $rootDir ".next\static"
$staticDest = Join-Path $assetsDir "_next\static"
Write-Host "Copying static assets from $staticSrc to $staticDest..."
Copy-Item -Path $staticSrc -Destination $staticDest -Recurse -Force

# 2. Copy public assets (icon, manifest)
Copy-Item (Join-Path $rootDir "public\icon.png") (Join-Path $assetsDir "icon.png") -Force

# 3. Copy HTML files
$serverApp = Join-Path $rootDir ".next\server\app"
Copy-Item (Join-Path $serverApp "index.html") (Join-Path $assetsDir "index.html") -Force
Copy-Item (Join-Path $serverApp "history.html") (Join-Path $assetsDir "history.html") -Force
Copy-Item (Join-Path $serverApp "settings.html") (Join-Path $assetsDir "settings.html") -Force
Copy-Item (Join-Path $serverApp "diagnostics.html") (Join-Path $assetsDir "diagnostics.html") -Force

# Copy prepared chamber.html
$chamberHtml = Join-Path $PSScriptRoot "assets_prep_chamber.html"
if (Test-Path $chamberHtml) {
    Copy-Item $chamberHtml (Join-Path $assetsDir "chamber.html") -Force
}

# 4. Copy RSC files
Copy-Item (Join-Path $serverApp "index.rsc") (Join-Path $assetsDir "index.rsc") -Force
Copy-Item (Join-Path $serverApp "history.rsc") (Join-Path $assetsDir "history.rsc") -Force
Copy-Item (Join-Path $serverApp "settings.rsc") (Join-Path $assetsDir "settings.rsc") -Force
Copy-Item (Join-Path $serverApp "diagnostics.rsc") (Join-Path $assetsDir "diagnostics.rsc") -Force

# Copy prepared chamber.rsc
$chamberRsc = Join-Path $PSScriptRoot "assets_prep_chamber.rsc"
if (Test-Path $chamberRsc) {
    Copy-Item $chamberRsc (Join-Path $assetsDir "chamber.rsc") -Force
}

$fileCount = (Get-ChildItem -Path $assetsDir -Recurse -File | Measure-Object).Count
$sumBytes = (Get-ChildItem -Path $assetsDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [math]::Round(($sumBytes / 1MB), 2)
Write-Host "[OK] Prepared $fileCount web assets ($totalSizeMB megabytes) in $assetsDir"
