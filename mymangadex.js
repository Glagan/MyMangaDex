/**
 * Author: Glagan <nicolas.colomer@protonmail.com>
 * See <https://github.com/Glagan/MyMangaDex> for more informations
 */

// INIT

// Object containing all options
// Is initialized with the default options
let default_options = {
    colors: {
        last_read: "rgba(95,158,160,0.6)", // cadetblue
        lower_chapter: "darkolivegreen",
        last_open: [
            "rgba(102, 51, 153, 0.6)", // rebeccapurple
            "rgba(75, 0, 130, 0.6)" // indigo
        ],
        opened_chapters: "darkslategray"
    },
    hide_lower: true,
    follow_button: true,
    last_only_higher: true,
    save_all_opened: true,
    max_save_opened: 100,
    version: 1.5
};
let MMD_options = {};

let URL = window.location.href;
let logged_in_mal = true;
let csrf_token = "";

// HELP FUNCTIONS

// https://stackoverflow.com/a/34491287/7794671
/**
 * Count the number of properties of an object to test if it's empty
 * Could add more tests but it was enough for this extension
 * @param {Object} obj The object to test
 */
function is_empty(obj) {
    for (let x in obj) { return false; }
    return true;
}

/**
 * Fetch data from the storage and directly return the real value
 * Return undefined if the data isn't stored or the data as it was stored if it exist
 * @param {string} key The key of the data to fetch in the storage
 */
function storage_get(key) {
    return browser.storage.local.get((key === null) ? null : key + "")
    .then((res) => {
        return (key === null) ? res : res[key];
    }).catch((error) => {
        console.error(error);
    });
}

/**
 * Insert the data argument directly with the key argument, to avoid creationg an object when calling storage.set()
 * If key is null, the data object just replace everything in storage
 * @param {*} key The key of the data to insert or null
 * @param {Object} data The data to insert
 */
function storage_set(key, data) {
    return browser.storage.local.set((key === null) ? data : {[key]:data})
    .catch((error) => {
        console.error(error);
    });
}

/**
 * Get the options from local storage and put them in the global object MMD_options
 * Also manage the updates and apply the modifications if there is
 */
function load_options() {
    return storage_get("options")
    .then((res) => {
        // If there is nothing in the storage, default options
        if (res === undefined) {
            MMD_options = default_options;
            return storage_set("options", MMD_options);
        } else {
            // Else load them, or with default if there is a missing option somehow
            MMD_options = {
				colors: {
					last_read: res.colors.last_read || default_options.colors.last_read,
					lower_chapter: res.colors.lower_chapter || default_options.colors.lower_chapter,
					last_open: res.colors.last_open || default_options.colors.last_open,
					opened_chapters: res.colors.opened_chapters || default_options.colors.opened_chapters
				},
				hide_lower: res.hide_lower,
				follow_button: res.follow_button,
				last_only_higher: res.last_only_higher,
				max_save_opened: res.max_save_opened || default_options.max_save_opened,
				save_all_opened: res.save_all_opened,
				version: res.version || default_options.version
            };

            let updates = [];

            // If options < last, and > 1.1
            if (MMD_options.version < default_options.version) {
                // 1.3 modified the storage by allowing only x chapters to be saved and added a new parameter
                if (MMD_options.version < 1.3) {
                    console.info("Updating to the 1.3 save format...");
                    MMD_options.max_save_opened = 100;
                    MMD_options.version = 1.3;

                    updates.push(
                        storage_get(null)
                        .then((data) => {
                            // Delete the list of chapters that was too long
                            for (let entry in data) {
                                if (entry == "options") {
                                    data.options.version = 1.3;
                                } else {
                                    while (data[entry].chapters.length > MMD_options.max_save_opened) {
                                        data[entry].chapters.pop();
                                    }
                                }
                            }

                            return storage_set(null, data)
                            .then(() => {
                                console.info("Done updating to the 1.3 save format.");
                            });
                        })
                    );
                }

                // Activated the follow_button option in 1.4
                if (MMD_options.version < 1.4) {
                    MMD_options.version = 1.4;
                    MMD_options.follow_button = default_options.follow_button;
                }

                // Nothing new in 1.5, fixes
                if (MMD_options.version < 1.5) {
                    MMD_options.version = 1.5;
                }

                return storage_set("options", MMD_options);
            } // Easy to add updates here, on another if and push the promise in the updates array

            return Promise.all(updates);
        }
    });
}

/**
 * Helpful function to avoid to write 2 lines each time
 * @param {Object} output_node The node that display the import output
 * @param {string} text The string to append in the display
 */
function append_to_output_and_scroll(output_node, text) {
    output_node.value += "\n" + text;
    output_node.scrollTop = output_node .scrollHeight;
}

/**
 * Fetch a page of an user list and put the result in the mal_manga object
 * Recursive unless dummy is set to true
 * Function used to test if the list exist, that's why dummy exists
 * @param {Object} mal_manga The object that will contain the fetched data
 * @param {string} username The username on MyAnimeList of the owner of the list to fetch
 * @param {Object} output_node Node used to display what we're doing
 * @param {number} offset Offset of the list
 * @param {boolean} dummy Used to avoid fetching the second page
 */
function fetch_mal_manga_list(mal_manga, username, output_node, offset=0, dummy=false) {
    append_to_output_and_scroll(output_node, "Fetching MyAnimeList manga from " + offset + " to " + (offset+300));

    return fetch("https://myanimelist.net/mangalist/" + username + "/load.json?offset=" + offset + "&status=7", {
        method: 'GET',
        redirect: 'follow',
        credentials: 'include'
    }).then(function(response) {
        return response.json();
    }).then((data) => {
        if (data.hasOwnProperty("errors")) {
            append_to_output_and_scroll(output_node, data.errors[0].message);
        } else {
            // Insert each manga fetched in the list
            for (let manga of data) {
                mal_manga.push(manga);
            }

            // If there is 300 items, we might have reached the list limit so we try again
            if (data.length == 300 && !dummy) {
                return fetch_mal_manga_list(mal_manga, username, output_node, offset+300);
            } else {
                append_to_output_and_scroll(output_node, "Done fetching MyAnimeList manga.");
            }
        }
    }).catch((error) => {
        console.error(error);
    });
}

/**
 * Fetch the id of all manga in the follow list of the currently logged in user
 * Recursive until we browsed all pages
 * @param {Object} mangadex_list Object that will contain the ids fetched
 * @param {Object} output_node Node used to display what we're doing
 * @param {number} page The current page to fetch from the list
 * @param {number} max_page Max number of page, calculated with the value displayed in the first page
 */
