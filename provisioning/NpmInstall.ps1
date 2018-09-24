<#
  This script is executed by `npm install`, and builds things required by gpii-windows.
#>
# Turn verbose on, change to "SilentlyContinue" for default behaviour.
$VerbosePreference = "continue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

# Include main Provisioning module.
Import-Module (Join-Path $scriptDir 'Provisioning.psm1') -Force -Verbose

$msbuild = Get-MSBuild "4.0"

