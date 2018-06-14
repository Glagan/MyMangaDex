// INIT

window.MyMangaDex = {
    url: "",
    manga_name: "",
    mangadex_id: 0,
    mal_id: 0,
    mal_url: "",
    last_read: 0,
    last_open: 0,
    chapters: [],
    current_chapter: {},
};

// FUNCTIONS

// https://stackoverflow.com/a/34491287/7794671
function isEmpty(obj) {
   for (var x in obj) { return false; }
   return true;
}

function debug_info() {
    console.log(MyMangaDex);
    browser.storage.local.get().then(data => console.log(data));
}

function start(logged_in) {
    // If user isn't logged in, can't do anything
    if (logged_in) {
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
    } else {
        console.error("Not logged in MyAnimeList, or there is a problem accessing the login page.");
    }
}

function is_logged_in() {
    // fetch https://myanimelist.net/login.php
    return fetch("https://myanimelist.net/login.php", {
        method: 'HEAD',
        redirect: 'follow',
        cache: 'no-cache',
        credentials: 'include'
    });
    // Redirected => logged in
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

function follow_page() {
}

/**
 * Manga page where there is the description and a list of the last 100 chapters of a manga
 * Optionnal MAL url with a mal icon
 */
function manga_page() {
    MyMangaDex.manga_name = document.getElementsByClassName("panel-title")[0].textContent.trim();
    MyMangaDex.mangadex_id = /.+manga\/(\d+)/.exec(MyMangaDex.url)[1];

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

                // Add the entry to the local storage, to avoid searching again next time
                browser.storage.local.set({
                    [MyMangaDex.mangadex_id]: MyMangaDex.mal_id
                });
            // If there is no MAL link, you can link one
            } else {
                has_a_mal_link = false;
                insert_mal_link_form();
            }
        } else {
            MyMangaDex.mal_id = data[MyMangaDex.mangadex_id];
        }

        // If there is a existing mal link
        if (has_a_mal_link) {
            // Fetch the edit page of the manga
            // Overkill until api come to life
            fetch("https://myanimelist.net/ownlist/manga/" + MyMangaDex.mal_id + "/edit", {
                method: 'GET',
                redirect: 'follow',
                credentials: 'include'
            }).then((data) => {
                data.text().then((text) => {
                    // Scan the fetch page for the last read chapter
                    MyMangaDex.last_read = /add_manga_num_read_chapters.+value="(\d+)*"/.exec(text);

                    // init for both if and else
                    var parent_node = document.getElementsByClassName("table table-condensed")[0].firstElementChild;
                    var chapters_row = document.createElement("tr");
                    var chapters_column_header = document.createElement("th");
                    chapters_column_header.textContent = "MAL Progress:";
                    var chapters_column_content = document.createElement("td");

                    // Check if the manga is already in the reading list
                    if (MyMangaDex.last_read !== null) {
                        // Finsih processing the last_read
                        MyMangaDex.last_read = MyMangaDex.last_read[1];

                        // Add the current chapter on the page
                        chapters_column_content.textContent = "Chapter " + MyMangaDex.last_read + " ";
                        var chapters_column_content_edit = document.createElement("a");
                        chapters_column_content_edit.className = "btn btn-default";
                        chapters_column_content_edit.href = "https://myanimelist.net/ownlist/manga/" + MyMangaDex.mal_id + "/edit";
                        chapters_column_content_edit.textContent = "Edit in MAL";
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
            }).catch((error) => {
                console.error(error);
            });

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
                    volume: volume_and_chapter[2],
                    chapter: volume_and_chapter[4],
                    sub_chapter: volume_and_chapter[5]
                });
            }
        } else {
            console.log("No MAL link avaible, can't do anything, try to add one if it exist.");
        }

        debug_info();
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

    // Get MAL Url from the database
    //MyMangaDex.mal_url = document.querySelector("img[src='/images/misc/mal.png'");

    // Fetch current chapter
    for (var chapter of manga_info.other_chapters) {
        if (chapter.id == manga_info.chapter_id) {
            var volume_and_chapter = /(Volume\s(\d+)|).*(Chapter\s(\d+))\.*(\d+)*/.exec(chapter.name);
            MyMangaDex.current_chapter = {
                volume: volume_and_chapter[2],
                chapter: volume_and_chapter[4],
                sub_chapter: volume_and_chapter[5]
            };
            break;
        }
    }
    debug_info();
}

// START HERE

// Check if is logged in and then start the script
is_logged_in()
.then((data) => {
    start(data.redirected);
});
/*.catch((error) => {
    console.error(error);
    start(false);
});*/