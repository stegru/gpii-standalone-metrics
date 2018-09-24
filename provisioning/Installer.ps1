<#
  This script install and setup all the needed npm packages.

  If the script is copied and run from a temporary folder (like when running via vagrant)
    the -originalBuildScriptPath parameter should be passed with the path to the original
    "provisioning" folder
#>
param ( # default to script path if no parameter is given
    [string]$originalBuildScriptPath = (Split-Path -parent $PSCommandPath)
)

Import-Module "$($originalBuildScriptPath)/Provisioning.psm1" -Force

$mainDir = (get-item $originalBuildScriptPath).parent.FullName
$installerDir = Join-Path $mainDir installer

if (!(Test-Path -Path $installerDir\filebeat.msm)) {
    Write-Output ""
    Write-Output "Please provide $installerDir\filebeat.msm"
    Write-Output ""
    exit 1
}


# Clean the output directory
$outputDir = Join-Path $mainDir output
$buildDir = Join-Path $outputDir build
$stagingDir = Join-Path $outputDir staging
$installerBuildDir = Join-Path $outputDir installer-build

if (Test-Path -Path $outputDir) {
    rm $outputDir -Recurse -Force
}
mkdir $outputDir
mkdir $buildDir
mkdir $stagingDir
mkdir $installerBuildDir

# Copy the non-dev files.
Invoke-Command "robocopy" "..\metrics $(Join-Path $buildDir "metrics") /job:windows.rcj *.*" $provisioningDir -errorLevel 3
Invoke-Command "robocopy" "$mainDir $buildDir LICENSE.txt" $provisioningDir -errorLevel 3
Invoke-Command "robocopy" "$mainDir $buildDir index.js" $provisioningDir -errorLevel 3
Invoke-Command "robocopy" "$mainDir $buildDir package.json" $provisioningDir -errorLevel 3
Invoke-Command "robocopy" "$mainDir $buildDir package-lock.json" $provisioningDir -errorLevel 3

# Build it.
Invoke-Command "npm" "install --production" $buildDir
# Create the executable.
Invoke-Command "$mainDir\node_modules\.bin\pkg.cmd" "package.json --output $(Join-Path $buildDir "gpii-metrics.exe")" $buildDir
# Copy the native node modules.
Get-ChildItem "$buildDir\*.node" -Recurse | Move-Item -Destination $stagingDir

# Make it a GUI app, and put it in the staging directory.
Invoke-Command "node" "./make-gui.js $(Join-Path $buildDir "gpii-metrics.exe") $(Join-Path $stagingDir "morphic-metrics.exe")" $mainDir

cp $buildDir\LICENSE.txt $stagingDir


# Make the installer
Invoke-Environment "C:\Program Files (x86)\Microsoft Visual C++ Build Tools\vcbuildtools_msbuild.bat"
# Collect the files
Invoke-Command "heat" "dir ""$stagingDir"" -dr INSTALLFOLDER -ke -srd -cg GPIIMetrics -var var.publishDir -gg -out $installerBuildDir\files.wxs" $outputDir
# Compile
Invoke-Command "candle" "-dpublishDir=$stagingDir -dversion=1 -o $installerBuildDir\files.wixobj $installerBuildDir\files.wxs" $outputDir
Invoke-Command "candle" "-dpublishDir=$stagingDir -dversion=1 -o $installerBuildDir\ui.wixobj $installerDir\UI_Metrics.wxs" $outputDir
Invoke-Command "candle" "-dpublishDir=$stagingDir -dversion=1 -o $installerBuildDir\metrics.wixobj $installerDir\metrics.wxs" $outputDir
# Link
Invoke-Command "light" "-ext WixUIExtension -out $outputDir\morphic-metrics.msi $installerBuildDir\files.wixobj $installerBuildDir\metrics.wixobj $installerBuildDir\ui.wixobj" $installerDir

exit 0
