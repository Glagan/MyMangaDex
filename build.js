#!/usr/bin/env node

const fs = require("fs");
const { exec, execSync } = require("child_process");
const rimraf = require('rimraf');

// Args
const [,, ...args] = process.argv;

// Files to copy
let files = {
    ".": ["options.html"],
    "third_party": [
        "vanilla-notify.css",
        "vanilla-notify.min.js"
    ],
    "scripts": {
        ".": ["defaultOptions.js"],
        "minified": [
            "myMangaDex.js",
            "optionsManager.js",
            "sharedFunctions.js"
        ]
    },
    "icons": ["mmd-48.png", "mmd-96.png", "mmd-128.png"],
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

// Used to merge manifests
function deepMerge(first, toMerge) {
    for (let property in toMerge) {
        if (first[property] !== undefined && typeof first[property] === "object") {
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
    fs.mkdirSync("makeBundle");

    // Merge manifests
    console.log("Merging manifests");
    let mainManifest = fs.readFileSync("manifests/manifest.json", "utf-8");
    mainManifest = JSON.parse(mainManifest);
    let browserManifest = fs.readFileSync("manifests/" + browser + ".json");
    browserManifest = JSON.parse(browserManifest);
    deepMerge(mainManifest, browserManifest);

    // Write new manifest
    let bundleManifestStream = fs.createWriteStream("makeBundle/manifest.json", {flags: "w+"});
    bundleManifestStream.write(JSON.stringify(mainManifest));
    bundleManifestStream.cork();
    bundleManifestStream.end();

    // Minify script
    console.log("Minifying scripts");
    execSync("minify");

    // Copy files
    console.log("Copying files");
    deepFileCopy(files, "makeBundle/", "");

    console.log("Building version %s", mainManifest.version);
    exec("web-ext build", {cwd: "makeBundle"}, (error, stdout, stderr) => {
        if (error) {
            console.error(`Build error: ${error}`);
            return;
        }

        if (!fs.existsSync("builds")) {
            fs.mkdirSync("builds");
        }
        fs.renameSync("makeBundle/web-ext-artifacts/mymangadex-" + mainManifest.version + ".zip", "builds/mymangadex-" + mainManifest.version + "_" + browser + ".zip");

        console.log("Deleting temp directory");
        if (browser == "chrome") {
            fs.renameSync("makeBundle", "ChromeTempBuild");
        } else {
            rimraf.sync("makeBundle");
        }

        console.log("Done");
    });
} else {
    console.error("Unrecognized browser to bundle for.");
}