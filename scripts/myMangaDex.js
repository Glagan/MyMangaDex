
const MD_STATUS = {READING: 1, COMPLETED: 2, ON_HOLD: 3, PLAN_TO_READ: 4, DROPPED: 5, RE_READING: 6};
const NOTIFY = {ERROR: "error", INFO: "info", SUCCESS: "success"};
class MyMangaDex {
    constructor() {
        this.pageUrl = window.location.href;
        this.loggedMyAnimeList = true;
        this.csrf = "";
        this.manga = {
            name: "",
            myAnimeListId: 0,
            lastMangaDexChapter: 0,
            mangaDexId: 0,
            chapterId: 0,
            chapters: [],
            currentChapter: {chapter: 0, volume: 0}
        };
        this.fetched = false;
        this.myAnimeListImage = "https://i.imgur.com/oMV2BJt.png";
    }

    async start() {
        this.options = await loadOptions();

        // Choose page
        if (this.pageUrl.indexOf("org/follows") > -1 ||
            (this.pageUrl.indexOf("org/group") > -1 && (this.pageUrl.indexOf("/chapters/") > -1 || (this.pageUrl.indexOf("/manga/") == -1 && this.pageUrl.indexOf("/comments/") == -1))) ||
            (this.pageUrl.indexOf("org/user") > -1 && (this.pageUrl.indexOf("/chapters/") > -1 || this.pageUrl.indexOf("/manga/") == -1))) {
            this.chaptersListPage();
        } else if (this.pageUrl.indexOf("org/search") > -1 ||
            this.pageUrl.indexOf("org/?page=search") > -1 ||
            this.pageUrl.indexOf("org/?page=titles") > -1 ||
            this.pageUrl.indexOf("org/featured") > -1 ||
            this.pageUrl.indexOf("org/titles") > -1 ||
            this.pageUrl.indexOf("org/list") > -1 ||
            (this.pageUrl.indexOf("org/group") > -1 && this.pageUrl.indexOf("/manga/") > -1) ||
            (this.pageUrl.indexOf("org/user") > -1 && this.pageUrl.indexOf("/manga/") > -1)) {
            this.titlesListPage();
        } else if (this.pageUrl.indexOf("org/title") > -1 || this.pageUrl.indexOf("org/manga") > -1) {
            this.titlePage();
        } else if (this.pageUrl.indexOf("org/chapter") > -1) {
            this.singleChapterPage();
        }
    }

    // START HELP

