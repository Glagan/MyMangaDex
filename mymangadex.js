// INIT

window.MyMangaDexOptions = {colors:{last_open:[]}};

window.MyMangaDex = {
    logged_in: true,
    url: "",
    manga_name: "",
    manga_image: "",
    mangadex_id: 0,
    mal_id: 0,
    mal_url: "",
    last_read: 0,
    last_open: -1,
    chapters: [],
    current_chapter: {
        volume: 0,
        chapter: 0
    },
    more_info: {}
};

function load_options(options_object) {
    return browser.storage.local.get("options")
    .then((res) => {
        if (isEmpty(res)) {
            options_object.colors = {
                last_read: "rgba(95,158,160,0.6)",
                lower_chapter: "darkolivegreen",
                last_open: [
                    "rebeccapurple",
	                "indigo"
                ]
            };
            options_object.hide_lower = true;
            options_object.follow_button = false;
            options_object.last_open_only_higher = true;
            options_object.save_all_opened = false;

            return browser.storage.local.set({
                options: options_object
            });
        } else {
            options_object.colors = {
                last_read: res.options.colors.last_read,
                lower_chapter: res.options.colors.lower_chapter,
                last_open: res.options.colors.last_open,
            };
            options_object.hide_lower = res.options.hide_lower;
            options_object.follow_button = res.options.follow_button;
            options_object.last_open_only_higher = res.options.last_open_only_higher;
            options_object.save_all_opened = res.options.save_all_opened;
        }
    });
}

function append_to_output_and_scroll(output_node, text) {
    output_node.value += "\n" + text;
    output_node.scrollTop = output_node .scrollHeight;
}

function fetch_mal_manga(mal_manga, username, output_node, offset=0, dummy=false) {
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
            if (data.length == 300) {
                if (!dummy) {
                    return fetch_mal_manga(mal_manga, username, output_node, offset+300);
                }
            } else {
                append_to_output_and_scroll(output_node, "Done fetching MyAnimeList manga.");
            }
        }
    }).catch((error) => {
        console.error(error);
    });
}

