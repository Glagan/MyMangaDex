#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const { exec, spawn } = require('child_process');
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

if (args[0] == 'stop') {
	if (fs.existsSync('.devTmp') && fs.existsSync('.devTmp/pid.txt')) {
		try {
			let pid = +fs.readFileSync('.devTmp/pid.txt');
			if (pid) {
				process.kill(pid, 'SIGINT');
				console.log('Terminated', pid);
			}
		} catch (e) {
			console.log('Process already terminated');
		}
	} else {
		console.log('Process not running');
	}
	while (true) {
		try {
			rimraf.sync('.devTmp');
			break;
		} catch (e) {}
	}
	process.exit();
}

let manifest = {
	manifest_version: 2,
	name: 'MyMangaDex',
	version: process.env.npm_package_version,
	author: 'Glagan',

	description: process.env.npm_package_description,

	permissions: ['https://*.myanimelist.net/*', 'https://*.mangadex.org/*', '*://*.nikurasu.org/api/*', 'storage'],

	icons: {
		48: 'icons/48.png',
		96: 'icons/96.png',
		128: 'icons/128.png',
	},

	browser_action: {
		default_icon: {
			48: 'icons/48.png',
			96: 'icons/96.png',
			128: 'icons/128.png',
		},
		default_title: 'MyMangaDex',
		//default_popup: 'options.html'
	},

	background: {
		scripts: ['scripts/background.js'],
	},

	options_ui: {
		page: 'options.html',
		open_in_tab: true,
	},

	content_scripts: [
		{
			matches: [
				'https://*.mangadex.org/follows',
				'https://*.mangadex.org/follows/',
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
				'https://*.mangadex.org/history',
			],
			js: ['scripts/MyMangaDex.js'],
			css: ['third_party/simpleNotification.min.css', 'css/mymangadex.css'],
		},
	],
};

// Files to copy
let files = {
	'.': ['options.html'],
	third_party: ['simpleNotification.min.css'],
	icons: ['128.png', '96.png', '48.png'],
	css: ['mymangadex.css', 'options.css'],
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
		'scripts/optionsManager.js',
	],
	'background.js': ['scripts/background.js'],
};

// What browser to bundle for
let browser = 'firefox';
if (args[0] == 'firefox' || args[0] == 'f') {
	browser = 'firefox';
} else if (args[0] == 'chrome' || args[0] == 'c') {
	browser = 'chrome';
}
let makeFolder = `${browser}Build`;

// Options
let noMinify = false;
if (args.indexOf('-no-minify') >= 0) {
	noMinify = true;
}
let debug = false;
if (args.indexOf('-debug') >= 0) {
	debug = true;
}
let dev = false;
if (args.indexOf('-dev') >= 0) {
	dev = true;
	noMinify = true;
	debug = true;
}

console.log(`Building for ${browser}`);
console.log(`Options: no-minify[${noMinify}] debug[${debug}] dev[${dev}]\n`);

// Browser specific elements
if (browser == 'firefox') {
	// Add gecko id
	manifest.applications = {
		gecko: {
			id: 'mymangadex@glagan',
			strict_min_version: '61.0',
		},
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

			files[file].forEach((element) => {
				console.log(`Copying '${currentBase}${element}' into '${currentDest}${element}'`);
				fs.copyFileSync(`${currentBase}${element}`, `${currentDest}${element}`);
			});
		} else if (typeof files[file] === 'object') {
			deepFileCopy(files[file], currentDest, currentBase);
		}
	}
}

function build() {
	// Create temp folder for the bundle
	console.log('Creating tmp. directory');
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
	Object.keys(scripts).forEach((name) => buildScript(name));

	// Copy files
	console.log('Copying files');
	deepFileCopy(files, `${makeFolder}/`, '');

	if (!dev) {
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
	}
}