function fetch_mangadex_manga(mangadex_list, output_node, page=1, max_page=1) {
    append_to_output_and_scroll(output_node, "Fetching MangaDex follow page manga " + page + " of " + max_page);

    return fetch("https://mangadex.org/follows/manga/0/0/" + page + "/", {
        method: 'GET',
        redirect: 'follow',
        credentials: 'include'
    }).then((data) => {
        return data.text().then((text) => {
            let regex = /<a\sclass=''\stitle='.+'\shref='\/manga\/(\d+)\/.+'>.+<\/a>/g;
            let m;

            // Get all manga ids
            while ((m = regex.exec(text)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
                mangadex_list.push(parseInt(m[1]));
            }

            // Check the number of pages
            if (page == 1) {
                max_page = Math.ceil(/Showing\s\d+\sto\s\d+\sof\s(\d+)\stitles/.exec(text)[1] / 100);
            }

            // We fetch the next page if required
            if (page < max_page) {
                return fetch_mangadex_manga(mangadex_list, output_node, page+1, max_page);
            } else {
                append_to_output_and_scroll(output_node, "Done fetching MangaDex follow manga.");
            }
        });
    }).catch((error) => {
        console.error(error);
    });
}

/**
 * With data from MyAnimeList and all of the ids of the followed manga on MangaDex
 * Send a request to the manga page for all ids, check if there is a MyAnimeList id
 * If there is, last chapter is updated in the local storage
 * In anycase, the manga is saved in local storage with the MangaDex id as the key, mal id (0 if none) and the last read chapter (0 if none)
 * @param {Object} mal_list The list of all MyAnimeList manga and some informations fetched with fetch_mal_manga_list()
 * @param {Object} mangadex_list The list of ids of all the followed manga of the currently logged in user
 * @param {Object} output_node Node used to display what we're doing
 * @param {*} index The index of manga that we're trying to update
 */
function update_all_manga_with_mal_data(mal_list, mangadex_list, output_node, index=0) {
    append_to_output_and_scroll(output_node, "Updating " + (index + 1) + "/" + mangadex_list.length);

    return fetch("https://mangadex.org/manga/" + mangadex_list[index], {
        method: 'GET',
        cache: 'no-cache'
    }).then((data) => {
        data.text().then((text) => {
            // Scan the manga page for the mal icon and mal url
            let manga_name = /<title>(.+)\s\(Manga\)/.exec(text)[1];
            append_to_output_and_scroll(output_node, "-> " + manga_name);

            let mal_url = /<a.+href='(.+)'>MyAnimeList<\/a>/.exec(text);

            let manga = {
                name: manga_name,
                id: mangadex_list[index],
                mal: 0,
                last: 0,
                current: {volume: 0, chapter: 0},
                chapters: []
            };

            // If regex is empty, there is no mal link, can't do anything
            if (mal_url === null) {
                // insert in local storage
                append_to_output_and_scroll(output_node, "-> Set to Chapter 0 (No MyAnimeList entry)");
                return update_manga_local_storage(manga).then(() => {
                    index++;
                    if (index < mangadex_list.length) {
                        return update_all_manga_with_mal_data(mal_list, mangadex_list, output_node, index);
                    } else {
                        append_to_output_and_scroll(output_node, "Done. Refresh the page to see the new data.");
                        vNotify.success({
                            title: "All MyAnimeList data imported.",
                            text: "Refresh the page to see the new data.",
                            image: "https://i.imgur.com/oMV2BJt.png",
                            sticky: true
                        });
                    }
                });
            } else {
                // Finish gettint the mal url
                mal_url = mal_url[1];
                // If there is a mal link, add it and save it in local storage
                manga.mal = parseInt(/.+\/(\d+)/.exec(mal_url)[1]);

                // Search for data from the mal_list object
                for (var mal_manga of mal_list) {
                    if (mal_manga.manga_id == manga.mal) {
                        manga.last = parseInt(mal_manga.num_read_chapters);

                        // Add last max_save_opened chapters since the current one in the opened array
                        // 100 is good because more is just useless data honestly
                        if (MMD_options.save_all_opened) {
                            let min = Math.max(manga.last - MMD_options.max_save_opened, 0);
                            for (let i = manga.last; i > min; i--) {
                                manga.chapters.push(i);
                            }
                        }
                        break;
                    }
                }

                // Update last open for the manga
                append_to_output_and_scroll(output_node, "-> Set to Chapter " + manga.last);
                return update_manga_local_storage(manga).then(() => {
                    index++;
                    if (index < mangadex_list.length) {
                        update_all_manga_with_mal_data(mal_list, mangadex_list, output_node, index);
                    } else {
                        append_to_output_and_scroll(output_node, "Done. Refresh the page to see the new data.");
                        vNotify.success({
                            title: "All MyAnimeList data imported.",
                            text: "Refresh the page to see the new data.",
                            image: "https://i.imgur.com/oMV2BJt.png",
                            sticky: true
                        });
                    }
                });
            }
        });
    }).catch((error) => {
        console.error(error);
    });
}

/**
 * Insert a form to add a MyAnimeList link if there isn't one for the manga
 * @param {Object} manga The manga object that will have the mal id updated
 * @param {Object} chapters The chapters displayed on the page
 */
function insert_mal_link_form(manga, chapters) {
    var parent_node = document.getElementsByClassName("table table-condensed")[0].firstElementChild;
    var add_mal_link_row = document.createElement("tr");
    add_mal_link_row.id = "add_mal_link_row";
    var add_mal_link_column_header = document.createElement("th");
    add_mal_link_column_header.textContent = "MAL link:";
    var add_mal_link_column_content = document.createElement("td");
    var add_mal_link_column_content_edit = document.createElement("input");
    add_mal_link_column_content_edit.id = "mymangadex-mal-link-input";
    add_mal_link_column_content_edit.className = "form-control";
    // Style the input since the form-control style is bad
    add_mal_link_column_content_edit.style.display = "inline-block";
    add_mal_link_column_content_edit.style.width = "auto";
    add_mal_link_column_content_edit.style.verticalAlign = "middle";
    add_mal_link_column_content_edit.type = "text";
    add_mal_link_column_content_edit.size = 40;
    add_mal_link_column_content_edit.placeholder = "An url like https://myanimelist.net/manga/103939 or an id";
    var add_mal_link_column_content_send = document.createElement("button");
    add_mal_link_column_content_send.className = "btn btn-default";
    add_mal_link_column_content_send.type = "submit";
    add_mal_link_column_content_send.textContent = "Send";
    add_mal_link_column_content_send.addEventListener("click", (event) => {
        if (add_mal_link_column_content_edit.value != "") {
            let mal_regex = /https:\/\/(?:www\.)?myanimelist\.net\/manga\/(\d+)(?:\/.+)?|(\d+)/.exec(add_mal_link_column_content_edit.value);

            if (mal_regex != null) {
                manga.mal =  parseInt(mal_regex[1]) || parseInt(mal_regex[2]);

                if (manga.mal > 0) {
                    fetch_mal_for_manga_data(manga)
                    .then(() => {
                        if (manga.more_info.exist) {
                            return update_manga_local_storage(manga, false)
                            .then(() => {
                                insert_mal_informations(add_mal_link_column_content, manga);
                                highlight_chapters(manga, chapters);

                                // Show a notification for updated last opened if there is no MyAnimeList id
                                vNotify.success({
                                    title: "MyAnimeList id set",
                                    text: "Nice.",
                                    image: "https://i.imgur.com/oMV2BJt.png"
                                });
                            });
                        } else {
                            vNotify.error({
                                title: "The manga doesn\'t exist.",
                                text: "Check the id maybe ?",
                            });
                        }
                    });
                } else {
                    vNotify.error({
                        title: "Wrong input",
                        text: "id need to be > 0"
                    });
                }
            } else {
                vNotify.error({
                    title: "Wrong input",
                    text: "You can only an url like https://myanimelist.net/manga/2, https://myanimelist.net/manga/2/Berserk, or an id",
                });
            }
        }
    });
    add_mal_link_column_content.appendChild(add_mal_link_column_content_edit);
    add_mal_link_column_content.appendChild(document.createTextNode(" "));
    add_mal_link_column_content.appendChild(add_mal_link_column_content_send);
    add_mal_link_row.appendChild(add_mal_link_column_header);
    add_mal_link_row.appendChild(add_mal_link_column_content);
    parent_node.insertBefore(add_mal_link_row, parent_node.lastElementChild);
}

/**
 * Function that fetch the edit page of a manga and "parse" it to get the required data to update it later
 * @param {Object} manga A manga Object, with a mal property to fetch the right page, and that will hold the informations
 */
function fetch_mal_for_manga_data(manga) {
    return fetch("https://myanimelist.net/ownlist/manga/" + manga.mal + "/edit?hideLayout", {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-cache',
        credentials: 'include'
    }).then((data) => {
        // init and set if it was redirected - redirected often means not in list or not approved
        manga.more_info = {};
        manga.more_info.redirected = data.redirected;

        return data.text().then((text) => {
            if (text == "401 Unauthorized") {
                vNotify.error({
                    title: "Not logged in",
                    text: "Log in on MyAnimeList!",
                    image: "https://i.imgur.com/oMV2BJt.png"
                });
                logged_in_mal = false;
            } else {
                // CSRF Token
                csrf_token = /'csrf_token'\scontent='(.{40})'/.exec(text)[1];
                // Does it exist ?!
                manga.more_info.is_approved = !/class="badresult"/.test(text);
                manga.more_info.exist = !/id="queryTitle"/.test(text);
                // Comments
                manga.more_info.comments = /add_manga_comments.+>(.*)</.exec(text)[1];
                // Finish date
                manga.more_info.finish_date = {};
                manga.more_info.finish_date.month = (parseInt(/add_manga_finish_date_month.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]) || "");
                manga.more_info.finish_date.day = (parseInt(/add_manga_finish_date_day.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]) || "");
                manga.more_info.finish_date.year = (parseInt(/add_manga_finish_date_year.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]) || "");
                // Ask to discuss
                manga.more_info.ask_to_discuss = /add_manga_is_asked_to_discuss.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
                manga.more_info.ask_to_discuss = (manga.more_info.ask_to_discuss === null) ? 0 : parseInt(manga.more_info.ask_to_discuss[1]);
                // Last read chapter
                manga.last_mal = /add_manga_num_read_chapters.+value="(\d+)?"/.exec(text);
                manga.last_mal = (manga.last_mal === null) ? 0 : parseInt(manga.last_mal[1]);
                // Total times re-read
                manga.more_info.total_reread = /add_manga_num_read_times.+value="(\d+)?"/.exec(text);
                manga.more_info.total_reread = (manga.more_info.total_reread === null) ? 0 : parseInt(manga.more_info.total_reread[1]);
                // Last read volume
                manga.more_info.last_volume = /add_manga_num_read_volumes.+value="(\d+)?"/.exec(text);
                manga.more_info.last_volume = (manga.more_info.last_volume === null) ? 0 : parseInt(manga.more_info.last_volume[1]);
                // Retail volumes
                manga.more_info.retail_volumes = /add_manga_num_retail_volumes.+value="(\d+)?"/.exec(text);
                manga.more_info.retail_volumes = (manga.more_info.retail_volumes === null) ? 0 : parseInt(manga.more_info.retail_volumes[1]);
                // Priority
                manga.more_info.priority = /add_manga_priority.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
                manga.more_info.priority = (manga.more_info.priority === null) ? 0 : parseInt(manga.more_info.priority[1]);
                // Re-read value
                manga.more_info.reread_value = /add_manga_reread_value.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
                manga.more_info.reread_value = (manga.more_info.reread_value === null) ? "" : manga.more_info.reread_value[1];
                // Score
                manga.more_info.score = /add_manga_score.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
                manga.more_info.score = (manga.more_info.score === null) ? "" : parseInt(manga.more_info.score[1]);
                // SNS Post type
                manga.more_info.sns_post_type = /add_manga_sns_post_type.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
                manga.more_info.sns_post_type = (manga.more_info.sns_post_type === null) ? 0 : parseInt(manga.more_info.sns_post_type[1]);
                // Start date
                manga.more_info.start_date = {};
                manga.more_info.start_date.month = (parseInt(/add_manga_start_date_month.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]) || "");
                manga.more_info.start_date.day = (parseInt(/add_manga_start_date_day.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]) || "");
                manga.more_info.start_date.year = (parseInt(/add_manga_start_date_year.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]) || "");
                // Status
                manga.more_info.status = /add_manga_status.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
                manga.more_info.status = (manga.more_info.status === null) ? 0 : parseInt(manga.more_info.status[1]);
                // Storage type
                manga.more_info.storage_type = /add_manga_storage_type.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
                manga.more_info.storage_type = (manga.more_info.storage_type === null) ? "" : manga.more_info.storage_type[1];
                // Tags
                manga.more_info.tags = /add_manga_tags.+>(.*)*</.exec(text)[1] || "";
                // Is re-reading - We'll see later for that
                //manga.more_info.is_rereading = /add_manga_is_rereading.+value="(\d*)"/.exec(text)[1];
                manga.more_info.is_rereading = 0;
                // Bonus : total volume and chapter
                manga.more_info.total_volume = parseInt(/id="totalVol">(.*)?<\//.exec(text)[1]) || 0;
                manga.more_info.total_chapter = parseInt(/id="totalChap">(.*)?<\//.exec(text)[1]) || 0;
            }
        });
    }).catch(console.error);
}

/**
 * Set the last chapter read on MyAnimeList as the current one on a chapter page, only if it's higher than the current one
 * Send 2 request currently
 *  One to check the last chapter, and also get the required csrf_token on mal
 *  And the second to update the last read chapter
 * Set the start date to today if the manga wasn't on the list or was in PTR list
 * Finish date and completed status is also set if it is the last chapter
 * @param {Object} manga The manga object that will contain the MyAnimeList informations and that is going to be updated
 * @param {boolean} use_pepper set to true modify the output to set completed, date or other things etc...
 * @param {number} set_status Optionnal status, used if we want to put it in the PTR or an other list than the reading list
 */
