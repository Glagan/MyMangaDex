// INIT

window.MyMangaDex = {
    url: "",
    manga_name: "",
    mangadex_id: 0,
    mal_id: 0,
    mal_url: "",
    last_read: -1,
    last_open: -1,
    last_open_sub: -1,
    chapters: [],
    current_chapter: {},
    more_info: {}
};

// FUNCTIONS

// https://stackoverflow.com/a/34491287/7794671
function isEmpty(obj) {
   for (var x in obj) { return false; }
   return true;
}

function debug_info() {
    console.log("=====");
    console.log(MyMangaDex);
    browser.storage.local.get().then(data => {
        console.log(data);
        console.log("=====");
    });
}

function start(logged_in) {
    // If user isn't logged in, can't do anything
    if (logged_in) {
        MyMangaDex.url = window.location.href;

        if (MyMangaDex.url.indexOf("org/about") > -1) {
            browser.storage.local.clear();
            debug_info();
        } else if (MyMangaDex.url.indexOf("org/follows") > -1) {
            console.log("Follow page");
            follow_page();
        } else if (MyMangaDex.url.indexOf("org/manga") > -1) {
            console.log("Manga page");
            manga_page();
        } else if (MyMangaDex.url.indexOf("org/chapter") > -1) {
            console.log("Chapter page");
            chapter_page();
        }
    } else {
        console.error("Not logged in MyAnimeList, or there is a problem accessing the login page.");
    }
}

function insert_mal_link_form() {
    var parent_node = document.getElementsByClassName("table table-condensed")[0].firstElementChild;
    var add_mal_link_row = document.createElement("tr");
    var add_mal_link_column_header = document.createElement("th");
    add_mal_link_column_header.textContent = "MAL link:";
    var add_mal_link_column_content = document.createElement("td");
    var add_mal_link_column_content_edit = document.createElement("input");
    add_mal_link_column_content_edit.id = "mymangadex-mal-link-input";
    add_mal_link_column_content_edit.className = "form-control";
    // Style the input since the form-control style is fucked
    add_mal_link_column_content_edit.style.display = "inline-block";
    add_mal_link_column_content_edit.style.width = "auto";
    add_mal_link_column_content_edit.style.verticalAlign = "middle";
    add_mal_link_column_content_edit.type = "text";
    add_mal_link_column_content_edit.size = 40;
    add_mal_link_column_content_edit.placeholder = "eg: https://myanimelist.net/manga/103939";
    var add_mal_link_column_content_send = document.createElement("button");
    add_mal_link_column_content_send.className = "btn btn-default"
    add_mal_link_column_content_send.type = "submit";
    add_mal_link_column_content_send.textContent = "Send";
    add_mal_link_column_content.appendChild(add_mal_link_column_content_edit);
    add_mal_link_column_content.appendChild(add_mal_link_column_content_send);
    add_mal_link_row.appendChild(add_mal_link_column_header);
    add_mal_link_row.appendChild(add_mal_link_column_content);
    parent_node.insertBefore(add_mal_link_row, parent_node.lastElementChild);
}

/**
 * Function that fetch the edit page of a manga and "parse" it to get the required data to update it later
 */
