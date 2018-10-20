/**
 * Author: Glagan
 * See <https://github.com/Glagan/MyMangaDex> for more informations
 */
const LOG = {INFO: "info", DANGER: "danger", WARNING: "warning", SUCCESS: "success"};
class OptionsManager {
    constructor() {
        // Nodes
        this.addColorButton = document.getElementById("addColor");
        this.saveButton = document.getElementById("save");
        this.lastOpenColorsList = document.getElementById("lastOpenColors");
        this.defaultLastOpenColors = document.getElementById("defaultLastOpenColors");
        this.refreshSaveButton = document.getElementById("refresh-save");
        this.saveContent = document.getElementById("save-content");
        this.importMMDForm = document.getElementById("save-import");
        this.importMALForm = document.getElementById("mal-import");
        this.deleteSaveButton = document.getElementById("delete-save");
        this.contentNode = document.getElementById("content");
        this.lastOpenColorsNodes = {};
        this.outputMyAnimeList = document.getElementById("malImportStatus");
        this.importInformations = document.getElementById("importInformations");
        this.importSubmitButton = document.getElementById("importSubmitButton");

        //
        this.options = {};
        this.myAnimeListMangaList = {};
        this.mangaDexMangaList = [];

        // Start
        this.setEvents();
        this.start();
    }

