/**
 * Author: Glagan
 * See <https://github.com/Glagan/MyMangaDex> for more informations
 */

 /**
 * source: https: //stackoverflow.com/a/34491287/7794671
 * Count the number of properties of an object to test if it's empty
 * Could add more tests but it was enough for this extension
 * @param {Object} obj The object to test
 */
function isEmpty(obj) {
    for (let x in obj) { return false; }
    return true;
}

/**
 * Fetch data from the storage and directly return the real value
 * Return undefined if the data isn't stored or the data as it was stored if it exist
 * @param {string} key The key of the data to fetch in the storage
 */
async function storageGet(key) {
    try {
        if (key !== null) {
            key = key + "";
        }
        let res;
        if (CHROME) {
            await browser.storage.local.get((key === null) ? null : key, function(result) {
                res = (key === null) ? result : result[key];
            });
            return res;
        } else {
            res = await browser.storage.local.get((key === null) ? null : key);
            return (key === null) ? res : res[key];
        }
    } catch(error) {
        console.error(error);
    }
}

/**
 * Insert the data argument directly with the key argument, to avoid creationg an object when calling storage.set()
 * If key is null, the data object just replace everything in storage
 * @param {*} key The key of the data to insert or null
 * @param {Object} data The data to insert
 */
async function storageSet(key, data) {
    try {
        return await browser.storage.local.set((key === null) ? data : {[key]:data});
    } catch(error) {
        console.error(error);
    }
}

/**
 * Get the options from local storage and put them in the global object MMD_options
 * Also manage the updates and apply the modifications if there is
 */
async function loadOptions() {
    let data = await storageGet("options");
    // If there is nothing in the storage, default options
    if (data === undefined) {
        vNotify.info({
            title: "First time using MyMangaDex",
            text: "It looks like it is your first time using MyMangaDex, for any help go to https://github.com/Glagan/MyMangaDex, and don't forget to look at the settings !",
            sticky: true
        });

        await storageSet("options", defaultOptions);
        return JSON.parse(JSON.stringify(defaultOptions));
    } else {
        // If options < last
        if (data.version < defaultOptions.version) {
            // I saw people using using 1.6.3 ??? So just in case...
            if (data.version < 1.7) {
                data.auto_md_list = false;
            }

            if (data.version < 1.8) {
                // Options object rework
                data = {
                    lastReadColor: data.colors.last_read,
                    lowerChaptersColor: data.colors.lower_chapter,
                    lastOpenColors: data.colors.last_open,
                    openedChaptersColor: data.colors.opened_chapters,
                    hideLowerChapters: data.hide_lower,
                    saveOnlyHigher: data.last_only_higher,
                    saveAllOpened: data.save_all_opened,
                    maxChapterSaved: data.max_save_opened,
                    updateMDList: data.auto_md_list,
                    showTooltips: true // New options to default
                };
            }

            if (data.version < 1.9) {
                data.highlightChapters = defaultOptions.highlightChapters;
                data.showNotifications = defaultOptions.showNotifications;
                data.showErrors = defaultOptions.showErrors;
                data.version = 1.9;

                vNotify.info({
                    title: "MyMangaDex as been updated to 1.9",
                    text: "You can see the changelog on https://github.com/Glagan/MyMangaDex, new options have been added, you should check them out !"
                });
            }

            await storageSet("options", data);
        } // Easy to add updates here, on another if and push the promise in the updates array

        return data;
    }
}

async function updateLocalStorage(manga, options) {
    if (options.saveOnlyHigher) {
        manga.lastMangaDexChapter = Math.max(manga.lastMangaDexChapter, manga.currentChapter.chapter);
    } else {
        manga.lastMangaDexChapter = manga.currentChapter.chapter;
    }
    await storageSet(manga.mangaDexId, {
        mal: manga.myAnimeListId,
        last: manga.lastMangaDexChapter,
        chapters: manga.chapters
    });
    // Show a notification for updated last opened if there is no MyAnimeList id
    if (options.showNotifications && manga.myAnimeListId == 0 && manga.currentChapter.chapter > manga.lastMangaDexChapter) {
        vNotify.success({
            title: "Manga updated",
            text: manga.name + " last open Chapter as been updated to " + manga.lastMangaDexChapter,
            image: "https://mangadex.org/images/manga/" + manga.mangaDexId + ".thumb.jpg"
        });
    }
}

function clearDomNode(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

function uniqueGUID() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}