function fetch_mal_for_manga_data() {
    return fetch("https://myanimelist.net/ownlist/manga/" + MyMangaDex.mal_id + "/edit?hideLayout", {
        method: 'GET',
        redirect: 'follow',
        credentials: 'include'
    }).then((data) => {
        return data.text().then((text) => {
            // Comments
            MyMangaDex.more_info.comments = /add_manga_comments.+>(.*)</.exec(text)[1];
            // Finish date
            MyMangaDex.more_info.finish_date = {};
            MyMangaDex.more_info.finish_date.month = (/add_manga_finish_date_month.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]||"");
            MyMangaDex.more_info.finish_date.day = (/add_manga_finish_date_day.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]||"");
            MyMangaDex.more_info.finish_date.year = (/add_manga_finish_date_year.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]||"");
            // Ask to discuss
            MyMangaDex.more_info.ask_to_discuss = /add_manga_is_asked_to_discuss.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
            MyMangaDex.more_info.ask_to_discuss = (MyMangaDex.more_info.ask_to_discuss === null) ? 0 : MyMangaDex.more_info.ask_to_discuss[1];
            // Last read chapter
            MyMangaDex.last_read = /add_manga_num_read_chapters.+value="(\d+)?"/.exec(text);
            MyMangaDex.last_read = (MyMangaDex.last_read === null) ? 0 : MyMangaDex.last_read[1];
            // Total times re-read
            MyMangaDex.more_info.total_reread = /add_manga_num_read_times.+value="(\d+)?"/.exec(text);
            MyMangaDex.more_info.total_reread = (MyMangaDex.more_info.total_reread === null) ? 0 : MyMangaDex.more_info.total_reread[1];
            // Last read volume
            MyMangaDex.more_info.last_volume = /add_manga_num_read_volumes.+value="(\d+)?"/.exec(text);
            MyMangaDex.more_info.last_volume = (MyMangaDex.more_info.last_volume === null) ? "" : MyMangaDex.more_info.last_volume[1];
            // Retail volumes
            MyMangaDex.more_info.retail_volumes = /add_manga_num_retail_volumes.+value="(\d+)?"/.exec(text);
            MyMangaDex.more_info.retail_volumes = (MyMangaDex.more_info.retail_volumes === null) ? "" : MyMangaDex.more_info.retail_volumes[1];
            // Priority
            MyMangaDex.more_info.priority = /add_manga_priority.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
            MyMangaDex.more_info.priority = (MyMangaDex.more_info.priority === null) ? 0 : MyMangaDex.more_info.priority[1];
            // Re-read value
            MyMangaDex.more_info.reread_value = /add_manga_reread_value.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
            MyMangaDex.more_info.reread_value = (MyMangaDex.more_info.reread_value === null) ? "" : MyMangaDex.more_info.reread_value[1];
            // Score
            MyMangaDex.more_info.score = /add_manga_score.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
            MyMangaDex.more_info.score = (MyMangaDex.more_info.score === null) ? "" : MyMangaDex.more_info.score[1];
            // SNS Post type
            MyMangaDex.more_info.sns_post_type = /add_manga_sns_post_type.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)
            MyMangaDex.more_info.sns_post_type = (MyMangaDex.more_info.sns_post_type === null) ? 0 : MyMangaDex.more_info.sns_post_type[1];
            // Start date
            MyMangaDex.more_info.start_date = {};
            MyMangaDex.more_info.start_date.month = (/add_manga_start_date_month.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]||"");
            MyMangaDex.more_info.start_date.day = (/add_manga_start_date_day.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]||"");
            MyMangaDex.more_info.start_date.year = (/add_manga_start_date_year.+\s.+value="(\d+)?"\sselected="selected"/.exec(text)[1]||"");
            // Status
            MyMangaDex.more_info.status = /add_manga_status.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
            MyMangaDex.more_info.status = (MyMangaDex.more_info.status === null) ? 1 : MyMangaDex.more_info.status[1];
            // Storage type
            MyMangaDex.more_info.storage_type = /add_manga_storage_type.+\s.+value="(\d+)?"\sselected="selected"/.exec(text);
            MyMangaDex.more_info.storage_type = (MyMangaDex.more_info.storage_type === null) ? "" : MyMangaDex.more_info.storage_type[1];
            // Tags
            MyMangaDex.more_info.tags = /add_manga_tags.+>(.*)*</.exec(text)[1] || "";
            // Is re-reading - We'll see later for that
            //MyMangaDex.more_info.is_rereading = /add_manga_is_rereading.+value="(\d*)"/.exec(text)[1];
            MyMangaDex.more_info.is_rereading = 0;
            // Bonus : total volume and chapter
            MyMangaDex.more_info.total_volume = /id="totalVol">(\d*)?<\//.exec(text)[1];
            MyMangaDex.more_info.total_chapter = /id="totalChap">(\d*)?<\//.exec(text)[1];
        })
    });
}

/**
 * Set the last chapter read on MyAnimeList as the current one on a chapter page, only if it's higher than the current one
 * Send 2 request currently
 *  One to check the last chapter
 *  And the second to update the last read chapter
 */