function update_manga_last_read(manga, use_pepper=true, set_status=1) {
    let fetched;
    if (use_pepper) {
        fetched = fetch_mal_for_manga_data(manga);
    } else {
        fetched = new Promise((resolve, reject) => {
            return resolve();
        });
    }

    return fetched.then(() => {
        if (logged_in_mal) {
            if (manga.more_info.is_approved) {
                try{
                let post_url = "https://myanimelist.net/ownlist/manga/" + manga.mal + "/edit?hideLayout";
                let status = parseInt(manga.more_info.status);

                if (use_pepper) {
                    // If the current chapter is higher than the last read one
                    // Use Math.floor on the current chapter to avoid updating even tough it's the same if this is a sub chapter
                    if (manga.last_mal == 0 || Math.floor(manga.current.chapter) > manga.last_mal) {
                        // Status is always set to reading, or we complet it if it's the last chapter, and so we fill the finish_date
                        status = (parseInt(manga.more_info.status) == 2 || (parseInt(manga.more_info.total_chapter) > 0 && manga.current.chapter >= parseInt(manga.more_info.total_chapter))) ? 2 : set_status;

                        // Set the start only if it's not already set and if we don't add it to PTR and if it was in ptr or not in the list
                        manga.more_info.started = false;
                        if (status != 6 && (manga.more_info.status == 6 || manga.more_info.status == 0) && manga.more_info.start_date.year == "") {
                            manga.more_info.started = true;
                            let MyDate = new Date();
                            manga.more_info.start_date.year = MyDate.getFullYear();
                            manga.more_info.start_date.month = MyDate.getMonth() + 1;
                            manga.more_info.start_date.day = MyDate.getDate();
                        }

                        // Start reading manga if it's the first chapter
                        if (manga.more_info.status == 0) {
                            // We have to change the url if we're adding the manga to the list, not editing
                            post_url = "https://myanimelist.net/ownlist/manga/add?selected_manga_id=" + manga.mal_id + "&hideLayout";
                        }

                        // Set the finish date if it's the last chapter and not set
                        if (status == 2 && manga.more_info.finish_date.year == "") {
                            let MyDate = new Date();
                            manga.more_info.finish_date.year = MyDate.getFullYear();
                            manga.more_info.finish_date.month = MyDate.getMonth()+1;
                            manga.more_info.finish_date.day = MyDate.getDate();
                        }

                        // Update the manga object
                        manga.last_mal = manga.current.chapter;
                        manga.last_volume = manga.current.volume;
                        manga.more_info.status = status;
                    } else {
                        vNotify.info({
                            title: "Not updated",
                            text: "Last read chapter on MyAnimelist is higher or equal to the current chapter, it wasn't updated.",
                            image: "https://mangadex.org/images/manga/" + manga.id + ".thumb.jpg"
                        });
                        return;
                    }
                }

                // Prepare the body
                var body = "";
                body += encodeURIComponent("add_manga[comments]") + "=" + encodeURIComponent(manga.more_info.comments) + "&";
                body += encodeURIComponent("add_manga[finish_date][day]") + "=" + manga.more_info.finish_date.day + "&";
                body += encodeURIComponent("add_manga[finish_date][month]") + "=" + manga.more_info.finish_date.month + "&";
                body += encodeURIComponent("add_manga[finish_date][year]") + "=" + manga.more_info.finish_date.year + "&";
                body += encodeURIComponent("add_manga[is_asked_to_discuss]") + "=" + manga.more_info.ask_to_discuss + "&";
                // parseInt the chapter we're going to put, since MyAnimeList doesn't accept sub chapters
                body += encodeURIComponent("add_manga[num_read_chapters]") + "=" + Math.floor(manga.current.chapter) + "&";
                body += encodeURIComponent("add_manga[num_read_times]") + "=" + manga.more_info.total_reread + "&";
                body += encodeURIComponent("add_manga[num_read_volumes]") + "=" + manga.current.volume + "&";
                body += encodeURIComponent("add_manga[num_retail_volumes]") + "=" + manga.more_info.retail_volumes + "&";
                body += encodeURIComponent("add_manga[priority]") + "=" + manga.more_info.priority + "&";
                body += encodeURIComponent("add_manga[reread_value]") + "=" + manga.more_info.reread_value + "&";
                body += encodeURIComponent("add_manga[score]") + "=" + manga.more_info.score + "&";
                body += encodeURIComponent("add_manga[sns_post_type]") + "=" + manga.more_info.sns_post_type + "&";
                body += encodeURIComponent("add_manga[start_date][day]") + "=" + manga.more_info.start_date.day + "&";
                body += encodeURIComponent("add_manga[start_date][month]") + "=" + manga.more_info.start_date.month + "&";
                body += encodeURIComponent("add_manga[start_date][year]") + "=" + manga.more_info.start_date.year + "&";
                body += encodeURIComponent("add_manga[status]") + "=" + status + "&";
                body += encodeURIComponent("add_manga[storage_type]") + "=" + manga.more_info.storage_type + "&";
                body += encodeURIComponent("add_manga[tags]") + "=" + encodeURIComponent(manga.more_info.tags) + "&";
                body += encodeURIComponent("csrf_token") + "=" + csrf_token + "&";
                // If status == completed check for is_rereading else it's not
                //body += encodeURIComponent("add_manga[is_rereading]") + "=&";
                body += "last_completed_vol=&";
                body += "manga_id=" + manga.mal + "&";
                body += "submitIt=0";

                // Send the POST request to update the manga
                fetch(post_url, {
                    method: 'POST',
                    body: body,
                    redirect: 'follow',
                    credentials: 'include',
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
                    }
                }).then(() => {
                    if (use_pepper) {
                        if (status == 6) {
                            vNotify.success({
                                title: "Added to Plan to Read",
                                text: manga.name + " as been put in your endless Plan to read list !",
                                image: "https://mangadex.org/images/manga/" + manga.id + ".thumb.jpg"
                            });
                        } else {
                            if (manga.last_mal > 0) {
                                //let text = manga.name + " as been updated to chapter " + manga.current.chapter;
                                //if (parseInt(manga.more_info.total_chapter) > 0)
                                vNotify.success({
                                    title: "Manga updated",
                                    text: manga.name + " as been updated to chapter " + manga.current.chapter + ((parseInt(manga.more_info.total_chapter) > 0) ? " out of " + manga.more_info.total_chapter : ""),
                                    image: "https://mangadex.org/images/manga/" + manga.id + ".thumb.jpg"
                                });
                            }

                            if (manga.more_info.started) {
                                vNotify.success({
                                    title: "Manga updated",
                                    text: "You started reading " + manga.name,
                                    image: "https://mangadex.org/images/manga/" + manga.id + ".thumb.jpg"
                                });
                            }

                            if (status != 6 && (manga.more_info.status == 0 || manga.more_info.status == 6)) {
                                vNotify.success({
                                    title: "Started manga",
                                    text: "The start date of " + manga.name + " was set to today.",
                                    image: "https://mangadex.org/images/manga/" + manga.id + ".thumb.jpg"
                                });
                            }

                            if (status == 2) {
                                vNotify.success({
                                    title: "Manga completed",
                                    text: manga.name + " was set as completed.",
                                    image: "https://mangadex.org/images/manga/" + manga.id + ".thumb.jpg"
                                });
                            }
                        }
                    }
                }).catch(console.error);
                }
                catch (error) {
                    console.error(error);
                }
            } else {
                vNotify.info({
                    title: "Not updated",
                    text: "The manga is still pending approval on MyAnimelist and can't be updated.",
                    image: "https://i.imgur.com/oMV2BJt.png",
                });
            }
        }
    });
}

/**
 * Update the last chapter of a manga entry, with a MangaDex id as a key
 * Optionnal notification about the update, if there is no mal id
 * Update only to the highest if the option is on
 * Also update the chapters regardless of the option
 * @param {Object} manga A manga object that will be updated
 * @param {boolean} notification The function is able to display a notification if it is set to true
 */
function update_manga_local_storage(manga, notification=true) {
    return storage_set(manga.id, {
        mal: manga.mal,
        last: ((manga.current.chapter > manga.last && MMD_options.last_only_higher) || !MMD_options.last_only_higher) ? manga.current.chapter : manga.last,
        chapters: manga.chapters
    }).then(() => {
        // Show a notification for updated last opened if there is no MyAnimeList id
        if (notification &&
            manga.mal == 0 &&
            ((manga.current.chapter > manga.last && MMD_options.last_only_higher) || !MMD_options.last_only_higher)) {
            vNotify.success({
                title: "Manga updated",
                text: manga.name + " last open Chapter as been updated to " + (((manga.current.chapter > manga.last && MMD_options.last_only_higher) || !MMD_options.last_only_higher) ? manga.current.chapter : manga.last),
                image: "https://mangadex.org/images/manga/" + manga.id + ".thumb.jpg"
            });
        }
    });
}



/**
 * Create a simple input with a name before and append it to a parent node, with a space after
 * @param {Object} parent Node where the element will be inserted
 * @param {string} title Name before the input
 * @param {string} input_type Type of input, [text, textarea, select]
 * @param {string} default_value The value that will be the default one when creating the form
 * @param {Array} input_data Array with the data for select input type (to fill <option>)
 */
function add_simple_input(parent, title, input_type, default_value = "", input_data = []) {
    let input = document.createElement(input_type);
    switch (input_type) {
        case "text":
            input = document.createElement("input");
            input.type = "text";
        case "textarea":
            input.value = default_value;
            break;
        case "select":
            input.style.display = "inline-block";
            input.style.width = "auto";
            for (let data of input_data) {
                let option = document.createElement("option");
                option.value = data.value;
                option.textContent = data.content || data.value;
                if (data.value == default_value) {
                    option.selected = "selected";
                }
                input.appendChild(option);
            }
            break;
    }
    input.className = "form-control";
    parent.appendChild(document.createTextNode(title));
    parent.appendChild(input);
    parent.appendChild(document.createTextNode(" "));

    return input;
}

/**
 * Create a row of with the title in the first column and a single input with optionnal data on the second column
 * @param {Object} parent Node where the element will be inserted
 * @param {string} title Text on the first column
 * @param {string} input_type Input type of the second column, [text, textarea, select]
 * @param {string} default_value The value that will be the default one when creating the form
 * @param {Array} input_data Array with the data for select input type (to fill <option>)
 * @param {string} after_info Text to append after the input on the second column
 */
