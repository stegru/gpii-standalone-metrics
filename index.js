/*
 * Stand-alone metrics capture.
 *
 * Copyright 2018 Raising the Floor - International
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * The R&D leading to these results received funding from the
 * Department of Education - Grant H421A150005 (GPII-APCP). However,
 * these results do not necessarily represent the policy of the
 * Department of Education, and you should not assume endorsement by the
 * Federal Government.
 *
 * You may obtain a copy of the License at
 * https://github.com/GPII/universal/blob/master/LICENSE.txt
 */

"use strict";

var fluid = require("infusion");

fluid.module.register("gpii-standalone-metrics", __dirname, require);

fluid.contextAware.makeChecks({
    "gpii.contexts.windows": {
        value: true
    }
});

var gpii = fluid.registerNamespace("gpii");

require("./metrics/node_modules/windowMessages");
require("./metrics/node_modules/windowsMetrics");
require("./metrics/node_modules/eventLog");
require("./metrics/node_modules/registrySettingsHandler");
require("./metrics/node_modules/displaySettingsHandler");
var metrics = gpii.windowsMetrics();

metrics.events.onStartMetrics.fire();