function update_manga_last_read() {
    fetch_mal_for_manga_data().then((data) => {
        if (MyMangaDex.last_read > 0) {
            // If the current chapter is higher than the last read one
            if (MyMangaDex.last_read < MyMangaDex.current_chapter.chapter) {
                // Prepare the body
                var body = "";
                body += encodeURIComponent("add_manga[comments]") + "=" + encodeURIComponent(MyMangaDex.more_info.comments) + "&";
                body += encodeURIComponent("add_manga[finish_date][year]") + "=" + MyMangaDex.more_info.finish_date.year + "&";
                body += encodeURIComponent("add_manga[finish_date][month]") + "=" + MyMangaDex.more_info.finish_date.month + "&";
                body += encodeURIComponent("add_manga[finish_date][day]") + "=" + MyMangaDex.more_info.finish_date.day + "&";
                body += encodeURIComponent("add_manga[is_asked_to_discuss]") + "=" + MyMangaDex.more_info.ask_to_discuss + "&";
                body += encodeURIComponent("add_manga[num_read_chapters]") + "=" + MyMangaDex.current_chapter.chapter + "&";
                body += encodeURIComponent("add_manga[num_read_times]") + "=" + MyMangaDex.more_info.total_reread + "&";
                body += encodeURIComponent("add_manga[num_read_volumes]") + "=" + MyMangaDex.current_chapter.volume + "&";
                body += encodeURIComponent("add_manga[num_retail_volumes]") + "=" + MyMangaDex.more_info.retail_volumes + "&";
                body += encodeURIComponent("add_manga[priority]") + "=" + MyMangaDex.more_info.priority + "&";
                body += encodeURIComponent("add_manga[reread_value]") + "=" + MyMangaDex.more_info.reread_value + "&";
                body += encodeURIComponent("add_manga[score]") + "=" + MyMangaDex.more_info.score + "&";
                body += encodeURIComponent("add_manga[sns_post_type]") + "=" + MyMangaDex.more_info.sns_post_type + "&";
                body += encodeURIComponent("add_manga[start_date][year]") + "=" + MyMangaDex.more_info.start_date.year + "&";
                body += encodeURIComponent("add_manga[start_date][month]") + "=" + MyMangaDex.more_info.start_date.month + "&";
                body += encodeURIComponent("add_manga[start_date][day]") + "=" + MyMangaDex.more_info.start_date.day + "&";
                body += encodeURIComponent("add_manga[status]") + "=1&";
                body += encodeURIComponent("add_manga[storage_type]") + "=" + MyMangaDex.more_info.storage_type + "&";
                body += encodeURIComponent("add_manga[tags]") + "=" + encodeURIComponent(MyMangaDex.more_info.tags) + "&";
                body += encodeURIComponent("csrf_token") + "=8552d2ea6d8542f0a02e1682f76f60f8aacd65e9&";
                body += encodeURIComponent("add_manga[is_rereading]") + "=0&";
                body += "last_completed_vol=&";
                body += "manga_id=" + MyMangaDex.mal_id + "&";
                body += "submitIt=0";

                // Send the POST request to update the manga
                fetch("https://myanimelist.net/ownlist/manga/" + MyMangaDex.mal_id + "/edit", {
                    method: 'POST',
                    body: body,
                    redirect: 'follow',
                    credentials: 'include',
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
                    }
                }).then((data) => {
                    data.text().then((text) => {
                        console.log("Updated");
                        vNotify.success({ text: MyMangaDex.manga_name + " as been updated to Chapter " + MyMangaDex.current_chapter.chapter + " out of " + MyMangaDex.more_info.total_chapter, title: 'Manga updated', position: "bottomRight" });
                    });
                }, (error) => {
                    console.log("Error updating the manga.");
                });
            } else {
                console.log("Last read is higher than the current chapter, not updating.");
            }
        } else {
            console.error("Error fetching the last read chapter on MyAnimeList.");
        }
    });
}

/**
 * Update the last_open and last_open_sub of a mangadex_id entry
 */
function update_last_open() {
    browser.storage.local.set({
        [MyMangaDex.mangadex_id]: {
            mal_id: MyMangaDex.mal_id,
            last_open: MyMangaDex.last_open,
            last_open_sub: MyMangaDex.last_open_sub
        }
    });
}

function insert_mal_button() {
    // Insert on the header
    var parent_node = document.getElementById("report_button").parentElement;
    var mal_button = document.createElement("button");
    mal_button.className = "btn btn-default";
    mal_button.title = "Edit on MyAnimeList";
    // Add a shiny edit icon to look fancy
    var edit_icon = document.createElement("span");
    edit_icon.className = "fas fa-edit fa-fw";
    mal_button.appendChild(edit_icon);
    // Have to mess with HTML, can't edit textContent
    mal_button.innerHTML += " Edit on MyAnimeList";
    parent_node.insertBefore(mal_button, parent_node.firstElementChild);
    // Add a text node with only a space, to separate it on the right
    parent_node.insertBefore(document.createTextNode(" "), parent_node.firstElementChild.nextElementSibling);
}

function follow_page() {
}

/**
 * Manga page where there is the description and a list of the last 100 chapters of a manga
 * Optionnal MAL url with a mal icon
 */