function add_row(parent, title, input_type = "", default_value = "", input_data = [], after_info = "") {
    let row = document.createElement("tr");
    let title_td = document.createElement("td");
    title_td.textContent = title;
    row.appendChild(title_td);
    let content = document.createElement("td");
    let input;
    if (input_type != "") {
        input = document.createElement(input_type);
        switch (input_type) {
            case "text":
                input = document.createElement("input");
                input.type = "text";

                if (after_info != "") {
                    input.classList.add("mmd-half");
                }
            case "textarea":
                input.value = default_value;
                break;
            case "a":
                input.textContent = default_value;
                input.href = "https://myanimelist.net/manga/" + input_data;
                input.target = "blank";
                break;
            case "select":
                for (let data of input_data) {
                    let option = document.createElement("option");
                    option.value = data.value;
                    option.textContent = data.content || data.value;
                    if (data.value == default_value) {
                        option.selected = "selected";
                    }
                    input.appendChild(option);
                }
                break;
        }
        input.classList.add("form-control");
        content.appendChild(input);

        if (after_info != "") {
            content.appendChild(document.createTextNode(after_info));
        }
    }
    row.appendChild(content);
    parent.appendChild(row);

    return (input_type == "") ? content : input;
}

/**
 * Add a "Edit" button where parent_node is
 * @param {Object} parent_node The node that will co ntain the MyAnimeList button
 * @param {Object} manga The manga informations
 */
function insert_mal_button(parent_node, manga, insert_new_informations) {
    // Insert on the header
    var mal_button = document.createElement("button");
    mal_button.className = "btn btn-default";
    mal_button.title = "Edit";
    mal_button.style.float = "right";

    // Add icon and text
    append_text_with_icon(mal_button, "edit", "");
    mal_button.appendChild(document.createTextNode(" Edit"));

    // On click we hide or create the modal
    mal_button.addEventListener("click", (event) => {
        // Display if exist
        let node = document.getElementById("mmd-modal-container");
        if (node) {
            node.style.display = "block";
            node.firstElementChild.classList.add("mmd-opening");
            setTimeout(() => {
                node.firstElementChild.classList.remove("mmd-opening");
            }, 500);
        } else {
            // Create modal
            let modal_container = document.createElement("div");
            modal_container.id = "mmd-modal-container";
            modal_container.className = "mmd-fadein";
            let modal = document.createElement("div");
            modal.id = "mmd-modal";
            modal.className = "mmd-opening";
            let close_button = document.createElement("span");
            close_button.className = "mmd-close-button";
            close_button.textContent = "×";
            close_button.addEventListener("click", (event) => {
                event.preventDefault();
                modal_container.style.display = "none";
            });
            let title = document.createElement("h1");
            title.textContent = "Edit informations";
            let content = document.createElement("table");
            content.className = "mmd-content";
            let content_body = document.createElement("tbody");

            // Save button
            let watcher = {start_date:{}, finish_date:{}};
            let save_button = document.createElement("a");
            save_button.className = "btn btn-success mmd-save";
            let save_icon = document.createElement("span");
            save_icon.className = "fas fa-save";
            save_button.appendChild(save_icon);
            save_button.appendChild(document.createTextNode(" Save"));
            save_button.addEventListener("click", (event) => {
                event.target.disabled = true;

                // Update the manga object with all the data in the form
                for (let watched in watcher) {
                    if (watched == "start_date" || watched == "finish_date") {
                        manga.more_info[watched] = {
                            month: watcher[watched].month.value,
                            day: watcher[watched].day.value,
                            year: watcher[watched].year.value
                        };
                    } else {
                        manga.more_info[watched] = watcher[watched].value;
                    }
                }
                manga.current.volume = parseInt(watcher.last_volume.value);
                manga.current.chapter = parseInt(watcher.last_mal.value);
                manga.last_mal = parseInt(watcher.last_mal.value);

                // Send it to MyAnimeList, without pepper because we already manage everything here
                update_manga_last_read(manga, false)
                .then(() => {
                    if (insert_new_informations) {
                        clear_dom_node(parent_node);
                        insert_mal_informations(parent_node, manga);
                    }

                    modal_container.style.display = "none";
                    vNotify.success({
                        title: "Manga Updated",
                        image: "https://i.imgur.com/oMV2BJt.png"
                    });
                });
            });
            content.appendChild(save_button);

            // Days, init it once since we use it twice
            let months = [{value:"",content:""},{value:1,content:"Jan"},{value:2,content:"Feb"},{value:3,content:"Mar"},{value:4,content:"Apr"},{value:5,content:"May"},{value:6,content:"June"},{value:7,content:"Jul"},{value:8,content:"Aug"},{value:9,content:"Sep"},{value:10,content:"Oct"},{value:11,content:"Nov"},{value:12,content:"Dec"}];
            let days = [{value:""},{value:1},{value:2},{value:3},{value:4},{value:5},{value:6},{value:7},{value:8},{value:9},{value:10},{value:11},{value:12},{value:13},{value:14},{value:15},{value:16},{value:17},{value:18},{value:19},{value:20},{value:21},{value:22},{value:23},{value:24},{value:25},{value:26},{value:27},{value:28},{value:29},{value:30},{value:31}];
            let years = [{value:""},{value:2018},{value:2017},{value:2016},{value:2015},{value:2014},{value:2013},{value:2012},{value:2011},{value:2010},{value:2009},{value:2008},{value:2007},{value:2006},{value:2005},{value:2004},{value:2003},{value:2002},{value:2001},{value:2000},{value:1999},{value:1998},{value:1997},{value:1996},{value:1995},{value:1994},{value:1993},{value:1992},{value:1991},{value:1990},{value:1989},{value:1988}];

            // ADD ALL ROWS

            add_row(content_body, "Title", "a", manga.name, manga.mal, "Click to open in a new tab");
            watcher.status = add_row(content_body, "Status", "select", manga.more_info.status, [{value:1,content:"Reading"},{value:2,content:"Completed"},{value:3,content:"On-Hold"},{value:4,content:"Dropped"},{value:6,content:"Plan to Read"}]);
            watcher.last_volume = add_row(content_body, "Volumes Read", "text", manga.more_info.last_volume, {}, " / " + manga.more_info.total_volume);
            watcher.last_mal = add_row(content_body, "Chapters Read", "text", manga.last_mal, {}, " / " + manga.more_info.total_chapter);
            watcher.score = add_row(content_body, "Your Score", "select", manga.more_info.score, [{value:"",content:"Select score"},{value:10,content:"(10) Masterpiece"},{value:9,content:"(9) Great"},{value:8,content:"(8) Very Good"},{value:7,content:"(7) Good"},{value:6,content:"(6) Fine"},{value:5,content:"(5) Average"},{value:4,content:"(4) Bad"},{value:3,content:"(3) Very Bad"},{value:2,content:"(2) Horrible"},{value:1,content:"(1) Appalling"}]);
            let start_date = add_row(content_body, "Start Date");
                watcher.start_date.month = add_simple_input(start_date, "Month: ", "select", manga.more_info.start_date.month, months);
                watcher.start_date.day = add_simple_input(start_date, "Day: ", "select", manga.more_info.start_date.day, days);
                watcher.start_date.year = add_simple_input(start_date, "Year: ", "select", manga.more_info.start_date.year, years);
            // Add current date when we click it (start)
            let insert_start_today = document.createElement("a");
            insert_start_today.textContent = "Insert Today";
            insert_start_today.addEventListener("click", (event) => {
                let MyDate = new Date();
                watcher.start_date.month.value = MyDate.getMonth() + 1;
                watcher.start_date.day.value = MyDate.getDate();
                watcher.start_date.year.value = MyDate.getFullYear();
            });
            start_date.appendChild(insert_start_today);
            let finish_date = add_row(content_body, "Finish Date");
                watcher.finish_date.month = add_simple_input(finish_date, "Month: ", "select", manga.more_info.finish_date.month, months);
                watcher.finish_date.day = add_simple_input(finish_date, "Day: ", "select", manga.more_info.finish_date.day, days);
                watcher.finish_date.year = add_simple_input(finish_date, "Year: ", "select", manga.more_info.finish_date.year, years);
            // Add current date when we click it (finish)
            let insert_finish_today = document.createElement("a");
            insert_finish_today.textContent = "Insert Today";
            insert_finish_today.addEventListener("click", (event) => {
                let MyDate = new Date();
                watcher.finish_date.month.value = MyDate.getMonth() + 1;
                watcher.finish_date.day.value = MyDate.getDate();
                watcher.finish_date.year.value = MyDate.getFullYear();
            });
            finish_date.appendChild(insert_finish_today);
            watcher.tags = add_row(content_body, "Tags", "textarea", manga.more_info.tags);
            watcher.priority = add_row(content_body, "Priority", "select", manga.more_info.priority, [{value:0,content:"Low"},{value:1,content:"Medium"},{value:2,content:"High"}]);
            watcher.storage = add_row(content_body, "Storage", "select", manga.more_info.storage, [{value:"", content:"None"},{value:1, content:"Hard Drive"},{value:6, content:"External HD"},{value:7, content:"NAS"},{value:8, content:"Blu-ray"},{value:2, content:"DVD / CD"},{value:4, content:"Retail Manga"},{value:5, content:"Magazine"}]);
            watcher.retail_volumes = add_row(content_body, "How many volumes?", "text", manga.more_info.retail_volumes);
            watcher.total_reread = add_row(content_body, "Total Times Re-read", "text", manga.more_info.total_reread);
            watcher.reread_value = add_row(content_body, "Re-read Value", "select", manga.more_info.reread_value, [{value:"", content:"Select reread value"},{value:1, content:"Very Low"},{value:2, content:"Low"},{value:3, content:"Medium"},{value:4, content:"High"},{value:5, content:"Very High"}]);
            watcher.comments = add_row(content_body, "Comments", "textarea", manga.more_info.comments);
            watcher.ask_to_discuss = add_row(content_body, "Ask to Discuss?", "select", manga.more_info.ask_to_discuss, [{value:0, content:"Ask to discuss a chapter after you update the chapter #"},{value:1, content:"Don't ask to discuss"}]);
            watcher.sns_post_type = add_row(content_body, "Post to SNS", "select", manga.more_info.sns_post_type, [{value:0, content:"Follow default setting"},{value:1, content:"Post with confirmation"},{value:2, content:"Post every time (without confirmation)"},{value:3, content:"Do not post"}]);

            // END ADD ALL ROWS

            modal.appendChild(close_button);
            modal.appendChild(title);
            content.appendChild(content_body);
            modal.appendChild(content);
            modal_container.appendChild(modal);
            document.body.appendChild(modal_container);

            // Remove mmd-opening when done
            setTimeout(() => {
                modal.classList.remove("mmd-opening");
            }, 500);
        }
    });

    parent_node.insertBefore(mal_button, parent_node.firstElementChild);
    // Add a text node with only a space, to separate it on the right
    //parent_node.insertBefore(document.createTextNode(" "), parent_node.firstElementChild.nextElementSibling);
}

