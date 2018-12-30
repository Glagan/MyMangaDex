#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const { exec, execSync } = require("child_process");
const rimraf = require("rimraf");

// Args
const [,, ...args] = process.argv;

// Files to copy
let files = {
    ".": ["options.html"],
    "third_party": [
        "simpleNotification.min.css",
        "simpleNotification.min.js"
    ],
    "scripts": {
        ".": ["defaultOptions.js"],
        "minified": [
            "myMangaDex.js",
            "optionsManager.js",
            "sharedFunctions.js"
        ]
    },
    "icons": ["128.png", "96.png", "48.png"],
    "css": ["mymangadex.css", "options.css"]
};

// What browser to bundle for
let browser;
if (args[0] == "firefox" || args[0] == "f") {
    browser = "firefox";
} else if (args[0] == "chrome" || args[0] == "c") {
    browser = "chrome";
    files.third_party.push("chrome-extension-async.js");
}

// Options
let minify = true;
let webExt = true;

// If we don't minify we don't use the "minified" subfolder for scripts
if (args.includes("--no-minify")) {
    minify = false;
    files.scripts = {
        ".": [
            "defaultOptions.js",
            "myMangaDex.js",
            "optionsManager.js",
            "sharedFunctions.js",
        ]
    };
}

// Don't build the web-ext artifact
if (args.includes("--no-web-ext")) {
    webExt = false;
}

// Used to merge manifests
function deepMerge(first, toMerge) {
    for (let property in toMerge) {
        if (first[property] !== undefined && Array.isArray(first[property])) {
            toMerge[property].forEach((value, key) => {
                if (typeof value === "object") {
                    deepMerge(first[property][key], value);
                } else {
                    first[property].push(value);
                }
            });
        } else if (first[property] !== undefined && typeof first[property] === "object") {
            deepMerge(first[property], toMerge[property]);
        } else {
            first[property] = toMerge[property];
        }
    }
}

// Used to import files
function deepFileCopy(files, destFolder, baseFolder="") {
    let currentBase = baseFolder;
    let currentDest = destFolder;
    for (let file in files) {
        if (file == ".") {
            currentBase = baseFolder;
            currentDest = destFolder;
        } else {
            currentBase = baseFolder + file + "/";
            currentDest = destFolder + file + "/";
        }

        if (Array.isArray(files[file])) {
            if (!fs.existsSync(currentDest)) {
                fs.mkdirSync(currentDest);
            }

            files[file].forEach(element => {
                console.log("Copying '%s' into '%s'", currentBase + element, currentDest + element);
                fs.copyFileSync(currentBase + element, currentDest + element);
            });
        } else if (typeof files[file] === "object") {
            deepFileCopy(files[file], currentDest, currentBase);
        }
    }
}

if (["firefox", "chrome"].includes(browser)) {
    // Create temp folder for the bundle
    console.log("Creating temp directory");
    let makeFolder = browser + "Build";
    if (fs.existsSync(makeFolder)) {
        rimraf.sync(makeFolder);
    }
    fs.mkdirSync(makeFolder);

    // Merge manifests
    console.log("Merging manifests");
    let mainManifest = fs.readFileSync("manifests/manifest.json", "utf-8");
    mainManifest = JSON.parse(mainManifest);
    let browserManifest = fs.readFileSync("manifests/" + browser + ".json");
    browserManifest = JSON.parse(browserManifest);
    deepMerge(mainManifest, browserManifest);
    console.log("Building version %s", mainManifest.version);

    // Write new manifest
    let bundleManifestStream = fs.createWriteStream(makeFolder + "/manifest.json", {flags: "w+"});
    bundleManifestStream.write(JSON.stringify(mainManifest));
    bundleManifestStream.cork();
    bundleManifestStream.end();

    // Minify script
    if (minify) {
        console.log("Minifying scripts");
        execSync("minify");
    }

    // Copy files
    console.log("Copying files");
    deepFileCopy(files, makeFolder + "/", "");

    if (webExt) {
        exec("web-ext build", {cwd: makeFolder}, (error, stdout, stderr) => {
            if (error) {
                console.error(`Build error: ${error}`);
                return;
            }

            if (!fs.existsSync("builds")) {
                fs.mkdirSync("builds");
            }
            console.log("Moving zip archive to 'builds'");
            fs.renameSync(makeFolder + "/web-ext-artifacts/mymangadex-" + mainManifest.version + ".zip", "builds/mymangadex-" + mainManifest.version + "_" + browser + ".zip");

            console.log("Done");
        });
    } else {
        console.log("Done");
    }
} else {
    console.error("Unrecognized browser to bundle for.");
}