function manga_page() {
    MyMangaDex.manga_name = document.getElementsByClassName("panel-title")[0].textContent.trim();
    MyMangaDex.mangadex_id = /.+manga\/(\d+)/.exec(MyMangaDex.url)[1];

    // Chapters list displayed
    var main_table = document.getElementsByClassName("table table-striped table-hover table-condensed")[0];
    var main_chapter_table = main_table.querySelector("tbody");

    // Get the name of each "chapters" in the list
    for (var element of main_chapter_table.children) {
        var name = element.children[1].firstChild.textContent;
        var volume_and_chapter = /(Vol\.\s(\d+)|).*(Ch\.\s(\d+))\.*(\d+)*/.exec(name);
        MyMangaDex.chapters.push({
            name: name,
            parent_node: element,
            volume: (volume_and_chapter[2]||""),
            chapter: volume_and_chapter[4],
            sub_chapter: volume_and_chapter[5]
        });
    }

    // Fetch the manga information from the local storage
    browser.storage.local.get(MyMangaDex.mangadex_id)
    .then((data) => {
        var has_a_mal_link = true;

        // If there is no entry try to find it
        if (isEmpty(data)) {
            // Search the icon, find the link
            MyMangaDex.mal_url = document.querySelector("img[src='/images/misc/mal.png'");

            if (MyMangaDex.mal_url !== null) {
                // Finish getting the mal link
                MyMangaDex.mal_url = MyMangaDex.mal_url.nextElementSibling.href;
                // Get MAL id of the manga from the mal link
                MyMangaDex.mal_id = /.+\/(\d+)/.exec(MyMangaDex.mal_url)[1];
            // If there is no MAL link, mal id is set to 0
            } else {
                MyMangaDex.mal_id = 0;
                has_a_mal_link = false;
            }

            // Add the entry to the local storage, to avoid searching again next time
            browser.storage.local.set({
                [MyMangaDex.mangadex_id]: {
                    mal_id: MyMangaDex.mal_id,
                    last_open: -1,
                    last_open_sub: -1
                }
            });
        } else {
            MyMangaDex.mal_id = data[MyMangaDex.mangadex_id].mal_id;
            MyMangaDex.last_open = data[MyMangaDex.mangadex_id].last_open;
            MyMangaDex.last_open_sub = data[MyMangaDex.mangadex_id].last_open_sub;

            if (MyMangaDex.mal_id == 0) {
                has_a_mal_link = false;
            }
        }

        // If there is a existing mal link
        if (has_a_mal_link) {
            // Fetch the edit page of the manga
            // Overkill until api come to life
            fetch_mal_for_manga_data().then((data) => {
                console.log(MyMangaDex);

                // init for both if and else
                var parent_node = document.getElementsByClassName("table table-condensed")[0].firstElementChild;
                var chapters_row = document.createElement("tr");
                var chapters_column_header = document.createElement("th");
                chapters_column_header.textContent = "MAL Progress:";
                var chapters_column_content = document.createElement("td");

                // Check if the manga is already in the reading list
                if (MyMangaDex.last_read > 0) {
                    // Add the current chapter on the page
                    chapters_column_content.textContent = "Chapter " + MyMangaDex.last_read + " out of " + MyMangaDex.more_info.total_chapter + " ";
                    // Add the MyAnimeList edit link
                    var chapters_column_content_edit = document.createElement("a");
                    chapters_column_content_edit.className = "btn btn-default";
                    chapters_column_content_edit.href = "https://myanimelist.net/ownlist/manga/" + MyMangaDex.mal_id + "/edit";
                    // Add the icon
                    var edit_icon = document.createElement("span");
                    edit_icon.className = "fas fa-edit fa-fw";
                    chapters_column_content_edit.appendChild(edit_icon);
                    chapters_column_content_edit.innerHTML += " Edit on MyAnimeList";
                    // Append nodes
                    chapters_column_content.appendChild(chapters_column_content_edit);

                    // Highlight last read chapter
                    for (var chapter of MyMangaDex.chapters) {
                        if (chapter.chapter == MyMangaDex.last_read) {
                            chapter.parent_node.style.backgroundColor = "cadetblue";
                        }
                    }
                    // Else add a button to add it
                } else {
                    // Add a "Add to reading list" button
                    var chapters_column_content_add = document.createElement("button");
                    chapters_column_content_add.className = "btn btn-default";
                    chapters_column_content_add.textContent = "Add to MAL reading list";
                    chapters_column_content.appendChild(chapters_column_content_add);
                }

                // Append nodes to the table to display
                chapters_row.appendChild(chapters_column_header);
                chapters_row.appendChild(chapters_column_content);
                parent_node.insertBefore(chapters_row, parent_node.lastElementChild);
            });
        } else {
            insert_mal_link_form();
            console.log("No MAL link avaible, can't do anything, try to add one if it exist.");
        }

        // Highlight last_open in anycase
        if (MyMangaDex.last_open >= 0) {
            for (var chapter of MyMangaDex.chapters) {
                if (chapter.chapter == MyMangaDex.last_open
                    && ((MyMangaDex.last_open_sub === -1 || MyMangaDex.last_open_sub === undefined) || MyMangaDex.last_open_sub == chapter.sub_chapter)) {
                    chapter.parent_node.style.backgroundColor = "rebeccapurple";
                    break;
                }
            }
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
    // Parse the script tag with the info of the chapters and manga inside
    var manga_info = JSON.parse(document.querySelector("script[data-type='chapter']").textContent);
    MyMangaDex.manga_name = manga_info.manga_title;
    MyMangaDex.mangadex_id = manga_info.manga_id + ""; // Convert to string for local storage

    // Fetch current chapter
    for (var chapter of manga_info.other_chapters) {
        if (chapter.id == manga_info.chapter_id) {
            var volume_and_chapter = /(Volume\s(\d+)|).*(Chapter\s(\d+))\.*(\d+)*/.exec(chapter.name);
            MyMangaDex.current_chapter = {
                volume: (volume_and_chapter[2]||""),
                chapter: volume_and_chapter[4],
                sub_chapter: volume_and_chapter[5]
            };
            break;
        }
    }
    // Update last open to this one
    MyMangaDex.last_open = MyMangaDex.current_chapter.chapter;
    MyMangaDex.last_open_sub = MyMangaDex.current_chapter.sub_chapter;

    // Get MAL Url from the database
    browser.storage.local.get(MyMangaDex.mangadex_id)
    .then((data) => {
        // If there is no entry for mal link
        if (isEmpty(data)) {
            console.log("No MAL Link, fetching the manga page to search for one...");
            vNotify.info({ text: "Fetching MangaDex manga page of " + MyMangaDex.manga_name + " to find a MyAnimeList id.", title: 'No MyAnimeList id', position: "bottomRight" });

            // Fetch it from mangadex manga page
            fetch("https://mangadex.org/manga/" + MyMangaDex.mangadex_id, {
                method: 'GET'
            }).then((data) => {
                data.text().then((text) => {
                    // Scan the manga page for the mal icon and mal url
                    MyMangaDex.mal_url = /<a.+href='(.+)'>MyAnimeList<\/a>/.exec(text);

                    // If regex is empty, there is no mal link, can't do anything
                    if (MyMangaDex.mal_url === null) {
                        console.log("No MAL link avaible, can't do anything, try to add one if it exist.");
                        vNotify.error({ text: "No MyAnimeList id found on the manga page, can't do anything.", title: 'No MyAnimeList id', position: "bottomRight" });

                        // We still update the last open in the local storage and store a 0 as mal_id to avoid checking
                        MyMangaDex.mal_id = 0;
                    } else {
                        // Finish gettint the mal url
                        MyMangaDex.mal_url = MyMangaDex.mal_url[1];
                        // If there is a mal link, add it and save it in local storage
                        MyMangaDex.mal_id = /.+\/(\d+)/.exec(MyMangaDex.mal_url)[1];

                        insert_mal_button();

                        // And finally add the chapter read
                        update_manga_last_read();
                    }

                    // Update local storage - after, it doesn't really matter
                    update_last_open();
                });
            }, (error) => {
                console.error(error);
            });
        } else {
            // Get the mal id from the local storage
            MyMangaDex.mal_id = data[MyMangaDex.mangadex_id].mal_id;

            // If there is a MAL, we update the last read
            if (MyMangaDex.mal_id > 0) {
                update_manga_last_read();
                insert_mal_button();
            }

            // We still update last open if there isn't a mal id
            update_last_open();
        }
    }, (error) => {
        console.error("Error fetching data from local storage.", error);
    });
}

// START HERE

// Check if is logged in and then start the script
// fetch https://myanimelist.net/login.php
// Redirected => logged in
fetch("https://myanimelist.net/login.php", {
    method: 'HEAD',
    redirect: 'follow',
    cache: 'no-cache',
    credentials: 'include'
})
.then((data) => {
    start(data.redirected);
}, (error) => {
    console.error(error);
    start(false);
});