    async start() {
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
                    document.querySelector("[data-color='" + field + "']").style.backgroundColor = event.target.value;
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
                let inputField = document.querySelector("[data-option='" + element.dataset.default +"']");
                if ("type" in inputField.dataset && inputField.dataset.type == "checkbox") {
                    this.updateCheckbox(inputField, defaultOptions[element.dataset.default]);
                } else {
                    inputField.value = defaultOptions[element.dataset.default];
                    if (inputField.dataset.color !== undefined) {
                        document.querySelector("[data-color='" + element.dataset.default + "']").style.backgroundColor = defaultOptions[element.dataset.default];
                    }
                }
            });
        });
        this.defaultLastOpenColors.addEventListener("click", () => {
            this.restoreDefaultsLastOpenColors();
        });

        // Export
        this.refreshSaveButton.addEventListener("click", async () => {
            // Load save
            let data = await storageGet(null);
            this.saveContent.value = JSON.stringify(data);
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

        // Delete
        this.deleteSaveButton.addEventListener("click", () => {
            this.deleteSave();
        });
    }

    // FUNCTIONS

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
                    document.querySelector("[data-color='" + element.dataset.option + "']").style.backgroundColor = element.value;
                }
            }
        });
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
        this.contentNode.classList.add(value ? "bg-success" : "bg-fail");
        setTimeout(() => {
            this.contentNode.classList.remove(value ? "bg-success" : "bg-fail");
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
                    this.options[element.dataset.option] = element.value;
                }
            });
            // Save
            await storageSet("options", this.options);
            console.log("Saved");
            this.flashBackground(true);
        } catch (error) {
            console.error(error);
            this.flashBackground(false);
        }
    }

    async deleteSave() {
        // Clear
        await browser.storage.local.clear();

        // Set the default options
        try {
            await storageSet("options", defaultOptions);
            this.options = JSON.parse(JSON.stringify(defaultOptions)); // Deep copy default
            this.flashBackground(true);
            this.restoreOptions();
        } catch (error) {
            console.error(error);
            this.flashBackground(false);
        }
    }

    // END FUNCTIONS / START IMPORT EXPORT

    logAndScroll(logLevel, text) {
        let row = document.createElement("li");
        row.className = "list-group-item list-group-item-" + logLevel;
        row.textContent = text;
        this.outputMyAnimeList.appendChild(row);
        this.outputMyAnimeList.scrollTop = this.outputMyAnimeList.scrollHeight;
    }

    async importMMD() {
        // try catch if JSON can't be parsed
        try {
            this.importSubmitButton.disabled = true;
            let importedData = JSON.parse(this.importMMDForm.save.value);
            if (isEmpty(importedData) || importedData.options === undefined) {
                this.importInformations.textContent = "Invalid save.";
                this.importSubmitButton.disabled = false;
                this.flashBackground(false);
                return;
            } else {
                this.importInformations.textContent = "Entries in the save: " + (Object.keys(importedData).length - 1);
            }
            await storageSet(null, importedData);

            // Load options to check for updates
            this.options = await loadOptions();
            // Update UI
            await this.restoreOptions();
            this.flashBackground(true);
            this.importSubmitButton.disabled = false;
            this.importMMDForm.save.value = "";
        } catch (error) {
            this.importSubmitButton.disabled = false;
            this.flashBackground(false);
            console.error(error);
        }
    }

    async importMAL() {
        let username = this.importMALForm.username.value;
        this.importMALForm.disabled = true;

        if (username != "") {
            // Arrays with the data
            this.myAnimeListMangaList = {};
            this.mangaDexMangaList = [];

            // Show the status box
            this.outputMyAnimeList.style.display = "block";
            clearDomNode(this.outputMyAnimeList);
            this.logAndScroll(LOG.INFO, "Starting... don't close this tab.");

            // Start a dummy request to MyAnimeList to see if we can fetch the data
            await this.listMyAnimeList(username, 0, true);
            if (Object.keys(this.myAnimeListMangaList).length == 0) {
                this.flashBackground(false);
                this.logAndScroll(LOG.DANGER, "Empty MAL manga list, aborting.");
            } else {
                // Start fetching the data
                await this.listMyAnimeList(username, Object.keys(this.myAnimeListMangaList).length);
                await this.listMangaDex();
                await this.updateLocalFromMDMAL();

                this.flashBackground(true);
            }
        } else {
            this.flashBackground(false);
            console.error("Empty MAL username");
        }
    }

    async listMyAnimeList(username, offset = 0, dummy = false) {
        // Abort if data already retrieved and only 1 page
        if (offset > 0 && offset < 300) {
            this.logAndScroll(LOG.SUCCESS, "Done fetching MyAnimeList manga.");
            return;
        }
        this.logAndScroll(LOG.INFO, "Fetching MyAnimeList manga from " + offset + " to " + (offset + 300));

        try {
            let response = await fetch("https://myanimelist.net/mangalist/" + username + "/load.json?offset=" + offset + "&status=7", {
                method: "GET",
                redirect: "follow",
                credentials: "include"
            });
            let data = await response.json();
            if (data.hasOwnProperty("errors")) {
                this.logAndScroll(LOG.DANGER, data.errors[0].message);
            } else {
                // Insert each manga fetched in the list
                for (let manga of data) {
                    this.myAnimeListMangaList[parseInt(manga.manga_id)] = parseInt(manga.num_read_chapters);
                }

                if (!dummy) {
                    // If there is 300 items, we might have reached the list limit so we try again
                    if (data.length == 300) {
                        await this.listMyAnimeList(username, offset + 300);
                    } else {
                        this.logAndScroll(LOG.SUCCESS, "Done fetching MyAnimeList manga.");
                    }
                }
            }
        } catch (error) {
            this.flashBackground(false);
            console.error(error);
        }
    }

    async listMangaDex(page = 1, max_page = 1) {
        this.logAndScroll(LOG.INFO, "Fetching MangaDex follow page manga " + page + ((max_page > 1) ? " of " + max_page : ""));

        try {
            let response = await fetch("https://mangadex.org/follows/manga/0/0/" + page + "/", {
                method: "GET",
                redirect: "follow",
                credentials: "include"
            });
            let data = await response.text();
            let regex = /href="\/title\/(\d+)\/.+"(?:\s*class)/g;
            let m;

            // Get all manga ids
            while ((m = regex.exec(data)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
                this.mangaDexMangaList.push(parseInt(m[1]));
            }

            // Check the number of pages
            if (page == 1) {
                let regex = /Showing\s\d+\sto\s\d+\sof\s(\d+)\stitles/.exec(data);
                if (regex !== null) {
                    max_page = Math.ceil(regex[1] / 100);
                }
            }

            // We fetch the next page if required
            if (page < max_page) {
                await this.listMangaDex(page + 1, max_page);
            } else {
                this.logAndScroll(LOG.SUCCESS, "Done fetching MangaDex follow manga.");
            }
        } catch (error) {
            this.flashBackground(false);
            console.error(error);
        }
    }

    async updateLocalFromMDMAL(index = 0) {
        this.logAndScroll(LOG.INFO, "Updating " + (index + 1) + "/" + this.mangaDexMangaList.length);

        // Wait 500ms
        await new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 500);
        });

        try {
            let response = await fetch("https://mangadex.org/title/" + this.mangaDexMangaList[index], {
                method: "GET",
                cache: "no-cache"
            });
            let data = await response.text();
            // Scan the manga page for the mal icon and mal url
            let mangaName = /<title>(.+)\s*\(Title\)\s*-\s*MangaDex<\/title>/.exec(data)[1];
            let myAnimeListURL = /<a.+href='(.+)'>MyAnimeList<\/a>/.exec(data);

            let manga = {
                name: mangaName,
                mangaDexId: this.mangaDexMangaList[index],
                myAnimeListId: 0,
                lastMangaDexChapter: 0,
                currentChapter: {
                    volume: 0,
                    chapter: 0
                },
                chapters: []
            };

            // If regex is empty, there is no mal link, can't do anything
            if (myAnimeListURL === null) {
                // insert in local storage
                this.logAndScroll(LOG.WARNING, "> " + mangaName + " set to Chapter 0 (No MyAnimeList entry)");
                await updateLocalStorage(manga, this.options);
                index++;
                if (index < this.mangaDexMangaList.length) {
                    return this.updateLocalFromMDMAL(index);
                } else {
                    this.logAndScroll(LOG.SUCCESS, "Done.");
                }
            } else {
                // Finish gettint the mal url
                myAnimeListURL = myAnimeListURL[1];
                // If there is a mal link, add it and save it in local storage
                manga.mal = parseInt(/.+\/(\d+)/.exec(myAnimeListURL)[1]);

                // Search for data from the mal_list object
                if (manga.mal in this.myAnimeListMangaList) {
                    manga.currentChapter.chapter = this.myAnimeListMangaList[manga.mal];

                    // Add last max_save_opened chapters since the current one in the opened array
                    if (this.options.saveAllOpened) {
                        let min = Math.max(manga.currentChapter.chapter - this.options.maxChapterSaved, 0);
                        for (let i = manga.currentChapter.chapter; i > min; i--) {
                            manga.chapters.push(i);
                        }
                    }
                }

                // Update last open for the manga
                this.logAndScroll(LOG.SUCCESS, "> " + mangaName + " set to Chapter " + manga.currentChapter.chapter);
                await updateLocalStorage(manga, this.options);
                index++;
                if (index < this.mangaDexMangaList.length) {
                    return this.updateLocalFromMDMAL(index);
                } else {
                    this.logAndScroll(LOG.SUCCESS, "Done.");
                }
            }
        } catch (error) {
            this.flashBackground(false);
            this.logAndScroll(LOG.DANGER, "Updating " + (index + 1) + " Failed");
            console.error(error);

            // Keep going
            index++;
            if (index < this.mangaDexMangaList.length) {
                await this.updateLocalFromMDMAL(index);
            } else {
                this.logAndScroll(LOG.SUCCESS, "Done.");
            }
        }
    }

    // END IMPORT EXPORT
}
document.addEventListener("DOMContentLoaded", async () => {
    let optionsManager = new OptionsManager();
});