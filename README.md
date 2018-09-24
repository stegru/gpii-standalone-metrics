# Standalone metrics capture

Used to collect metrics when GPII is not installed. The metrics are uploaded to a central log server via an external
service, Filebeat.

It captures the same Windows related metrics as gpii-windows, in the same format.

This is effectively the [windowsMetrics](https://github.com/GPII/windows/tree/master/gpii/node_modules/windowsMetrics)
module turned into a standalone exe file.

## Build and run

Inside a Windows VM:

    npm install
    node index.js

## Deployment

Before building the installer, acquire `filebeat.msm` and place it in the [installer](./installer) directory. Then, run:

    provisioning/Installer.ps1

Expect to find an msi file in the newly created `output` directory, which is all that's needed when deploying.

The installer will install and configure the Filebeat service, and an executable, morphic-metrics.exe, that auto-starts.
(See [gpii-filebeat-installer](https://github.com/stegru/gpii-filebeat-installer))

## Development

This contains a few modules that have been ripped from gpii-windows
([this branch](https://github.com/stegru/windows/tree/GPII-3349)), and have been gently massaged into shape so they work
outside of GPII. The effort to share these can be made once this project has been proven.