function buildScript(name) {
	console.log('Making', name);
	let scriptConcatContent = [];
	scripts[name].forEach((filename) => {
		scriptConcatContent.push(fs.readFileSync(filename, 'utf-8'));
	});
	let minified = 0;
	if (noMinify) {
		minified = { code: scriptConcatContent.join(`\n`) };
	} else {
		minified = Terser.minify(scriptConcatContent, {
			ie8: false,
		});
	}
	if (debug) {
		minified.code = `try {\n\t${minified.code}\n} catch(e) {\n\tconsole.error(e);\n}`;
	}
	let scriptFileStream = fs.createWriteStream(`${makeFolder}/scripts/${name}`, { flags: 'w+' });
	scriptFileStream.write(minified.code);
	scriptFileStream.cork();
	scriptFileStream.end();
}

if (['firefox', 'chrome'].includes(browser)) {
	if (!dev) {
		build();
	} else {
		// start browser with extension and auto-rebuilder
		build();
		const watch = require('node-watch');

		let killweb = () => {};
		const webargs = () => {
			let target = browser;
			if (browser == 'chrome') {
				target = 'chromium';
			} else if (browser == 'firefox') {
				target = args.indexOf('-mobile') >= 0 ? 'firefox-android' : 'firefox-desktop';
			}
			let webargs = ['run', '--target', target, '--browser-console'];
			let pos;
			if ((pos = args.indexOf('-profile')) >= 0 && args.length > pos + 1) {
				webargs = webargs.concat(['--firefox-profile', args[pos + 1], '--keep-profile-changes']);
			}
			if ((pos = args.indexOf('-mobile')) >= 0 && args.length > pos + 1) {
				webargs = webargs.concat(['--android-device', args[pos + 1]]);
			}
			return webargs;
		};

		if (args.indexOf('-detached') == -1) {
			const web = spawn('web-ext', webargs(), { cwd: makeFolder });
			killweb = () => web.kill();

			web.stdout.on('data', (data) => {
				console.log(`${data}\n`);
			});
			web.stderr.on('data', (data) => {
				console.error(`${data}\n`);
			});
			web.on('exit', () => process.exit());
		} else {
			if (!fs.existsSync('.devTmp')) {
				fs.mkdirSync('.devTmp');
			}
			const createProcess = () => {
				let out = fs.openSync('.devTmp/out.log', 'a');
				let err = fs.openSync('.devTmp/err.log', 'a');

				const web = spawn('web-ext', webargs(), {
					cwd: makeFolder,
					detached: true,
					stdio: ['ignore', out, err],
				});
				web.unref();
				return `${web.pid}`;
			};

			// create web process if needed
			if (!fs.existsSync('.devTmp/pid.txt')) {
				let pidfile = fs.createWriteStream('.devTmp/pid.txt', { flags: 'w+' });
				pidfile.write(createProcess());
				pidfile.cork();
				pidfile.end();
			}
			try {
				let pid = fs.readFileSync('.devTmp/pid.txt');
				process.kill(pid, 0); // 0 - only test, throws if invalid pid
			} catch (e) {
				let pidfile = fs.createWriteStream('.devTmp/pid.txt', { flags: 'w+' });
				pidfile.write(createProcess());
				pidfile.cork();
				pidfile.end();
			}

			const connect = watch(['.devTmp/out.log', '.devTmp/err.log'], (evt, name) => {
				const content = fs.readFileSync(name);
				if (!content || content == '') return;
				console.log(`${content}\n`);
				fs.writeFileSync(name, ''); // clear file
			});
			process.on('SIGINT', () => {
				connect.close();
			});
		}

		const watcher = watch(['options.html', 'scripts/', 'css/'], { recursive: true }, (evt, name) => {
			if (evt == 'remove') {
				console.error('Removing files not supported, adjust build file and rerun');
				watcher.close();
				killweb();
				process.exit();
			}

			// rebuild necessary scripts or copy file
			if (/^scripts\//.exec(name)) {
				Object.keys(scripts).forEach((script) => {
					if (scripts[script].includes(name)) {
						buildScript(script);
					}
				});
			} else {
				console.log(`Copying ${name}`);
				fs.copyFileSync(name, `${makeFolder}/${name}`);
			}
		});

		process.on('SIGINT', () => {
			watcher.close();
			killweb();
		});
	}
} else {
	console.error('Unrecognized browser to bundle for.');
}
