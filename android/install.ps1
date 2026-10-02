$ErrorActionPreference = "Stop"

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
    $adb = "adb"
}

$apkPath = Join-Path $PSScriptRoot "build\bin\TheCouncil.apk"
if (-not (Test-Path $apkPath)) {
    Write-Host "APK not found. Building first..."
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "build.ps1")
}

Write-Host "Configuring ADB reverse port forwarding (tcp:3000 -> tcp:3000)..."
& $adb reverse tcp:3000 tcp:3000

Write-Host "Pushing APK to device..."
& $adb push $apkPath /data/local/tmp/TheCouncil.apk

Write-Host "Installing APK on device..."
& $adb shell pm install -r -d -g /data/local/tmp/TheCouncil.apk

Write-Host "Launching The Council app on device..."
& $adb shell am start -n com.thecouncil.app/.MainActivity

Write-Host ""
Write-Host "[OK] The Council has been installed and launched successfully on your phone!"
Write-Host "  - USB Connection: http://localhost:3000 (via adb reverse)"
Write-Host "  - Wi-Fi Connection: http://192.168.1.21:3000 (LAN)"