/**
 * Append a colored node with the status to the node parameter
 * @param {number} status The status of the manga
 * @param {Object} node The node that will get the child
 */
function append_status(status, node) {
    let color = "";
    let text = "";
    switch (parseInt(status)) {
        case 0:
            color = "blueviolet";
            text = "Not on the list";
            break;
        case 1:
            color = "cornflowerblue";
            text = "Reading";
            break;
        case 2:
            color = "darkseagreen";
            text = "Completed";
            break;
        case 3:
            color = "orange";
            text = "On-Hold";
            break;
        case 4:
            color = "firebrick";
            text = "Dropped";
            break;
        case 6:
            color = "violet";
            text = "Plan to Read";
            break;
    }
    let color_span = document.createElement("span");
    color_span.style.color = color;
    color_span.textContent = text;
    node.appendChild(color_span);
}

/**
 * Totally empty a DOM node, better and faster than .innerHTML = ""
 * @param {Object} dom_node The node to clear
 */
function clear_dom_node(dom_node) {
    while (dom_node.firstChild) {
        dom_node.removeChild(dom_node.firstChild);
    }
}

/**
 * Display the status, current volume and chapter, and start and finish date if it exist
 * @param {Object} content_node The node that will contain the MyAnimeList informations
 * @param {Object} manga A manga object with the informations
 */
function insert_mal_informations(content_node, manga) {
    // Delete node before adding anything to it, it's surely old thin anyway
    clear_dom_node(content_node);
    insert_mal_button(content_node, manga, true);

    // Add some informations on the page
    append_status(manga.more_info.status, content_node);
    content_node.appendChild(document.createElement("br"));
    append_text_with_icon(content_node, "book", "Volume " + manga.more_info.last_volume + ((parseInt(manga.more_info.total_volume) > 0) ? " out of " + manga.more_info.total_volume : ""));
    content_node.appendChild(document.createElement("br"));
    append_text_with_icon(content_node, "bookmark", "Chapter " + manga.last_mal + ((parseInt(manga.more_info.total_chapter) > 0) ? " out of " + manga.more_info.total_chapter : ""));
    content_node.appendChild(document.createElement("br"));
    if (manga.more_info.start_date.year != "") {
        append_text_with_icon(content_node, "calendar-alt", "Start date " + manga.more_info.start_date.year + "/" + manga.more_info.start_date.month + "/" + manga.more_info.start_date.day);
        content_node.appendChild(document.createElement("br"));
    }
    if (manga.more_info.status == 2 && manga.more_info.finish_date.year != "") {
        append_text_with_icon(content_node, "calendar-alt", "Finish date " + manga.more_info.finish_date.year + "/" + manga.more_info.finish_date.month + "/" + manga.more_info.finish_date.day);
        content_node.appendChild(document.createElement("br"));
    }
    let score_text;
    if (manga.more_info.score == "") {
        score_text = "Not scored yet";
    } else {
        score_text = "Scored " + manga.more_info.score + " out of 10";
    }
    append_text_with_icon(content_node, "star", score_text);
}

/**
 * Highlight last read chapter from MyAnimeList and also every read chapters if the option is on
 * @param {Object} manga The manga informations
 * @param {Object} chapters The list of chapters displayed on the page
 */
function highlight_chapters(manga, chapters) {
    for (let page_chapter of chapters) {
        // We would have no match if there was an actual sub chapter
        if (manga.last_mal == parseInt(page_chapter.chapter)) {
            page_chapter.node.style.backgroundColor = MMD_options.colors.last_read;
        } else if (manga.last == page_chapter.chapter) {
            page_chapter.node.style.backgroundColor = MMD_options.colors.last_open[0];
        // If save all opened is on we highlight them
        } else if (MMD_options.save_all_opened) {
            for (let chapter of manga.chapters) {
                if (page_chapter.chapter == chapter) {
                    page_chapter.node.style.backgroundColor = MMD_options.colors.opened_chapters;
                    break;
                }
            }
        }
    }
}

/**
 * Add the manga to the list, with a status, 1 for reading, 6 for PTR
 * No need to fetch MyAnimeList data again, since it's already set in the manga object when updating and most of the data is empty anyway
 * @param {Object} manga The manga object that hold the informations
 * @param {number} status The status to be set when updating
 * @param {Object} container_node The node that will contain the new informations after the update
 */
function add_to_mal_list(manga, status, container_node) {
    // Delete the row content, to avoid clicking on any button again and to prepare for new content
    container_node.textContent = "Loading...";

    // Put it in the reading list
    update_manga_last_read(manga, true, status)
    .then(() => {
        // Display new informations
        insert_mal_informations(container_node, manga);
    });
}

/**
 * Get the attributes of a node to convert it to a object containing the volume and chapter
 * Volume is set to 0 if null and chapter is set to 1 if it's a Oneshot
 * @param {Object} node The node that have data-* attributes
 */
function volume_and_chapter_from_node(node) {
    let chapter = node.getAttribute("data-chapter-num");

    // If it's a Oneshot or just attributes are empty, we use a regex on the title
    if (chapter == "") {
        // If the chapter isn't available in the attributes we get it with a good ol' regex
        return volume_and_chapter_from_string(node.textContent);
    }

    return {
        volume: parseInt(node.getAttribute("data-volume-num")) || 0,
        chapter: parseFloat(chapter) || 1
    };
}

/**
 * Apply a regex to the string to return the volume and chapter of a title.
 * Volume is set to 0 if null and chapter is set to 1 if it's a Oneshot
 * String usually looks like: Volume x Chapter y.z, or Vol. x Ch. y.z, with optionnal "Volume" and .z decimal
 * But there is some broken manga on MangaDex with just "1.4" as a title, gotta handle it
 * @param {string} string The string with the volume and chapter
 */
function volume_and_chapter_from_string(string) {
    // The ultimate regex ? Don't think so... Volume[1] Chapter[2] + [3]
    let regex_result = /(?:Vol(?:[.]|ume)\s([0-9]+)\s)?(?:Ch(?:[.]|apter)\s)?([0-9]+)([.][0-9]+)?/.exec(string);

    // If it's a Oneshot
    if (regex_result == null) {
        regex_result = [0, 0, 1, undefined];
    }

    return {
        volume: parseInt(regex_result[1]) || 0,
        chapter: parseFloat(regex_result[2] + "" + regex_result[3])
    };
}

/**
 * Create a button on the nav bar, used on the follow page to build the "manage" navigation next to the current nav bar
 * @param {Object} parent_node The ndoe that will contain the button, usually the nav bar
 * @param {string} title The text of the button
 * @param {string} icon The FontAwesome icon name
 * @param {Function} callback The function that will be called when we click on the butto
 */
function create_nav_button(parent_node, title, icon, callback) {
    var new_button = document.createElement("li");
    new_button.setAttribute("is-a-mmd-button", true);
    var new_button_link = document.createElement("a");
    append_text_with_icon(new_button_link, icon, "");
    new_button_link.appendChild(document.createTextNode(" " + title));
    new_button_link.addEventListener("click", callback);
    new_button.appendChild(new_button_link);
    parent_node.insertBefore(new_button, parent_node.lastElementChild);
}

/**
 * Helper function to desactivate all buttons on the follow page and activate the new one
 * @param {Object} button_node The node that is a <a>
 */
function activate_button(button_node) {
    document.querySelectorAll("li[is-a-mmd-button='true']").forEach((node) => {
        node.className = "";
    });
    button_node.parentElement.classList.toggle("active");
}

/**
 * Hide the container and disable buttons if needed or clear it and set the button as active
 * @param {number} id The id of the "menu"
 * @param {number} last_active The id of the last active menu
 * @param {Object} container Container that old the informations
 * @param {Object} button_node The button that was clicked on (it's the <a>)
 */
function display_or_hide_container(id, last_active, container, button_node) {
    if (container.style.display == "none" || last_active != id) {
        // Clear first so we don't have to maybe draw something that will be deleted
        clear_dom_node(container);
        container.style.display = "block";
        return false;
    }

    container.style.display = "none";
    button_node.parentElement.classList.toggle("active");
    return true;
}

/**
 * Create a simple node with a FontAwesome icon before it and append it to the node parameter
 * @param {Object} node The node that will contain the new icon with text
 * @param {string} icon The FontAwesome icon name
 * @param {string} text The text next to the icon
 */
function append_text_with_icon(node, icon, text) {
    let icon_node = document.createElement("span");
    icon_node.className = "fas fa-" + icon + " fa-fw";
    icon_node.setAttribute("aria-hidden", true);

    node.appendChild(icon_node);
    node.appendChild(document.createTextNode(" "));
    node.appendChild(document.createTextNode(text));
}

/**
 * Display a manga thumbnail and the last 5 highest read chapters next to a row in the follow list
 * @param {Object} node The row where the tooltip will be displayed next to
 * @param {number} u_id Unique id to representep the tooltip
 * @param {number} manga_id The manga id on MangaDex
 * @param {Object} data Object that contain the chapters list
 */
