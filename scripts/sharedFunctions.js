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

            if (data.version < 2.0) {
                data.showNoMal = defaultOptions.showNoMal;
                data.onlineSave = defaultOptions.onlineSave; // New options to default
                data.onlineURL = defaultOptions.onlineURL;
                data.username = defaultOptions.username;
                data.password = defaultOptions.password;
                data.isLoggedIn = defaultOptions.isLoggedIn;
                data.token = defaultOptions.token;
                data.version = 2.0;

                vNotify.info({
                    title: "MyMangaDex as been updated to 2.0",
                    text: "Online Save as been added, if you wish to use it you need to manually enable it. You can see the changelog on https://github.com/Glagan/MyMangaDex."
                });
            }

            await storageSet("options", data);
        } // Easy to add updates here, on another if and push the promise in the updates array

        // Sub version option fix
        if (data.showNoMal === undefined) {
            data.showNoMal = defaultOptions.showNoMal;
            await storageSet("options", data);
        }

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

function processMyAnimeListResponse(manga, text) {
    manga.is_approved = !/class="badresult"/.test(text);
    manga.exist = !/id="queryTitle"/.test(text);
    // Comments
    manga.comments = /add_manga_comments.+>(.*)</.exec(text)[1];
    // Ask to discuss
    manga.ask_to_discuss = /add_manga_is_asked_to_discuss.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
    manga.ask_to_discuss = (manga.ask_to_discuss === null) ? 0 : parseInt(manga.ask_to_discuss[1]);
    // Last read chapter
    manga.lastMyAnimeListChapter = /add_manga_num_read_chapters.+value="(\d+)?"/.exec(text);
    manga.lastMyAnimeListChapter = (manga.lastMyAnimeListChapter === null) ? 0 : parseInt(manga.lastMyAnimeListChapter[1]);
    // Total times re-read
    manga.total_reread = /add_manga_num_read_times.+value="(\d+)?"/.exec(text);
    manga.total_reread = (manga.total_reread === null) ? 0 : parseInt(manga.total_reread[1]);
    // Last read volume
    manga.last_volume = /add_manga_num_read_volumes.+value="(\d+)?"/.exec(text);
    manga.last_volume = (manga.last_volume === null) ? 0 : parseInt(manga.last_volume[1]);
    // Retail volumes
    manga.retail_volumes = /add_manga_num_retail_volumes.+value="(\d+)?"/.exec(text);
    manga.retail_volumes = (manga.retail_volumes === null) ? 0 : parseInt(manga.retail_volumes[1]);
    // Priority
    manga.priority = /add_manga_priority.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
    manga.priority = (manga.priority === null) ? 0 : parseInt(manga.priority[1]);
    // Re-read value
    manga.reread_value = /add_manga_reread_value.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
    manga.reread_value = (manga.reread_value === null) ? "" : manga.reread_value[1];
    // Score
    manga.score = /add_manga_score.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
    manga.score = (manga.score === null) ? "" : parseInt(manga.score[1]);
    // SNS Post type
    manga.sns_post_type = /add_manga_sns_post_type.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
    manga.sns_post_type = (manga.sns_post_type === null) ? 0 : parseInt(manga.sns_post_type[1]);
    // Start date
    manga.start_date = {};
    manga.start_date.month = (parseInt(/add_manga_start_date_month.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
    manga.start_date.day = (parseInt(/add_manga_start_date_day.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
    manga.start_date.year = (parseInt(/add_manga_start_date_year.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
    // Finish date
    manga.finish_date = {};
    manga.finish_date.month = (parseInt(/add_manga_finish_date_month.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
    manga.finish_date.day = (parseInt(/add_manga_finish_date_day.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
    manga.finish_date.year = (parseInt(/add_manga_finish_date_year.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
    // Status
    manga.status = /add_manga_status.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
    manga.status = (manga.status === null) ? 0 : parseInt(manga.status[1]);
    // Storage type
    manga.storage_type = /add_manga_storage_type.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
    manga.storage_type = (manga.storage_type === null) ? "" : manga.storage_type[1];
    // Tags
    manga.tags = /add_manga_tags.+>(.*)*</.exec(text)[1] || "";
    // Is re-reading ?
    manga.is_rereading = /name="add_manga\[is_rereading\]"\s*value="\d*"\s*checked="checked"/.test(text);
    // Bonus : total volume and chapter
    manga.total_volume = parseInt(/id="totalVol">(.*)?<\//.exec(text)[1]) || 0;
    manga.total_chapter = parseInt(/id="totalChap">(.*)?<\//.exec(text)[1]) || 0;
    // Is in the list
    manga.in_list = (manga.status > 0);
}

function buildMyAnimeListBody(usePepper, manga, csrf, status = 1) {
    let requestURL = "https://myanimelist.net/ownlist/manga/" + manga.myAnimeListId + "/edit?hideLayout";
    if (usePepper) {
        // Status is always set to reading, or we complet it if it's the last chapter, and so we fill the finish_date
        manga.status = (manga.status == 2 || (manga.total_chapter > 0 && manga.currentChapter.chapter >= manga.total_chapter)) ? 2 : status;

        // Set the start only if it's not already set and if we don't add it to PTR and if it was in ptr or not in the list
        if (!manga.in_list && manga.status != 6 && manga.start_date.year == "") {
            let MyDate = new Date();
            manga.start_date.year = MyDate.getFullYear();
            manga.start_date.month = MyDate.getMonth() + 1;
            manga.start_date.day = MyDate.getDate();
            manga.start_today = true;
        }

        // Set the finish date if it's the last chapter and not set
        if (manga.status == 2 && manga.finish_date.year == "") {
            let MyDate = new Date();
            manga.finish_date.year = MyDate.getFullYear();
            manga.finish_date.month = MyDate.getMonth() + 1;
            manga.finish_date.day = MyDate.getDate();
            manga.end_today = true;
        }

        // Start reading manga if it's the first chapter
        if (!manga.in_list) {
            // We have to change the url if we're adding the manga to the list, not editing
            requestURL = "https://myanimelist.net/ownlist/manga/add?selected_manga_id=" + manga.myAnimeListId + "&hideLayout";
            manga.in_list = true;
            manga.started = true;
        }

        if (manga.is_rereading && manga.total_chapter > 0 && manga.currentChapter.chapter >= manga.total_chapter) {
            manga.completed = true;
            manga.is_rereading = false;
            manga.total_reread++;
        }
    } else {
        manga.status = status;
    }

    // Update
    manga.lastMyAnimeListChapter = Math.floor(manga.currentChapter.chapter);

    // Prepare the body
    let body = "entry_id=0&";
    body += "manga_id=" + manga.myAnimeListId + "&";
    body += encodeURIComponent("add_manga[status]") + "=" + manga.status + "&";
    body += encodeURIComponent("add_manga[num_read_volumes]") + "=" + manga.currentChapter.volume + "&";
    body += "last_completed_vol=&";
    body += encodeURIComponent("add_manga[num_read_chapters]") + "=" + manga.lastMyAnimeListChapter + "&";
    body += encodeURIComponent("add_manga[score]") + "=" + manga.score + "&";
    body += encodeURIComponent("add_manga[start_date][day]") + "=" + manga.start_date.day + "&";
    body += encodeURIComponent("add_manga[start_date][month]") + "=" + manga.start_date.month + "&";
    body += encodeURIComponent("add_manga[start_date][year]") + "=" + manga.start_date.year + "&";
    body += encodeURIComponent("add_manga[finish_date][day]") + "=" + manga.finish_date.day + "&";
    body += encodeURIComponent("add_manga[finish_date][month]") + "=" + manga.finish_date.month + "&";
    body += encodeURIComponent("add_manga[finish_date][year]") + "=" + manga.finish_date.year + "&";
    body += encodeURIComponent("add_manga[tags]") + "=" + encodeURIComponent(manga.tags) + "&";
    body += encodeURIComponent("add_manga[priority]") + "=" + manga.priority + "&";
    body += encodeURIComponent("add_manga[storage_type]") + "=" + manga.storage_type + "&";
    body += encodeURIComponent("add_manga[num_retail_volumes]") + "=" + manga.retail_volumes + "&";
    body += encodeURIComponent("add_manga[num_read_times]") + "=" + manga.total_reread + "&";
    body += encodeURIComponent("add_manga[reread_value]") + "=" + manga.reread_value + "&";
    body += encodeURIComponent("add_manga[comments]") + "=" + encodeURIComponent(manga.comments) + "&";
    body += encodeURIComponent("add_manga[is_asked_to_discuss]") + "=" + manga.ask_to_discuss + "&";
    body += encodeURIComponent("add_manga[sns_post_type]") + "=" + manga.sns_post_type + "&";
    if (manga.is_rereading) {
        body += encodeURIComponent("add_manga[is_rereading]") + "=1&";
    }
    body += "submitIt=0&";
    body += encodeURIComponent("csrf_token") + "=" + csrf;

    return {
        requestURL: requestURL,
        body: body
    };
}