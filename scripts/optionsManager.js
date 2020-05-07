const LOG = { INFO: "info", DANGER: "danger", WARNING: "warning", SUCCESS: "success" };
class OptionsManager {
	constructor() {
		// Nodes
		this.addColorButton = document.getElementById("addColor");
		this.saveButton = document.getElementById("save");
		this.lastOpenColorsList = document.getElementById("lastOpenColors");
		this.defaultLastOpenColors = document.getElementById("defaultLastOpenColors");
		this.downloadSaveButton = document.getElementById("download-save");
		this.refreshSaveButton = document.getElementById("refresh-save");
		this.copySave = document.getElementById("copy-save");
		this.saveContent = document.getElementById("save-content");
		this.importMMDForm = document.getElementById("save-import");
		this.importMALForm = document.getElementById("mal-import");
		this.importMALbutton = this.importMALForm.querySelector("button");
		this.exportMALForm = document.getElementById("mal-export");
		this.exportMALbutton = this.exportMALForm.querySelector("button");
		this.deleteSaveButton = document.getElementById("delete-save");
		this.lastOpenColorsNodes = {};
		this.importOutput = document.getElementById("malImportStatus");
		this.exportOutput = document.getElementById("malExportStatus");
		this.importInformations = document.getElementById("importInformations");
		this.saveUploadButton = document.getElementById("saveUploadButton");
		this.importSubmitButton = document.getElementById("importSubmitButton");
		this.onlineOptions = document.getElementById("onlineOptions");
		this.loggedInPanel = document.getElementById("loggedInPanel");
		this.onlineAdvancedPanel = document.getElementById("onlineAdvancedPanel");
		this.loggedOutPanel = document.getElementById("loggedOutPanel");
		this.onlineForm = document.getElementById("onlineForm");
		this.onlineError = document.getElementById("onlineError");
		this.onlineSuccess = document.getElementById("onlineSuccess");
		this.downloadOnlineButton = document.getElementById("downloadOnline");

		// Only Chrome users can update the online save
		if (CHROME) {
			document.getElementById("onlineURLPanel").style.display = "block";
		} else {
			document.getElementById("onlineServiceInfo").style.display = "block";
		}

		//
		this.options = {};
		this.myAnimeListMangaList = {};
		this.mangaDexMangaList = [];
		this.currentLog = "import";
		this.malBusy = false;
		this.malAbort = false;
		this.loggedMyAnimeList = true;
		this.HTMLParser = new DOMParser();

		// Start
		this.setEvents();
		this.start();
	}

	async start() {
		// Load options
		this.options = await loadOptions();
		this.restoreOptions();
	}