function tooltip(node, u_id, manga_id, data=undefined) {
    node.addEventListener("mouseenter", (event) => {
        event.preventDefault();

        let node = document.getElementById("tooltip-" + u_id);
        if (node === null) {
            let tooltip = document.createElement("div");
            tooltip.setAttribute("data-hover", true);
            tooltip.className = "mmd-tooltip mmd-loading";
            tooltip.id = "tooltip-" + u_id;

            // Create the tooltip
            let tooltip_img = document.createElement("img");
            tooltip_img.src = "https://mangadex.org/images/manga/" + manga_id + ".thumb.jpg";

            // Value to set the position of the element - get them before or they might change we image is loaded
            let row_rect = event.target.getBoundingClientRect();
            let scroll_value = window.scrollY;

            // When the ressource loaded we can adjust it's position
            tooltip_img.addEventListener("load", () => {
                tooltip.classList.remove("mmd-loading");

                // Set it's position
                let img_rect = tooltip_img.getBoundingClientRect();
                tooltip.style.left = row_rect.x - img_rect.width - 5 + "px";
                tooltip.style.top = row_rect.y + (row_rect.height / 2) + scroll_value - (img_rect.height / 2) + "px";
                tooltip.style.maxWidth = img_rect.width + 2 + "px";

                // if the element is still hovered, we active it
                if (tooltip.getAttribute("data-hover") === "true") {
                    tooltip.classList.add("mmd-active");
                }
            });

            // Append the tooltip
            tooltip.appendChild(tooltip_img);

            // Append the chapters if there is
            if (MMD_options.save_all_opened && data !== undefined && data.chapters !== undefined && data.chapters.length > 0) {
                // Add a border below the iamge
                tooltip_img.className = "mmd-tooltip-image";

                // We put the chapters in a container to have padding
                let chapters_list_container = document.createElement("div");
                chapters_list_container.className = "mmd-tooltip-content";
                let max = Math.min(5, data.chapters.length);
                for (let i = 0; i < max; i++) {
                    append_text_with_icon(chapters_list_container, "eye", data.chapters[i]);
                    chapters_list_container.appendChild(document.createElement("br"));
                }
                tooltip.appendChild(chapters_list_container);
            }

            // And then to the body
            document.getElementById("mmd-tooltip").appendChild(tooltip);
        } else {
            node.setAttribute("data-hover", true);
            node.classList.add("mmd-active");
        }
    });

    // Hide the tooltip
    node.addEventListener("mouseleave", (event) => {
        event.preventDefault();

        let node = document.getElementById("tooltip-" + u_id);
        if (node !== null) {
            node.setAttribute("data-hover", false);
            node.classList.remove("mmd-active");
        }
    });
}

/**
 * Update the manga "id" on MangaDex and put on the list "type"
 * 1 Reading 4 Plan to read
 * @param {Object} row The row of the element
 * @param {number} id The id on MangaDex of the manga
 * @param {number} type The type of the list to add the manga
 */
function update_mangadex_list(row, id, type) {
    fetch("https://mangadex.org/ajax/actions.ajax.php?function=manga_follow&id=" + id + "&type=" + type, {
        method: 'GET',
        credentials: 'include',
        headers: {
            "X-Requested-With": "XMLHttpRequest"
        }
    })
    .then(() => {
        // Flash background
        row.classList.add((type == 4) ? "mmd-ptr" : "mmd-saved");
        setTimeout(() => {
            row.classList.remove((type == 4) ? "mmd-ptr" : "mmd-saved");
        }, 500);
    });
}

/**
 * Insert the chapter in the chapters list, ordered highest to lowest and check the length to be lesser or equal to the option
 * @param {Array} chapters The list of chapters
 * @param {Object} chapter A chapter and volume object
 */
function insert_chapter(chapters, chapter) {
    if (chapters.indexOf(chapter) === -1) {
        if (chapters.length == 0) {
            chapters.push(chapter);
        } else {
            let i = 0;
            let max = chapters.length;
            let higher = true;
            // Chapters are ordered
            while (i < max && higher) {
                if (chapters[i] < chapter) {
                    higher = false;
                } else {
                    i++;
                }
            }
            chapters.splice(i, 0, chapter);

            // Check the length
            while (chapters.length > MMD_options.max_save_opened) {
                chapters.pop();
            }
        }
    }
}

// PAGES

/**
 * Start
 */
function start() {
    // URL so we can start the right function
    console.log(URL);
    try {
    if (URL.indexOf("org/follows") > -1 ||
        (URL.indexOf("org/group") > -1 && (URL.indexOf("/chapters/") > -1 || (URL.indexOf("/manga/") == -1 && URL.indexOf("/comments/") == -1))) ||
        (URL.indexOf("org/user") > -1 && (URL.indexOf("/chapters/") > -1 || URL.indexOf("/manga/") == -1))) {
        follow_page(!(URL.indexOf("org/group") > -1 || URL.indexOf("org/user") > -1));
    } else if (URL.indexOf("org/manga") > -1) {
        manga_page();
    } else if (URL.indexOf("org/chapter") > -1) {
        chapter_page();
    } else if (URL.indexOf("org/quick_search") > -1 ||
                URL.indexOf("org/search") > -1 ||
                URL.indexOf("org/?page=search") > -1 ||
                URL.indexOf("org/?page=titles") > -1 ||
                URL.indexOf("org/featured") > -1 ||
                URL.indexOf("org/titles") > -1 ||
                (URL.indexOf("org/group") > -1 && URL.indexOf("/manga/") > -1) ||
                (URL.indexOf("org/user") > -1 && URL.indexOf("/manga/") > -1)) {
        search_and_list_page();
    }

    } catch (error) {
        console.error(error);
    }
}

/**
 * Follow page
 * Highlight all last open chapters, hide lower ones depending on the option and show the mangagement buttons
 */