//table table-striped table-hover table-condensed
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
                fetch_mangadex_manga(mangadex_list, output_node, page+1, max_page);
            } else {
                append_to_output_and_scroll(output_node, "Done fetching MangaDex follow manga.");
            }
        });
    }).catch((error) => {
        console.error(error);
    });
}

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
            let manga_image = /src='\/images\/manga\/(\d+\.[a-zA-Z0-9]{3,4})\??\d*'\swidth='100%'\stitle='Manga image'/.exec(text)[1];

            let manga = {
                mangadex_id: mangadex_list[index],
                mal_id: 0,
                manga_name: manga_name,
                manga_image: manga_image,
                last_open: 0
            };

            // If regex is empty, there is no mal link, can't do anything
            if (mal_url === null) {
                // insert in local storage
                append_to_output_and_scroll(output_node, "-> Set to Chapter 0 (No MyAnimeList entry)");
                return update_last_open(manga).then(() => {
                    index++;
                    if (index < mangadex_list.length) {
                        return update_all_manga_with_mal_data(mal_list, mangadex_list, output_node, index);
                    } else {
                        append_to_output_and_scroll(output_node, "Done. Refresh the page to see the new data.");
                        vNotify.success({
                            title: 'All MyAnimeList data imported.',
                            message: 'You can review manga without a MyAnimeList link in the list.',
                            position: "bottomRight",
                            image: "https://i.imgur.com/oMV2BJt.png",
                            sticky: true
                        });
                    }
                });
            } else {
                // Finish gettint the mal url
                mal_url = mal_url[1];
                // If there is a mal link, add it and save it in local storage
                manga.mal_id = parseInt(/.+\/(\d+)/.exec(mal_url)[1]);

                // Search for data from the mal_list object
                for (var mal_manga of mal_list) {
                    if (mal_manga.manga_id == manga.mal_id) {
                        manga.last_open = parseInt(mal_manga.num_read_chapters);
                        break;
                    }
                }

                // Update last open for the manga
                append_to_output_and_scroll(output_node, "-> Set to Chapter " + manga.last_open);
                return update_last_open(manga).then(() => {
                    index++;
                    if (index < mangadex_list.length) {
                        update_all_manga_with_mal_data(mal_list, mangadex_list, output_node, index);
                    } else {
                        append_to_output_and_scroll(output_node, "Done. Refresh the page to see the new data.");
                        vNotify.success({
                            title: 'All MyAnimeList data imported.',
                            message: 'You can review manga without a MyAnimeList link in the list.',
                            position: "bottomRight",
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

// PAGES

function start() {
    MyMangaDex.url = window.location.href;

    if (MyMangaDex.url.indexOf("org/follows") > -1) {
        console.log("Follow page");
        follow_page();
    } else if (MyMangaDex.url.indexOf("org/manga") > -1) {
        console.log("Manga page");
        manga_page();
    } else if (MyMangaDex.url.indexOf("org/chapter") > -1) {
        console.log("Chapter page");
        chapter_page();
    }
}

function insert_mal_link_form() {
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
            let mal_id = /https:\/\/(?:www\.)?myanimelist\.net\/manga\/(\d+)(?:\/.+)?|(\d+)/.exec(add_mal_link_column_content_edit.value);

            if (mal_id != null) {
                MyMangaDex.mal_id =  parseInt(mal_id[1]) || parseInt(mal_id[2]);

                if (MyMangaDex.mal_id > 0) {
                    fetch_mal_for_manga_data(MyMangaDex)
                    .then(() => {
                        if (MyMangaDex.more_info.exist) {
                            return browser.storage.local.set({
                                [MyMangaDex.mangadex_id]: {
                                    mal_id: MyMangaDex.mal_id,
                                    image: MyMangaDex.manga_image,
                                    last_open: MyMangaDex.last_read
                                }
                            }).then(() => {
                                try {
                                insert_mal_informations(add_mal_link_column_content, MyMangaDex);
                                highlight_last_read_chapter(MyMangaDex.last_read, MyMangaDex.chapters);

                                // Show a notification for updated last opened if there is no MyAnimeList id
                                vNotify.success({
                                    title: "MyAnimeList id set",
                                    text: "Nice.",
                                    position: "bottomRight",
                                    image: "https://i.imgur.com/oMV2BJt.png"
                                });

                                } catch (error) {
                                    console.error(error);
                                }
                            });
                        } else {
                            vNotify.error({
                                title: 'The manga doesn\'t exist.',
                                text: 'Check the id maybe ?',
                                position: 'bottomRight'
                            });
                        }
                    });
                } else {
                    vNotify.error({
                        title: 'Wrong input',
                        text: 'id need to be > 0',
                        position: 'bottomRight'
                    });
                }
            } else {
                vNotify.error({
                    title: 'Wrong input',
                    text: 'You can only an url like https://myanimelist.net/manga/2, https://myanimelist.net/manga/2/Berserk, or an id',
                    position: 'bottomRight'
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
 */
function fetch_mal_for_manga_data(manga) {
    return fetch("https://myanimelist.net/ownlist/manga/" + manga.mal_id + "/edit?hideLayout", {
        method: 'GET',
        redirect: 'follow',
        credentials: 'include'
    }).then((data) => {
        manga.more_info = {};
        manga.more_info.redirected = data.redirected;
        return data.text().then((text) => {
            if (text == "401 Unauthorized") {
                vNotify.error({
                    title: "Not logged in",
                    text: "Log in on MyAnimeList!",
                    position: "bottomRight",
                    image: "https://i.imgur.com/oMV2BJt.png"
                });
                MyMangaDex.logged_in = false;
            } else {
                // CSRF Token
                manga.csrf_token = /'csrf_token'\scontent='(.{40})'/.exec(text)[1];
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
                manga.last_read = /add_manga_num_read_chapters.+value="(\d+)?"/.exec(text);
                manga.last_read = (manga.last_read === null) ? 0 : parseInt(manga.last_read[1]);
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
                manga.more_info.status = (manga.more_info.status === null) ? 1 : parseInt(manga.more_info.status[1]);
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
    }).catch((error) => {
        console.error(error);
    });
}

/**
 * Set the last chapter read on MyAnimeList as the current one on a chapter page, only if it's higher than the current one
 * Send 2 request currently
 *  One to check the last chapter, and also get the required csrf_token on mal
 *  And the second to update the last read chapter
 */
function update_manga_last_read(set_status=1) {
    return fetch_mal_for_manga_data(MyMangaDex).then((data) => {
        if (MyMangaDex.logged_in) {
            if (MyMangaDex.more_info.is_approved) {
                // If the current chapter is higher than the last read one
                // Use parseInt on the current chapter to avoid updating even tough it's the same if this is a sub chapter
                if (MyMangaDex.last_read == "" || parseInt(MyMangaDex.current_chapter.chapter) > MyMangaDex.last_read) {
                    // Status is always set to reading, or we complet it if it's the last chapter, and so we fill the finishh_date
                    var status = (parseInt(MyMangaDex.more_info.total_chapter) > 0 && parseInt(MyMangaDex.current_chapter.chapter) >= parseInt(MyMangaDex.more_info.total_chapter)) ? 2 : set_status;
                    var post_url = "https://myanimelist.net/ownlist/manga/" + MyMangaDex.mal_id + "/edit?hideLayout";

                    // Start reading manga if it's the first chapter
                    if (MyMangaDex.last_read == "") {
                        if (status != 6 && MyMangaDex.more_info.start_date.year == "") {
                            let MyDate = new Date();
                            MyMangaDex.more_info.start_date.year = MyDate.getFullYear();
                            MyMangaDex.more_info.start_date.month = MyDate.getMonth() + 1;
                            MyMangaDex.more_info.start_date.day = MyDate.getDate();
                        }
                        // We have to change the url if we're reading the first chapter
                        post_url = "https://myanimelist.net/ownlist/manga/add?selected_manga_id=" + MyMangaDex.mal_id + "&hideLayout";
                    }

                    // Set the finish date if it's the last chapter and not set
                    if (parseInt(status) == 2 && MyMangaDex.more_info.finish_date.year == "") {
                        let MyDate = new Date();
                        MyMangaDex.more_info.finish_date.year = MyDate.getFullYear();
                        MyMangaDex.more_info.finish_date.month = MyDate.getMonth()+1;
                        MyMangaDex.more_info.finish_date.day = MyDate.getDate();
                    }

                    // Prepare the body
                    var body = "";
                    body += encodeURIComponent("add_manga[comments]") + "=" + encodeURIComponent(MyMangaDex.more_info.comments) + "&";
                    body += encodeURIComponent("add_manga[finish_date][year]") + "=" + MyMangaDex.more_info.finish_date.year + "&";
                    body += encodeURIComponent("add_manga[finish_date][month]") + "=" + MyMangaDex.more_info.finish_date.month + "&";
                    body += encodeURIComponent("add_manga[finish_date][day]") + "=" + MyMangaDex.more_info.finish_date.day + "&";
                    body += encodeURIComponent("add_manga[is_asked_to_discuss]") + "=" + MyMangaDex.more_info.ask_to_discuss + "&";
                    // parseInt the chapter we're going to put, since MyAnimeList doesn't accept sub chapters
                    body += encodeURIComponent("add_manga[num_read_chapters]") + "=" + parseInt(MyMangaDex.current_chapter.chapter) + "&";
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
                    body += encodeURIComponent("add_manga[status]") + "=" + status + "&";
                    body += encodeURIComponent("add_manga[storage_type]") + "=" + MyMangaDex.more_info.storage_type + "&";
                    body += encodeURIComponent("add_manga[tags]") + "=" + encodeURIComponent(MyMangaDex.more_info.tags) + "&";
                    body += encodeURIComponent("csrf_token") + "=" + MyMangaDex.csrf_token + "&";
                    // is_rereading is always set to 0 for the moment
                    body += encodeURIComponent("add_manga[is_rereading]") + "=" + MyMangaDex.is_rereading + "&";
                    body += "last_completed_vol=&";
                    body += "manga_id=" + MyMangaDex.mal_id + "&";
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
                    }).then((data) => {
                        //data.text().then((text) => {
                        //    clear_dom_node(document.getElementById("content"));
                        //    document.getElementById("content").textContent = text;
                            if (status == 6) {
                                vNotify.success({
                                    title: "Manga updated",
                                    text: MyMangaDex.manga_name + " as been put in your endless <b>Plan to read</b> list !",
                                    position: "bottomRight",
                                    image: "https://mangadex.org/images/manga/" + MyMangaDex.manga_image
                                });
                            } else {
                                vNotify.success({
                                    title: "Manga updated",
                                    text: MyMangaDex.manga_name + " as been updated to Chapter " + MyMangaDex.current_chapter.chapter + " out of " + MyMangaDex.more_info.total_chapter,
                                    position: "bottomRight",
                                    image: "https://mangadex.org/images/manga/" + MyMangaDex.manga_image
                                });

                                if (MyMangaDex.last_read == "") {
                                    vNotify.success({
                                        title: "Started manga",
                                        text: "The start date of " + MyMangaDex.manga_name + " was set to today.",
                                        position: "bottomRight",
                                        image: "https://mangadex.org/images/manga/" + MyMangaDex.manga_image
                                    });
                                }

                                if (parseInt(status) == 2) {
                                    vNotify.success({
                                        title: "Manga completed",
                                        text: MyMangaDex.manga_name + " was set as completed.",
                                        position: "bottomRight",
                                        image: "https://mangadex.org/images/manga/" + MyMangaDex.manga_image
                                    });
                                }
                            }
                        //});
                    }, (error) => {
                        console.error("Error updating the manga.");
                    });
                } else {
                    vNotify.info({
                        title: "Not updated",
                        text: "Last read chapter on MyAnimelist is higher or equal to the current chapter, it wasn't updated.",
                        position: "bottomRight",
                        image: "https://mangadex.org/images/manga/" + MyMangaDex.manga_image
                    });
                }
            } else {
                vNotify.info({
                    title: "Not updated",
                    text: "The manga is still pending on MyAnimelist and can't be updated.",
                    position: "bottomRight",
                    image: "https://i.imgur.com/oMV2BJt.png",
                });
            }
        }
    });
}

/**
 * Update the last_open and last_open_sub of a mangadex_id entry
 */
function update_last_open(manga, notification=true) {
    return browser.storage.local.set({
        [manga.mangadex_id]: {
            mal_id: manga.mal_id,
            image: manga.manga_image,
            last_open: manga.last_open
        }
    }).then(() => {
        // Show a notification for updated last opened if there is no MyAnimeList id
        if (manga.mal_id == 0 && notification) {
            vNotify.success({
                title: "Manga updated",
                text: manga.manga_name + " last open Chapter as been updated to " + manga.last_open,
                position: "bottomRight",
                image: "https://mangadex.org/images/manga/" + manga.manga_image
            });
        }
    });
}

function insert_mal_button(parent_node) {
    // Insert on the header
    var mal_button = document.createElement("a");
    mal_button.href = "https://myanimelist.net/ownlist/manga/" + MyMangaDex.mal_id + "/edit";
    mal_button.className = "btn btn-default";
    mal_button.title = "Edit on MyAnimeList";
    mal_button.target = "_blank";
    mal_button.style.float = "right";

    // Add icon and text
    append_text_with_icon(mal_button, "edit", "");
    mal_button.appendChild(document.createTextNode(" Edit on MyAnimeList"));

    parent_node.insertBefore(mal_button, parent_node.firstElementChild);
    // Add a text node with only a space, to separate it on the right
    parent_node.insertBefore(document.createTextNode(" "), parent_node.firstElementChild.nextElementSibling);
}

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

function clear_dom_node(dom_node) {
    while (dom_node.firstChild) {
        dom_node.removeChild(dom_node.firstChild);
    }
}

function insert_mal_informations(content_node, manga) {
    // Delete node before adding anything to it, it's surely old thin anyway
    clear_dom_node(content_node);
    insert_mal_button(content_node);

    // Add some informations on the page
    append_status(manga.more_info.status, content_node);
    content_node.appendChild(document.createElement("br"));
    append_text_with_icon(content_node, "book", "Volume " + manga.more_info.last_volume + " out of " + manga.more_info.total_volume);
    content_node.appendChild(document.createElement("br"));
    append_text_with_icon(content_node, "bookmark", "Chapter " + manga.last_read + " out of " + manga.more_info.total_chapter + " ");
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

// Highlight last read chapter
function highlight_last_read_chapter(chapter_number, chapters) {
    for (var chapter of chapters) {
        // parseInt the chapter, since MyAnimeList doesn't have sub chapters
        // We would have no match if there was an actual sub chapter
        if (parseInt(chapter.chapter) == chapter_number) {
            chapter.parent_node.style.backgroundColor = MyMangaDexOptions.colors.last_read;
        }
    }
}

/**
 * Get the attributes of a node to convert it to a object containing the volume and chapter
 * Volume is set to 0 if null and chapter is set to 1 if it's a Oneshot
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

function create_button(parent_node, title, icon, callback) {
    var new_button = document.createElement("li");
    new_button.setAttribute("is-a-mmd-button", true);
    var new_button_link = document.createElement("a");
    append_text_with_icon(new_button_link, icon, "");
    new_button_link.appendChild(document.createTextNode(" " + title));
    new_button_link.addEventListener("click", callback);
    new_button.appendChild(new_button_link);
    parent_node.appendChild(new_button);
}

function insert_manage_buttons() {
    let manage_container = document.createElement("div");
    manage_container.className = "form-group";
    manage_container.style.display = "none";
    manage_container.style.padding = "15px 0 0 0";
    manage_container.style.textAlign = "center";
    let chapters_node = document.getElementById("chapters");
    chapters_node.style.clear = "both";
    chapters_node.parentElement.insertBefore(manage_container, chapters_node);

    let nav_bar = document.querySelector("ul[role='tablist']");
    var last_active = 0;
    var is_clickable = true;

    // Create import data button
    create_button(nav_bar, "Import (MMD)", "upload", (event) => {
        event.preventDefault();
        if (is_clickable) {
            document.querySelectorAll("li[is-a-mmd-button='true']").forEach((node) => {
                node.className = "";
            });
            event.target.parentElement.classList.toggle("active");

            if (manage_container.style.display == "none" || last_active != 2) {
                last_active = 2;
                manage_container.style.display = "block";
                clear_dom_node(manage_container);

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
                merge_checkbox.value = "Merge"
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
                                    continue;
                                }

                                promises.push(
                                    browser.storage.local.get(mangadex_id+"")
                                    .then((data) => {
                                        let to_insert = {
                                            [mangadex_id]: imported_data[mangadex_id]
                                        };

                                        // If there is an entry we set it to the highest last_open
                                        if (!isEmpty(data)) {
                                            to_insert[mangadex_id].last_open = Math.max(data[mangadex_id].last_open, imported_data[mangadex_id].last_open);
                                        }

                                        // Insert the entry in the local storage
                                        return browser.storage.local.set(to_insert);
                                    })
                                );
                            }
                            Promise.all(promises)
                            .then(() => {
                                is_clickable = true;

                                vNotify.success({
                                    title: "Data imported",
                                    text: "Your data was successfully imported and merged !\nRefresh the page to see the modifications.",
                                    sticky: true,
                                    position: "bottomRight"
                                });
                            });
                        } else {
                            browser.storage.local.set(imported_data)
                            .then(() => {
                                is_clickable = true;

                                vNotify.success({
                                    title: "Data imported",
                                    text: "Your data was successfully imported !\nRefresh the page to see the modifications.",
                                    sticky: true,
                                    position: "bottomRight"
                                });
                            });
                        }
                    } catch (error) {
                        is_clickable = true;

                        vNotify.error({
                            title: "Error importing",
                            text: error,
                            sticky: true,
                            position: "bottomRight"
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
            } else {
                manage_container.style.display = "none";
                event.target.parentElement.classList.toggle("active");
            }
        }
    });

    // Create an import from MyAnimeList button
    create_button(nav_bar, "Import (MAL)", "upload", (event) => {
        event.preventDefault();

        if (is_clickable) {
            document.querySelectorAll("li[is-a-mmd-button='true']").forEach((node) => {
                node.className = "";
            });
            event.target.parentElement.classList.toggle("active");

            if (manage_container.style.display == "none" || last_active != 4) {
                last_active = 4;
                manage_container.style.display = "block";
                clear_dom_node(manage_container);

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
                        fetch_mal_manga(mal_manga, input_mal_username.value, result_container, 0, true)
                        .then(() => {
                            if (mal_manga.length == 0) {
                                is_clickable = true;

                                vNotify.error({
                                    title: 'Can\'t fetch',
                                    text: 'The list of this user isn\'t accessible, maybe you are not logged in on MyAnimeList ?',
                                    position: 'bottomRight',
                                    image: "https://i.imgur.com/oMV2BJt.png"
                                });
                            } else {
                                sub_event.target.parentElement.removeChild(sub_event.target);
                                input_mal_username.parentElement.removeChild(input_mal_username);

                                // Create the textarea which will show the data imported
                                manage_container.appendChild(result_container);

                                // Start fetching the data
                                Promise.all([fetch_mal_manga(mal_manga, input_mal_username.value, result_container, mal_manga.length), fetch_mangadex_manga(mangadex_manga, result_container)])
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
                            title: 'Empty username',
                            text: 'Can\'t import a non-existing user ?!',
                            position: 'bottomRight',
                            image: "https://i.imgur.com/oMV2BJt.png"
                        });
                    }
                });
                manage_container.appendChild(confirm_import_button);
            } else {
                manage_container.style.display = "none";
                event.target.parentElement.classList.toggle("active");
            }
        }
    });

    create_button(nav_bar, "Export (MMD)", "download", (event) => {
        event.preventDefault();

        if (is_clickable) {
            document.querySelectorAll("li[is-a-mmd-button='true']").forEach((node) => {
                node.className = "";
            });
            event.target.parentElement.classList.toggle("active");

            if (manage_container.style.display == "none" || last_active != 1) {
                last_active = 1;
                manage_container.style.display = "block";
                clear_dom_node(manage_container);

                let json_container = document.createElement("textarea");
                json_container.className = "form-control";
                json_container.style.height = "300px";
                json_container.style.overflow = "auto";
                json_container.value = "Loading...";
                json_container.readOnly = true;
                manage_container.appendChild(json_container);

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
                            text: "Your data is in your Clipboard.",
                            position: "bottomRight"
                        });
                    } catch (error) {
                        vNotify.error({
                            title: "Error copying data",
                            text: error,
                            sticky: true,
                            position: "bottomRight"
                        });
                        console.error(error);
                    }
                });

                // Print all data
                browser.storage.local.get(null)
                .then((data) => {
                    json_container.value = JSON.stringify(data);
                    manage_container.appendChild(copy_button);
                });
            } else {
                manage_container.style.display = "none";
                event.target.parentElement.classList.toggle("active");
            }
        }
    });

    // Create clear data button
    create_button(nav_bar, "Clear Data (MMD)", "trash", (event) => {
        event.preventDefault();

        if (is_clickable) {
            document.querySelectorAll("li[is-a-mmd-button='true']").forEach((node) => {
                node.className = "";
            });
            event.target.parentElement.classList.toggle("active");

            if (manage_container.style.display == "none" || last_active != 3) {
                last_active = 3;
                manage_container.style.display = "block";
                clear_dom_node(manage_container);

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
                            text: "Local storage as been cleared.",
                            position: "bottomRight"
                        });
                    });

                    // Hide menu
                    event.target.parentElement.classList.toggle("active");
                    manage_container.style.display = "none";
                });
                manage_container.appendChild(confirm_delete_button);
            } else {
                manage_container.style.display = "none";
                event.target.parentElement.classList.toggle("active");
            }
        }
    });
}

function append_text_with_icon(node, icon, text) {
    let icon_node = document.createElement("span");
    icon_node.className = "fas fa-" + icon + " fa-fw";
    icon_node.setAttribute("aria-hidden", true);

    node.appendChild(icon_node);
    node.appendChild(document.createTextNode(" "));
    node.appendChild(document.createTextNode(text));
}

/**
 * Highlight all last open for each entries
 */
function follow_page() {
    var main_table = document.getElementsByClassName("table table-striped table-hover table-condensed")[0];
    var main_chapter_table = main_table.querySelector("tbody");

    // Keep track of alone old updated chapters
    var series = [];
    var series_local_storage = {};
    var series_count = -1;
    //var color = "rebeccapurple"; // "darkmagenta", "darkorchid"
    // Switch between colors of this array
    var colors = MyMangaDexOptions.colors.last_open;
    var mcolor = colors.length;
    var ccolor = 0;

    // Check each rows of the main table
    for (let element of main_chapter_table.children) {
        // Get volume and chapter number
        let volume_and_chapter = volume_and_chapter_from_node(element.children[2].firstElementChild);

        // If it's a row with a name
        if (element.firstElementChild.childElementCount > 0) {
            // Push a serie entry with information to check if we delete it
            series.push({
                name: element.firstElementChild.firstElementChild.textContent,
                id: parseInt(/\/manga\/(\d+)\//.exec(element.firstElementChild.firstElementChild.href)[1]),
                dom_nodes: [element],
                chapters: []
            });
            series_count++;
        // Else it's a empty name row, so we load the previous row
        } else {
            series[series_count].dom_nodes.push(element);
        }

        // Add the current chapter to the serie entry
        series[series_count].chapters.push(volume_and_chapter);
    }

    function process_serie(serie, manga_info) {
        // Switch colors between rows
        let going_for_color = colors[ccolor];

        // If it's a single chapter
        if (serie.chapters.length == 1) {
            // If it's the last open chapter we paint it rebeccapurple
            if (manga_info.last_open == serie.chapters[0].chapter) {
                serie.dom_nodes[0].style.backgroundColor = going_for_color;
                ccolor = (ccolor+1)%mcolor;
                // If it's a lower than last open we delete it
            } else if (manga_info.last_open > serie.chapters[0].chapter) {
                if (MyMangaDexOptions.hide_lower) {
                    serie.dom_nodes[0].parentElement.removeChild(serie.dom_nodes[0]);
                } else {
                    serie.dom_nodes[0].style.backgroundColor = MyMangaDexOptions.colors.lower_chapter;
                }
            } else {
                // Else it's a higher, we make it so clicking it paint it
                serie.dom_nodes[0].children[2].firstElementChild.addEventListener("auxclick", (event) => {
                    event.target.parentElement.parentElement.style.backgroundColor = going_for_color;
                });
            }
        // Or if it's a list of chapters
        } else {
            let highest_on_list = -1;

            // Check the highest chapter on the list
            for (let chapter of serie.chapters) {
                if (chapter.chapter > highest_on_list) {
                    highest_on_list = chapter.chapter;
                }
            }

            // If all chapters are lower, delete all of them
            if (highest_on_list < manga_info.last_open) {
                for (let node of serie.dom_nodes) {
                    if (MyMangaDexOptions.hide_lower) {
                        node.parentElement.removeChild(node);
                    } else {
                        node.style.backgroundColor = MyMangaDexOptions.colors.lower_chapter;
                    }
                }
            // Else we delete each lower rows except the first one
            } else {
                let highlight_next = false;
                // Reverse order so we can paint the name column once we see the current chapter if there is one
                for (let chapter_index = serie.chapters.length - 1; chapter_index >= 0; chapter_index--) {
                    let chapter = serie.chapters[chapter_index];

                    // Highlight if it's the current last open chapter, and start painting the name column from here
                    if (chapter.chapter == manga_info.last_open && !highlight_next) {
                        serie.dom_nodes[chapter_index].style.backgroundColor = going_for_color;
                        ccolor = (ccolor+1)%mcolor;
                        highlight_next = true;
                        // Delete if it's a lower chapter and not the first line (for the name)
                    } else if (chapter.chapter < manga_info.last_open && chapter_index > 0) {
                        if (MyMangaDexOptions.hide_lower) {
                            serie.dom_nodes[chapter_index].parentElement.removeChild(serie.dom_nodes[chapter_index]);
                        } else {
                            serie.dom_nodes[chapter_index].style.backgroundColor = MyMangaDexOptions.colors.lower_chapter;
                        }
                    // Highlight the name column to show which title is the chapter corresponding to
                    } else if (highlight_next) {
                        serie.dom_nodes[chapter_index].firstElementChild.style.backgroundColor = going_for_color;

                        // If it's the name of the manga when we paint the column, the row has rounded border
                        if (chapter_index == 0) {
                            serie.dom_nodes[chapter_index].firstElementChild.style.borderRadius = "12px 12px 0 0";
                        }
                    // If it's an higher chapter (last possibility), make it purple on click to mark it read without reload
                    } else {
                        // Only work when middle-clicking to open on another tab
                        serie.dom_nodes[chapter_index].children[2].firstElementChild.addEventListener("auxclick", (event) => {
                            event.target.parentElement.parentElement.style.backgroundColor = going_for_color;
                        });
                    }
                }
            }
        }
    }

    // Once we have information on all the chapters in the current page we paint or delete them
    for (let serie of series) {
        if (series_local_storage.hasOwnProperty(serie.id)) {
            process_serie(serie, series_local_storage[serie.id]);
        } else {
            browser.storage.local.get(serie.id+"")
            .then((data) => {
                if (!isEmpty(data)) {
                    series_local_storage[serie.id] = data[serie.id];
                    process_serie(serie, series_local_storage[serie.id]);
                }
            }).catch((error) => {
                console.error(error);
            });
        }
    }

    // Display buttons
    insert_manage_buttons();
}

/**
 * Manga page where there is the description and a list of the last 100 chapters of a manga
 * Optionnal MAL url with a mal icon
 */
function manga_page() {
    MyMangaDex.manga_name = document.getElementsByClassName("panel-title")[0].textContent.trim();
    MyMangaDex.mangadex_id = parseInt(/.+manga\/(\d+)/.exec(MyMangaDex.url)[1]);

    // Chapters list displayed
    var main_table = document.getElementsByClassName("table table-striped table-hover table-condensed")[0];
    var main_chapter_table = main_table.querySelector("tbody");

    // Get the name of each "chapters" in the list
    for (var element of main_chapter_table.children) {
        var name = element.children[1].firstElementChild.textContent;
        var volume_and_chapter = volume_and_chapter_from_node(element.children[1].firstElementChild);

        MyMangaDex.chapters.push({
            name: name,
            parent_node: element,
            volume: volume_and_chapter.volume,
            chapter: volume_and_chapter.chapter
        });
    }

    // Fetch the manga information from the local storage
    browser.storage.local.get(MyMangaDex.mangadex_id+"")
    .then((data) => {
        var has_a_mal_link = true;
        let first_fetch = false;

        // If there is no entry try to find it
        if (isEmpty(data)) {
            first_fetch = true;
            MyMangaDex.last_open = 0;

            // Search the icon, find the link
            MyMangaDex.mal_url = document.querySelector("img[src='/images/misc/mal.png'");
            MyMangaDex.manga_image = document.querySelector("img[title='Manga image']").src; //"https://mangadex.org/images/manga/" + MyMangaDex.mangadex_id + ".jpg";
            MyMangaDex.manga_image = /\/(\d+\.[a-zA-Z]{3,4})\??\d*/.exec(MyMangaDex.manga_image)[1];

            if (MyMangaDex.mal_url !== null) {
                // Finish getting the mal link
                MyMangaDex.mal_url = MyMangaDex.mal_url.nextElementSibling.href;
                // Get MAL id of the manga from the mal link
                MyMangaDex.mal_id = parseInt(/.+\/(\d+)/.exec(MyMangaDex.mal_url)[1]);
            } else {
            // If there is no MAL link, mal id is set to 0
                MyMangaDex.mal_id = 0;
                vNotify.error({
                    title: "No MyAnimeList id found",
                    text: "You can add one using the form.\nLast open chapter will still be saved.",
                    position: "bottomRight",
                    sticky: true
                });
                has_a_mal_link = false;
            }

            // Update it at least once to save the mal id
                update_last_open(MyMangaDex, false);
        } else {
            MyMangaDex.mal_id = data[MyMangaDex.mangadex_id].mal_id;
            MyMangaDex.last_open = data[MyMangaDex.mangadex_id].last_open;
            MyMangaDex.manga_image = data[MyMangaDex.mangadex_id].image;

            if (MyMangaDex.mal_id == 0) {
                has_a_mal_link = false;
            }
        }

        let promises = [];
        // If there is a existing mal link
        if (has_a_mal_link) {
            // Fetch the edit page of the manga
            // Overkill until api come to life
            promises.push(
                fetch_mal_for_manga_data(MyMangaDex).then((data) => {
                    if (MyMangaDex.logged_in) {
                        var parent_node = document.getElementsByClassName("table table-condensed")[0].firstElementChild;
                        var chapters_row = document.createElement("tr");
                        var chapters_column_header = document.createElement("th");
                        chapters_column_header.textContent = "Status:";
                        var chapters_column_content = document.createElement("td");

                        if (MyMangaDex.more_info.is_approved) {
                            // Check if the manga is already in the reading list
                            if (MyMangaDex.more_info.redirected == false) {
                                insert_mal_informations(chapters_column_content, MyMangaDex);
                                highlight_last_read_chapter(MyMangaDex.last_read, MyMangaDex.chapters);

                                if (first_fetch) {
                                    MyMangaDex.last_open = MyMangaDex.last_read;
                                    update_last_open(MyMangaDex, false);
                                }
                            } else {
                                // Add a "Add to reading list" button
                                var chapters_column_content_add = document.createElement("button");
                                chapters_column_content_add.className = "btn btn-default";
                                chapters_column_content_add.textContent = "Start Reading";
                                chapters_column_content_add.addEventListener("click", (event) => {
                                    // Delete the row content, to avoid clicking on any button again and to prepare for new content
                                    chapters_column_content.textContent = "Loading...";

                                    // Put it in the reading list
                                    update_manga_last_read(1)
                                    .then((d) => {
                                        // Display new informations
                                        fetch_mal_for_manga_data(MyMangaDex)
                                        .then((data) => {
                                            insert_mal_informations(chapters_column_content, MyMangaDex);
                                            highlight_last_read_chapter(MyMangaDex.last_read, MyMangaDex.chapters);
                                        });
                                    });
                                });
                                // And a "Plan to read" button
                                var chapters_column_content_ptr = document.createElement("button");
                                chapters_column_content_ptr.className = "btn btn-default";
                                chapters_column_content_ptr.textContent = "Add to Plan to Read list";
                                chapters_column_content_ptr.addEventListener("click", (event) => {
                                    // Delete the row content, to avoid clicking on any button again and to prepare for new content
                                    chapters_column_content.textContent = "Loading...";

                                    // Put it in the plan to read list
                                    update_manga_last_read(6)
                                    .then((d) => {
                                        // Display new informations
                                        fetch_mal_for_manga_data(MyMangaDex)
                                        .then((data) => {
                                            insert_mal_informations(chapters_column_content, MyMangaDex);
                                            highlight_last_read_chapter(MyMangaDex.last_read, MyMangaDex.chapters);
                                        });
                                    });
                                });
                                chapters_column_content.appendChild(chapters_column_content_add);
                                chapters_column_content.appendChild(document.createTextNode(" "));
                                chapters_column_content.appendChild(chapters_column_content_ptr);
                            }
                        } else {
                            let color_span = document.createElement("span");
                            color_span.style.color = "firebrick";
                            color_span.textContent = "The manga is still pending on MyAnimelist and can't be updated";
                            chapters_column_content.appendChild(color_span);
                        }

                        // Append nodes to the table to display
                        chapters_row.appendChild(chapters_column_header);
                        chapters_row.appendChild(chapters_column_content);
                        parent_node.insertBefore(chapters_row, parent_node.lastElementChild);
                    }
                })
            );
        } else {
            insert_mal_link_form();
            console.log("No MAL link avaible, can't do anything, try to add one if it exist.");
        }

        // Highlight last_open in anycase
        if (MyMangaDex.last_open >= 0) {
            for (var chapter of MyMangaDex.chapters) {
                if  (chapter.chapter == MyMangaDex.last_open) {
                    chapter.parent_node.style.backgroundColor = MyMangaDexOptions.colors.last_open[0];
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
    MyMangaDex.mangadex_id = manga_info.manga_id;

    // Fetch current chapter
    for (var chapter of manga_info.other_chapters) {
        if (parseInt(chapter.id) == parseInt(manga_info.chapter_id)) {
            MyMangaDex.current_chapter = volume_and_chapter_from_string(chapter.name);
            break;
        }
    }

    // Update last open to this one
    MyMangaDex.last_open = MyMangaDex.current_chapter.chapter;

    // Get MAL Url from the database
    browser.storage.local.get(MyMangaDex.mangadex_id+"")
    .then((data) => {
        // If there is no entry for mal link
        if (isEmpty(data)) {
            vNotify.info({
                title: "No MyAnimeList id in storage",
                text: "Fetching MangaDex manga page of " + MyMangaDex.manga_name + " to find a MyAnimeList id.",
                position: "bottomRight"
            });

            // Fetch it from mangadex manga page
            fetch("https://mangadex.org/manga/" + MyMangaDex.mangadex_id, {
                method: 'GET',
                cache: 'no-cache'
            }).then((data) => {
                data.text().then((text) => {
                    // Scan the manga page for the mal icon and mal url
                    MyMangaDex.mal_url = /<a.+href='(.+)'>MyAnimeList<\/a>/.exec(text);
                    MyMangaDex.manga_image = /src='\/images\/manga\/(\d+\.[a-zA-Z0-9]{3,4})\??\d*'\swidth='100%'\stitle='Manga image'/.exec(text)[1];

                    // If regex is empty, there is no mal link, can't do anything
                    if (MyMangaDex.mal_url === null) {
                        vNotify.error({
                            title:"No MyAnimeList id found",
                            text:"You can add one using the form.\nLast open chapter is still saved.",
                            position:"bottomRight",
                            sticky:true
                        });

                        // We still update the last open in the local storage and store a 0 as mal_id to avoid checking
                        MyMangaDex.mal_id = 0;
                    } else {
                        // Finish gettint the mal url
                        MyMangaDex.mal_url = MyMangaDex.mal_url[1];
                        // If there is a mal link, add it and save it in local storage
                        MyMangaDex.mal_id = parseInt(/.+\/(\d+)/.exec(MyMangaDex.mal_url)[1]);

                        insert_mal_button(document.getElementById("report_button").parentElement);

                        // And finally add the chapter read
                        update_manga_last_read();
                    }

                    // Update local storage - after, it doesn't really matter
                    update_last_open(MyMangaDex);
                });
            }, (error) => {
                console.error(error);
            });
        } else {
            // Get the mal id from the local storage
            MyMangaDex.mal_id = data[MyMangaDex.mangadex_id].mal_id;
            MyMangaDex.manga_image = data[MyMangaDex.mangadex_id].image;

            // If there is a MAL, we update the last read
            if (MyMangaDex.mal_id > 0) {
                update_manga_last_read();
                insert_mal_button(document.getElementById("report_button").parentElement);
            }

            // We still update last open if there isn't a mal id - Only if it's higher
            if ((MyMangaDex.last_open > data[MyMangaDex.mangadex_id].last_open && MyMangaDexOptions.last_open_only_higher) ||
                !MyMangaDexOptions.last_open_only_higher) {
                update_last_open(MyMangaDex);
            }
        }
    }, (error) => {
        console.error("Error fetching data from local storage.", error);
    });
}

// START HERE

load_options(MyMangaDexOptions).then(start);