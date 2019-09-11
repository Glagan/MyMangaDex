/**
 * Author: Glagan
 * See <https://github.com/Glagan/MyMangaDex> for more informations
 */

/**
 * source: https: //stackoverflow.com/a/34491287/7794671
 * Count the number of properties of an object to test if it's empty
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
    } catch (error) {
        console.error(browser.runtime.lastError);
        console.error(error);
        return undefined;
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
    } catch (error) {
        console.error(browser.runtime.lastError);
        console.error(error);
        return undefined;
    }
}

/**
 * Get the options from local storage and put them in the global object MMD_options
 * Also manage the updates and apply the modifications if there is
 */
async function loadOptions() {
    let data = await storageGet("options");
    let mmdImage = "https://ramune.nikurasu.org/mymangadex/128.png";
    // If there is nothing in the storage, default options
    if (data === undefined || typeof data != "object" || isEmpty(data)) {
        SimpleNotification.info({
            title: "First Time",
            image: mmdImage,
            text: "It looks like it is your first time using MyMangaDex, for any help go on {{github|https://github.com/Glagan/MyMangaDex}}.\nDon't forget to look at the **Options** !",
            buttons: {
                value: "Open Options",
                type: "message",
                onClick: (n) => {
                    n.close();
                    browser.runtime.sendMessage({ action: "openOptions" });
                }
            }
        }, { sticky: true, position: "bottom-left" });
        await storageSet("options", defaultOptions);
        return JSON.parse(JSON.stringify(defaultOptions));
    } else {
        // Make sure all keys are present
        let fixed = false;
        Object.keys(defaultOptions).forEach(key => {
            if (!data.hasOwnProperty(key)) {
                data[key] = defaultOptions[key];
                fixed = true;
            }
        });
        // Version updates
        if (data.version < defaultOptions.version) {
            if (data.version < 2.2) {
                SimpleNotification.info({
                    title: "MyMangaDex Update",
                    image: mmdImage,
                    text: "You can now **Confirm Updates** that would be rejected (lower chapter) and update a title only if it's in your **MangaDex** list.\nYou can enable these options... in the **options**.\nIf you have a problem, don't forget: **Github**, **Reddit** or **Discord**.",
                    buttons: {
                        value: "Open Options",
                        type: "message",
                        onClick: (n) => {
                            n.close();
                            browser.runtime.sendMessage({ action: "openOptions" });
                        }
                    }
                }, { sticky: true, position: "bottom-left" });

                SimpleNotification.info({
                    title: "Online Save Update",
                    image: mmdImage,
                    text: "**MyMangaDex** online save has been updated and now save your **options** and your **history** (if enabled).\nIf you have **any** problem, same as the previous notification.",
                    buttons: {
                        value: "Open Options",
                        type: "message",
                        onClick: (n) => {
                            n.close();
                            browser.runtime.sendMessage({ action: "openOptions" });
                        }
                    }
                }, { sticky: true, position: "bottom-left" });
            }

            if (data.version < 2.3) {
                SimpleNotification.info({
                    title: "More options",
                    image: mmdImage,
                    text: "Version **2.3** come with more options, you can now display the full size cover in the thumbnails, hide higher chapters and highlight the next chapter.\nSee you in the options !",
                    buttons: {
                        value: "Open Options",
                        type: "message",
                        onClick: (n) => {
                            n.close();
                            browser.runtime.sendMessage({ action: "openOptions" });
                        }
                    }
                }, { sticky: true, position: "bottom-left" });
            }
        }
        // Fix the save on version updates
        if ((data.version != defaultOptions.version) ||
            (data.version == defaultOptions.version && data.subVersion != defaultOptions.subVersion)) {
            // Fix history wrong progress
            let history = await storageGet("history");
            if (history) {
                Object.keys(history).forEach(md_id => {
                    if (md_id == 'list') return;
                    if (history[md_id]) {
                        if (history[md_id].progress == null) {
                            history[md_id].progress = {
                                volume: 0,
                                chapter: 0
                            };
                        } else if (typeof history[md_id].progress != 'object') {
                            history[md_id].progress = {
                                volume: 0,
                                chapter: history[md_id].progress
                            };
                        }
                    } else {
                        history[md_id] = undefined;
                    }
                });
            } else {
                history = { list: [] };
            }
            await storageSet("history", history);
            data.version = defaultOptions.version;
            data.subVersion = defaultOptions.subVersion;
            fixed = true;
        }
        if (fixed) {
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
        SimpleNotification.success({
            title: "Manga updated",
            image: "https://mangadex.org/images/manga/" + manga.mangaDexId + ".thumb.jpg",
            text: manga.name + " last open Chapter as been updated to " + manga.lastMangaDexChapter,
        }, { position: "bottom-left" });
    }
    // Update online
    if (options.onlineSave && options.isLoggedIn) {
        // Build body
        let body = {
            mal: manga.myAnimeListId,
            last: manga.lastMangaDexChapter,
            options: {
                "saveAllOpened": options.saveAllOpened,
                "maxChapterSaved": options.maxChapterSaved
            }
        };
        if (options.updateHistoryPage &&
            manga.name != undefined &&
            manga.chapterId > 0) {
            body.options.updateHistoryPage = true;
            body.volume = manga.currentChapter.volume;
            body.title_name = manga.name;
            body.chapter = manga.chapterId;
        }
        // Send the request
        try {
            let response = await browser.runtime.sendMessage({
                action: "fetch",
                url: options.onlineURL + "user/self/title/" + manga.mangaDexId,
                options: {
                    method: "POST",
                    mode: "cors",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json; charset=utf-8",
                        "X-Auth-Token": options.token
                    },
                    body: JSON.stringify(body)
                },
                isJson: true
            });

            if (response.status != 200) {
                options.isLoggedIn = false;
            }
        } catch (error) {
            options.isLoggedIn = false;
            console.error(error);
        }
        if (options.isLoggedIn == false) {
            if (options.showErrors) {
                SimpleNotification.error({
                    title: "Couldn't save Online",
                    image: "https://ramune.nikurasu.org/mymangadex/128b.png",
                    text: "The Online Service might have a problem, or your credentials has been changed.\nYou have been **logged out**, go to the options to log in again.",
                    buttons: {
                        value: "Open Options",
                        type: "message",
                        onClick: (n) => {
                            n.close();
                            browser.runtime.sendMessage({ action: "openOptions" });
                        }
                    }
                }, { sticky: true, position: "bottom-left" });
            }
            await storageSet("options", options);
        }
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
            manga.start_date = {
                year: MyDate.getFullYear(),
                month: MyDate.getMonth() + 1,
                day: MyDate.getDate()
            }
            manga.start_today = true;
        }

        // Set the finish date if it's the last chapter and not set
        if (manga.status == 2 && manga.finish_date.year == "") {
            let MyDate = new Date();
            manga.finish_date = {
                year: MyDate.getFullYear(),
                month: MyDate.getMonth() + 1,
                day: MyDate.getDate()
            };
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