    async fetchMyAnimeList() {
        let data = await fetch("https://myanimelist.net/ownlist/manga/" + this.manga.myAnimeListId + "/edit?hideLayout", {
            method: "GET",
            redirect: "follow",
            cache: "no-cache",
            credentials: "include"
        });
        let text = await data.text();
        this.fetched = true;
        // init and set if it was redirected - redirected often means not in list or not approved
        this.redirected = data.redirected;

        if (text == "401 Unauthorized") {
            this.notification(NOTIFY.ERROR, "Not logged in", "Log in on MyAnimeList!", this.myAnimeListImage);
            this.loggedMyAnimeList = false;
        } else {
            // CSRF Token
            this.csrf = /'csrf_token'\scontent='(.{40})'/.exec(text)[1];
            // Does it exist ?!
            this.manga.is_approved = !/class="badresult"/.test(text);
            this.manga.exist = !/id="queryTitle"/.test(text);
            // Comments
            this.manga.comments = /add_manga_comments.+>(.*)</.exec(text)[1];
            // Ask to discuss
            this.manga.ask_to_discuss = /add_manga_is_asked_to_discuss.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
            this.manga.ask_to_discuss = (this.manga.ask_to_discuss === null) ? 0 : parseInt(this.manga.ask_to_discuss[1]);
            // Last read chapter
            this.manga.lastMyAnimeListChapter = /add_manga_num_read_chapters.+value="(\d+)?"/.exec(text);
            this.manga.lastMyAnimeListChapter = (this.manga.lastMyAnimeListChapter === null) ? 0 : parseInt(this.manga.lastMyAnimeListChapter[1]);
            // Total times re-read
            this.manga.total_reread = /add_manga_num_read_times.+value="(\d+)?"/.exec(text);
            this.manga.total_reread = (this.manga.total_reread === null) ? 0 : parseInt(this.manga.total_reread[1]);
            // Last read volume
            this.manga.last_volume = /add_manga_num_read_volumes.+value="(\d+)?"/.exec(text);
            this.manga.last_volume = (this.manga.last_volume === null) ? 0 : parseInt(this.manga.last_volume[1]);
            // Retail volumes
            this.manga.retail_volumes = /add_manga_num_retail_volumes.+value="(\d+)?"/.exec(text);
            this.manga.retail_volumes = (this.manga.retail_volumes === null) ? 0 : parseInt(this.manga.retail_volumes[1]);
            // Priority
            this.manga.priority = /add_manga_priority.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
            this.manga.priority = (this.manga.priority === null) ? 0 : parseInt(this.manga.priority[1]);
            // Re-read value
            this.manga.reread_value = /add_manga_reread_value.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
            this.manga.reread_value = (this.manga.reread_value === null) ? "" : this.manga.reread_value[1];
            // Score
            this.manga.score = /add_manga_score.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
            this.manga.score = (this.manga.score === null) ? "" : parseInt(this.manga.score[1]);
            // SNS Post type
            this.manga.sns_post_type = /add_manga_sns_post_type.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
            this.manga.sns_post_type = (this.manga.sns_post_type === null) ? 0 : parseInt(this.manga.sns_post_type[1]);
            // Start date
            this.manga.start_date = {};
            this.manga.start_date.month = (parseInt(/add_manga_start_date_month.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
            this.manga.start_date.day = (parseInt(/add_manga_start_date_day.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
            this.manga.start_date.year = (parseInt(/add_manga_start_date_year.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
            // Finish date
            this.manga.finish_date = {};
            this.manga.finish_date.month = (parseInt(/add_manga_finish_date_month.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
            this.manga.finish_date.day = (parseInt(/add_manga_finish_date_day.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
            this.manga.finish_date.year = (parseInt(/add_manga_finish_date_year.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text)[1]) || "");
            // Status
            this.manga.status = /add_manga_status.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
            this.manga.status = (this.manga.status === null) ? 0 : parseInt(this.manga.status[1]);
            // Storage type
            this.manga.storage_type = /add_manga_storage_type.+\s.+value="(\d+)?"\s*selected="selected"/.exec(text);
            this.manga.storage_type = (this.manga.storage_type === null) ? "" : this.manga.storage_type[1];
            // Tags
            this.manga.tags = /add_manga_tags.+>(.*)*</.exec(text)[1] || "";
            // Is re-reading ?
            this.manga.is_rereading = /name="add_manga\[is_rereading\]"\s*value="\d*"\s*checked="checked"/.test(text);
            // Bonus : total volume and chapter
            this.manga.total_volume = parseInt(/id="totalVol">(.*)?<\//.exec(text)[1]) || 0;
            this.manga.total_chapter = parseInt(/id="totalChap">(.*)?<\//.exec(text)[1]) || 0;
            // Is in the list
            this.manga.in_list = (this.manga.status > 0);
        }
    }

    async updateMyAnimeList(usePepper = true, setStatus = 1) {
        if (this.loggedMyAnimeList) {
            if (this.manga.is_approved) {
                let requestURL = "https://myanimelist.net/ownlist/manga/" + this.manga.myAnimeListId + "/edit?hideLayout";

                let oldStatus = this.manga.status;
                if (usePepper) {
                    // If the current chapter is higher than the last read one
                    // Use Math.floor on the current chapter to avoid updating even tough it's the same if this is a sub chapter
                    if (this.manga.lastMyAnimeListChapter == 0 || (this.manga.currentChapter.chapter >= 0 && this.manga.currentChapter.chapter > this.manga.lastMyAnimeListChapter)) {
                        // Status is always set to reading, or we complet it if it's the last chapter, and so we fill the finish_date
                        this.manga.status = (this.manga.status == 2 || (this.manga.total_chapter > 0 && this.manga.currentChapter.chapter >= this.manga.total_chapter)) ? 2 : setStatus;

                        // Set the start only if it's not already set and if we don't add it to PTR and if it was in ptr or not in the list
                        if (!this.manga.in_list && this.manga.status != 6 && this.manga.start_date.year == "") {
                            let MyDate = new Date();
                            this.manga.start_date.year = MyDate.getFullYear();
                            this.manga.start_date.month = MyDate.getMonth() + 1;
                            this.manga.start_date.day = MyDate.getDate();
                            this.manga.start_today = true;
                        }

                        // Set the finish date if it's the last chapter and not set
                        if (this.manga.status == 2 && this.manga.finish_date.year == "") {
                            let MyDate = new Date();
                            this.manga.finish_date.year = MyDate.getFullYear();
                            this.manga.finish_date.month = MyDate.getMonth() + 1;
                            this.manga.finish_date.day = MyDate.getDate();
                            this.manga.end_today = true;
                        }

                        // Start reading manga if it's the first chapter
                        if (!this.manga.in_list) {
                            // We have to change the url if we're adding the manga to the list, not editing
                            requestURL = "https://myanimelist.net/ownlist/manga/add?selected_manga_id=" + this.manga.myAnimeListId + "&hideLayout";
                            this.manga.in_list = true;
                            this.manga.started = true;
                        }

                        if (this.manga.is_rereading && this.manga.total_chapter > 0 && this.manga.currentChapter.chapter >= this.manga.total_chapter) {
                            this.manga.completed = true;
                            this.manga.is_rereading = false;
                            this.manga.total_reread++;
                        }
                    } else {
                        this.notification(NOTIFY.INFO, "Not updated", "Last read chapter on MyAnimelist is higher or equal to the current chapter and wasn't updated.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                        return;
                    }
                } else {
                    this.manga.status = setStatus;
                }

                // Update
                this.manga.lastMyAnimeListChapter = Math.floor(this.manga.currentChapter.chapter);

                // Prepare the body
                let body = "entry_id=0&";
                body += "manga_id=" + this.manga.myAnimeListId + "&";
                body += encodeURIComponent("add_manga[status]") + "=" + this.manga.status + "&";
                body += encodeURIComponent("add_manga[num_read_volumes]") + "=" + this.manga.currentChapter.volume + "&";
                body += "last_completed_vol=&";
                body += encodeURIComponent("add_manga[num_read_chapters]") + "=" + this.manga.lastMyAnimeListChapter + "&";
                body += encodeURIComponent("add_manga[score]") + "=" + this.manga.score + "&";
                body += encodeURIComponent("add_manga[start_date][day]") + "=" + this.manga.start_date.day + "&";
                body += encodeURIComponent("add_manga[start_date][month]") + "=" + this.manga.start_date.month + "&";
                body += encodeURIComponent("add_manga[start_date][year]") + "=" + this.manga.start_date.year + "&";
                body += encodeURIComponent("add_manga[finish_date][day]") + "=" + this.manga.finish_date.day + "&";
                body += encodeURIComponent("add_manga[finish_date][month]") + "=" + this.manga.finish_date.month + "&";
                body += encodeURIComponent("add_manga[finish_date][year]") + "=" + this.manga.finish_date.year + "&";
                body += encodeURIComponent("add_manga[tags]") + "=" + encodeURIComponent(this.manga.tags) + "&";
                body += encodeURIComponent("add_manga[priority]") + "=" + this.manga.priority + "&";
                body += encodeURIComponent("add_manga[storage_type]") + "=" + this.manga.storage_type + "&";
                body += encodeURIComponent("add_manga[num_retail_volumes]") + "=" + this.manga.retail_volumes + "&";
                body += encodeURIComponent("add_manga[num_read_times]") + "=" + this.manga.total_reread + "&";
                body += encodeURIComponent("add_manga[reread_value]") + "=" + this.manga.reread_value + "&";
                body += encodeURIComponent("add_manga[comments]") + "=" + encodeURIComponent(this.manga.comments) + "&";
                body += encodeURIComponent("add_manga[is_asked_to_discuss]") + "=" + this.manga.ask_to_discuss + "&";
                body += encodeURIComponent("add_manga[sns_post_type]") + "=" + this.manga.sns_post_type + "&";
                if (this.manga.is_rereading) {
                    body += encodeURIComponent("add_manga[is_rereading]") + "=1&";
                }
                body += "submitIt=0&";
                body += encodeURIComponent("csrf_token") + "=" + this.csrf;

                // Send the POST request to update the manga
                await fetch(requestURL, {
                    method: "POST",
                    body: body,
                    redirect: "follow",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
                    }
                });

                if (usePepper) {
                    if (this.manga.status == 6) {
                        this.notification(NOTIFY.SUCCESS, "Added to Plan to Read", this.manga.name + " as been put in your endless Plan to read list !", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                    } else {
                        if ("started" in this.manga) {
                            delete this.manga.started;
                            this.notification(NOTIFY.SUCCESS, "Manga updated", "You started reading " + this.manga.name, "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                            if ("start_today" in this.manga) {
                                delete this.manga.start_today;
                                this.notification(NOTIFY.SUCCESS, "Started manga", "The start date of " + this.manga.name + " was set to today.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                            }
                        } else if (this.manga.lastMyAnimeListChapter > 0 && (this.manga.status != 2 || (this.manga.status == 2 && this.manga.is_rereading))) {
                            this.notification(NOTIFY.SUCCESS, "Manga updated", this.manga.name + " as been updated to chapter " + this.manga.lastMyAnimeListChapter + ((this.manga.total_chapter > 0) ? " out of " + this.manga.total_chapter : ""), "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                        }

                        if (this.manga.status == 2 && !this.manga.is_rereading) {
                            this.notification(NOTIFY.SUCCESS, "Manga updated", this.manga.name + " was set as completed.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                            if ("end_today" in this.manga) {
                                delete this.manga.end_today;
                                this.notification(NOTIFY.SUCCESS, "Manga completed", "The finish date of " + this.manga.name + " was set to today.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                            }
                        }
                    }
                }

                if (this.options.updateMDList && (this.manga.status != oldStatus || this.manga.completed !== undefined)) {
                    switch (this.manga.status) {
                    case 1:
                        await this.updateMangaDexList("manga_follow", MD_STATUS.READING);
                        break;
                    case 2:
                        await this.updateMangaDexList("manga_follow", MD_STATUS.COMPLETED);
                        break;
                    case 3:
                        await this.updateMangaDexList("manga_follow", MD_STATUS.ON_HOLD);
                        break;
                    case 4:
                        await this.updateMangaDexList("manga_follow", MD_STATUS.DROPPED);
                        break;
                    case 6:
                        await this.updateMangaDexList("manga_follow", MD_STATUS.PLAN_TO_READ);
                        break;
                    }
                }
            } else {
                this.notification(NOTIFY.INFO, "Not updated", "The manga is still pending approval on MyAnimelist and can't be updated.", this.myAnimeListImage);
            }
        }
    }

    async quickAddOnMyAnimeList(status) {
        // Delete the row content, to avoid clicking on any button again and to prepare for new content
        this.informationsNode.textContent = "Loading...";

        // Put it in the reading list
        if (!this.fetched) {
            await this.fetchMyAnimeList();
        }
        await this.updateMyAnimeList(true, status);
        this.insertMyAnimeListInformations();
    }

    async updateMangaDexList(func, type) {
        let time = new Date().getTime();
        try {
            await fetch("https://mangadex.org/ajax/actions.ajax.php?function=" + func + "&id=" + this.manga.mangaDexId + "&type=" + type + "&_=" + time, {
                method: "GET",
                redirect: "follow",
                credentials: "include",
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            });
            this.notification(NOTIFY.SUCCESS, "Status on MangaDex updated");
        } catch (error) {
            this.notification(NOTIFY.ERROR, "Error updating MDList");
        }
    }

    getVolumeChapterFromNode(node) {
        let chapter = node.getAttribute("data-chapter");

        // If it's a Oneshot or just attributes are empty, we use a regex on the title
        if (chapter == "") {
            // If the chapter isn't available in the attributes we get it with a good ol' regex
            return this.getVolumeChapterFromString(node.children[1].textContent);
        }

        return {
            volume: parseInt(node.getAttribute("data-volume")) || 0,
            chapter: parseFloat(chapter) || 1
        };
    }

    getVolumeChapterFromString(string) {
        // The ultimate regex ? Don't think so... Volume[1] Chapter[2] + [3]
        let regexResult = /(?:Vol(?:[.]|ume)\s([0-9]+)\s)?(?:Ch(?:[.]|apter)\s)?([0-9]+)([.][0-9]+)?/.exec(string);

        // If it's a Oneshot
        if (regexResult == null) {
            regexResult = [0, 0, 1, undefined];
        }

        return {
            volume: parseInt(regexResult[1]) || 0,
            chapter: parseFloat(regexResult[2] + "" + regexResult[3])
        };
    }

    appendTextWithIcon(node, icon, text) {
        let iconNode = document.createElement("span");
        iconNode.className = "fas fa-" + icon + " fa-fw";
        iconNode.setAttribute("aria-hidden", true);

        node.appendChild(iconNode);
        node.appendChild(document.createTextNode(" " + text));
    }

    tooltip(node, id, data=undefined) {
        // Create tooltip
        let tooltip = document.createElement("div");
        tooltip.className = "mmd-tooltip";
        tooltip.style.width = "100px";
        tooltip.style.left = "-1000px";
        this.tooltipContainer.appendChild(tooltip);
        let tooltipThumb = document.createElement("img");
        tooltip.appendChild(tooltipThumb);

        // Append the chapters if there is
        if (this.options.saveAllOpened && data !== undefined && data.chapters !== undefined && data.chapters.length > 0) {
            tooltipThumb.className = "mmd-tooltip-image"; // Add a border below the image

            let chaptersContainer = document.createElement("div");
            chaptersContainer.className = "mmd-tooltip-content";
            let max = Math.min(5, data.chapters.length);
            for (let i = 0; i < max; i++) {
                this.appendTextWithIcon(chaptersContainer, "eye", data.chapters[i]);
                chaptersContainer.appendChild(document.createElement("br"));
            }
            tooltip.appendChild(chaptersContainer);
        }

        tooltipThumb.addEventListener("load", () => {
            // Set it's final position
            let thumbnailDimensions = tooltipThumb.getBoundingClientRect();
            tooltip.style.width = thumbnailDimensions.width + 2 + "px"; // Final width
        });

        // Events
        let inserted = false;
        node.addEventListener("mouseenter", async () => {
            if (!inserted) {
                tooltipThumb.src = await "https://mangadex.org/images/manga/" + id + ".thumb.jpg";
                inserted = true;
            }
            tooltip.classList.add("mmd-active");
            let parentRect = node.getBoundingClientRect();
            let rowRect = tooltip.getBoundingClientRect();
            tooltip.style.left = parentRect.x - rowRect.width - 5 + "px";
            tooltip.style.top = parentRect.y + (parentRect.height / 2) + window.scrollY - (rowRect.height / 2) + "px";
        });
        // Hide the tooltip
        node.addEventListener("mouseleave", () => {
            tooltip.classList.remove("mmd-active");
            tooltip.style.left = "-1000px";
        });

        // Set it last for the load even to work
    }

    highlightChapters() {
        // Chapters list displayed
        let chaptersList = document.querySelector(".chapter-container").children;

        // Get the name of each "chapters" in the list - ignore first line
        for (let i = 1; i < chaptersList.length; i++) {
            let element = chaptersList[i];
            let chapterVolume = this.getVolumeChapterFromNode(element.firstElementChild.firstElementChild);

            if (this.manga.lastMyAnimeListChapter == parseInt(chapterVolume.chapter)) {
                element.style.backgroundColor = this.options.lastReadColor;
            } else if (this.manga.lastMangaDexChapter == chapterVolume.chapter) {
                element.style.backgroundColor = this.options.lastOpenColors[0];
            // If save all opened is on we highlight them
            } else if (this.options.saveAllOpened) {
                let found = this.manga.chapters.find(value => {
                    return value == chapterVolume.chapter;
                });
                if (found !== undefined) {
                    element.style.backgroundColor = this.options.openedChaptersColor;
                }
            }
        }
    }

    addModalLabel(parent, labelName) {
        let row = document.createElement("div");
        row.className = "row form-group";
        let label = document.createElement("label");
        label.className = "col-sm-3 col-form-label";
        label.textContent = labelName;
        row.appendChild(label);
        let col = document.createElement("div");
        col.className = "col px-0 my-auto";
        row.appendChild(col);
        parent.appendChild(row);
        return col;
    }

    addModalInput(parent, inputType, optionName, value, data = {}) {
        let input = document.createElement(inputType);
        input.className = "form-control";
        input.value = value;
        input.dataset.mal = optionName;
        parent.appendChild(input);
        if (inputType == "input") {
            input.type = data.type;
            if (data.type == "number") {
                input.min = data.min;
                input.max = data.max;
                input.dataset.number = true;
            }
            if (data.type != "checkbox") {
                input.placeholder = data.placeholder;
            } else {
                // Empty and style label
                parent.className = "custom-control custom-checkbox form-check";
                // Input style
                input.id = optionName;
                input.className = "custom-control-input";
                input.checked = value;
                // New label on the right
                let label = document.createElement("label");
                label.className = "custom-control-label";
                label.textContent = data.label;
                label.setAttribute("for", optionName);
                parent.appendChild(label);
            }
        } else if (inputType == "select") {
            if ("number" in data) {
                input.dataset.number = true;
            }
            data.elements.forEach(element => {
                let option = document.createElement("option");
                if ("value" in element) {
                    option.value = element.value;
                } else {
                    option.value = element.text;
                }
                option.textContent = element.text || element.value;
                if (value == option.value) {
                    option.selected = true;
                }
                input.appendChild(option);
            });
        } else if (inputType == "textarea") {
            input.placeholder = data.placeholder;
        }
    }

    addModalRow(parent, labelName, inputType, optionName, value, data={}) {
        let col = this.addModalLabel(parent, labelName);
        if (!("placeholder" in data)) {
            data.placeholder = labelName;
        }
        this.addModalInput(col, inputType, optionName, value, data);
        return col;
    }

    createMyAnimeListModal() {
        // Container
        let modal = document.createElement("div");
        modal.id = "modal-mal";
        modal.className = "modal show-advanced";
        modal.tabIndex = -1;
        modal.role = "dialog";
        let modalDialog = document.createElement("div");
        modalDialog.className = "modal-dialog modal-lg";
        modalDialog.role = "document";
        modal.appendChild(modalDialog);
        let modalContent = document.createElement("div");
        modalContent.className = "modal-content";
        modalDialog.appendChild(modalContent);

        // Header
        let modalHeader = document.createElement("div");
        modalHeader.className = "modal-header";
        modalContent.appendChild(modalHeader);
        let modalTitle = document.createElement("h4");
        modalTitle.className = "modal-title";
        modalTitle.textContent = "MyAnimeList Informations";
        modalHeader.appendChild(modalTitle);
        let closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "close";
        closeButton.dataset.dismiss = "modal";
        closeButton.textContent = "×";
        modalHeader.appendChild(closeButton);

        // Body
        let modalBody = document.createElement("div");
        modalBody.className = "modal-body";
        modalContent.appendChild(modalBody);
        let bodyContainer = document.createElement("div");
        bodyContainer.className = "container";
        modalBody.appendChild(bodyContainer);

        // Add all informations
        let nameCol = this.addModalLabel(bodyContainer, "Title");
        let nameLink = document.createElement("a");
        nameLink.textContent = this.manga.name;
        nameLink.href = "https://myanimelist.net/manga/" + this.manga.myAnimeListId;
        nameCol.appendChild(nameLink);
        this.addModalRow(bodyContainer, "Status", "select", "status", this.manga.status, {number: true, elements: [{value:1,text:"Reading"},{value:2,text:"Completed"},{value:3,text:"On-Hold"},{value:4,text:"Dropped"},{value:6,text:"Plan to Read"}]});
        // START VOLUMES
        let volumesCol = this.addModalRow(bodyContainer, "Volumes Read", "input", "currentChapter.volume", this.manga.last_volume, {type: "number", min: 0, max: 9999});
        volumesCol.classList.add("input-group");
        let volumesOfContainer = document.createElement("div");
        volumesOfContainer.className = "input-group-append";
        let volumesOf = document.createElement("span");
        volumesOf.className = "input-group-text";
        volumesOf.textContent = "of " + this.manga.total_volume;
        volumesOfContainer.appendChild(volumesOf);
        volumesCol.appendChild(volumesOfContainer);
        // END VOLUMES // START CHAPTERS
        let chaptersCol = this.addModalRow(bodyContainer, "Chapters Read", "input", "currentChapter.chapter", this.manga.lastMyAnimeListChapter, {type: "number", min: 0, max: 9999});
        chaptersCol.classList.add("input-group");
        let chaptersOfContainer = document.createElement("div");
        chaptersOfContainer.className = "input-group-append";
        let chaptersOf = document.createElement("span");
        chaptersOf.className = "input-group-text";
        chaptersOf.textContent = "of " + this.manga.total_chapter;
        chaptersOfContainer.appendChild(chaptersOf);
        chaptersCol.appendChild(chaptersOfContainer);
        // END CHAPTERS
        this.addModalRow(bodyContainer, "", "input", "is_rereading", this.manga.is_rereading, {type: "checkbox", label: "Re-reading"});
        this.addModalRow(bodyContainer, "Your score", "select", "score", this.manga.score, {number: true, elements: [{value:"",text:"Select score"},{value:10,text:"(10) Masterpiece"},{value:9,text:"(9) Great"},{value:8,text:"(8) Very Good"},{value:7,text:"(7) Good"},{value:6,text:"(6) Fine"},{value:5,text:"(5) Average"},{value:4,text:"(4) Bad"},{value:3,text:"(3) Very Bad"},{value:2,text:"(2) Horrible"},{value:1,text:"(1) Appalling"}]});
        // DATE START
        let months = [{value:"",text:""},{value:1,text:"Jan"},{value:2,text:"Feb"},{value:3,text:"Mar"},{value:4,text:"Apr"},{value:5,text:"May"},{value:6,text:"June"},{value:7,text:"Jul"},{value:8,text:"Aug"},{value:9,text:"Sep"},{value:10,text:"Oct"},{value:11,text:"Nov"},{value:12,text:"Dec"}];
        let days = [{value:""},{value:1},{value:2},{value:3},{value:4},{value:5},{value:6},{value:7},{value:8},{value:9},{value:10},{value:11},{value:12},{value:13},{value:14},{value:15},{value:16},{value:17},{value:18},{value:19},{value:20},{value:21},{value:22},{value:23},{value:24},{value:25},{value:26},{value:27},{value:28},{value:29},{value:30},{value:31}];
        let years = [{value:""},{value:2018},{value:2017},{value:2016},{value:2015},{value:2014},{value:2013},{value:2012},{value:2011},{value:2010},{value:2009},{value:2008},{value:2007},{value:2006},{value:2005},{value:2004},{value:2003},{value:2002},{value:2001},{value:2000}];
        let dateStart = this.addModalLabel(bodyContainer, "Start date");
        dateStart.className = "col px-0 my-auto form-inline input-group";
        this.addModalInput(dateStart, "select", "start_date.day", this.manga.start_date.day, {number: true, elements: days});
        this.addModalInput(dateStart, "select", "start_date.month", this.manga.start_date.month, {number: true, elements: months});
        this.addModalInput(dateStart, "select", "start_date.year", this.manga.start_date.year, {number: true, elements: years});
        let appendStartToday = document.createElement("span");
        appendStartToday.className = "input-group-append";
        let startToday = document.createElement("button");
        startToday.className = "btn btn-secondary";
        startToday.textContent = "Today";
        startToday.addEventListener("click", () => {
            let today = new Date();
            document.querySelector("[data-mal='start_date.day']").value = today.getDate();
            document.querySelector("[data-mal='start_date.month']").value = today.getMonth();
            document.querySelector("[data-mal='start_date.year']").value = today.getFullYear();
        });
        appendStartToday.appendChild(startToday);
        dateStart.appendChild(appendStartToday);
        let dateEnd = this.addModalLabel(bodyContainer, "Finish date");
        dateEnd.className = "col px-0 my-auto form-inline input-group";
        this.addModalInput(dateEnd, "select", "finish_date.day", this.manga.finish_date.day, {number: true, elements: days});
        this.addModalInput(dateEnd, "select", "finish_date.month", this.manga.finish_date.month, {number: true, elements: months});
        this.addModalInput(dateEnd, "select", "finish_date.year", this.manga.finish_date.year, {number: true, elements: years});
        let appendEndToday = document.createElement("span");
        appendEndToday.className = "input-group-append";
        let endToday = document.createElement("button");
        endToday.className = "btn btn-secondary";
        endToday.textContent = "Today";
        endToday.addEventListener("click", () => {
            let today = new Date();
            document.querySelector("[data-mal='finish_date.day']").value = today.getDate();
            document.querySelector("[data-mal='finish_date.month']").value = today.getMonth();
            document.querySelector("[data-mal='finish_date.year']").value = today.getFullYear();
        });
        appendEndToday.appendChild(endToday);
        dateEnd.appendChild(appendEndToday);
        // DATE END
        this.addModalRow(bodyContainer, "Tags", "textarea", "tags", this.manga.tags);
        this.addModalRow(bodyContainer, "Priority", "select", "priority", this.manga.priority, {number: true, elements: [{value:0,text:"Low"},{value:1,text:"Medium"},{value:2,text:"High"}]});
        this.addModalRow(bodyContainer, "Storage", "select", "storage_type", this.manga.storage_type, {number: true, elements: [{value:"",text:"None"},{value:1,text:"Hard Drive"},{value:6,text:"External HD"},{value:7,text:"NAS"},{value:8,text:"Blu-ray"},{value:2,text:"DVD / CD"},{value:4,text:"Retail Manga"},{value:5,text:"Magazine"}]});
        this.addModalRow(bodyContainer, "How many volumes ?", "input", "retail_volumes", this.manga.retail_volumes, {type: "number", min: 0, max: 999});
        this.addModalRow(bodyContainer, "Total times re-read", "input", "total_reread", this.manga.total_reread, {type: "number", min: 0, max: 999});
        this.addModalRow(bodyContainer, "Re-read value", "select", "reread_value", this.manga.reread_value, {number: true, elements: [{value:"",text:"Select reread value"},{value:1,text:"Very Low"},{value:2,text:"Low"},{value:3,text:"Medium"},{value:4,text:"High"},{value:5,text:"Very High"}]});
        this.addModalRow(bodyContainer, "Comments", "textarea", "comments", this.manga.comments);
        this.addModalRow(bodyContainer, "Ask to discuss?", "select", "ask_to_discuss", this.manga.ask_to_discuss, {number: true, elements: [{value:0,text:"Ask to discuss a chapter after you update the chapter #"},{value:1,text:"Don't ask to discuss"}]});
        this.addModalRow(bodyContainer, "Post to SNS", "select", "sns_post_type", this.manga.sns_post_type, {number: true, elements: [{value:0,text:"Follow default setting"},{value:1,text:"Post with confirmation"},{value:2,text:"Post every time (without confirmation)"},{value:3,text:"Do not post"}]});

        // Footer
        let modalFooter = document.createElement("div");
        modalFooter.className = "modal-footer";
        modalBody.appendChild(modalFooter);
        let modalSave = document.createElement("button");
        modalSave.type = "button";
        modalSave.className = "btn btn-success";
        this.appendTextWithIcon(modalSave, "save", "Save");
        modalSave.addEventListener("click", async () => {
            // Save each values
            let status;
            bodyContainer.querySelectorAll("[data-mal]").forEach(option => {
                let keys = option.dataset.mal.split(".");
                if ("type" in option && option.type == "checkbox") {
                    this.manga[option.dataset.mal] = option.checked;
                } else if (keys.length == 2) {
                    this.manga[keys[0]][keys[1]] = parseInt(option.value) || option.value;
                } else if (keys == "status") {
                    status = (option.value != "") ? parseInt(option.value) : option.value;
                } else {
                    this.manga[option.dataset.mal] = ("number" in option.dataset && option.value != "") ? parseInt(option.value) : option.value;
                }
            });

            await this.updateMyAnimeList(false, status);
            if (this.informationsNode != undefined) {
                this.insertMyAnimeListInformations();
            }
            this.notification(NOTIFY.SUCCESS, "Manga Updated", undefined, this.myAnimeListImage);

            if (CHROME) {
                document.documentElement.setAttribute('onreset', "$('#modal-mal').modal('hide');");
                document.documentElement.dispatchEvent(new CustomEvent('reset'));
                document.documentElement.removeAttribute('onreset');
            } else {
                // Same as for opening, unwrap and wrap jQuery
                window.wrappedJSObject.jQuery("#modal-mal").modal("hide");
                XPCNativeWrapper(window.wrappedJSObject.jQuery);
            }
            this.highlightChapters(); // Highlight last again
        });
        modalFooter.appendChild(modalSave);

        // Append
        document.body.appendChild(modal);
    }

    insertMyAnimeListButton(parentNode = undefined) {
        // Create the modal
        this.createMyAnimeListModal();

        // Insert on the header
        var button = document.createElement("a");
        button.title = "Edit on MyAnimeList";
        button.dataset.toggle = "modal";
        button.dataset.target = "modal-mal";

        // Add icon and text
        if (parentNode === undefined) {
            button.className = "btn btn-secondary float-right mr-1";
            this.appendTextWithIcon(button, "edit", "Edit on MyAnimeList");
        } else {
            button.className = "btn btn-secondary col m-1";
            this.appendTextWithIcon(button, "edit", "");
        }
        // On click we hide or create the modal
        button.addEventListener("click", () => {
            // Update the only values that can change
            document.querySelector("[data-mal='status']").value = this.manga.status;
            document.querySelector("[data-mal='currentChapter.volume']").value = this.manga.last_volume;
            document.querySelector("[data-mal='currentChapter.chapter']").value = this.manga.lastMyAnimeListChapter;
            document.querySelector("[data-mal='is_rereading']").checked = this.manga.is_rereading;
            document.querySelector("[data-mal='start_date.day']").value = this.manga.start_date.day;
            document.querySelector("[data-mal='start_date.month']").value = this.manga.start_date.month;
            document.querySelector("[data-mal='start_date.year']").value = this.manga.start_date.year;
            document.querySelector("[data-mal='finish_date.day']").value = this.manga.finish_date.day;
            document.querySelector("[data-mal='finish_date.month']").value = this.manga.finish_date.month;
            document.querySelector("[data-mal='finish_date.year']").value = this.manga.finish_date.year;
            document.querySelector("[data-mal='total_reread']").value = this.manga.total_reread;

            if (CHROME) { // Nasty
                document.documentElement.setAttribute('onreset', "$('#modal-mal').modal();");
                document.documentElement.dispatchEvent(new CustomEvent('reset'));
                document.documentElement.removeAttribute('onreset');
            } else {
                // We can't access jQuery, use "wrappedJSObject" and wrap it back after
                window.wrappedJSObject.jQuery("#modal-mal").modal();
                XPCNativeWrapper(window.wrappedJSObject.jQuery);
            }
        });

        if (parentNode !== undefined) {
            parentNode.appendChild(button);
        } else {
            this.informationsNode.appendChild(button);
        }
    }

    insertMyAnimeListInformations() {
        // Delete node before adding anything to it, it's surely old data anyway
        clearDomNode(this.informationsNode);
        this.insertMyAnimeListButton();

        // Informations
        if (this.manga.status == 2 && !this.manga.is_rereading) {
            let rereadButton = document.createElement("a");
            rereadButton.title = "Re-read";

            // Add icon and text
            rereadButton.className = "btn btn-secondary float-right mr-1";
            this.appendTextWithIcon(rereadButton, "book-open", "Re-read");

            // On click we hide or create the modal
            rereadButton.addEventListener("click", async () => {
                this.manga.currentChapter.chapter = 0;
                this.manga.lastMyAnimeListChapter = 0;
                this.manga.currentChapter.volume = 0;
                this.manga.last_volume = 0;
                this.manga.is_rereading = 1;

                await this.updateMyAnimeList(false);
                this.insertMyAnimeListInformations();
                this.notification(NOTIFY.SUCCESS, "Re-reading", "You started re-reading " + this.manga.name, "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");

                if (this.options.updateMDList) {
                    await this.updateMangaDexList("manga_follow", MD_STATUS.RE_READING);
                }
            });

            this.informationsNode.appendChild(rereadButton);
        }

        // Status
        let statusList = [{color:"blueviolet", text:"Not on the list"},{color:"cornflowerblue", text:"Reading"},{color:"darkseagreen", text:"Completed"},{color:"orange", text:"On-Hold"},{color:"firebrick", text:"Dropped"}, null, /* 5 doesn't exist */ {color:"violet", text:"Plan to Read"}];
        let status = document.createElement("span");
        status.style.color = statusList[this.manga.status].color;
        status.textContent = statusList[this.manga.status].text;
        this.informationsNode.appendChild(status);
        // Other "useful" informations
        this.informationsNode.appendChild(document.createElement("br"));
        this.appendTextWithIcon(this.informationsNode, "book", "Volume " + this.manga.last_volume + ((parseInt(this.manga.total_volume) > 0) ? " out of " + this.manga.total_volume : ""));
        this.informationsNode.appendChild(document.createElement("br"));
        this.appendTextWithIcon(this.informationsNode, "bookmark", "Chapter " + this.manga.lastMyAnimeListChapter + ((parseInt(this.manga.total_chapter) > 0) ? " out of " + this.manga.total_chapter : "") + ((this.manga.is_rereading) ? " - Re-reading" : ""));
        this.informationsNode.appendChild(document.createElement("br"));
        if (this.manga.start_date.year != "") {
            this.appendTextWithIcon(this.informationsNode, "calendar-alt", "Start date " + this.manga.start_date.year + "/" + this.manga.start_date.month + "/" + this.manga.start_date.day);
            this.informationsNode.appendChild(document.createElement("br"));
        }
        if (this.manga.status == 2 && this.manga.finish_date.year != "") {
            this.appendTextWithIcon(this.informationsNode, "calendar-alt", "Finish date " + this.manga.finish_date.year + "/" + this.manga.finish_date.month + "/" + this.manga.finish_date.day);
            this.informationsNode.appendChild(document.createElement("br"));
        }
        let scoreText;
        if (this.manga.score == "") {
            scoreText = "Not scored yet";
        } else {
            scoreText = "Scored " + this.manga.score + " out of 10";
        }
        this.appendTextWithIcon(this.informationsNode, "star", scoreText);
    }

    async searchMyAnimeListID() {
        let data = await storageGet(this.manga.mangaDexId);
        // If there is no entry for mal link
        if (data === undefined) {
            this.notification(NOTIFY.INFO, "No MyAnimeList ID in storage", "Searching on the manga page of " + this.manga.name + " to find a MyAnimeList id.");

            // Fetch it from mangadex manga page
            try {
                let data = await fetch("https://mangadex.org/title/" + this.manga.mangaDexId, {
                    method: "GET",
                    cache: "no-cache"
                });
                let text = await data.text();
                // Scan the manga page for the mal icon and mal url
                let myAnimeListURL = /<a.+href='(.+)'>MyAnimeList<\/a>/.exec(text);

                // If regex is empty, there is no mal link, can't do anything
                if (myAnimeListURL === null) {
                    this.notification(NOTIFY.ERROR, "No MyAnimeList id found", "You will need to go on the manga page if one is added.\nLast open chapters are still saved.", undefined, true);
                } else {
                    // If there is a mal link, add it and save it in local storage
                    this.manga.myAnimeListId = parseInt(/.+\/(\d+)/.exec(myAnimeListURL[1])[1]);
                }
            } catch (error) {
                this.notification(NOTIFY.ERROR, "Error fetching MangaDex title page");
            }
        } else {
            // Get the mal id from the local storage
            this.manga.myAnimeListId = data.mal;
            this.manga.lastMangaDexChapter = data.last;
            this.manga.chapters = data.chapters || [];
        }

        // When we know everything
        this.myAnimeListChecked = true;
    }

    insertChapter(chapter) {
        if (this.manga.chapters.indexOf(chapter) === -1) {
            if (this.manga.chapters.length == 0) {
                this.manga.chapters.push(chapter);
            } else {
                let i = 0;
                let max = this.manga.chapters.length;
                let higher = true;
                // Chapters are ordered
                while (i < max && higher) {
                    if (this.manga.chapters[i] < chapter) {
                        higher = false;
                    } else {
                        i++;
                    }
                }
                this.manga.chapters.splice(i, 0, chapter);

                // Check the length
                while (this.manga.chapters.length > this.options.maxChapterSaved) {
                    this.manga.chapters.pop();
                }
            }
        }
    }

    notification(type, title, text=undefined, image=undefined, sticky=false) {
        if (this.options.showNotifications || (type == NOTIFY.ERROR && this.options.showErrors)) {
            let data = {title: title};
            if (text !== undefined)     { data.text = text; }
            if (image !== undefined)    { data.image = image; }
            if (sticky)                 { data.sticky = true; }
            vNotify[type].call(null, data);
        }
    }

    paintOrHide(manga, mangaDexId, chapters, colors) {
        let data = undefined;
        let paintColor = this.options.lastOpenColors[colors.current];

        if (manga !== undefined) {
            data = {chapters: manga.chapters};

            // If it's a single chapter
            if (chapters.length == 1) {
                // If it's the last open chapter we paint it
                if (chapters[0].currentChapter.chapter == manga.last && this.options.highlightChapters) {
                    chapters[0].row.style.backgroundColor = paintColor;
                } else if (chapters[0].currentChapter.chapter < manga.last) {
                    if (this.options.hideLowerChapters) {
                        chapters[0].row.parentElement.removeChild(chapters[0].row);
                    } else if (this.options.highlightChapters) {
                        chapters[0].row.style.backgroundColor = this.options.lowerChaptersColor;
                    }
                } else if (this.options.highlightChapters) {
                    chapters[0].row.lastElementChild.firstElementChild.addEventListener("auxclick", () => {
                        chapters[0].row.style.backgroundColor = paintColor;
                    });
                }
            } else {
                let sawLastChapter = false;
                let sawHigher = false;

                // It's a multiple row list - we delete the old ones if needed
                for (let chapter in chapters) {
                    let currentChapter = chapters[chapter].currentChapter.chapter;
                    let currentRow = chapters[chapter].row;

                    // We delete the row if it's lower and one first - or first but all are lower
                    if (currentChapter > manga.last && this.options.highlightChapters) {
                        if (sawLastChapter) {
                            currentRow.firstElementChild.style.backgroundColor = paintColor;
                        }
                        sawHigher = true;
                        currentRow.lastElementChild.firstElementChild.addEventListener("auxclick", () => {
                            currentRow.style.backgroundColor = paintColor;
                        });
                    } else if (currentChapter < manga.last) {
                        if (sawLastChapter && this.options.highlightChapters) {
                            currentRow.firstElementChild.style.backgroundColor = paintColor;
                        } else if (!sawHigher || (sawHigher && chapter < chapters.length-1)) {
                            if (this.options.hideLowerChapters) {
                                currentRow.parentElement.removeChild(currentRow);
                            } else if (this.options.highlightChapters) {
                                currentRow.style.backgroundColor = this.options.lowerChaptersColor;
                            }
                        }
                    } else if (currentChapter == manga.last) {
                        sawLastChapter = true;
                        if (this.options.highlightChapters) {
                            currentRow.style.backgroundColor = paintColor;
                        }
                    }
                }
            }
        } else {
            chapters.forEach(chapter => {
                chapter.row.lastElementChild.firstElementChild.addEventListener("auxclick", () => {
                    chapter.row.style.backgroundColor = paintColor;
                });
            });
        }
        colors.current = (colors.current + 1) % colors.max;

        // Show a tooltip with the thumbnail if the row wasn't deleted
        if (this.options.showTooltips && chapters.length > 0) {
            this.tooltip(chapters[chapters.length-1].row, mangaDexId, data);
        }
    }

    // END HELP / START PAGE

    async chaptersListPage() {
        if (!this.options.highlightChapters && !this.options.hideLowerChapters && !this.options.showTooltips) {
            return;
        } // Abort early if useless

        let chaptersList = document.querySelector(".chapter-container").children;
        // Keep track of the current entries in the follow table
        var chapters = [];
        var colors = {
            current: 0,
            max: this.options.lastOpenColors.length
        };
        // Save each data storage promises to avoid fetching the same data twice - huge speed boost when there is the same serie multiple times
        var localStorage = {};

        // Create a tooltip holder to avoid spamming the document body
        if (this.options.showTooltips) {
            this.tooltipContainer = document.createElement("div");
            this.tooltipContainer.id = "mmd-tooltip";
            document.body.appendChild(this.tooltipContainer);
        }

        // Check each rows of the main table - Stop at 1 because first row is the header
        let lastChapter = chaptersList.length - 1;
        for (let row = lastChapter; row > 0; --row) {
            let chapter = chaptersList[row];

            // Add the row
            chapters.push({
                row: row,
                currentChapter: this.getVolumeChapterFromNode(chapter.lastElementChild.firstElementChild)
            });

            // If it's a row with a name
            if (chapter.firstElementChild.childElementCount > 0) {
                let mangaDexId = parseInt(/\/title\/(\d+)\//.exec(chapter.firstElementChild.firstElementChild.href)[1]);
                let chaptersCopy = JSON.parse(JSON.stringify(chapters));
                chaptersCopy.forEach(element => {
                    element.row = chaptersList[element.row];
                }); // Copy DOM nodes

                // Check if the data for the current serie is already fetched
                if (localStorage[mangaDexId] === undefined) {
                    // Use Promise, to do all rows async
                    storageGet(mangaDexId).then(result => {
                        localStorage[mangaDexId] = result;
                        this.paintOrHide(result, mangaDexId, chaptersCopy, colors);
                    });
                } else {
                    this.paintOrHide(localStorage[mangaDexId], mangaDexId, chaptersCopy, colors);
                }
                chapters = [];
            }
        }
    }

    async titlePage() {
        this.manga.name = document.querySelector("h6[class='card-header']").textContent.trim();
        this.manga.mangaDexId = /.+title\/(\d+)/.exec(this.pageUrl);
        // We always try to find the link, in case it was updated
        let myAnimeListUrl = document.querySelector("img[src='/images/misc/mal.png'");

        if (this.manga.mangaDexId === null) {
            let dropdown = document.getElementById("1");
            if (dropdown !== null) {
                this.manga.mangaDexId = parseInt(dropdown.dataset.mangaId);
            }
        } else {
            this.manga.mangaDexId = parseInt(this.manga.mangaDexId[1]);
        }

        // Fetch the manga information from the local storage
        let data = await storageGet(this.manga.mangaDexId);
        let firstFetch = false;

        // If there is no entry try to find it
        if (data === undefined) {
            firstFetch = true;
            if (myAnimeListUrl !== null) {
                // Finish getting the mal link
                myAnimeListUrl = myAnimeListUrl.nextElementSibling.href;
                // Get MAL id of the manga from the mal link
                this.manga.myAnimeListId = parseInt(/.+\/(\d+)/.exec(myAnimeListUrl)[1]);
            }

            // Update it at least once to save the mal id
            await updateLocalStorage(this.manga, this.options);
        } else {
            this.manga.myAnimeListId = data.mal;
            if (this.manga.myAnimeListId == 0 && myAnimeListUrl !== null) {
                // Finish getting the mal link
                myAnimeListUrl = myAnimeListUrl.nextElementSibling.href;
                // Get MAL id of the manga from the mal link
                this.manga.myAnimeListId = parseInt(/.+\/(\d+)/.exec(myAnimeListUrl)[1]);
                // We set first fetch even though it's not to update local storage with the new id
                firstFetch = true;
            }
            this.manga.lastMangaDexChapter = data.last;
            this.manga.chapters = data.chapters || [];
            this.manga.currentChapter.chapter = this.manga.lastMangaDexChapter;
        }

        // Informations
        let parentNode = document.querySelector(".col-xl-9.col-lg-8.col-md-7");
        let informationsRow = document.createElement("div");
        informationsRow.className = "row m-0 py-1 px-0 border-top";
        parentNode.insertBefore(informationsRow, parentNode.lastElementChild);
        let informationsLabel = document.createElement("div");
        informationsLabel.className = "col-lg-3 col-xl-2 strong";
        informationsLabel.textContent = "Status:";
        informationsRow.appendChild(informationsLabel);
        this.informationsNode = document.createElement("div");
        this.informationsNode.className = "col-lg-9 col-xl-10";
        informationsRow.appendChild(this.informationsNode);

        // If there is a existing mal link
        if (this.manga.myAnimeListId > 0) {
            // Fetch the edit page of the manga
            await this.fetchMyAnimeList();
            if (this.loggedMyAnimeList) {
                if (this.manga.is_approved) {
                    // Check if the manga is already in the reading list
                    if (this.redirected == false) {
                        this.insertMyAnimeListInformations();

                        if (firstFetch) {
                            this.manga.currentChapter.chapter = Math.max(this.manga.lastMyAnimeListChapter, this.manga.lastMangaDexChapter);
                            this.insertChapter(this.manga.currentChapter.chapter);
                            await updateLocalStorage(this.manga, this.options);
                        }
                    } else {
                        // Add a "Add to reading list" button
                        let quickAddReading = document.createElement("button");
                        quickAddReading.className = "btn btn-default";
                        quickAddReading.textContent = "Start Reading";
                        quickAddReading.addEventListener("click", async () => {
                            await this.quickAddOnMyAnimeList(1);
                        });

                        // And a "Plan to read" button
                        let quickAddPTR = document.createElement("button");
                        quickAddPTR.className = "btn btn-default";
                        quickAddPTR.textContent = "Add to Plan to Read list";
                        quickAddPTR.addEventListener("click", async () => {
                            await this.quickAddOnMyAnimeList(6);
                        });
                        this.informationsNode.appendChild(quickAddReading);
                        this.informationsNode.appendChild(document.createTextNode(" "));
                        this.informationsNode.appendChild(quickAddPTR);
                    }
                } else {
                    let pendingMessage = document.createElement("span");
                    pendingMessage.className = "alert-info p-1 rounded";
                    pendingMessage.textContent = "The manga is still pending approval on MyAnimelist and can't be updated";
                    this.informationsNode.appendChild(pendingMessage);
                }
            }
        } else {
            let noIDMessage = document.createElement("span");
            noIDMessage.className = "alert-info p-1 rounded";
            noIDMessage.textContent = "No MyAnimeList found. When one is added, MyMangaDex will find it, don't worry.";
            this.informationsNode.appendChild(noIDMessage);
        }
        this.highlightChapters();
    }

    async singleChapterPage() {
        // We can use the info on the page if we don't change chapter while reading
        let chapter = document.querySelector("meta[property='og:title']").content;
        this.manga.currentChapter = this.getVolumeChapterFromString(chapter);
        this.manga.name = /.*\((.+)\)/.exec(chapter)[1];

        chapter = document.querySelector("meta[property='og:image']").content;
        this.manga.mangaDexId = parseInt(/manga\/(\d+)\.thumb.+/.exec(chapter)[1]);
        this.manga.chapterId = parseInt(document.querySelector("meta[name='app']").dataset.chapterId);

        // Detect which reader we're using - if we're not legacy we have to check when changing chapter
        if (document.getElementsByClassName("card-header").length == 0) {
            var observer = new MutationObserver(async mutationsList => {
                for (var mutation of mutationsList) {
                    if (mutation.type == "attributes") {
                        // If the new id is different - check for the first load
                        let newChapterId = parseInt(document.querySelector(".chapter-title").dataset.chapterId);
                        if (this.manga.chapterId != newChapterId) {
                            // Fetch the chapter info from the MangaDex API
                            this.manga.chapterId = newChapterId;
                            let data = await fetch("https://mangadex.org/api/chapter/" + this.manga.chapterId);
                            data = await data.json();
                            if (data.status !== "delayed") {
                                this.manga.currentChapter.chapter = parseFloat(data.chapter);
                                this.manga.currentChapter.volume = parseInt(data.volume) || 0;

                                // Update the Database and maybe MyAnimeList
                                if (this.myAnimeListChecked && this.manga.myAnimeListId > 0) {
                                    this.updateMyAnimeList();
                                }

                                // We add the current chapter to the list of opened chapters if the option is on
                                if (this.options.saveAllOpened) {
                                    this.insertChapter(this.manga.currentChapter.chapter);
                                }

                                // Update local storage - after, it doesn't really matter
                                await updateLocalStorage(this.manga, this.options);
                            } else {
                                this.notification(NOTIFY.ERROR, "Chapter Delayed", "The chapter was not updated and saved since it is delayed on MangaDex.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                            }
                        }
                    }
                }
            });
            let config = { attributes: true };
            observer.observe(document.querySelector(".chapter-title"), config);
        }

        // Get MAL Url from the database
        let delayed = (document.getElementsByClassName("alert alert-danger text-center m-auto").length > 0);
        await this.searchMyAnimeListID();
        if (!delayed) {
            // We add the current chapter to the list of opened chapters if the option is on
            if (this.options.saveAllOpened) {
                this.insertChapter(this.manga.currentChapter.chapter);
            }

            // Update MyAnimeList
            if (this.manga.myAnimeListId > 0) {
                await this.fetchMyAnimeList();
                if (this.manga.exist && this.manga.is_approved) {
                    await this.updateMyAnimeList();
                    this.insertMyAnimeListButton(document.querySelector(".reader-controls-actions.col-auto.row.no-gutters.p-1").lastElementChild);
                }
            }

            // Update local storage - after, it doesn't really matter
            await updateLocalStorage(this.manga, this.options);
        } else {
            this.notification(NOTIFY.ERROR, "Chapter Delayed", "The chapter was not updated and saved since it is delayed on MangaDex.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
        }
    }

    titlesListPage() {
        let founds = document.querySelectorAll(".row.m-0.border-bottom");
        let max = founds.length;

        // if there is no table the list is not expanded or simple
        if (max == 0 || !this.options.showTooltips) {
            return;
        }

        // Create the tooltip holder
        this.tooltipContainer = document.createElement("div");
        this.tooltipContainer.id = "mmd-tooltip";
        document.body.appendChild(this.tooltipContainer);

        // Create the tooltips
        for (let i = 1; i < max; i++) {
            let id = /title\/(\d+)\/?.*/.exec(founds[i].firstElementChild.firstElementChild.firstElementChild.children[1].href)[1];
            this.tooltip(founds[i], id);
        }
    }

    // END PAGE
}

let myMangaDex = new MyMangaDex();
myMangaDex.start();