function follow_page(append_top_bar) {
    console.log("here");
    console.log(append_top_bar);
    let chapters_list = document.querySelector("table.table-striped.table-hover.table-condensed tbody").children;

    // Keep track of all entries in the follow table
    var entries = {};

    //var color = "rebeccapurple"; // "darkmagenta", "darkorchid"
    // Switch between colors of this array
    var max_color = MMD_options.colors.last_open.length;
    var current_color = 0;

    // Create a tooltip holder to avoid spamming the document body
    let tooltip_container = document.createElement("div");
    tooltip_container.id = "mmd-tooltip";
    document.body.appendChild(tooltip_container);

    // Save each data storage promises to avoid fetching the same data twice - huge speed boost when there is the same serie multiple times
    let local_storage = {};

    // Check each rows of the main table
    let nbr_chapters = chapters_list.length - 1;
    for (let row = nbr_chapters; row >= 0; --row) {
        let element = chapters_list[row];

        // Get volume and chapter number
        let volume_and_chapter = volume_and_chapter_from_node(element.children[2].firstElementChild);

        // If it's a row with a name
        if (element.firstElementChild.childElementCount > 0) {
            let id = parseInt(/\/manga\/(\d+)\//.exec(element.firstElementChild.firstElementChild.href)[1]);
            let current_entries = {};

            // We copy the entries - necessary since storage_get is async we won't get the right data
            if (!is_empty(entries)) {
                // We push the last entry - the current one - if there is other entries
                entries.dom_nodes.push(element);
                entries.chapters.push(volume_and_chapter);

                // Copy
                current_entries = {
                    dom_nodes: entries.dom_nodes,
                    chapters: entries.chapters
                };
            }

            // Clear entries for next rows
            entries = {};

            // Check if the data for the current serie is already fetched
            let storage_promise = local_storage[id];
            if (local_storage[id] === undefined) {
                // If there isn't, we fetch it and add it in the local_storage object
                local_storage[id] = storage_get(id);
                storage_promise = local_storage[id];
            }

            // Promise that come from the local_storage array or a new promise to fetch data
            storage_promise
            .then((data) => {
                let show_tooltip = true;

                // Paint or not
                if (data !== undefined) {
                    // Switch colors between rows
                    let going_for_color = MMD_options.colors.last_open[current_color];

                    // If it's a single chapter
                    if (is_empty(current_entries)) {
                        // If it's the last open chapter we paint it
                        if (volume_and_chapter.chapter == data.last) {
                            element.style.backgroundColor = going_for_color;
                            current_color = (current_color + 1) % max_color;
                            // If it's a lower than last open we delete it
                        } else if (volume_and_chapter.chapter < data.last) {
                            show_tooltip = false;
                            if (MMD_options.hide_lower) {
                                element.parentElement.removeChild(element);
                            } else {
                                element.style.backgroundColor = MMD_options.colors.lower_chapter;
                            }
                            // Else it's a higher, we make it so clicking it paint it
                        } else {
                            element.children[2].firstElementChild.addEventListener("auxclick", () => {
                                element.style.backgroundColor = going_for_color;
                            });
                            current_color = (current_color + 1) % max_color;
                        }
                    } else {
                        let build_tree = false;
                        let has_higher = false;

                        // It's a multiple row list - we delete the old ones if needed
                        let max_entry = current_entries.chapters.length - 1;
                        for (let entry_index in current_entries.chapters) {
                            let entry_chapter = current_entries.chapters[entry_index].chapter;
                            let entry_node = current_entries.dom_nodes[entry_index];
                            let still_exist = true;

                            // We delete the row if it's lower and one first - or first but all are lower
                            if (entry_chapter < data.last &&
                                (parseInt(entry_index) < max_entry || (parseInt(entry_index) == max_entry && (!build_tree && !has_higher)))) {
                                still_exist = false;

                                if (parseInt(entry_index) == max_entry) {
                                    show_tooltip = false;
                                }

                                if (MMD_options.hide_lower) {
                                    entry_node.parentElement.removeChild(entry_node);
                                } else {
                                    entry_node.style.backgroundColor = MMD_options.colors.lower_chapter;
                                }
                            } else if (entry_chapter == data.last) {
                                // If it's the current chapter we start painting the left column - that avoid deleting the first row
                                build_tree = true;
                                // And we also paint the row
                                entry_node.style.backgroundColor = going_for_color;
                                current_color = (current_color + 1) % max_color;
                            } else {
                                has_higher = true;

                                if (build_tree) {
                                    entry_node.firstElementChild.style.backgroundColor = going_for_color;
                                }

                                // Else we make the auxclick paint the row - it'a a higher
                                entry_node.children[2].firstElementChild.addEventListener("auxclick", () => {
                                    entry_node.style.backgroundColor = going_for_color;
                                });
                            }
                        }
                    }
                }

                // Show a tooltip with the thumbnail if the row wasn't deleted
                if (show_tooltip) {
                    tooltip(element, row, id, data);
                }
            });
        } else {
            // Else it's a empty name row, so we just add the dom_node to the current entry
            if (is_empty(entries)) {
                entries = {
                    dom_nodes: [element],
                    chapters: [volume_and_chapter]
                };
            } else {
                entries.dom_nodes.push(element);
                entries.chapters.push(volume_and_chapter);
            }
        }
    }

    if (append_top_bar) {
        // Display buttons that import, export and delete the storage
        let manage_container = document.createElement("div");
        manage_container.className = "form-group";
        manage_container.style.display = "none";
        manage_container.style.padding = "15px 0 0 0";
        manage_container.style.textAlign = "center";

        let chapters_node = document.getElementById("chapters");
        chapters_node.style.clear = "both";
        chapters_node.parentElement.insertBefore(manage_container, chapters_node);

        // The nav bar where we will put all the buttons in
        let nav_bar = document.querySelector("ul[role='tablist']");
        var last_active = 0;
        var is_clickable = true;

        // Create import data button
        create_nav_button(nav_bar, "Import (MMD)", "upload", (event) => {
            event.preventDefault();

            if (is_clickable) {
                activate_button(event.target);
                if (display_or_hide_container(2, last_active, manage_container, event.target)) {
                    return;
                } else {
                    last_active = 2;
                }

                let import_label = document.createElement("label");
                import_label.className = "col-sm-3 control-label";
                import_label.textContent = "JSON Data: ";

                let import_text_container = document.createElement("div");
                import_text_container.className = "col-sm-9";
                let import_textarea = document.createElement("textarea");
                import_textarea.className = "form-control";

                let send_container = document.createElement("div");
                send_container.style.textAlign = "right";
                let merge_label = document.createElement("label");
                let merge_checkbox = document.createElement("input");
                merge_checkbox.type = "checkbox";
                merge_checkbox.style.margin = "0 5px";
                merge_checkbox.style.verticalAlign = "middle";
                merge_checkbox.value = "Merge";
                merge_label.appendChild(merge_checkbox);
                merge_label.appendChild(document.createTextNode("Merge"));

                let send_button = document.createElement("button");
                send_button.className = "btn btn-default";
                send_button.style.margin = "15px 0";
                append_text_with_icon(send_button, "save", "Send");

                send_container.appendChild(merge_label);
                send_container.appendChild(document.createTextNode(" "));
                send_container.appendChild(send_button);

                send_button.addEventListener("click", (sub_event) => {
                    sub_event.preventDefault();

                    is_clickable = false;

                    try {
                        let imported_data = JSON.parse(import_textarea.value);

                        // If we merge the impport, the current data won't be deleted
                        // If there is an entry, the last open will be set to the highest of the two entries
                        if (merge_checkbox.checked) {
                            let promises = [];

                            for (let mangadex_id in imported_data) {
                                if (mangadex_id == "options") {
                                    promises.push(
                                        storage_set("options", imported_data[mangadex_id])
                                    );
                                } else {
                                    promises.push(
                                        storage_get(mangadex_id)
                                        .then((data) => {
                                            let to_insert = imported_data[mangadex_id + ""];

                                            // If there is an entry we set it to the highest last chapter and we mix all opened chapters
                                            if (data !== undefined) {
                                                to_insert.last = Math.max(data.last, to_insert.last);

                                                // Merge chapters
                                                if (to_insert.chapters !== undefined) {
                                                    for (let chapter of data.chapters) {
                                                        insert_chapter(to_insert.chapters, chapter);
                                                    }

                                                    while (to_insert.chapters.length > MMD_options.max_save_opened) {
                                                        to_insert.chapters.pop();
                                                    }
                                                } else {
                                                    to_insert.chapters = data.chapters || [];
                                                }
                                            }

                                            // Insert the entry in the local storage
                                            return storage_set(mangadex_id, to_insert);
                                        })
                                    );
                                }
                            }

                            // We wait until we checked all data
                            Promise.all(promises)
                            .then(() => {
                                is_clickable = true;

                                vNotify.success({
                                    title: "Data imported",
                                    text: "Your data was successfully imported and merged !\nRefresh the page to see the modifications.",
                                    sticky: true,
                                });
                            });
                        } else {
                            storage_set(null, imported_data)
                            .then(() => {
                                is_clickable = true;

                                vNotify.success({
                                    title: "Data imported",
                                    text: "Your data was successfully imported !\nRefresh the page to see the modifications.",
                                    sticky: true,
                                });
                            });
                        }
                    } catch (error) {
                        is_clickable = true;

                        vNotify.error({
                            title: "Error importing",
                            text: error,
                            sticky: true
                        });
                        console.error(error);
                    }

                    // Hide menu
                    event.target.parentElement.classList.toggle("active");
                    manage_container.style.display = "none";
                });

                manage_container.appendChild(import_label);
                import_text_container.appendChild(import_textarea);
                import_text_container.appendChild(send_container);
                manage_container.appendChild(import_text_container);
            }
        });

        // Create an import from MyAnimeList button
        create_nav_button(nav_bar, "Import (MAL)", "upload", (event) => {
            event.preventDefault();

            if (is_clickable) {
                activate_button(event.target);
                if (display_or_hide_container(4, last_active, manage_container, event.target)) {
                    return;
                } else {
                    last_active = 4;
                }

                let result_container = document.createElement("textarea");
                result_container.className = "form-control";
                result_container.style.height = "300px";
                result_container.style.overflow = "auto";
                result_container.readOnly = true;
                result_container.value = "Loading... Don't close the browser tab or \"Import (MAL)\" tab.";

                let input_mal_username = document.createElement("input");
                input_mal_username.className = "form-control";
                input_mal_username.style.margin = "0 auto";
                input_mal_username.style.display = "inline-block";
                input_mal_username.style.width = "auto";
                input_mal_username.placeholder = "MyAnimeList username";
                manage_container.appendChild(input_mal_username);
                manage_container.appendChild(document.createTextNode(" "));

                let confirm_import_button = document.createElement("button");
                confirm_import_button.className = "btn btn-success";
                confirm_import_button.style.margin = "0 auto";
                confirm_import_button.style.display = "inline-block";
                append_text_with_icon(confirm_import_button, "check", "Import data from MyAnimeList");
                confirm_import_button.addEventListener("click", (sub_event) => {
                    sub_event.preventDefault();

                    if (input_mal_username.value != "") {
                        is_clickable = false;

                        // Arrays with the data
                        let mal_manga = [];
                        let mangadex_manga = [];

                        // Start a dummy request to MyAnimeList to see if we can fetch the data
                        fetch_mal_manga_list(mal_manga, input_mal_username.value, result_container, 0, true)
                        .then(() => {
                            if (mal_manga.length == 0) {
                                is_clickable = true;

                                vNotify.error({
                                    title: "Can\'t fetch",
                                    text: "The list of this user isn't accessible, maybe you are not logged in on MyAnimeList ?",
                                    image: "https://i.imgur.com/oMV2BJt.png"
                                });
                            } else {
                                sub_event.target.parentElement.removeChild(sub_event.target);
                                input_mal_username.parentElement.removeChild(input_mal_username);

                                // Create the textarea which will show the data imported
                                manage_container.appendChild(result_container);

                                // Start fetching the data
                                Promise.all([fetch_mal_manga_list(mal_manga, input_mal_username.value, result_container, mal_manga.length), fetch_mangadex_manga(mangadex_manga, result_container)])
                                .then(() => {
                                    update_all_manga_with_mal_data(mal_manga, mangadex_manga, result_container)
                                    .then(() => {
                                        is_clickable = true;
                                    });
                                });
                            }
                        });
                    } else {
                        vNotify.error({
                            title: "Empty username",
                            text: "Can't import a non-existing user ?!",
                            image: "https://i.imgur.com/oMV2BJt.png"
                        });
                    }
                });
                manage_container.appendChild(confirm_import_button);
            }
        });

        create_nav_button(nav_bar, "Export (MMD)", "download", (event) => {
            event.preventDefault();

            if (is_clickable) {
                activate_button(event.target);
                if (display_or_hide_container(1, last_active, manage_container, event.target)) {
                    return;
                } else {
                    last_active = 1;
                }

                let json_container = document.createElement("textarea");
                json_container.className = "form-control";
                json_container.style.height = "300px";
                json_container.style.overflow = "auto";
                json_container.value = "Loading...";
                json_container.readOnly = true;

                // Get the data here so it might fetch while we create the other nodes
                storage_get(null)
                .then((data) => {
                    json_container.value = JSON.stringify(data);
                });

                let copy_button = document.createElement("button");
                copy_button.className = "btn btn-default";
                copy_button.style.float = "right";
                copy_button.style.margin = "15px";
                append_text_with_icon(copy_button, "copy", "Copy");
                copy_button.addEventListener("click", (sub_event) => {
                    sub_event.preventDefault();

                    try {
                        json_container.select();
                        document.execCommand("Copy");

                        vNotify.success({
                            title: "Data copied",
                            text: "Your data is in your Clipboard."
                        });
                    } catch (error) {
                        vNotify.error({
                            title: "Error copying data",
                            text: error,
                            sticky: true
                        });
                        console.error(error);
                    }
                });

                // Append at the end so we draw it directly if it was fetched
                manage_container.appendChild(json_container);
                manage_container.appendChild(copy_button);
            }
        });

        // Create clear data button
        create_nav_button(nav_bar, "Clear Data (MMD)", "trash", (event) => {
            event.preventDefault();

            if (is_clickable) {
                activate_button(event.target);
                if (display_or_hide_container(3, last_active, manage_container, event.target)) {
                    return;
                } else {
                    last_active = 3;
                }

                let confirm_delete_button = document.createElement("button");
                confirm_delete_button.className = "btn btn-danger";
                confirm_delete_button.style.margin = "0 auto";
                confirm_delete_button.style.display = "block";
                append_text_with_icon(confirm_delete_button, "trash", "Click here to Delete MyMangaDex local storage");
                confirm_delete_button.addEventListener("click", (sub_event) => {
                    sub_event.preventDefault();
                    is_clickable = false;

                    // Clear data
                    browser.storage.local.clear()
                    .then(() => {
                        is_clickable = true;

                        vNotify.success({
                            title: "Data deleted",
                            text: "Local storage as been cleared."
                        });
                    });

                    // Set the options
                    storage_set("options", MMD_options);

                    // Hide menu
                    event.target.parentElement.classList.toggle("active");
                    manage_container.style.display = "none";
                });
                manage_container.appendChild(confirm_delete_button);
            }
        });
    }
}

/**
 * Manga page where there is the description and a list of the last 100 chapters of a manga
 * Optionnal MAL url with a mal icon
 */
function manga_page() {
    let manga = {
        name: document.getElementsByClassName("panel-title")[0].textContent.trim(),
        id: parseInt(/.+manga\/(\d+)/.exec(URL)[1]),
        mal: 0,
        last: 0,
        current: {volume: 0, chapter: 0},
        chapters: []
    };

    // Chapters with more informations to highlight
    let chapters = [];

    // Chapters list displayed
    var chapters_list = document.querySelector(".table-responsive tbody").children;

    // Get the name of each "chapters" in the list
    for (var element of chapters_list) {
        var volume_and_chapter = volume_and_chapter_from_node(element.children[1].firstElementChild);

        chapters.push({
            node: element,
            volume: volume_and_chapter.volume,
            chapter: volume_and_chapter.chapter
        });
    }

    // Fetch the manga information from the local storage
    storage_get(manga.id)
    .then((data) => {
        let first_fetch = false;

        // We always try to find the link, in case it was updated
        let mal_url = document.querySelector("img[src='/images/misc/mal.png'");

        // If there is no entry try to find it
        if (data === undefined) {
            first_fetch = true;
            manga.last = 0;

            if (mal_url !== null) {
                // Finish getting the mal link
                mal_url = mal_url.nextElementSibling.href;
                // Get MAL id of the manga from the mal link
                manga.mal = parseInt(/.+\/(\d+)/.exec(mal_url)[1]);
            } else {
                vNotify.error({
                    title: "No MyAnimeList id found",
                    text: "You can add one using the form.\nLast open chapter will still be saved.",
                    sticky: true
                });
            }

            // Update it at least once to save the mal id
            update_manga_local_storage(manga, false);
        } else {
            manga.mal = data.mal;
            if (manga.mal == 0 && mal_url !== null) {
                // Finish getting the mal link
                mal_url = mal_url.nextElementSibling.href;
                // Get MAL id of the manga from the mal link
                manga.mal = parseInt(/.+\/(\d+)/.exec(mal_url)[1]);
                // We set first fetch even though it's not to update local storage with the new id
                first_fetch = true;
            }
            manga.last = data.last;
            manga.chapters = data.chapters || [];
        }

        // If there is a existing mal link
        if (manga.mal > 0) {
            // Fetch the edit page of the manga
            // Overkill until api come to life
            fetch_mal_for_manga_data(manga).then((data) => {
                if (logged_in_mal) {
                    var parent_node = document.getElementsByClassName("table table-condensed")[0].firstElementChild;
                    var chapters_row = document.createElement("tr");
                    var chapters_column_header = document.createElement("th");
                    chapters_column_header.textContent = "Status:";
                    var chapters_column_content = document.createElement("td");

                    if (manga.more_info.is_approved) {
                        // Check if the manga is already in the reading list
                        if (manga.more_info.redirected == false) {
                            insert_mal_informations(chapters_column_content, manga);

                            if (first_fetch) {
                                manga.last = Math.max(manga.last_mal, manga.last);
                                insert_chapter(manga.chapters, manga.last);
                                update_manga_local_storage(manga, false);
                            }
                        } else {
                            // Add a "Add to reading list" button
                            var chapters_column_content_add = document.createElement("button");
                            chapters_column_content_add.className = "btn btn-default";
                            chapters_column_content_add.textContent = "Start Reading";
                            chapters_column_content_add.addEventListener("click", (event) => {
                                add_to_mal_list(manga, 1, chapters_column_content);
                            });

                            // And a "Plan to read" button
                            var chapters_column_content_ptr = document.createElement("button");
                            chapters_column_content_ptr.className = "btn btn-default";
                            chapters_column_content_ptr.textContent = "Add to Plan to Read list";
                            chapters_column_content_ptr.addEventListener("click", (event) => {
                                add_to_mal_list(manga, 6, chapters_column_content);
                            });
                            chapters_column_content.appendChild(chapters_column_content_add);
                            chapters_column_content.appendChild(document.createTextNode(" "));
                            chapters_column_content.appendChild(chapters_column_content_ptr);
                        }
                    } else {
                        let color_span = document.createElement("span");
                        color_span.style.color = "firebrick";
                        color_span.textContent = "The manga is still pending approval on MyAnimelist and can't be updated";
                        chapters_column_content.appendChild(color_span);
                    }

                    // We highlight the chapters anyway, since they can be others that aren't saved on MyAnimeList
                    highlight_chapters(manga, chapters);

                    // Append nodes to the table to display
                    chapters_row.appendChild(chapters_column_header);
                    chapters_row.appendChild(chapters_column_content);
                    parent_node.insertBefore(chapters_row, parent_node.lastElementChild);
                }
            });
        } else {
            insert_mal_link_form(manga, chapters);
            highlight_chapters(manga, chapters);
        }
    }, (error) => {
        console.error("Error fetching data from local storage.", error);
    });
}

/**
 * Chapter page
 * The volume and chapter number is located on the selector
 * The MAL URL is fetched from the local database, if there isn't an entry, we look at the manga page, and if there isn't, no more option
 * All of this is done in the background when the page ended loading, we're not in a hurry anyway
 */
function chapter_page() {
    // Manga Object
    let manga = {
        name: "",
        id: 0,
        mal: 0,
        last: 0,
        current: 0,
        chapters: []
    };

    var chapter_list_node = document.querySelector("script[data-type='chapter']");
    // Fix for chapter without content, when the chapter WILL be published according to group delay
    if (chapter_list_node == null) {
        chapter_list_node = document.querySelector("meta[property='og:title']");
        manga.current = volume_and_chapter_from_string(chapter_list_node.content);
        manga.name = document.getElementsByClassName("panel-title")[0].children[1].title;

        chapter_list_node = document.querySelector("meta[property='og:image']");
        manga.id = parseInt(/manga\/(\d+)\.thumb.+/.exec(chapter_list_node.content)[1]);
    } else {
        // Parse the script tag with the info of the chapters and manga inside
        var manga_info = JSON.parse(chapter_list_node.textContent);

        manga.name = manga_info.manga_title;
        manga.id = manga_info.manga_id;
        // Fetch current chapter
        for (var other_chapter of manga_info.other_chapters) {
            if (other_chapter.id == manga_info.chapter_id) {
                manga.current = volume_and_chapter_from_string(other_chapter.name);
                break;
            }
        }
    }

    console.log(manga);

    // Get MAL Url from the database
    storage_get(manga.id)
    .then((data) => {
        // If there is no entry for mal link
        if (data === undefined) {
            vNotify.info({
                title: "No MyAnimeList id in storage",
                text: "Fetching MangaDex manga page of " + manga.name + " to find a MyAnimeList id.",
            });

            // There is no data so the last one is the current one
            manga.last = manga.current.chapter;
            if (MMD_options.save_all_opened) {
                manga.chapters.push(manga.last);
            }

            // Fetch it from mangadex manga page
            fetch("https://mangadex.org/manga/" + manga.id, {
                method: 'GET',
                cache: 'no-cache'
            }).then((data) => {
                data.text().then((text) => {
                    // Scan the manga page for the mal icon and mal url
                    let mal_url = /<a.+href='(.+)'>MyAnimeList<\/a>/.exec(text);

                    // If regex is empty, there is no mal link, can't do anything
                    if (mal_url === null) {
                        vNotify.error({
                            title: "No MyAnimeList id found",
                            text: "You can add one using the form.\nLast open chapter is still saved.",
                            sticky: true
                        });
                    } else {
                        // If there is a mal link, add it and save it in local storage
                        manga.mal = parseInt(/.+\/(\d+)/.exec(mal_url[1])[1]);

                        // And finally add the chapter read and display the edit button
                        update_manga_last_read(manga)
                        .then(() => {
                            if (manga.more_info.exist && manga.more_info.is_approved) {
                                insert_mal_button(document.getElementById("report_button").parentElement, manga, false);
                            }
                        });
                    }

                    // Update local storage - after, it doesn't really matter
                    update_manga_local_storage(manga);
                });
            }, (error) => {
                console.error(error);
            });
        } else {
            // Get the mal id from the local storage
            manga.mal = data.mal;
            manga.last = data.last;
            manga.chapters = data.chapters || [];

            // We add the current chapter to the list of opened chapters if the option is on
            if (MMD_options.save_all_opened) {
                insert_chapter(manga.chapters, manga.current.chapter);
            }

            // If there is a MAL, we update the last read
            if (manga.mal > 0) {
                update_manga_last_read(manga)
                .then(() => {
                    if (manga.more_info.exist && manga.more_info.is_approved) {
                        insert_mal_button(document.getElementById("report_button").parentElement, manga, false);
                    }
                });
            }

            // Update local storage
            update_manga_local_storage(manga);
        }
    }, (error) => {
        console.error("Error fetching data from local storage.", error);
    });
}

/**
 * Insert a "Reading" and "Plan to read" button that add the manga in the corresponding list on MangaDex
 */
function search_and_list_page() {
    // https://mangadex.org/ajax/actions.ajax.php?function=manga_follow&id=3409&type=4
    let founds_table = document.querySelector("table.table-striped.table-condensed tbody");

    // if there is no table the list is not expanded or simple
    if (founds_table === null) {
        return;
    }
    let founds = founds_table.children;

    let manga_height = 2;
    if (founds_table.parentElement.classList.contains('table-hover')) {
        manga_height = 1;

        // Create the tooltip holder because there will be one
        let tooltip_container = document.createElement("div");
        tooltip_container.id = "mmd-tooltip";
        document.body.appendChild(tooltip_container);
    }

    for (let row in founds) {
        // Every 2 rows
        if (row % manga_height == 0) {
            let node = founds[row].children[manga_height];
            let id = /manga\/(\d+)\/?.*/.exec(node.firstElementChild.href)[1];

            if (manga_height == 1) {
                tooltip(founds[row], row, id);
            }

            if (MMD_options.follow_button) {
                founds[row].classList.add("mmd-background-transition");
                let button_read = document.createElement("button");
                button_read.style.float = "right";
                button_read.className = "btn btn-default";
                button_read.textContent = "Reading";
                button_read.addEventListener("click", (event) => {
                    event.preventDefault();
                    update_mangadex_list(founds[row], id, 1);
                });

                node.appendChild(button_read);
                node.appendChild(document.createTextNode(" "));

                let button_ptr = document.createElement("button");
                button_ptr.style.float = "right";
                button_ptr.className = "btn btn-default";
                button_ptr.textContent = "Plan to read";
                button_ptr.addEventListener("click", (event) => {
                    event.preventDefault();
                    update_mangadex_list(founds[row], id, 4);
                });

                node.appendChild(button_ptr);
            }
        }
    }
}

// START HERE

// Load the required options and then start the real work !
load_options().then(start);