	setEvents() {
		// Add events to colorBox
		document.querySelectorAll("[data-color]").forEach(element => {
			let field = element.dataset.option;
			// All events that update the value of the input
			["input", "change", "cut", "paste", "keyup"].forEach(function (eventType) {
				element.addEventListener(eventType, event => {
					document.querySelector(`[data-color='${field}']`).style.backgroundColor = event.target.value;
				});
			});
		});

		// Checkbox events
		document.querySelectorAll("[data-type='checkbox']").forEach(element => {
			let buttons = element.getElementsByTagName("button");
			buttons[0].addEventListener("click", () => {
				this.updateCheckbox(element, true);
			});
			buttons[1].addEventListener("click", () => {
				this.updateCheckbox(element, false);
			});
		});

		// Last open colors list
		this.addColorButton.addEventListener("click", () => {
			this.addColor();
		});

		// Save event
		this.saveButton.addEventListener("click", () => {
			this.saveOptions();
		});

		// Default buttons
		document.querySelectorAll("[data-default]").forEach(element => {
			element.addEventListener("click", () => {
				let inputField = document.querySelector(`[data-option='${element.dataset.default}']`);
				if ("type" in inputField.dataset && inputField.dataset.type == "checkbox") {
					this.updateCheckbox(inputField, defaultOptions[element.dataset.default]);
				} else {
					inputField.value = defaultOptions[element.dataset.default];
					if (inputField.dataset.color !== undefined) {
						document.querySelector(`[data-color='${element.dataset.default}']`).style.backgroundColor = defaultOptions[element.dataset.default];
					}
				}
			});
		});
		this.defaultLastOpenColors.addEventListener("click", () => {
			this.restoreDefaultsLastOpenColors();
		});

		// Export
		this.downloadSaveButton.addEventListener("click", async event => {
			if (this.downloadSaveButton.dataset.busy === undefined) {
				this.downloadSaveButton.dataset.busy = true;
				let data = await storageGet(null);
				delete data.options.token;
				delete data.options.username;
				let downloadLink = document.createElement("a");
				downloadLink.style.display = "none";
				document.body.appendChild(downloadLink);
				downloadLink.download = "mymangadex_export.json";
				downloadLink.target = "_blank";
				downloadLink.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data))}`;
				downloadLink.click();
				downloadLink.remove();
				delete this.downloadSaveButton.dataset.busy;
			}
		});
		this.refreshSaveButton.addEventListener("click", async () => {
			// Load save
			this.copySave.classList.add("d-none");
			let data = await storageGet(null);
			delete data.options.token;
			delete data.options.username;
			this.saveContent.value = JSON.stringify(data);
			this.copySave.classList.remove("d-none");
		});
		this.copySave.addEventListener("click", async () => {
			this.copySave.classList.add("d-none");
			this.saveContent.select();
			document.execCommand("copy");
			this.saveContent.value = "";
		});
		this.saveContent.addEventListener("click", event => {
			event.target.select();
		});

		// Import
		this.importMMDForm.addEventListener("submit", event => {
			event.preventDefault();
			this.importMMD();
		});
		this.importMALForm.addEventListener("submit", event => {
			event.preventDefault();
			this.importMAL();
		});
		this.exportMALForm.addEventListener("submit", event => {
			event.preventDefault();
			this.exportMAL();
		});

		// Delete
		this.deleteSaveButton.addEventListener("click", () => {
			if (this.deleteSaveButton.dataset.again === undefined) {
				this.deleteSaveButton.style.fontSize = "2rem";
				this.deleteSaveButton.dataset.again = true;
				this.deleteSaveButton.textContent = "Click again to confirm";
				return;
			}

			this.deleteSave();
		});

		// Online
		this.onlineError.addEventListener("click", () => {
			this.onlineError.style.display = "none";
		});
		this.onlineSuccess.addEventListener("click", () => {
			this.onlineSuccess.style.display = "none";
		});
		// Buttons that can be clicked only once
		document.querySelectorAll("[data-button-protect]").forEach(async button => {
			button.addEventListener("click", this.protectButton.bind(this, button));
		});
		// Hide panels if online save is disabled
		let onlineSaveCheckbox = document.querySelector("[data-option='onlineSave']");
		onlineSaveCheckbox.firstElementChild.firstElementChild.addEventListener("click", () => {
			this.toggleOnlinePanels(true);
		});
		onlineSaveCheckbox.lastElementChild.lastElementChild.addEventListener("click", () => {
			this.toggleOnlinePanels(false);
		});
	}

	async protectButton(button) {
		if (button.dataset.busy === undefined) {
			button.dataset.busy = true;
			await this[button.dataset.buttonProtect]();
			delete button.dataset.busy;
		}
	}

	// FUNCTIONS

	async sleep(time) {
		return await new Promise(resolve => {
			setTimeout(() => {
				resolve();
			}, time);
		});
	}

	async restoreOptions() {
		// Update current options, no lastOpenColors yet
		let colors = this.options.lastOpenColors;
		this.deleteLastOpenColors();

		// Restore lastOpenColors colors
		colors.forEach(color => {
			this.addColor(color);
		});

		// Add "normal" options
		document.querySelectorAll("[data-option]").forEach(element => {
			if (element.dataset.type !== undefined && element.dataset.type == "checkbox") {
				this.updateCheckbox(element, this.options[element.dataset.option]);
			} else {
				element.value = this.options[element.dataset.option];
				if (element.dataset.color !== undefined) {
					document.querySelector(`[data-color='${element.dataset.option}']`).style.backgroundColor = element.value;
				}
			}
		});

		// Restore online options
		this.onlineForm.onlineURL.value = this.options.onlineURL;
		this.onlineForm.username.value = this.options.username;

		// Show panels
		this.toggleOnlinePanels(this.options.onlineSave);
	}

	addColor(name = "") {
		let index = uniqueGUID();
		while (this.lastOpenColorsNodes[index] !== undefined) {
			index = uniqueGUID();
		}

		// Container
		let container = document.createElement("div");
		container.className = "col px-0 pb-2 my-auto input-group";

		// Remove button
		let remove = document.createElement("div");
		remove.className = "input-group-prepend";
		let removeIcon = document.createElement("i");
		removeIcon.className = "fas fa-trash";
		let removeText = document.createElement("a");
		removeText.className = "btn btn-danger input-prepend";
		removeText.appendChild(removeIcon);
		removeText.appendChild(document.createTextNode(" Remove"));
		removeText.addEventListener("click", () => {
			this.removeColor(index);
		});
		remove.appendChild(removeText);
		container.appendChild(remove);

		// Color box
		let colorBoxContainer = document.createElement("div");
		colorBoxContainer.className = "input-group-append";
		let colorBox = document.createElement("span");
		colorBox.className = "input-group-text";
		colorBox.style.backgroundColor = name;
		colorBoxContainer.appendChild(colorBox);

		// Input
		let colorInput = document.createElement("input");
		["input", "change", "cut", "paste", "keyup"].forEach(function (eventType) {
			colorInput.addEventListener(eventType, event => {
				colorBox.style.backgroundColor = event.target.value;
			});
		});
		colorInput.type = "text";
		colorInput.className = "form-control";
		colorInput.value = name;
		this.lastOpenColorsNodes[index] = {
			parent: container,
			input: colorInput
		};
		container.appendChild(colorInput);
		container.appendChild(colorBoxContainer);

		// Insert
		this.lastOpenColorsList.insertBefore(container, this.lastOpenColorsList.lastElementChild);
	}

	removeColor(index) {
		if (Object.keys(this.lastOpenColorsNodes).length > 1) {
			this.lastOpenColorsList.removeChild(this.lastOpenColorsNodes[index].parent);
			delete this.lastOpenColorsNodes[index];
		}
	}

	deleteLastOpenColors() {
		while (this.lastOpenColorsList.firstChild) {
			if (this.lastOpenColorsList.firstChild.id == "addColorRow") {
				break;
			}
			this.lastOpenColorsList.removeChild(this.lastOpenColorsList.firstChild);
		}
		this.lastOpenColorsNodes = {};
	}

	restoreDefaultsLastOpenColors() {
		this.deleteLastOpenColors();
		defaultOptions.lastOpenColors.forEach(color => {
			this.addColor(color);
		});
	}

	updateCheckbox(node, value) {
		node.dataset.value = value;
		let enabledButton = node.firstElementChild.firstElementChild;
		let disabledButton = node.lastElementChild.lastElementChild;
		if (value) {
			enabledButton.classList.add("btn-success");
			enabledButton.classList.remove("btn-secondary");
			disabledButton.classList.add("btn-secondary");
			disabledButton.classList.remove("btn-danger");
		} else {
			enabledButton.classList.add("btn-secondary");
			enabledButton.classList.remove("btn-success");
			disabledButton.classList.add("btn-danger");
			disabledButton.classList.remove("btn-secondary");
		}
	}

	flashBackground(value) {
		document.body.classList.add(value ? "bg-success" : "bg-fail");
		setTimeout(() => {
			document.body.classList.remove(value ? "bg-success" : "bg-fail");
		}, 500);
	}

	async saveOptions() {
		// Update local storage
		try {
			// Update last open colors
			this.options.lastOpenColors = [];
			Object.keys(this.lastOpenColorsNodes).forEach(colorIndex => {
				this.options.lastOpenColors.push(this.lastOpenColorsNodes[colorIndex].input.value);
			});
			// Update other fields
			document.querySelectorAll("[data-option]").forEach(element => {
				if ("type" in element.dataset && element.dataset.type == "checkbox") {
					this.options[element.dataset.option] = (element.dataset.value == "true");
				} else {
					if (element.dataset.type == "number") {
						let value = Math.floor(element.value);
						if (element.min != "" && Math.floor(element.min) > value) {
							value = Math.floor(element.min);
							element.value = value;
						} else if (element.max != "" && Math.floor(element.max) < value) {
							value = Math.floor(element.max);
							element.value = value;
						}
						this.options[element.dataset.option] = value;
					} else {
						this.options[element.dataset.option] = element.value;
					}
				}
			});
			// Save
			await storageSet("options", this.options);
			// Online
			if (this.options.onlineSave &&
				this.options.isLoggedIn) {
				this.saveOnlineOptions();
			}
			this.flashBackground(true);
		} catch (error) {
			console.error(error);
			this.flashBackground(false);
		}
	}

	async deleteSave() {
		// Done
		this.deleteSaveButton.style.fontSize = "1rem";
		delete this.deleteSaveButton.dataset.again;
		this.deleteSaveButton.textContent = "Delete";

		// Clear
		await browser.storage.local.clear();

		// Set the default options
		try {
			await storageSet("options", defaultOptions);
			await storageSet("history", { list: [] });
			this.options = JSON.parse(JSON.stringify(defaultOptions)); // Deep copy default
			this.flashBackground(true);
			this.restoreOptions();
		} catch (error) {
			console.error(error);
			this.flashBackground(false);
		}
	}

	async setDomain() {
		this.domain = "https://mangadex.org/";
	}

	// END FUNCTIONS / START IMPORT EXPORT

	logAndScroll(logLevel, text) {
		let row = document.createElement("li");
		row.className = "list-group-item list-group-item-" + logLevel;
		row.textContent = text;
		this.logOutput.appendChild(row);
		this.logOutput.scrollTop = this.logOutput.scrollHeight;
	}

	importMMD() {
		// try catch if JSON can't be parsed
		try {
			// Import from file if specified
			if (this.saveUploadButton.files[0] != undefined) {
				var reader = new FileReader();
				reader.onload = () => {
					this.importMMDForm.reset();
					this.finishImportMMD(JSON.parse(reader.result));
				};
				reader.readAsText(this.saveUploadButton.files[0]);
			} else {
				// Import from the text field if there is no file
				this.finishImportMMD(JSON.parse(this.importMMDForm.save.value));
			}
		} catch (error) {
			this.importSubmitButton.disabled = false;
			this.flashBackground(false);
			console.error(error);
			return;
		}
	}

	async finishImportMMD(importedData) {
		this.importSubmitButton.disabled = true;
		if (isEmpty(importedData) || importedData.options === undefined) {
			this.importInformations.textContent = "Invalid save.";
			this.importSubmitButton.disabled = false;
			this.flashBackground(false);
			return;
		} else {
			this.importInformations.textContent = `Entries in the save: ${Object.keys(importedData).length - 1}`;
		}
		// Log out of online save
		this.toggleOnlinePanels(importedData.options.isLoggedIn);
		await storageSet(null, importedData);

		// Load options to check for updates
		this.options = await loadOptions();
		// Update UI
		await this.restoreOptions();
		this.flashBackground(true);
		this.importSubmitButton.disabled = false;
		this.importMMDForm.save.value = "";
	}

	abortImport() {
		this.importMALbutton.textContent = "Import";
		this.malBusy = false;
		this.malAbort = false;
		this.logAndScroll(LOG.INFO, "You aborted the task.");
	}

	async importMAL() {
		if (this.malBusy) {
			this.malAbort = true;
			this.importMALbutton.textContent = "Aborting...";
			return;
		}

		this.importMALbutton.textContent = "In progress, click to abort.";
		let username = this.importMALForm.username.value;
		this.importMALForm.disabled = true;
		await this.setDomain();

		if (username != "") {
			// Arrays with the data
			this.myAnimeListMangaList = {};
			this.mangaDexMangaList = [];

			// Show the status box
			this.malBusy = true;
			this.logOutput = this.importOutput;
			this.logOutput.style.display = "block";
			clearDomNode(this.logOutput);
			this.logAndScroll(LOG.INFO, "Starting... don't close the options page.");

			// Start a dummy request to MyAnimeList to see if we can fetch the data
			await this.listMyAnimeList(username, 0, true);
			if (this.malAbort) {
				return (this.abortImport());
			}
			if (Object.keys(this.myAnimeListMangaList).length == 0) {
				this.flashBackground(false);
				this.logAndScroll(LOG.INFO, "Empty MyAnimeList manga list, try another username maybe ?");
			} else {
				// Start fetching the data
				await this.listMangaDex();
				if (this.malAbort) {
					return (this.abortImport());
				}
				if (this.mangaDexMangaList.length > 0) {
					await this.listMyAnimeList(username, Object.keys(this.myAnimeListMangaList).length);
					if (this.malAbort) {
						return (this.abortImport());
					}
					await this.updateLocalFromMDMAL();
					if (this.malAbort) {
						return (this.abortImport());
					}
					this.flashBackground(true);
				} else {
					this.logAndScroll(LOG.INFO, "No followed manga on MangaDex.");
					this.flashBackground(false);
				}
			}

			// Done
			this.malBusy = false;
		} else {
			this.flashBackground(false);
			console.error("Empty MyAnimeList username");
		}
	}

	async listMyAnimeList(username, offset = 0, dummy = false) {
		// Abort if data already retrieved and only 1 page
		if (offset > 0 && offset < 300) {
			this.logAndScroll(LOG.SUCCESS, "Done fetching MyAnimeList manga.");
			return;
		}
		this.logAndScroll(LOG.INFO, `Fetching MyAnimeList manga from ${offset} to ${offset + 300}`);

		for (let i = 0; i < 3; ++i) {
			try {
				let response = await browser.runtime.sendMessage({
					action: "fetch",
					url: `https://myanimelist.net/mangalist/${username}/load.json?offset=${offset}&status=7`,
					options: {
						method: "GET",
						redirect: "follow",
						credentials: "include"
					},
					isJson: true
				});
				if (response.body.hasOwnProperty("errors")) {
					this.logAndScroll(LOG.DANGER, response.body.errors[0].message);
				} else {
					// Insert each manga fetched in the list
					for (let manga of response.body) {
						this.myAnimeListMangaList[parseInt(manga.manga_id)] = parseInt(manga.num_read_chapters);
					}

					if (!dummy) {
						// If there is 300 items, we might have reached the list limit so we try again
						if (response.body.length == 300) {
							await this.sleep(1000); // Wait 1000ms between requests
							if (this.malAbort) {
								return (false);
							}
							await this.listMyAnimeList(username, offset + 300);
						} else {
							this.logAndScroll(LOG.SUCCESS, "Done fetching MyAnimeList manga.");
						}
					}
				}
				break;
			} catch (error) {
				if (i < 2) {
					this.flashBackground(false);
					console.error(error);
					await this.sleep(1000);
					if (this.malAbort) {
						return (false);
					}
				} else {
					return (false);
				}
			}
		}
		return (true);
	}

	async listMangaDex(page = 1, max_page = 1, type = 0) {
		this.logAndScroll(LOG.INFO, `Fetching MangaDex follow page manga ${page}${max_page > 1 ? ` of ${max_page}` : ""}`);
		try {
			let response = await browser.runtime.sendMessage({
				action: "fetch",
				url: `${this.domain}follows/manga/${type}/0/${page}/`,
				options: {
					method: "GET",
					redirect: "follow",
					credentials: "include"
				}
			});
			let domContent = this.HTMLParser.parseFromString(response.body, "text/html");
			let links = domContent.querySelectorAll("a.manga_title");
			for (let i = 0; i < links.length; i++) {
				this.mangaDexMangaList.push(parseInt(/\/title\/(\d+)\//.exec(links[i].href)[1]));
			}

			// Check the number of pages
			if (page == 1) {
				let node = domContent.querySelector(".mt-3.text-center");
				if (node !== null) {
					let regex = /Showing\s\d+\sto(\s\d+)\sof\s(\d+)\stitles/.exec(node.textContent);
					if (regex !== null) {
						max_page = Math.ceil(parseInt(regex[2]) / parseInt(regex[1]));
					}
				}
			}

			// We fetch the next page if required
			if (page < max_page) {
				// Wait 1000ms
				await this.sleep(1000);
				if (this.malAbort) {
					return (false);
				}
				await this.listMangaDex(page + 1, max_page, type);
			} else {
				this.logAndScroll(LOG.SUCCESS, "Done fetching MangaDex followed manga.");
			}
			return true;
		} catch (error) {
			this.flashBackground(false);
			console.error(error);
			return false;
		}
	}

	async updateLocalFromMDMAL(index = 0) {
		this.logAndScroll(LOG.INFO, `Updating ${index + 1}/${this.mangaDexMangaList.length}`);

		// Wait 1000ms
		await this.sleep(1000);
		if (this.malAbort) {
			return (false);
		}
		try {
			let response = await browser.runtime.sendMessage({
				action: "fetch",
				url: `${this.domain}title/${this.mangaDexMangaList[index]}`,
				options: {
					method: "GET",
					cache: "no-cache"
				}
			});
			let content = this.HTMLParser.parseFromString(response.body, "text/html");
			//
			let manga = {
				mangaDexId: this.mangaDexMangaList[index],
				myAnimeListId: 0,
				lastMangaDexChapter: -1,
				currentChapter: {
					volume: 0,
					chapter: 0
				},
				chapters: []
			};
			// Scan the manga page for the mal icon and mal url
			let mangaName = content.querySelector("h6.card-header").textContent.trim();
			let myAnimeListURL = content.querySelector("img[src$='/mal.png']");
			if (myAnimeListURL !== null) {
				myAnimeListURL = myAnimeListURL.nextElementSibling;
				manga.myAnimeListId = parseInt(/https:\/\/myanimelist\.net\/manga\/(\d+)/.exec(myAnimeListURL.href)[1]);
			} else {
				manga.myAnimeListId = 0;
			}
			// If regex is empty, there is no mal link, can't do anything
			if (manga.myAnimeListId == 0) {
				// insert in local storage
				this.logAndScroll(LOG.WARNING, `> ${mangaName} set to Chapter 0 (No MyAnimeList entry)`);
				await updateLocalStorage(manga, this.options);
				index++;
				if (index < this.mangaDexMangaList.length) {
					return (this.updateLocalFromMDMAL(index));
				} else {
					this.logAndScroll(LOG.SUCCESS, "Done.");
				}
			} else {
				// Search for data from the mal_list object
				if (manga.myAnimeListId in this.myAnimeListMangaList) {
					manga.currentChapter.chapter = this.myAnimeListMangaList[manga.myAnimeListId];

					// Add last max_save_opened chapters since the current one in the opened array
					if (this.options.saveAllOpened) {
						let min = Math.max(manga.currentChapter.chapter - this.options.maxChapterSaved, 0);
						for (let i = manga.currentChapter.chapter; i > min; i--) {
							manga.chapters.push(i);
						}
					}
				}

				// Update last open for the manga
				this.logAndScroll(LOG.SUCCESS, `> ${mangaName} set to Chapter ${manga.currentChapter.chapter}`);
				await updateLocalStorage(manga, this.options);
				index++;
				if (index < this.mangaDexMangaList.length) {
					return (this.updateLocalFromMDMAL(index));
				} else {
					this.logAndScroll(LOG.SUCCESS, "Done.");
				}
			}
			return (true);
		} catch (error) {
			this.flashBackground(false);
			this.logAndScroll(LOG.DANGER, `Updating ${index + 1} Failed`);
			console.error(error);

			// Keep going
			index++;
			if (index < this.mangaDexMangaList.length) {
				await this.updateLocalFromMDMAL(index);
			} else {
				this.logAndScroll(LOG.SUCCESS, "Done.");
			}
			return (false);
		}
	}

	abortExport() {
		this.exportMALbutton.textContent = "Export";
		this.malBusy = false;
		this.malAbort = false;
		this.logAndScroll(LOG.INFO, "You aborted the task.");
	}

	async exportMAL() {
		if (this.malBusy) {
			this.malAbort = true;
			this.exportMALbutton.textContent = "Aborting...";
			return;
		}

		// Disable import
		this.malBusy = true;
		this.exportMALbutton.textContent = "In progress, click to abort.";

		// Start
		this.logOutput = this.exportOutput;
		this.logOutput.style.display = "block";
		clearDomNode(this.logOutput);
		this.logAndScroll(LOG.INFO, `Starting... don't close the options page. Some requests can be long on failure,
			don't close the page until there is a "Done for real" notifications.`);
		await this.setDomain();

		// Do the same process for every status
		for (let s = 1; s <= 6; s++) {
			// Wait 1000ms
			await this.sleep(1000);
			if (this.malAbort) {
				return (this.abortExport());
			}

			this.logAndScroll(LOG.INFO, `Updating manga with the status ${s}`);
			// Arrays with the data in this.mangaDexMangaList
			this.mangaDexMangaList = [];
			await this.listMangaDex(1, 1, s);
			if (this.malAbort) {
				return (this.abortExport());
			}

			// Abort if empty
			let max = this.mangaDexMangaList.length;
			if (max == 0)
				continue;

			// Update everything
			for (let i = 0; i < max; i++) {
				// Wait 1000ms
				await this.sleep(1000);
				if (this.malAbort) {
					return (this.abortExport());
				}

				this.logAndScroll(LOG.INFO, `Updating #${this.mangaDexMangaList[i]}`);
				let current = await storageGet(this.mangaDexMangaList[i]);

				// Get the MAL id
				let needLocalUpdate = false;
				if (current == null) {
					needLocalUpdate = true;
					this.logAndScroll(LOG.INFO, `Trying to find a MyAnimeList id for #${this.mangaDexMangaList[i]}`);
					let response = await browser.runtime.sendMessage({
						action: "fetch",
						url: `${this.domain}title/${this.mangaDexMangaList[i]}`,
						options: {
							method: "GET",
							cache: "no-cache"
						}
					});
					let content = this.HTMLParser.parseFromString(response.body, "text/html");
					// New local title
					current = {
						mal: 0,
						last: -1,
						chapters: [],
						lastTitle: Date.now()
					};
					// Scan the manga page for the mal icon and mal url
					let myAnimeListURL = content.querySelector("img[src$='/mal.png']");
					if (myAnimeListURL !== null) {
						myAnimeListURL = myAnimeListURL.nextElementSibling;
						current.mal = parseInt(/https:\/\/myanimelist\.net\/manga\/(\d+)/.exec(myAnimeListURL.href)[1]);
					}
				}

				if (current.mal == 0) {
					this.logAndScroll(LOG.WARNING, "No MyAnimeList id, skip.");
					if (needLocalUpdate) {
						await updateLocalStorage({
							mangaDexId: this.mangaDexMangaList[i],
							myAnimeListId: current.mal,
							lastMangaDexChapter: current.last,
							currentChapter: {
								chapter: current.last
							},
							chapters: current.chapters,
							lastTitle: current.lastTitle
						}, this.options);
					}
					continue;
				}

				// Update MyAnimeList
				let manga = {};
				manga.myAnimeListId = current.mal;
				manga.lastMangaDexChapter = current.last;
				manga.currentChapter = { chapter: current.last, volume: 0 };
				if (!await this.fetchMyAnimeList(manga, current.mal)) {
					if (this.malAbort) {
						return (this.abortExport());
					}
					return;
				}
				if (this.malAbort) {
					return (this.abortExport());
				}
				// Abort if not logged in - we didn't receive any data
				if (this.loggedMyAnimeList) {
					if (manga.is_approved) {
						// If MAL is already in the list save it to local
						if (manga.in_list) {
							if (current.last > manga.lastMyAnimeListChapter) {
								await this.updateMyAnimeList(manga, s);
								this.logAndScroll(LOG.INFO, `> MyAnimeList #${current.mal} updated with chapter ${current.last}`);
							} else {
								this.logAndScroll(LOG.INFO, `> MyAnimeList #${current.mal} NOT updated since it is up to date.`);
								manga.lastMangaDexChapter = manga.lastMyAnimeListChapter;
								needLocalUpdate = true;
							}
						} else { // Else update MAL
							await this.updateMyAnimeList(manga, s);
							this.logAndScroll(LOG.INFO, `> MyAnimeList #${current.mal} added with chapter ${current.last}`);
						}
					} else {
						this.logAndScroll(LOG.INFO, "The manga is still pending approval on MyAnimelist and can't be updated, skip.");
					}
				}
				// Save to Local Storage if needed
				if (needLocalUpdate) {
					manga.mangaDexId = this.mangaDexMangaList[i];
					manga.chapters = current.chapters;
					manga.lastTitle = current.lastTitle;
					if (manga.chapters.length == 0 && this.options.saveAllOpened) {
						let min = Math.max(manga.lastMangaDexChapter - this.options.maxChapterSaved, 0);
						for (let i = manga.lastMangaDexChapter; i > min; i--) {
							manga.chapters.push(i);
						}
					}
					await updateLocalStorage(manga, this.options);
				}
				if (this.malAbort) {
					return (this.abortExport());
				}
				if (!this.loggedMyAnimeList) {
					this.logAndScroll(LOG.DANGER, "Not logged on MyAnimeList, aborting.");
					return;
				}
			}
			this.logAndScroll(LOG.SUCCESS, `Status ${s} done.`);
		}

		// Done
		this.flashBackground(true);
		this.logAndScroll(LOG.SUCCESS, "Done, for real !");
		this.malBusy = false;
	}

	async fetchMyAnimeList(manga) {
		for (let i = 0; i < 3; ++i) {
			if (this.malAbort) {
				return (false);
			}
			let data = await browser.runtime.sendMessage({
				action: "fetch",
				url: `https://myanimelist.net/ownlist/manga/${manga.myAnimeListId}/edit?hideLayout`,
				options: {
					method: "GET",
					redirect: "follow",
					cache: "no-cache",
					credentials: "include"
				}
			});

			if (data.url.indexOf("login.php") > -1) {
				this.loggedMyAnimeList = false;
				break;
			} else {
				if (!data || (data.status < 200 || data.status >= 400)) {
					if (i < 2) {
						this.logAndScroll(LOG.WARNING, "Error updating the manga. Retrying...");
					} else {
						this.logAndScroll(LOG.DANGER, "There was an error while receiving info from MyAnimeList, aborting.");
						return (false);
					}
					await this.sleep(1000);
					if (this.malAbort) {
						return (false);
					}
				} else {
					// CSRF Token
					this.csrf = /'csrf_token'\scontent='(.{40})'/.exec(data.body)[1];
					processMyAnimeListResponse(manga, data.body);
					break;
				}
			}
		}
		return (true);
	}

	async updateMyAnimeList(manga, status) {
		// MD Status to MAL Status
		if (status == 4) {
			status = 6;
		} else if (status == 5) {
			status = 4;
		} else if (status == 6) {
			status = 1;
			manga.is_rereading = true;
		}

		// Build body
		let { requestURL, body } = buildMyAnimeListBody(true, manga, this.csrf, status);
		// Send the POST request to update or add the manga
		for (let i = 0; i < 3; ++i) {
			try {
				if (this.malAbort) {
					return (false);
				}
				await browser.runtime.sendMessage({
					action: "fetch",
					url: requestURL,
					options: {
						method: "POST",
						body: body,
						redirect: "follow",
						credentials: "include",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
							"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
						}
					}
				});
				break;
			} catch (error) {
				if (i < 2) {
					this.logAndScroll(LOG.WARNING, "Error updating the manga. Retrying...");
					await this.sleep(1000);
					if (this.malAbort) {
						return (false);
					}
				} else {
					this.logAndScroll(LOG.DANGER, `Error updating the manga. error: ${error}`);
					return (false);
				}
			}
		}
		return (true);
	}

	// END IMPORT EXPORT

	// START ONLINE

	toggleOnlinePanels(enabled = true) {
		if (enabled) {
			this.onlineOptions.style.display = "block";

			if (this.options.isLoggedIn) {
				this.loggedInPanel.style.display = "block";
				this.loggedOutPanel.style.display = "none";
				this.onlineAdvancedPanel.style.display = "block";
			} else {
				this.loggedInPanel.style.display = "none";
				this.loggedOutPanel.style.display = "block";
				this.onlineAdvancedPanel.style.display = "none";
			}
		} else {
			this.onlineOptions.style.display = "none";
		}
	}

	hideOnlineMessage(which = undefined) {
		if (which == "error" || which == undefined) {
			this.onlineError.style.display = "none";
		}
		if (which == "success" || which == undefined) {
			this.onlineSuccess.style.display = "none";
		}
	}

	handleOnlineError(response) {
		// Convert to object if it's a simple string
		if (typeof response === "string") {
			response = { status: response };
		}

		// Display error alert
		this.onlineError.style.display = "block";
		this.onlineError.textContent = "";
		this.flashBackground(false);

		// If there is no status the errors is a list
		if (response.status == undefined) {
			Object.keys(response).forEach(key => {
				let errorName = document.createElement("b");
				errorName.textContent = `${key}: `;
				this.onlineError.appendChild(errorName);
				this.onlineError.appendChild(document.createTextNode(response[key].join(", "))); // List of errors
				this.onlineError.appendChild(document.createElement("br"));
			});
		} else {
			// If there is a status just display it
			let errorName = document.createElement("b");
			errorName.textContent = "Error: ";
			this.onlineError.appendChild(errorName);
			this.onlineError.appendChild(document.createTextNode(response.status));
		}
	}

	handleOnlineSuccess(response) {
		// Convert to object if it's a simple string
		if (typeof response === "string") {
			response = { status: response };
		}

		// Display success alert
		this.onlineSuccess.style.display = "block";
		this.onlineSuccess.textContent = "";

		let successName = document.createElement("b");
		successName.textContent = "Success: ";
		this.onlineSuccess.appendChild(successName);
		this.onlineSuccess.appendChild(document.createTextNode(response.status));
	}

	getPassword() {
		let password = this.onlineForm.password.value;
		this.onlineForm.password.value = "";
		if (password == "" || password.length < 10) {
			this.handleOnlineError("Empty or invalid password.");
			return false;
		}
		return password;
	}

	async login() {
		this.hideOnlineMessage();

		let onlineURL = this.onlineForm.onlineURL.value;
		let username = this.onlineForm.username.value;
		let password = this.getPassword();
		if (!password) return;

		// Send a request to the "login" route /user
		try {
			let response = await browser.runtime.sendMessage({
				action: "fetch",
				url: onlineURL + "user",
				options: {
					method: "GET",
					headers: {
						"Accept": "application/json",
						"X-Auth-Name": username,
						"X-Auth-Pass": password
					}
				},
				isJson: true
			});

			// Check headers and get token if correct
			if (response.status == 200) {
				this.options.onlineURL = onlineURL;
				this.options.username = username;
				this.options.isLoggedIn = true;
				this.options.token = response.body.token;
				this.handleOnlineSuccess(response.body);
				await storageSet("options", this.options);
				this.flashBackground("bg-success");
				this.toggleOnlinePanels();
			} else {
				this.handleOnlineError(response.body);
			}
		} catch (error) {
			this.handleOnlineError(error);
		}
	}

	async register() {
		this.hideOnlineMessage();

		let onlineURL = this.onlineForm.onlineURL.value;
		let body = {
			username: this.onlineForm.username.value
		};
		body.password = this.getPassword();
		if (!body.password) return;

		// Send a request to the /user route
		try {
			let response = await browser.runtime.sendMessage({
				action: "fetch",
				url: onlineURL + "user",
				options: {
					method: "POST",
					headers: {
						"Accept": "application/json",
						"Content-Type": "application/json; charset=utf-8"
					},
					body: JSON.stringify(body)
				},
				isJson: true
			});

			if (response.status == 201) {
				this.options.onlineURL = onlineURL;
				this.options.username = body.username;
				this.options.isLoggedIn = true;
				this.options.token = response.body.token;
				this.handleOnlineSuccess(response.body);
				this.saveOptions();
				this.toggleOnlinePanels();
			} else {
				this.handleOnlineError(response.body);
			}
		} catch (error) {
			this.handleOnlineError(error);
		}
	}

	logout() {
		this.hideOnlineMessage();

		// Set the options
		this.options.username = "";
		this.options.isLoggedIn = false;
		this.options.token = "";
		// Delete the form too
		this.onlineForm.username.value = "";
		this.onlineForm.password.value = "";
		// Save
		this.handleOnlineSuccess("Logged out.");
		this.saveOptions();
		this.toggleOnlinePanels();
	}

	async importOnline() {
		this.hideOnlineMessage();

		try {
			let response = await browser.runtime.sendMessage({
				action: "fetch",
				url: `${this.options.onlineURL}user/self/export`,
				options: {
					method: "GET",
					headers: {
						"Accept": "application/json",
						"X-Auth-Token": this.options.token
					}
				},
				isJson: true
			});

			if (response.status == 200) {
				// Clear storage
				browser.storage.local.clear();
				// Build titles
				let data = {
					options: response.body.options,
					history: {
						list: response.body.history.list
					}
				};
				// Replace Online Save options
				if (data.options == null || data.options == '') {
					data.options = JSON.parse(JSON.stringify(this.options));
				} else {
					data.options.token = this.options.token;
					data.options.isLoggedIn = true;
					data.options.onlineURL = this.options.onlineURL;
					data.options.username = this.options.username;
					data.options.onlineSave = true;
				}
				response.body.titles.forEach(element => {
					data[element.md_id] = {
						mal: element.mal_id,
						last: element.last,
						chapters: element.chapters
					};
				});
				response.body.history.titles.forEach(title => {
					data.history[title.md_id] = {
						name: title.name,
						id: title.md_id,
						progress: {
							volume: Math.floor(title.progress.volume),
							chapter: parseFloat(title.progress.chapter)
						},
						chapter: Math.floor(title.chapter)
					};
				});
				await storageSet(null, data);
				// Load options to check for updates
				this.options = await loadOptions();
				// Update UI
				await this.restoreOptions();
				this.flashBackground(true);
				this.handleOnlineSuccess("Titles imported.");
			} else {
				this.handleOnlineError(response.body);
			}
		} catch (error) {
			console.error(error);
			this.handleOnlineError(error);
		}
	}

	async exportOnline() {
		this.hideOnlineMessage();

		let body = {
			options: JSON.parse(JSON.stringify(this.options)),
			titles: {},
			history: {
				list: [],
				titles: {}
			}
		};

		// Build titles list
		let _local = await storageGet(null);
		const invalidKeys = ['options', 'history', 'lastHistory', 'initializedHistory'];
		Object.keys(_local).forEach(key => {
			if (invalidKeys.indexOf(key) >= 0) return;
			body.titles[key] = _local[key];
		});
		// History
		if (this.options.updateHistoryPage) {
			let history = _local.history;
			if (history) {
				body.history.list = history.list;
				Object.keys(history).forEach(id => {
					if (id != 'list') {
						body.history.titles[id] = {
							md_id: id,
							name: history[id].name,
							progress: history[id].progress,
							chapter: history[id].chapter,
						};
					}
				});
			}
		}

		// Send the request
		try {
			let response = await browser.runtime.sendMessage({
				action: "fetch",
				url: `${this.options.onlineURL}user/self/import`,
				options: {
					method: "POST",
					headers: {
						"Accept": "application/json",
						"Content-Type": "application/json; charset=utf-8",
						"X-Auth-Token": this.options.token
					},
					body: JSON.stringify(body)
				},
				isJson: true
			});

			if (response.status == 200) {
				this.handleOnlineSuccess(response.body);
			} else {
				this.handleOnlineError(response.body);
			}
		} catch (error) {
			this.handleOnlineError(error);
		}
	}

	async deleteOnline() {
		this.hideOnlineMessage();

		let deleteOnlineButton = document.getElementById("deleteOnline");
		if (deleteOnlineButton.dataset.again === undefined) {
			deleteOnlineButton.style.fontSize = "2rem";
			deleteOnlineButton.dataset.again = true;
			deleteOnlineButton.textContent = "Click again to confirm";
			return;
		} else {
			deleteOnlineButton.style.fontSize = "1rem";
			delete deleteOnlineButton.dataset.again;
			deleteOnlineButton.textContent = "Delete Online";
		}

		let password = this.getPassword();
		if (!password) return;

		// Send a simple DELETE request
		try {
			let response = await browser.runtime.sendMessage({
				action: "fetch",
				url: `${this.options.onlineURL}user/self`,
				options: {
					method: "DELETE",
					headers: {
						"Accept": "application/json",
						"X-Auth-Name": this.options.username,
						"X-Auth-Pass": password
					}
				},
				isJson: true
			});

			if (response.status == 200) {
				// Delete in the options
				this.options.username = "";
				this.options.isLoggedIn = false;
				this.options.token = "";
				// Delete the form too
				this.onlineForm.username.value = "";
				this.onlineForm.password.value = "";
				// Save
				this.handleOnlineSuccess(response.body);
				this.saveOptions();
				this.toggleOnlinePanels();
			} else {
				this.handleOnlineError(response.body);
			}
		} catch (error) {
			this.handleOnlineError(error);
		}
	}

	async update() {
		this.hideOnlineMessage();

		let password = this.getPassword();
		if (!password) return;

		let oldPassword = this.onlineForm.password.dataset.currentPassword;
		if (oldPassword === undefined) {
			this.onlineForm.password.dataset.currentPassword = password;
			this.handleOnlineSuccess("Enter your new password and click Update Credentials again.");
			return;
		} else {
			delete this.onlineForm.password.dataset.currentPassword;
		}

		// Only the password can be updated
		let body = {
			password: password
		};

		try {
			let response = await browser.runtime.sendMessage({
				action: "fetch",
				url: `${this.options.onlineURL}user/self`,
				options: {
					method: "POST",
					headers: {
						"Accept": "application/json",
						"Content-Type": "application/json; charset=utf-8",
						"X-Auth-Name": this.options.username,
						"X-Auth-Pass": oldPassword
					},
					body: JSON.stringify(body)
				},
				isJson: true
			});

			if (response.status == 200) {
				this.options.token = response.body.token;
				this.handleOnlineSuccess(response.body);
				this.saveOptions();
			} else {
				this.handleOnlineError(response.body);
			}
		} catch (error) {
			this.handleOnlineError(error);
		}
	}

	async refreshToken() {
		this.hideOnlineMessage();

		let password = this.getPassword();
		if (!password) return;

		try {
			let response = await browser.runtime.sendMessage({
				action: "fetch",
				url: `${this.options.onlineURL}user/self/token/refresh`,
				options: {
					method: "GET",
					headers: {
						"Accept": "application/json",
						"X-Auth-Name": this.options.username,
						"X-Auth-Pass": password
					}
				},
				isJson: true
			});

			if (response.status == 200) {
				// Update in the options
				this.options.token = response.body.token;
				// Save
				this.handleOnlineSuccess("Token updated.");
				this.saveOptions();
			} else {
				this.handleOnlineError(response.body);
			}
		} catch (error) {
			this.handleOnlineError(error);
		}
	}

	async receiveToken() {
		this.hideOnlineMessage();

		let password = this.getPassword();
		if (!password) return;

		try {
			let response = await browser.runtime.sendMessage({
				action: "fetch",
				url: `${this.options.onlineURL}user/self/token`,
				options: {
					method: "GET",
					headers: {
						"Accept": "application/json",
						"X-Auth-Name": this.options.username,
						"X-Auth-Pass": password
					}
				},
				isJson: true
			});

			// Check headers and get token if correct
			if (response.status == 200) {
				this.options.token = response.body.token;
				this.handleOnlineSuccess("Token received.");
				this.saveOptions();
			} else {
				this.handleOnlineError(response.body);
			}
		} catch (error) {
			this.handleOnlineError(error);
		}
	}

	async downloadOnline() {
		try {
			let response = await browser.runtime.sendMessage({
				action: "fetch",
				url: `${this.options.onlineURL}user/self/export`,
				options: {
					method: "GET",
					headers: {
						"Accept": "application/json",
						"X-Auth-Token": this.options.token
					}
				},
				isJson: true
			});
			if (response.status == 200) {
				let body = {
					options: response.body.options,
					history: {
						list: response.body.history.list
					}
				};
				if (body.options == null || body.options == '') {
					body.options = JSON.parse(JSON.stringify(this.options));
				} else {
					body.options.token = this.options.token;
					body.options.isLoggedIn = true;
					body.options.onlineURL = this.options.onlineURL;
					body.options.username = this.options.username;
					body.options.onlineSave = true;
				}
				response.body.titles.forEach(element => {
					body[element.md_id] = {
						mal: element.mal_id,
						last: element.last,
						chapters: element.chapters
					};
				});
				response.body.history.titles.forEach(title => {
					body.history[title.md_id] = {
						name: title.name,
						id: title.md_id,
						progress: title.progress,
						chapter: Math.floor(title.chapter)
					};
				});
				this.downloadOnlineButton.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(body))}`;
				this.downloadOnlineButton.click();
				this.downloadOnlineButton.href = "";
			} else {
				this.handleOnlineError(response.body);
			}
		} catch (error) {
			console.error(error);
			this.handleOnlineError(error);
		}
	}

	async saveOnlineOptions() {
		try {
			await browser.runtime.sendMessage({
				action: "fetch",
				url: `${this.options.onlineURL}user/self/options`,
				options: {
					method: "POST",
					headers: {
						"Accept": "application/json",
						"Content-Type": "application/json; charset=utf-8",
						"X-Auth-Token": this.options.token
					},
					body: JSON.stringify({
						options: this.options
					})
				},
				isJson: true
			});
		} catch (error) {
			console.error(error);
			this.handleOnlineError(error);
		}
	}

	// END ONLINE
}
document.addEventListener("DOMContentLoaded", () => {
	new OptionsManager();
});