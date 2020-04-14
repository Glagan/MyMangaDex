#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const { exec } = require('child_process');
const rimraf = require('rimraf');
const Terser = require('terser');

// Args
const [, , ...args] = process.argv;

if (args[0] == 'clean') {
	rimraf.sync('builds');
	rimraf.sync('firefoxBuild');
	rimraf.sync('chromeBuild');
	process.exit();
}

let manifest = {
	manifest_version: 2,
	name: 'MyMangaDex',
	version: process.env.npm_package_version,
	author: 'Glagan',

	description: process.env.npm_package_description,

	permissions: [
		'https://*.myanimelist.net/*',
		'https://*.mangadex.org/*',
		'*://*.nikurasu.org/api/*',
		'storage'
	],

	icons: {
		48: 'icons/48.png',
		96: 'icons/96.png',
		128: 'icons/128.png'
	},

	browser_action: {
		default_icon: {
			48: 'icons/48.png',
			96: 'icons/96.png',
			128: 'icons/128.png'
		},
		default_title: 'MyMangaDex',
		//default_popup: 'options.html'
	},

	background: {
		scripts: ['scripts/background.js']
	},

	options_ui: {
		page: 'options.html',
		open_in_tab: true
	},

	content_scripts: [{
		matches: [
			'https://*.mangadex.org/follows',
			'https://*.mangadex.org/follows/manga/0/0/*',
			'https://*.mangadex.org/follows/chapters/*',
			'https://*.mangadex.org/manga*',
			'https://*.mangadex.org/titles*',
			'https://*.mangadex.org/title*',
			'https://*.mangadex.org/chapter/*',
			'https://*.mangadex.org/search*',
			'https://*.mangadex.org/?page=search*',
			'https://*.mangadex.org/?page=titles*',
			'https://*.mangadex.org/featured',
			'https://*.mangadex.org/group*',
			'https://*.mangadex.org/genre*',
			'https://*.mangadex.org/user*',
			'https://*.mangadex.org/list*',
			'https://*.mangadex.org/history'
		],
		js: [
			'scripts/MyMangaDex.js'
		],
		css: [
			'third_party/simpleNotification.min.css',
			'css/mymangadex.css'
		]
	}]
};

// Files to copy
let files = {
	'.': [
		'options.html'
	],
	'third_party': [
		'simpleNotification.min.css'
	],
	'icons': [
		'128.png',
		'96.png',
		'48.png'
	],
	'css': [
		'mymangadex.css',
		'options.css'
	]
};

// Scripts to make
let scripts = {
	'MyMangaDex.js': [
		'third_party/simpleNotification.min.js',
		'scripts/defaultOptions.js',
		'scripts/sharedFunctions.js',
		'scripts/myMangaDex.js',
	],
	'Options.js': [
		'third_party/simpleNotification.min.js',
		'scripts/defaultOptions.js',
		'scripts/sharedFunctions.js',
		'scripts/optionsManager.js'
	],
	'background.js': [
		'scripts/background.js'
	]
};

// What browser to bundle for
let browser = 'firefox';
if (args[0] == 'firefox' || args[0] == 'f') {
	browser = 'firefox';
} else if (args[0] == 'chrome' || args[0] == 'c') {
	browser = 'chrome';
}

// Options
let noMinify = false;
if (args.indexOf('-no-minify') >= 0) {
	noMinify = true;
}
let debug = false;
if (args.indexOf('-debug') >= 0) {
	debug = true;
}

console.log(`Building for ${browser}`);
console.log(`Options: no-minify[${noMinify}] debug[${debug}]\n`);

// Browser specific elements
if (browser == 'firefox') {
	// Add gecko id
	manifest.applications = {
		gecko: {
			id: 'mymangadex@glagan',
			strict_min_version: '61.0'
		}
	};
} else if (browser == 'chrome') {
	// Add chrome async
	scripts['MyMangaDex.js'].splice(2, 0, 'third_party/chrome-extension-async.js');
	scripts['Options.js'].splice(2, 0, 'third_party/chrome-extension-async.js');
}

// Used to import files
function deepFileCopy(files, destFolder, baseFolder = '') {
	let currentBase = baseFolder;
	let currentDest = destFolder;
	for (let file in files) {
		if (file == '.') {
			currentBase = baseFolder;
			currentDest = destFolder;
		} else {
			currentBase = `${baseFolder}${file}/`;
			currentDest = `${destFolder}${file}/`;
		}

		if (Array.isArray(files[file])) {
			if (!fs.existsSync(currentDest)) {
				fs.mkdirSync(currentDest);
			}

			files[file].forEach(element => {
				console.log(`Copying '${currentBase}${element}' into '${currentDest}${element}'`);
				fs.copyFileSync(currentBase + element, currentDest + element);
			});
		} else if (typeof files[file] === 'object') {
			deepFileCopy(files[file], currentDest, currentBase);
		}
	}
}

if (['firefox', 'chrome'].includes(browser)) {
	// Create temp folder for the bundle
	console.log('Creating tmp. directory');
	let makeFolder = browser + 'Build';
	if (fs.existsSync(makeFolder)) {
		rimraf.sync(makeFolder);
	}
	fs.mkdirSync(makeFolder);
	fs.mkdirSync(`${makeFolder}/scripts`);

	// Write new manifest
	console.log(`Building version ${manifest.version}`);
	let bundleManifestStream = fs.createWriteStream(`${makeFolder}/manifest.json`, { flags: 'w+' });
	bundleManifestStream.write(JSON.stringify(manifest));
	bundleManifestStream.cork();
	bundleManifestStream.end();

	// Make scripts
	console.log('Making minified scripts');
	Object.keys(scripts).forEach(name => {
		console.log('Making', name);
		let scriptConcatContent = [];
		scripts[name].forEach(filename => {
			scriptConcatContent.push(fs.readFileSync(filename, 'utf-8'));
		});
		let minified = 0;
		if (noMinify) {
			minified = { code: scriptConcatContent.join(`\n`) };
		} else {
			minified = Terser.minify(scriptConcatContent, {
				ie8: false
			});
		}
		if (debug) {
			minified.code = `try {\n\t${minified.code}\n} catch(e) {\n\tconsole.error(e);\n}`;
		}
		let scriptFileStream = fs.createWriteStream(`${makeFolder}/scripts/${name}`, { flags: 'w+' });
		scriptFileStream.write(minified.code);
		scriptFileStream.cork();
		scriptFileStream.end();
	});

	// Copy files
	console.log('Copying files');
	deepFileCopy(files, `${makeFolder}/`, '');

	exec('web-ext build', { cwd: makeFolder }, (error, stdout, stderr) => {
		if (error) {
			console.error(`Build error: ${error}`);
			return;
		}

		if (!fs.existsSync('builds')) {
			fs.mkdirSync('builds');
		}
		console.log(`Moving zip archive to 'builds'`);
		fs.renameSync(
			`${makeFolder}/web-ext-artifacts/mymangadex-${manifest.version}.zip`,
			`builds/mymangadex-${manifest.version}_${browser}.zip`
		);

		console.log('Done');
	});
} else {
	console.error('Unrecognized browser to bundle for.');
}