$ErrorActionPreference = "Stop"

$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$buildTools = "$sdk\build-tools\36.1.0"
$platform = "$sdk\platforms\android-34\android.jar"
$aapt2 = "$buildTools\aapt2.exe"
$d8 = "$buildTools\d8.bat"
$zipalign = "$buildTools\zipalign.exe"
$apksigner = "$buildTools\apksigner.bat"
$javac = "C:\Program Files\Java\jdk-25.0.2\bin\javac.exe"
$jar = "C:\Program Files\Java\jdk-25.0.2\bin\jar.exe"
$keystore = "C:\Android\.android\debug.keystore"

Write-Host "=== 1. Compiling Resources ==="
& $aapt2 compile --dir "android\res" -o "android\build\obj\res.zip"

Write-Host "=== 2. Linking Resources and Manifest ==="
& $aapt2 link -I $platform `
    --manifest "android\AndroidManifest.xml" `
    --java "android\build\gen" `
    -o "android\build\obj\base.apk" `
    --auto-add-overlay `
    "android\build\obj\res.zip"

Write-Host "=== 3. Compiling Java Source ==="
& $javac --release 8 -cp $platform `
    -d "android\build\obj\classes" `
    "android\build\gen\com\thecouncil\app\R.java" `
    "android\src\com\thecouncil\app\MainActivity.java"

Write-Host "=== 4. Dexing with D8 ==="
$classFiles = Get-ChildItem -Path "android\build\obj\classes" -Recurse -Filter "*.class" | Select-Object -ExpandProperty FullName
& cmd /c $d8 --lib $platform --output "android\build\obj" $classFiles

Write-Host "=== 5. Packaging into APK ==="
Copy-Item "android\build\obj\base.apk" "android\build\obj\unaligned.apk" -Force
Push-Location "android\build\obj"
try {
    & $jar uf "unaligned.apk" "classes.dex"
} finally {
    Pop-Location
}

Write-Host "=== 6. Zipalign ==="
if (Test-Path "android\build\bin\TheCouncil-aligned.apk") { Remove-Item "android\build\bin\TheCouncil-aligned.apk" -Force }
& $zipalign -f -p 4 "android\build\obj\unaligned.apk" "android\build\bin\TheCouncil-aligned.apk"

Write-Host "=== 7. Signing with Apksigner ==="
if (Test-Path "android\build\bin\TheCouncil.apk") { Remove-Item "android\build\bin\TheCouncil.apk" -Force }
& cmd /c $apksigner sign --ks $keystore --ks-pass pass:android --ks-key-alias androiddebugkey --key-pass pass:android --out "android\build\bin\TheCouncil.apk" "android\build\bin\TheCouncil-aligned.apk"

Write-Host "=== 8. Verifying Signature ==="
& cmd /c $apksigner verify "android\build\bin\TheCouncil.apk"

Write-Host "APK build complete: android\build\bin\TheCouncil.apk"
