/*
 * Turns a console executable into a GUI one. Required to prevent the node stub from creating a console window.
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

var fs = require("fs"),
    os = require("os");

var inputFile = process.argv[2];
var outputFile = process.argv[3];

if (!outputFile) {
    console.error("usage:", __filename, "inputFile outputFile");
    return 1;
}

return makeGui(inputFile, outputFile);

/**
 * Sets the Subsystem value in a Windows executable to "GUI". The structure of the executable image is documented here:
 * https://docs.microsoft.com/en-us/windows/desktop/debug/pe-format
 *
 * @param {String} inputFile The original executable path.
 * @param {String} outputFile The path of the new executable.
 * @return {Boolean} true upon success.
 */
function makeGui(inputFile, outputFile) {
    var IMAGE_DOS_SIGNATURE = 0x5a4d; // "MZ"
    var IMAGE_NT_SIGNATURE = 0x00004550; // "PE00"
    var IMAGE_NT_OPTIONAL_HDR32_MAGIC = 0x10b;
    var IMAGE_NT_OPTIONAL_HDR64_MAGIC = 0x20b;

    var IMAGE_SUBSYSTEM_WINDOWS_GUI = 2;
    var IMAGE_SUBSYSTEM_WINDOWS_CUI = 3;

    var coffHeaderLen = 20;

    var offsets = {
        dosHeader: 0x00,
        peHeaderOffset: 0x3c,
        peHeader: undefined,
        // offset from peHeader:
        coffHeader: 0x04,
        coffSizeOfOptionalHeader: 16,
        optionalHeader: coffHeaderLen,
        // offset from optionalHeader:
        checksum: 0x40,
        subsystem: 0x44
    };

    var content = fs.readFileSync(inputFile);

    // Check it's an executable
    assert(IMAGE_DOS_SIGNATURE, content.readUInt16LE(offsets.dosHeader), "DOS Header: Not an executable");

    // PE signature
    offsets.peHeader = content.readUInt16LE(offsets.peHeaderOffset);
    assert(IMAGE_NT_SIGNATURE, content.readUInt32LE(offsets.peHeader), "PE Header: Not a valid PE");

    // Adjust the rest of the offsets.
    offsets.coffHeader += offsets.peHeader;
    offsets.coffSizeOfOptionalHeader += offsets.coffHeader;
    offsets.optionalHeader += offsets.coffHeader;
    offsets.checksum += offsets.optionalHeader;
    offsets.subsystem += offsets.optionalHeader;

    // Check there is an optional header after the PE header.
    var optionalHeaderLen = content.readUInt16LE(offsets.coffSizeOfOptionalHeader);
    if (optionalHeaderLen === 0) {
        assert(">0", optionalHeaderLen, "COFF header: No optional header (invalid image file)");
    }

    // Ensure it's a valid one for Windows.
    var optionalMagic = content.readUInt16LE(offsets.optionalHeader);

    if (optionalMagic !== IMAGE_NT_OPTIONAL_HDR32_MAGIC && optionalMagic !== IMAGE_NT_OPTIONAL_HDR64_MAGIC) {
        assert(IMAGE_NT_OPTIONAL_HDR32_MAGIC, optionalMagic, "Optional header: Not PE32 or PE32+");
    }

    // Get the current sub-system.
    var subsystem = content.readUInt8(offsets.subsystem);

    // Only change it if it's a console application.
    if (subsystem === IMAGE_SUBSYSTEM_WINDOWS_GUI) {
        throw new Error("Subsystem: Already GUI");
    } else if (subsystem !== IMAGE_SUBSYSTEM_WINDOWS_CUI) {
        throw new Error("Subsystem: Current subsystem unknown:" + subsystem.toString(16));
    }

    content.writeUInt8(IMAGE_SUBSYSTEM_WINDOWS_GUI, offsets.subsystem);

    // Update the checksum using the windows API call. The checksum isn't strictly required (only for kernel/system
    // DLLs).
    var updateChecksum = os.platform() === "win32";
    if (updateChecksum) {
        var ffi = require("ffi"),
            ref = require("ref");

        var imagehlp = ffi.Library("Imagehlp", {
            // https://docs.microsoft.com/en-us/windows/desktop/api/imagehlp/nf-imagehlp-mapfileandchecksumw
            "MapFileAndCheckSumW": [
                "ulong", ["char*", "ulong*", "ulong*"]
            ]
        });

        var origChecksum;
        var checksum;
        var tempFile = outputFile + ".tmp";
        try {
            fs.writeFileSync(tempFile, content);

            var headerSumBuf = ref.alloc("ulong");
            var checkSumBuf = ref.alloc("ulong");
            var result =
                imagehlp.MapFileAndCheckSumW(new Buffer(tempFile + "\u0000", "ucs2"), headerSumBuf, checkSumBuf);
            if (result) {
                throw new Error("MapFileAndCheckSum failed:", result);
            }
            origChecksum = headerSumBuf.deref();
            checksum = checkSumBuf.deref();
        } finally {
            fs.unlink(tempFile);
        }

        console.log("Original checksum:", origChecksum.toString(16));
        console.log("New checksum:     ", checksum.toString(16));

        var parsedChecksum = content.readUInt32LE(offsets.checksum);

        // This could mean the parsing was incorrect, and it's about to write to the wrong location.
        assert(origChecksum, parsedChecksum, "Original checksum mismatch");

        // Write the new checksum
        content.writeUInt32LE(checksum, offsets.checksum);
    }

    fs.writeFileSync(outputFile, content);
    console.log("Written to", outputFile);
    return true;
}

/**
 * Throw an exception if expect and actual values are not equal.
 *
 * @param {Number|String} expect The expected value.
 * @param {Number|String} actual The actual value.
 * @param {String} msg The message to display if the values differ.
 */
function assert(expect, actual, msg) {
    if (expect !== actual) {
        console.error("Assert fail\n", "expected:", expect.toString(16), "\nactual:  ", actual.toString(16));
        throw new Error(msg);
    }
}

