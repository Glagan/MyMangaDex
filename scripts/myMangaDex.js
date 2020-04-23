const NOTIFY = { ERROR: "error", INFO: "info", SUCCESS: "success", WARNING: "warning", MESSAGE: "message" };
class MyMangaDex {
	constructor() {
		this.pageUrl = window.location.href;
		this.pageType = "";
		this.loggedMyAnimeList = true;
		this.csrf = "";
		this.manga = {
			name: "",
			myAnimeListId: 0,
			lastMangaDexChapter: -1,
			mangaDexId: 0,
			chapterId: 0,
			chapters: [],
			currentChapter: { chapter: -1, volume: 0 }
		};
		this.fetched = false;
		this.myAnimeListImage = "https://ramune.nikurasu.org/mymangadex/myanimelist.png";
		this.mmdImage = "https://ramune.nikurasu.org/mymangadex/128.png";
		this.mmdCrossedImage = "https://ramune.nikurasu.org/mymangadex/128b.png";
	}

	async start() {
		this.options = await loadOptions();
		let urls = {
			follows: "follows",
			group: "group",
			user: "user",
			search: "search",
			oldSearch: "?page=search",
			oldTitles: "?page=titles",
			featured: "featured",
			titles: "titles",
			genre: "genre",
			list: "list",
			title: "title",
			chapter: "chapter",
			history: "history",
			manga: "manga"
		};
		Object.keys(urls).forEach(key => {
			urls[key] = [domainName, urls[key]].join('/');
		});

		// Choose page
		if ((this.pageUrl.indexOf(urls.follows) > -1 && this.pageUrl.indexOf("/manga/") == -1) ||
			(this.pageUrl.indexOf(urls.group) > -1 && (this.pageUrl.indexOf("/chapters/") > -1 || (this.pageUrl.indexOf("/manga/") == -1 && this.pageUrl.indexOf("/comments") == -1))) ||
			(this.pageUrl.indexOf(urls.user) > -1 && (this.pageUrl.indexOf("/chapters/") > -1 || this.pageUrl.indexOf("/manga/") == -1))) {
			this.pageType = "chapterList";
			this.chapterListPage(this.pageUrl.indexOf(urls.follows) > -1);
		} else if (this.pageUrl.indexOf(urls.search) > -1 ||
			this.pageUrl.indexOf(urls.oldSearch) > -1 ||
			this.pageUrl.indexOf(urls.oldTitles) > -1 ||
			this.pageUrl.indexOf(urls.featured) > -1 ||
			this.pageUrl.indexOf(urls.titles) > -1 ||
			this.pageUrl.indexOf(urls.genre) > -1 ||
			this.pageUrl.indexOf(urls.list) > -1 ||
			(this.pageUrl.indexOf(urls.follows) > -1 && this.pageUrl.indexOf("/manga/") > -1) ||
			(this.pageUrl.indexOf(urls.group) > -1 && this.pageUrl.indexOf("/manga/") > -1) ||
			(this.pageUrl.indexOf(urls.user) > -1 && this.pageUrl.indexOf("/manga/") > -1)) {
			this.pageType = "titlesList";
			this.titlesListPage();
		} else if (this.pageUrl.indexOf(urls.title) > -1 || this.pageUrl.indexOf(urls.manga) > -1) {
			this.pageType = "title";
			this.titlePage();
		} else if (this.pageUrl.indexOf(urls.chapter) > -1 && this.pageUrl.indexOf("/comments") == -1) {
			this.pageType = "singleChapter";
			this.singleChapterPage();
		} else if (this.pageUrl.indexOf(urls.history) > -1) {
			this.pageType = "history";
			this.historyPage();
		}

		// clean up existing nodes
		// const oldDomNodes = document.querySelectorAll("body > .gn-wrapper, #mmd-tooltip, .nav-item.mmdNav");
		// oldDomNodes.forEach(node => node.remove());
		// const oldToolTips = document.querySelectorAll(".row[data-loaded=\"true\"]");
		// oldToolTips.forEach(node => node.removeAttribute("data-loaded"));

		const eyes = document.querySelectorAll(".chapter-row .chapter_mark_read_button, .chapter-row .chapter_mark_unread_button");
		eyes.forEach(eye => eye.addEventListener("click", this.handleEyeClick.bind(this, eye)));
	}

	// START HELP

	async fetchMyAnimeList(manga = undefined) {
		if (manga === undefined) {
			manga = this.manga;

			if (manga.myAnimeListId < 1) {
				this.fetched = false;
				return;
			}
			this.fetched = true;
		} else if (manga.myAnimeListId < 1) {
			return;
		}
		let data = await browser.runtime.sendMessage({
			action: "fetch",
			url: "https://myanimelist.net/ownlist/manga/" + manga.myAnimeListId + "/edit?hideLayout",
			options: {
				method: "GET",
				cache: "no-cache",
				credentials: "include",
				redirect: "follow",
			}
		});
		if (data.status >= 500) {
			this.notification(NOTIFY.ERROR, "MyAnimeList error", "MyAnimeList is unreacheable.");
			// init and set if it was redirected - redirected often means not in list or not approved
		} else if (data.url.indexOf("login.php") > -1) {
			if (CHROME) {
				this.notification(NOTIFY.ERROR, "Not logged in", "Login {{here|https://myanimelist.net/login.php}} on MyAnimeList !", this.myAnimeListImage, true);
			} else {
				this.notification(NOTIFY.ERROR, "Not logged in",
					[
						"Login {{here|https://myanimelist.net/login.php}} on MyAnimeList !\n",
						"If you see this error while logged in, see {{this issue|https://github.com/Glagan/MyMangaDex/issues/5}} on **Github**.",
					].join(""), this.myAnimeListImage, true);
			}
			this.loggedMyAnimeList = false;
		} else {
			// CSRF Token
			this.csrf = /'csrf_token'\scontent='(.{40})'/.exec(data.body)[1];
			manga.lastMAL = Date.now();
			processMyAnimeListResponse(manga, data.body);
		}
		return data;
	}

	// MAL status:  READING: 1, COMPLETED: 2, ON_HOLD: 3, PLAN_TO_READ: 6, DROPPED: 4, RE_READING: 1+is_rereading
	// MD status:   READING: 1, COMPLETED: 2, ON_HOLD: 3, PLAN_TO_READ: 4, DROPPED: 5, RE_READING: 6
	malToMdStatus(status) {
		switch (status) {
			case 1:
				if (this.manga.is_rereading) {
					return "Re-reading";
				}
				return "Reading";
			case 2:
				return "Completed";
			case 3:
				return "On hold";
			case 3:
				return "Dropped";
			case 6:
				return "Plan to read";
		}
		return "";
	}

	async updateManga(usePepper = true, setStatus = 1, force = false) {
		const doMyAnimeList = this.fetched &&
			this.loggedMyAnimeList &&
			this.manga.myAnimeListId > 0 &&
			this.manga.exist;

		// make sure the following calculations still work
		if (!doMyAnimeList) {
			this.manga.lastMyAnimeListChapter = this.manga.lastMangaDexChapter;
			if (this.manga.lastMangaDexChapter == -1) {
				this.manga.started = true;
				this.manga.start_today = true;
			}
		}
		const realChapter = Math.floor(this.manga.currentChapter.chapter);

		if (!force && usePepper) {
			// If the current chapter is higher than the last read one
			// Use Math.floor on the current chapter to avoid updating even tough it's the same if this is a sub chapter
			const isHigher = (realChapter < 0 || realChapter > this.manga.lastMyAnimeListChapter);
			const isHigherDex = (isHigher || (this.manga.lastMangaDexChapter != -1 && this.manga.currentChapter.chapter > this.manga.lastMangaDexChapter));
			if (!isHigherDex && this.options.saveOnlyHigher) {
				if (this.options.confirmChapter) {
					SimpleNotification.info({
						title: "Not updated",
						image: this.getCurrentThumbnail(),
						text: "Last read chapter on MyAnimelist is higher or equal to the current chapter and wasn't updated.\nYou can update it anyway or ignore this notification.",
						buttons: [{
							value: "Update", type: "success",
							onClick: (notification) => {
								notification.close();
								this.updateManga(usePepper, setStatus, true);
							}
						}, {
							value: "Close", type: "error",
							onClick: (notification) => {
								notification.close();
							}
						}]
					}, { position: "bottom-left", closeOnClick: false, duration: 10000 });
				} else {
					this.notification(NOTIFY.INFO, "Not updated", "Last read chapter on MyAnimelist is higher or equal to the current chapter and wasn't updated.", this.getCurrentThumbnail());
				}
				return;
			}

			/*let isNext = (realChapter < 0 ||
				//realChapter == this.manga.lastMyAnimeListChapter ||
				realChapter == this.manga.lastMyAnimeListChapter + 1); // ||
					//(!this.options.saveOnlyHigher && realChapter == this.manga.lastMyAnimeListChapter - 1));*/
			const maybeNext = isHigherDex && realChapter <= Math.floor(this.manga.lastMangaDexChapter)+1;
			if (this.options.saveOnlyNext && this.manga.lastMyAnimeListChapter > 0 && !maybeNext) {
				if (this.options.confirmChapter) {
					SimpleNotification.info({
						title: "Not updated",
						image: this.getCurrentThumbnail(),
						text: "The current chapter is not the next one and it wasn't updated on **MyAnimelist**.\nYou can update it anyway or ignore this notification.",
						buttons: [{
							value: "Update", type: "success",
							onClick: (notification) => {
								notification.close();
								this.updateManga(usePepper, setStatus, true);
							}
						}, {
							value: "Close", type: "error",
							onClick: (notification) => {
								notification.close();
							}
						}]
					}, { position: "bottom-left", closeOnClick: false, sticky: true });
				} else {
					this.notification(NOTIFY.INFO, "Not updated", "The current chapter is not the next one and it wasn't updated on **MyAnimelist**.", this.getCurrentThumbnail());
				}
				return;
			}
		}

		const doUpdate = doMyAnimeList && this.manga.lastMyAnimeListChapter != realChapter;
		const oldStatus = this.manga.status;
		/*if (this.mangaDexScore > 0) {
			this.manga.score = this.mangaDexScore;
		}*/

		// Send the POST request to update the manga if there as a change
		if ((force && doMyAnimeList && this.manga.is_approved) || doUpdate) {
			const { requestURL, body } = buildMyAnimeListBody(usePepper, this.manga, this.csrf, setStatus);
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
		} else if (doMyAnimeList && !this.manga.is_approved) {
			this.notification(NOTIFY.INFO, "Not updated", "The manga is still pending approval on MyAnimelist and can't be updated.", this.myAnimeListImage, true);
		}

		if (usePepper) {
			if (this.manga.status == 6) {
				this.notification(NOTIFY.SUCCESS, "Plan to Read", "**" + this.manga.name + "** has been put in your endless Plan to read list !", this.getCurrentThumbnail());
			} else {
				if ("started" in this.manga) {
					delete this.manga.started;
					if ("start_today" in this.manga) {
						delete this.manga.start_today;
						this.notification(NOTIFY.SUCCESS, "Started manga", "You started reading **" + this.manga.name + "** and it's start date was set to today.", this.getCurrentThumbnail());
					} else {
						this.notification(NOTIFY.SUCCESS, "Manga updated", "You started reading **" + this.manga.name + "** at chapter " + this.manga.lastMyAnimeListChapter, this.getCurrentThumbnail());
					}
				} else if (this.manga.lastMyAnimeListChapter >= 0 &&
					(this.manga.status != 2 || (this.manga.status == 2 && this.manga.is_rereading) || oldStatus == 2)) {
					this.notification(NOTIFY.SUCCESS, "Manga updated", "**" + this.manga.name + "** has been updated to chapter " + this.manga.lastMyAnimeListChapter + ((this.manga.total_chapter > 0) ? " out of " + this.manga.total_chapter : ""), this.getCurrentThumbnail());
				}
				if (oldStatus != 2 && this.manga.status == 2 && !this.manga.is_rereading) {
					if ("end_today" in this.manga) {
						delete this.manga.end_today;
						this.notification(NOTIFY.SUCCESS, "Manga completed", "You completed **" + this.manga.name + "** and it's finish date was set to today.", this.getCurrentThumbnail());
					} else {
						this.notification(NOTIFY.SUCCESS, "Manga updated", "**" + this.manga.name + "** was set as completed.", this.getCurrentThumbnail());
					}
				}
			}
		}
		
		if (this.options.updateMDList &&
			((
				(doMyAnimeList && this.manga.status != oldStatus) ||
				(!doMyAnimeList && this.mangaDexStatus == false)) ||
			this.manga.completed !== undefined ||
				(this.options.updateOnlyInList && (
					!this.mangaDexStatus ||
					(doMyAnimeList && this.mangaDexStatus != this.malToMdStatus(this.manga.status)))
				))) {
			if (doMyAnimeList) {
				this.mangaDexStatus = this.malToMdStatus(this.manga.status);
			} else {
				this.mangaDexStatus = "Reading";
				this.manga.status = 1;
			}
			await this.updateMangaDexList("manga_follow", this.manga.status);
		}
		
		// We add the current chapter to the list of opened chapters if the option is on
		if (this.options.saveAllOpened && this.manga.currentChapter) {
			this.insertChapter(this.manga.currentChapter.chapter);
		}
		// Update local storage - after, it doesn't really matter
		this.manga.lastMangaDexChapter = this.manga.currentChapter.chapter;
		await updateLocalStorage(this.manga, this.options);
		// Update History
		if (this.options.updateHistoryPage && this.history) {
			this.saveTitleInHistory(this.manga);
		}
	}

	async quickAddOnMyAnimeList(status) {
		// Delete the row content, to avoid clicking on any button again and to prepare for new content
		this.informationsNode.textContent = "Loading...";

		// Put it in the reading list
		if (!this.fetched) {
			await this.fetchMyAnimeList();
		}
		await this.updateManga(true, status, true);
		this.insertMyAnimeListInformations();
	}

	async updateMangaDexList(func, type) {
		// Convert MAL status to MD
		if (type == 6) type = 4;
		else if (type == 4) type = 5;
		// Send the request
		let time = new Date().getTime();
		try {
			await browser.runtime.sendMessage({
				action: "fetch",
				url: [domain, "ajax/actions.ajax.php?function=", func, "&id=", this.manga.mangaDexId, "&type=", type, "&_=", time].join(''),
				options: {
					method: "GET",
					redirect: "follow",
					credentials: "include",
					headers: {
						"X-Requested-With": "XMLHttpRequest"
					}
				}
			});
			this.notification(NOTIFY.SUCCESS, undefined, "Status on MangaDex updated");
		} catch (error) {
			this.mangaDexLoggedIn = false;
			this.notification(NOTIFY.ERROR, undefined, "Error updating MDList");
		}
	}

	getVolumeChapterFromNode(node) {
		let chapter = node.dataset.chapter;

		// If it's a Oneshot or just attributes are empty, we use a regex on the title
		if (chapter == "") {
			// If the chapter isn't available in the attributes we get it with a good ol' regex
			return this.getVolumeChapterFromString(node.children[1].textContent);
		}

		chapter = parseFloat(chapter);
		return {
			volume: Math.floor(node.dataset.volume) || 0,
			chapter: (isNaN(chapter) ? 0 : chapter)
		};
	}

	getVolumeChapterFromString(string) {
		// The ultimate regex ? Don't think so... Volume[1] Chapter[2] + [3]
		let regexResult = /(?:Vol(?:\.|ume)\s*)?([0-9]+)?\s*(?:Ch(?:\.|apter)\s*)([0-9]+(?:\.[0-9]+)?)/.exec(string);

		// If it's a Oneshot
		if (regexResult == null) {
			regexResult = [0, 0, 0, undefined];
		}

		let chapter = parseFloat(regexResult[2]);
		return {
			volume: Math.floor(regexResult[1]) || 0,
			chapter: (isNaN(chapter) ? 0 : chapter)
		};
	}

	appendTextWithIcon(node, icon, text) {
		let iconNode = document.createElement("span");
		iconNode.className = "fas fa-" + icon + " fa-fw";
		iconNode.setAttribute("aria-hidden", true);
		node.appendChild(iconNode);
		node.appendChild(document.createTextNode(" " + text));
	}

	updateTooltipPosition(tooltip, row) {
		let rightColumn = (tooltip.dataset.column == "true");
		let rect = {
			tooltip: tooltip.getBoundingClientRect(),
			row: row.getBoundingClientRect()
		};
		if (tooltip.childElementCount == 2) {
			let chapterRect = tooltip.lastElementChild.getBoundingClientRect();
			tooltip.firstElementChild.style.maxHeight = [(window.innerHeight - 10) * (this.options.coverMaxHeight / 100) - chapterRect.height, "px"].join("");
		}
		// Calculate to place on the left of the main column by default
		let left = Math.max(5, rect.row.x - rect.tooltip.width - 5);
		let maxWidth = rect.row.left - 10;
		// Boundaries
		if ((this.options.showFullCover && rect.row.left < 400) || rect.row.left < 100) {
			if (rightColumn) {
				rect.lastChild = row.lastElementChild.getBoundingClientRect();
				maxWidth = (rect.lastChild.left - 10);
			} else {
				rect.firstChild = row.firstElementChild.getBoundingClientRect();
				maxWidth = (document.body.clientWidth - 10);
			}
		}
		tooltip.style.maxWidth = [maxWidth, "px"].join("");
		// X axis
		setTimeout(() => {
			if ((this.options.showFullCover && rect.row.left < 400) || rect.row.left < 100) {
				if (rightColumn) {
					left = (rect.lastChild.left - 5) - Math.min(maxWidth, rect.tooltip.width);
				} else {
					left = rect.firstChild.right + 5;
				}
			}
			tooltip.style.left = [left, "px"].join("");
		}, 1);
		// Y axis
		rect.tooltip = tooltip.getBoundingClientRect();
		let top = window.scrollY + rect.row.y + (rect.row.height / 2) - (rect.tooltip.height / 2);
		if (top <= window.scrollY) {
			top = window.scrollY + 5;
		} else if (top + rect.tooltip.height > window.scrollY + window.innerHeight) {
			top = window.scrollY + window.innerHeight - rect.tooltip.height - 5;
		}
		tooltip.style.top = [top, "px"].join("");
	}

	tooltip(node, id, chapters = [], options = undefined) {
		// Create tooltip
		options = options || {};
		let domId = ["mmd-tooltip-", id].join("");
		let tooltip = document.getElementById(domId);
		let tooltipThumb, spinner;

		if (!tooltip) {
			tooltip = document.createElement("div");
			tooltip.className = "mmd-tooltip loading";
			tooltip.id = domId;
			tooltip.style.left = "-5000px";
			tooltip.style.maxHeight = [(window.innerHeight - 10) * (this.options.coverMaxHeight / 100), "px"].join("");
			spinner = document.createElement("i");
			spinner.className = "fas fa-circle-notch fa-spin";
			tooltip.appendChild(spinner);
			this.tooltipContainer.appendChild(tooltip);
			// Thumbnail
			tooltipThumb = document.createElement("img");
			tooltipThumb.className = "mmd-thumbnail loading";
			tooltipThumb.style.maxHeight = [(window.innerHeight - 10) * (this.options.coverMaxHeight / 100), "px"].join("");
			tooltip.appendChild(tooltipThumb);
		}

		// Append the chapters if there is
		if (this.options.saveAllOpened && chapters.length > 0) {
			tooltip.classList.add("has-chapters"); // Add a border below the image
			let add = false;
			let chaptersContainer = tooltip.querySelector(".mmd-tooltip-content");
			if (!chaptersContainer) {
				chaptersContainer = document.createElement("div");
				chaptersContainer.className = "mmd-tooltip-content";
				tooltip.appendChild(chaptersContainer);
				add = true;
			} else if (options.clear) {
				options.clear = false;
				clearDomNode(chaptersContainer);
				add = true;
			}
			if (add) {
				let max = Math.min(5, chapters.length);
				for (let i = 0; i < max; i++) {
					if (!isNaN(chapters[i])) {
						this.appendTextWithIcon(chaptersContainer, "eye", chapters[i]);
						chaptersContainer.appendChild(document.createElement("br"));
					}
				}
			}
		}

		if (tooltipThumb) {
			tooltipThumb.addEventListener("load", () => {
				delete tooltip.dataset.loading;
				tooltip.dataset.loaded = true;
				// Remove the spinner
				spinner.remove();
				tooltip.classList.remove("loading");
				tooltip.style.left = "-5000px";
				tooltipThumb.classList.remove("loading");
				// Update position
				if (tooltip.classList.contains("active")) {
					setTimeout(() => {
						this.updateTooltipPosition(tooltip, node);
					}, 1);
				}
			});
			let extensions = ['jpg', 'png', 'jpeg', 'gif'];
			tooltipThumb.addEventListener("error", () => {
				if (this.options.showFullCover) {
					let tryNumber = Math.floor(tooltipThumb.dataset.ext);
					if (Math.floor(tooltipThumb.dataset.ext) < extensions.length) {
						tooltipThumb.src = [domain, "images/manga/", id, ".", extensions[tryNumber]].join('');
						tooltipThumb.dataset.ext = tryNumber + 1;
					} else {
						tooltipThumb.src = '';
					}
				}
			});
		} else {
			tooltipThumb = tooltip.querySelector(".mmd-thumbnail");
			spinner = tooltip.querySelector(".fa-spin");
		}
		// Events
		let activateTooltip = (rightColumn) => {
			tooltip.dataset.column = rightColumn;
			tooltip.classList.add("active");
			if (tooltip.dataset.loading) {
				this.updateTooltipPosition(tooltip, node);
				return;
			}
			if (!tooltip.dataset.loaded) {
				tooltip.dataset.loading = true;
				// Will trigger 'load' event
				if (this.options.showFullCover) {
					tooltipThumb.src = [domain, "images/manga/", id, ".jpg"].join('');
					tooltipThumb.dataset.ext = 1;
				} else {
					tooltipThumb.src = [domain, "images/manga/", id, ".thumb.jpg"].join('');
				}
			}
			this.updateTooltipPosition(tooltip, node);
		};
		let disableTooltip = () => {
			tooltip.classList.remove("active");
			tooltip.style.left = "-5000px";
		};
		// First column
		node.firstElementChild.addEventListener("mouseenter", event => {
			event.stopPropagation();
			activateTooltip(false);
		});
		// Second column
		node.lastElementChild.addEventListener("mouseenter", event => {
			event.stopPropagation();
			activateTooltip(true);
		});
		// Row
		node.addEventListener("mouseleave", event => {
			event.stopPropagation();
			disableTooltip();
		});
		node.addEventListener("mouseout", event => {
			event.stopPropagation();
			if (event.target == node) {
				disableTooltip();
			}
		});
	}

	highlightChapters() {
		if (!this.options.highlightChapters) return;
		// Chapters list displayed
		let chaptersList;
		try {
			chaptersList = Array.from(document.querySelector(".chapter-container").children).reverse();
		} catch (e) {
			// probably because we're in reader, no chapters to highlight
			return;
		}

		// Get the name of each "chapters" in the list - ignore first line
		let firstChapter = undefined;
		let foundNext = false;
		let markFullChapter = undefined;
		for (let i = 0; i < chaptersList.length - 1; i++) {
			let element = chaptersList[i];
			let chapterVolume = this.getVolumeChapterFromNode(element.firstElementChild.firstElementChild);
			chapterVolume.chapterFloored = Math.floor(chapterVolume.chapter);

			if (firstChapter === undefined) {
				firstChapter = chapterVolume.chapter;
			}
			// if is current chapter and subchapter matches, proceed as normal
			if (markFullChapter === undefined && chapterVolume.chapter == this.manga.lastMangaDexChapter) {
				markFullChapter = false;
			}
			// if is current chapter but subchapter doesn't match. must be first subchapter but lastMangaDexChapter does not correspond
			// assume this means a sync from MAL and mark all subchapters read
			if (markFullChapter === undefined && chapterVolume.chapterFloored != chapterVolume.chapter && this.manga.lastMangaDexChapter == chapterVolume.chapterFloored) {
				markFullChapter = true;
			}
			// TODO: Also check volume if it saved
			let maybeNext = (chapterVolume.chapterFloored <= Math.floor(this.manga.lastMangaDexChapter) + 1);
			if (((this.manga.lastMyAnimeListChapter == -1 || this.manga.lastMangaDexChapter == -1) && chapterVolume.chapter == firstChapter) ||
				((this.manga.lastMangaDexChapter == -1 || markFullChapter) && this.manga.lastMyAnimeListChapter + 1 == chapterVolume.chapterFloored) ||
				(this.manga.lastMangaDexChapter != -1 && parseFloat(chapterVolume.chapter) > this.manga.lastMangaDexChapter && maybeNext &&
					(foundNext === false || foundNext === chapterVolume.chapter) && !markFullChapter)) {
				element.style.backgroundColor = this.options.nextChapterColor;
				foundNext = parseFloat(chapterVolume.chapter);
			} else if (this.manga.lastMyAnimeListChapter == chapterVolume.chapterFloored &&
				(this.manga.lastMangaDexChapter == -1 || chapterVolume.chapter == this.manga.lastMangaDexChapter)) {
				element.style.backgroundColor = this.options.lastReadColor;
			} else if (this.manga.lastMangaDexChapter == chapterVolume.chapter ||
				(markFullChapter && this.manga.lastMangaDexChapter == chapterVolume.chapterFloored)) {
				element.style.backgroundColor = this.options.lastOpenColors[0];
				// If save all opened is on we highlight them
			} else if (this.options.saveAllOpened) {
				let found = this.manga.chapters.find(value => {
					return value == chapterVolume.chapter;
				});
				if (found !== undefined) {
					element.style.backgroundColor = this.options.openedChaptersColor;
				} else {
					element.style.backgroundColor = ''; // clear previous highlights
				}
			} else {
				element.style.backgroundColor = ''; // clear previous highlights
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

	addModalRow(parent, labelName, inputType, optionName, value, data = {}) {
		let col = this.addModalLabel(parent, labelName);
		if (!("placeholder" in data)) {
			data.placeholder = labelName;
		}
		this.addModalInput(col, inputType, optionName, value, data);
		return col;
	}

	modalControl(open) {
		if (CHROME) {
			document.documentElement.setAttribute("onreset", "$('#modal-mal').modal(" + ((open) ? "" : "'hide'") + ");");
			document.documentElement.dispatchEvent(new CustomEvent("reset"));
			document.documentElement.removeAttribute("onreset");
		} else {
			// Same as for opening, unwrap and wrap jQuery
			if (open) {
				window.wrappedJSObject.jQuery("#modal-mal").modal();
			} else {
				window.wrappedJSObject.jQuery("#modal-mal").modal("hide");
			}
			XPCNativeWrapper(window.wrappedJSObject.jQuery);
		}
	}

	createMyAnimeListModal() {
		let modal = document.querySelector("#modal-mal");
		if (modal) modal.remove();
		// Container
		modal = document.createElement("div");
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
		nameCol.classList.add("mb-0");
		let nameLink = document.createElement("a");
		nameLink.textContent = this.manga.name;
		nameLink.href = "https://myanimelist.net/manga/" + this.manga.myAnimeListId;
		nameCol.appendChild(nameLink);
		let deleteEntry = document.createElement("button");
		deleteEntry.className = "btn btn-danger";
		deleteEntry.textContent = "Delete on MyAnimeList";
		deleteEntry.addEventListener("click", async () => {
			await browser.runtime.sendMessage({
				action: "fetch",
				url: "https://myanimelist.net/ownlist/manga/" + this.manga.myAnimeListId + "/delete",
				options: {
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded"
					},
					body: "csrf_token=" + this.csrf
				}
			});
			if (this.informationsNode != undefined) {
				clearDomNode(this.informationsNode);
				// Add a "Add to reading list" button
				let quickAddReading = this.createQuickButton("Start Reading", 1);
				// And a "Plan to read" button
				let quickAddPTR = this.createQuickButton("Add to Plan to Read list", 6);
				// Append
				this.informationsNode.appendChild(quickAddReading);
				this.informationsNode.appendChild(document.createTextNode(" "));
				this.informationsNode.appendChild(quickAddPTR);
			}
			this.notification(NOTIFY.SUCCESS, "Deleted", "The manga has been deleted on **MyAnimeList**.", this.myAnimeListImage);
			this.modalControl(false);
			this.highlightChapters();
		});
		let deleteCol = this.addModalLabel(bodyContainer, "");
		deleteCol.appendChild(deleteEntry);
		this.addModalRow(bodyContainer, "Status", "select", "status", this.manga.status, { number: true, elements: [{ value: 1, text: "Reading" }, { value: 2, text: "Completed" }, { value: 3, text: "On-Hold" }, { value: 4, text: "Dropped" }, { value: 6, text: "Plan to Read" }] });
		// START VOLUMES
		let volumesCol = this.addModalRow(bodyContainer, "Volumes Read", "input", "currentChapter.volume", this.manga.last_volume, { type: "number", min: 0, max: 9999 });
		volumesCol.classList.add("input-group");
		let volumesOfContainer = document.createElement("div");
		volumesOfContainer.className = "input-group-append";
		let volumesOf = document.createElement("span");
		volumesOf.className = "input-group-text";
		volumesOf.textContent = "of " + this.manga.total_volume;
		volumesOfContainer.appendChild(volumesOf);
		volumesCol.appendChild(volumesOfContainer);
		// END VOLUMES // START CHAPTERS
		let chaptersCol = this.addModalRow(bodyContainer, "Chapters Read", "input", "currentChapter.chapter", this.manga.lastMyAnimeListChapter, { type: "number", min: 0, max: 9999 });
		chaptersCol.classList.add("input-group");
		let chaptersOfContainer = document.createElement("div");
		chaptersOfContainer.className = "input-group-append";
		let chaptersOf = document.createElement("span");
		chaptersOf.className = "input-group-text";
		chaptersOf.textContent = "of " + this.manga.total_chapter;
		chaptersOfContainer.appendChild(chaptersOf);
		chaptersCol.appendChild(chaptersOfContainer);
		// END CHAPTERS
		this.addModalRow(bodyContainer, "", "input", "is_rereading", this.manga.is_rereading, { type: "checkbox", label: "Re-reading" });
		this.addModalRow(bodyContainer, "Your score", "select", "score", this.manga.score, { number: true, elements: [{ value: "", text: "Select score" }, { value: 10, text: "(10) Masterpiece" }, { value: 9, text: "(9) Great" }, { value: 8, text: "(8) Very Good" }, { value: 7, text: "(7) Good" }, { value: 6, text: "(6) Fine" }, { value: 5, text: "(5) Average" }, { value: 4, text: "(4) Bad" }, { value: 3, text: "(3) Very Bad" }, { value: 2, text: "(2) Horrible" }, { value: 1, text: "(1) Appalling" }] });
		// DATE START
		let months = [{ value: "", text: "" }, { value: 1, text: "Jan" }, { value: 2, text: "Feb" }, { value: 3, text: "Mar" }, { value: 4, text: "Apr" }, { value: 5, text: "May" }, { value: 6, text: "June" }, { value: 7, text: "Jul" }, { value: 8, text: "Aug" }, { value: 9, text: "Sep" }, { value: 10, text: "Oct" }, { value: 11, text: "Nov" }, { value: 12, text: "Dec" }];
		let days = [{ value: "" }, { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }, { value: 10 }, { value: 11 }, { value: 12 }, { value: 13 }, { value: 14 }, { value: 15 }, { value: 16 }, { value: 17 }, { value: 18 }, { value: 19 }, { value: 20 }, { value: 21 }, { value: 22 }, { value: 23 }, { value: 24 }, { value: 25 }, { value: 26 }, { value: 27 }, { value: 28 }, { value: 29 }, { value: 30 }, { value: 31 }];
		let years = [{ value: "" }, { value: 2020 }, { value: 2019 }, { value: 2018 }, { value: 2017 }, { value: 2016 }, { value: 2015 }, { value: 2014 }, { value: 2013 }, { value: 2012 }, { value: 2011 }, { value: 2010 }, { value: 2009 }, { value: 2008 }, { value: 2007 }, { value: 2006 }, { value: 2005 }, { value: 2004 }, { value: 2003 }, { value: 2002 }, { value: 2001 }, { value: 2000 }];
		let dateStart = this.addModalLabel(bodyContainer, "Start date");
		dateStart.className = "col px-0 my-auto form-inline input-group";
		this.addModalInput(dateStart, "select", "start_date.day", this.manga.start_date.day, { number: true, elements: days });
		this.addModalInput(dateStart, "select", "start_date.month", this.manga.start_date.month, { number: true, elements: months });
		this.addModalInput(dateStart, "select", "start_date.year", this.manga.start_date.year, { number: true, elements: years });
		let appendStartToday = document.createElement("span");
		appendStartToday.className = "input-group-append";
		let startToday = document.createElement("button");
		startToday.className = "btn btn-secondary";
		startToday.textContent = "Today";
		startToday.addEventListener("click", () => {
			let today = new Date();
			document.querySelector("[data-mal='start_date.day']").value = today.getDate();
			document.querySelector("[data-mal='start_date.month']").value = today.getMonth() + 1;
			document.querySelector("[data-mal='start_date.year']").value = today.getFullYear();
		});
		appendStartToday.appendChild(startToday);
		dateStart.appendChild(appendStartToday);
		let dateEnd = this.addModalLabel(bodyContainer, "Finish date");
		dateEnd.className = "col px-0 my-auto form-inline input-group";
		this.addModalInput(dateEnd, "select", "finish_date.day", this.manga.finish_date.day, { number: true, elements: days });
		this.addModalInput(dateEnd, "select", "finish_date.month", this.manga.finish_date.month, { number: true, elements: months });
		this.addModalInput(dateEnd, "select", "finish_date.year", this.manga.finish_date.year, { number: true, elements: years });
		let appendEndToday = document.createElement("span");
		appendEndToday.className = "input-group-append";
		let endToday = document.createElement("button");
		endToday.className = "btn btn-secondary";
		endToday.textContent = "Today";
		endToday.addEventListener("click", () => {
			let today = new Date();
			document.querySelector("[data-mal='finish_date.day']").value = today.getDate();
			document.querySelector("[data-mal='finish_date.month']").value = today.getMonth() + 1;
			document.querySelector("[data-mal='finish_date.year']").value = today.getFullYear();
		});
		appendEndToday.appendChild(endToday);
		dateEnd.appendChild(appendEndToday);
		// DATE END
		this.addModalRow(bodyContainer, "Tags", "textarea", "tags", this.manga.tags);
		this.addModalRow(bodyContainer, "Priority", "select", "priority", this.manga.priority, { number: true, elements: [{ value: 0, text: "Low" }, { value: 1, text: "Medium" }, { value: 2, text: "High" }] });
		this.addModalRow(bodyContainer, "Storage", "select", "storage_type", this.manga.storage_type, { number: true, elements: [{ value: "", text: "None" }, { value: 1, text: "Hard Drive" }, { value: 6, text: "External HD" }, { value: 7, text: "NAS" }, { value: 8, text: "Blu-ray" }, { value: 2, text: "DVD / CD" }, { value: 4, text: "Retail Manga" }, { value: 5, text: "Magazine" }] });
		this.addModalRow(bodyContainer, "How many volumes ?", "input", "retail_volumes", this.manga.retail_volumes, { type: "number", min: 0, max: 999 });
		this.addModalRow(bodyContainer, "Total times re-read", "input", "total_reread", this.manga.total_reread, { type: "number", min: 0, max: 999 });
		this.addModalRow(bodyContainer, "Re-read value", "select", "reread_value", this.manga.reread_value, { number: true, elements: [{ value: "", text: "Select reread value" }, { value: 1, text: "Very Low" }, { value: 2, text: "Low" }, { value: 3, text: "Medium" }, { value: 4, text: "High" }, { value: 5, text: "Very High" }] });
		this.addModalRow(bodyContainer, "Comments", "textarea", "comments", this.manga.comments);
		this.addModalRow(bodyContainer, "Ask to discuss?", "select", "ask_to_discuss", this.manga.ask_to_discuss, { number: true, elements: [{ value: 0, text: "Ask to discuss a chapter after you update the chapter #" }, { value: 1, text: "Don't ask to discuss" }] });
		this.addModalRow(bodyContainer, "Post to SNS", "select", "sns_post_type", this.manga.sns_post_type, { number: true, elements: [{ value: 0, text: "Follow default setting" }, { value: 1, text: "Post with confirmation" }, { value: 2, text: "Post every time (without confirmation)" }, { value: 3, text: "Do not post" }] });

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
					this.manga[keys[0]][keys[1]] = Math.floor(option.value) || option.value;
				} else if (keys == "status") {
					status = (option.value != "") ? Math.floor(option.value) : option.value;
				} else {
					this.manga[option.dataset.mal] = ("number" in option.dataset && option.value != "") ? Math.floor(option.value) : option.value;
				}
			});

			await this.updateManga(false, status, true);
			if (this.informationsNode != undefined) {
				this.insertMyAnimeListInformations();
			}
			this.notification(NOTIFY.SUCCESS, "Manga Updated", undefined, this.myAnimeListImage);
			this.modalControl(false);
			this.highlightChapters(); // Highlight last again
		});
		modalFooter.appendChild(modalSave);

		// Append
		document.body.appendChild(modal);
	}

	insertMyAnimeListButton(parentNode = undefined, rnew = true) {
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
			button.className = "btn btn-secondary" + (rnew ? " col m-1" : "");
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

			this.modalControl(true);
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

				await this.updateManga(false);
				this.insertMyAnimeListInformations();
				this.notification(NOTIFY.SUCCESS, "Re-reading", "You started re-reading **" + this.manga.name + "**", this.getCurrentThumbnail());
				// Update MangaDex to *Reading*
				if (this.options.updateMDList) {
					this.mangaDexStatus = "Re-reading";
					await this.updateMangaDexList("manga_follow", 6);
				}
			});

			this.informationsNode.appendChild(rereadButton);
		}

		// Status
		let statusList = [{ color: "blueviolet", text: "Not on the list" }, { color: "cornflowerblue", text: "Reading" }, { color: "darkseagreen", text: "Completed" }, { color: "orange", text: "On-Hold" }, { color: "firebrick", text: "Dropped" }, null, /* 5 doesn't exist */ { color: "violet", text: "Plan to Read" }];
		let status = document.createElement("span");
		status.style.color = statusList[this.manga.status].color;
		status.textContent = statusList[this.manga.status].text;
		this.informationsNode.appendChild(status);
		// Other "useful" informations
		this.informationsNode.appendChild(document.createElement("br"));
		this.appendTextWithIcon(this.informationsNode, "book", "Volume " + this.manga.last_volume + ((Math.floor(this.manga.total_volume) > 0) ? " out of " + this.manga.total_volume : ""));
		this.informationsNode.appendChild(document.createElement("br"));
		this.appendTextWithIcon(this.informationsNode, "bookmark", "Chapter " + this.manga.lastMyAnimeListChapter + ((Math.floor(this.manga.total_chapter) > 0) ? " out of " + this.manga.total_chapter : "") + ((this.manga.is_rereading) ? " - Re-reading" : ""));
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

	async getTitleInfos() {
		let data = await storageGet(this.manga.mangaDexId);
		let outdatedMyAnimeList = false;
		// If there is no entry for mal link
		let notificationText = ["Searching on the title page of **", this.manga.name, "** to find a MyAnimeList id."].join('');
		if (data === undefined) {
			this.notification(NOTIFY.INFO, "Searching MAL ID", notificationText, this.mmdImage);
		} else {
			// Get the mal id from the local storage
			this.manga.myAnimeListId = data.mal;
			this.manga.lastMangaDexChapter = data.last;
			this.manga.chapters = data.chapters || [];
			this.manga.lastTitle = data.lastTitle;
			// Check if there is an updated MAL id if lastTitle is older than 3 days (259200000ms)
			if (this.manga.myAnimeListId == 0 &&
				(!data.lastTitle || (Date.now() - data.lastTitle) >= 259200000)) {
				this.notification(NOTIFY.INFO, "Searching MAL ID", notificationText, this.mmdImage);
				outdatedMyAnimeList = true;
			}
		}
		if (data === undefined || this.options.updateOnlyInList || outdatedMyAnimeList) {
			// Fetch it from mangadex manga page
			await this.fetchTitleInfos(outdatedMyAnimeList);
		}
	}

	async fetchTitleInfos(outdatedMyAnimeList, notifications = true) {
		let data = await browser.runtime.sendMessage({
			action: "fetch",
			url: [domain, "title/", this.manga.mangaDexId].join(''),
			options: {
				method: "GET",
				cache: "no-cache"
			}
		});
		this.manga.lastTitle = Date.now();
		// Scan the manga page for the mal icon and mal url
		let myAnimeListURL = /<a.+href='(.+)'>MyAnimeList<\/a>/.exec(data.body);
		// If regex is empty, there is no mal link, can't do anything
		if (data == undefined && myAnimeListURL == null && notifications) {
			this.notification(NOTIFY.ERROR, "No MyAnimeList ID", "Last open chapters are still saved.", this.mmdCrossedImage, true);
		}
		if (myAnimeListURL != undefined) {
			// If there is a mal link, add it and save it in local storage
			this.manga.myAnimeListId = Math.floor(/.+\/(\d+)/.exec(myAnimeListURL[1])[1]);
		}
		if (outdatedMyAnimeList || myAnimeListURL != undefined) {
			await updateLocalStorage(this.manga, this.options);
		}
		// Get the manga status on MangaDex
		this.mangaDexLoggedIn = !/You need to log in to use this function\./.exec(data.body);
		this.mangaDexStatus = false;
		this.mangaDexScore = 0;
		if (this.mangaDexLoggedIn) {
			let status = /disabled dropdown-item manga_follow_button.+?<\/span>\s*(.+?)<\/a>/.exec(data.body);
			if (status) {
				this.mangaDexStatus = status[1].trim();
			}
			let scoreRegex = /class='\s*disabled\s*dropdown-item\s*manga_rating_button'\s*id='(\d+)'/.exec(data.body);
			if (scoreRegex) {
				this.mangaDexScore = scoreRegex[1];
			}
		}
	}

	insertChapter(chapter, manga = undefined) {
		if (manga === undefined) {
			manga = this.manga;
		}
		if (manga.chapters.indexOf(chapter) === -1) {
			if (manga.chapters.length == 0) {
				manga.chapters.push(chapter);
			} else {
				let i = 0;
				let max = manga.chapters.length;
				let higher = true;
				// Chapters are ordered
				while (i < max && higher) {
					if (manga.chapters[i] < chapter) {
						higher = false;
					} else {
						i++;
					}
				}
				manga.chapters.splice(i, 0, chapter);

				// Check the length
				while (manga.chapters.length > this.options.maxChapterSaved) {
					manga.chapters.pop();
				}
			}
		}
	}

	notification(type, title, text = undefined, image = undefined, sticky = false) {
		if (this.options.showNotifications || (type == NOTIFY.ERROR && this.options.showErrors)) {
			let options = {
				position: "bottom-left",
				sticky: sticky
			};
			SimpleNotification[type]({
				title: title,
				image: image,
				text: text
			}, options);
		}
	}

	getChapterListGroups() {
		let chapterContainer = document.querySelector(".chapter-container");
		if (!chapterContainer) return [];
		let nodes = chapterContainer.children;
		let groups = [];
		if (nodes.length > 1) {
			let currentGroup = { chapters: [] };
			for (let i = 1; i < nodes.length; i++) {
				let chapterRow = nodes[i].querySelector("[data-chapter]");
				let titleId = Math.floor(chapterRow.dataset.mangaId);
				let isFirstRow = (nodes[i].firstElementChild.childElementCount > 0);
				// Is this is a new entry push the current group and create a new one
				if (isFirstRow) {
					if (currentGroup.chapters.length > 0) {
						groups.push(currentGroup);
					}
					currentGroup = {
						titleId: titleId,
						name: nodes[i].firstElementChild.textContent.trim(),
						chapters: [],
					};
				}
				let chapter = this.getVolumeChapterFromNode(chapterRow);
				chapter.value = chapter.chapter;
				chapter.node = nodes[i];
				currentGroup.chapters.push(chapter);
			}
			// Push last group
			if (currentGroup.chapters.length > 0) {
				groups.push(currentGroup);
			}
		}
		return groups;
	}

	createQuickButton(content, status) {
		let quickButton = document.createElement("button");
		quickButton.className = "btn btn-default";
		quickButton.textContent = content;
		quickButton.addEventListener("click", async () => {
			await this.quickAddOnMyAnimeList(status);
		});
		return quickButton;
	}

	async saveTitleInHistory(manga) {
		this.history = await this.history;
		if (this.history == undefined || this.history == null || isEmpty(this.history)) {
			this.history = { list: [] };
		}
		if (this.history[manga.mangaDexId] == undefined) {
			this.history[manga.mangaDexId] = {
				name: manga.name,
				id: manga.mangaDexId
			};
		} else {
			let index = this.history.list.indexOf(manga.mangaDexId);
			if (index >= 0) {
				this.history.list.splice(index, 1);
			}
		}
		this.history[manga.mangaDexId].progress = manga.currentChapter;
		this.history[manga.mangaDexId].chapter = manga.chapterId;
		this.history[manga.mangaDexId].lastRead = Date.now();
		this.history.list.push(manga.mangaDexId);
		if (this.history.list.length > this.options.historySize) {
			let diff = this.history.list.length - this.options.historySize;
			for (let i = 0; i < diff; i++) {
				delete this.history[this.history.list[i]];
			}
			this.history.list.splice(0, diff);
		}
		await storageSet("history", this.history);
	}

	chapterStringFromObject(chapter) {
		if (chapter == null || chapter == undefined) return "Chapter Unknown";
		if (typeof chapter != "object") {
			return ["Chapter ", chapter].join("");
		}
		let string = [];
		if (chapter.volume > 0) {
			string.push("Vol. ", chapter.volume, " ");
		}
		if (chapter.chapter <= 0) {
			string.push("Chapter 0");
		} else {
			string.push("Chapter ", chapter.chapter);
		}
		return string.join("");
	}

	setCardLastRead(card, titleTimestamp, readTimestamp) {
		card.dataset.toggle = "tooltip";
		card.dataset.placement = "bottom";
		card.dataset.html = true;
		let date = new Date(readTimestamp);
		let title = [];
		if (readTimestamp) {
			title.push(`${date.getUTCDate()} ${date.toDateString().split(' ')[1]} ${date.getUTCFullYear()} ${date.toTimeString().split(' ')[0]}`);
		}
		if (titleTimestamp) {
			date = new Date(titleTimestamp);
			title.push(`<span style="color:rgb(51,152,182)">${date.getUTCDate()} ${date.toDateString().split(' ')[1]} ${date.getUTCFullYear()} ${date.toTimeString().split(' ')[0]}</span>`);
		}
		card.title = title.join("<br>");
	}

	buildHistoryEntryNode(historyEntry) {
		// Build
		let container = document.createElement("div");
		container.className = "large_logo rounded position-relative mx-1 my-2";
		let hover = document.createElement("div");
		hover.className = "hover";
		let titleLinkImage = document.createElement("a");
		titleLinkImage.rel = "noreferrer noopener";
		titleLinkImage.href = ["/manga/", historyEntry.id].join("");
		let titleImage = document.createElement("img");
		titleImage.className = "rounded";
		titleImage.title = historyEntry.name;
		titleImage.src = ["/images/manga/", historyEntry.id, ".large.jpg"].join("");
		titleImage.style.width = "100%";
		let informationsContainer = document.createElement("div");
		informationsContainer.className = "car-caption px-2 py-1";
		let titleName = document.createElement("p");
		titleName.className = "text-truncate m-0";
		let titleLinkName = document.createElement("a");
		titleLinkName.className = "manga_title white";
		titleLinkName.title = historyEntry.name;
		titleLinkName.rel = "noreferrer noopener";
		titleLinkName.href = ["/title/", historyEntry.id].join("");
		titleLinkName.textContent = historyEntry.name;
		let chapterInfo = document.createElement("p");
		chapterInfo.className = "text-truncate m-0";
		let chapterLink = document.createElement("a");
		chapterLink.className = "white";
		chapterLink.rel = "noreferrer noopener";
		chapterLink.href = ["/chapter/", historyEntry.chapter].join("");
		chapterLink.textContent = this.chapterStringFromObject(historyEntry.progress);
		// Append
		titleName.appendChild(titleLinkName);
		chapterInfo.appendChild(chapterLink);
		informationsContainer.appendChild(titleName);
		informationsContainer.appendChild(chapterInfo);
		titleLinkImage.appendChild(titleImage);
		hover.appendChild(titleLinkImage);
		container.appendChild(hover);
		container.appendChild(informationsContainer);
		return container;
	}

	getCurrentThumbnail() {
		return [domain, "images/manga/", this.manga.mangaDexId, ".thumb.jpg"].join('');
	}

	async handleEyeClick(eye, event) {
		const markUnread = eye.classList.contains('chapter_mark_unread_button');
		let dataNode = eye;
		while (true) {
			dataNode = dataNode.parentNode;
			if (!dataNode || dataNode.dataset.chapter) break;
		}
		if (!dataNode) return;
		let chapter = +dataNode.dataset.chapter;

		if (this.pageType != "title") {
			this.manga = { mangaDexId: dataNode.dataset.mangaId };
			await this.getTitleInfos();

			if (this.manga.myAnimeListId) await this.fetchMyAnimeList();
		}
		this.manga.currentChapter = this.manga.currentChapter || { chapter: -1, volume: 0 };
		if (markUnread) {
			let updateLast = this.manga.lastMangaDexChapter == chapter;
			if (updateLast) {
				this.manga.currentChapter.chapter = 0;
				this.manga.lastMangaDexChapter = 0;
			}
			this.manga.chapters = this.manga.chapters.filter(chap => {
				// update to next smaller chapter
				if (updateLast && chap < chapter) {
					this.manga.currentChapter.chapter = chap;
					this.manga.lastMangaDexChapter = chap;
					updateLast = false;
				}
				return chap != chapter
			});
		} else {
			this.insertChapter(chapter);
			if (chapter > this.manga.lastMangaDexChapter || chapter > this.manga.lastMyAnimeListChapter) {
				this.manga.currentChapter.chapter = chapter;
				this.manga.lastMangaDexChapter = chapter;
			}
		}

		if (this.manga.myAnimeListId && (!this.manga.lastMyAnimeListChapter || Math.floor(this.manga.lastMangaDexChapter) != this.manga.lastMyAnimeListChapter)) {
			const { requestURL, body } = buildMyAnimeListBody(true, this.manga, this.csrf, this.manga.status);
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
			this.manga.lastMAL = Date.now();
		}

		// no need to wait until it's saved
		updateLocalStorage(this.manga, this.options);
		if (this.pageType == "title") {
			this.highlightChapters();
		} else if (this.pageType == "chapterList") {
			delete this.titleInformations[this.manga.mangaDexId];
			this.chapterListPage(false);
		}
		return true;
	}

	// END HELP / START PAGE

	async chapterListPage(checkUpdates = true) {
		if (!this.options.highlightChapters &&
			!this.options.hideLowerChapters && !this.options.hideHigherChapters && !this.options.hideLastRead &&
			!this.options.showTooltips) {
			return;
		} // Abort early if useless - no highlight, no hiding and no thumbnails
		let groups = this.getChapterListGroups();
		let lastChapter = groups.length;
		let titleInformations = this.titleInformations || {};
		this.titleInformations = titleInformations; // save object reference

		const checkTitle = id => ((checkUpdates && !titleInformations[id].getsUpdated) ||
			(!checkUpdates && titleInformations[id].getsUpdated));

		// collect information
		let toUpdate = [];
		for (let i = 0; i < lastChapter; i++) {
			let group = groups[i];
			// Get title informations from LocalStorage
			if (!(group.titleId in titleInformations)) {
				titleInformations[group.titleId] = await storageGet(group.titleId);
				if (titleInformations[group.titleId]) {
					titleInformations[group.titleId].next = Infinity;
					titleInformations[group.titleId].getsUpdated = !checkUpdates;
				}
			}

			// if there is data, find the next chapter
			// no need to check the title if an update is fetched anyways
			// but if it's the next pass, check it
			if (titleInformations[group.titleId] && checkTitle(group.titleId)) {
				let chapterCount = group.chapters.length;

				for (let j = 0; j < chapterCount; j++) {
					let chapter = group.chapters[j];

					// if higher chapter
					if (chapter.value > titleInformations[group.titleId].last) {
						// might be next
						if (Math.floor(chapter.value) <= titleInformations[group.titleId].last + 1) {
							titleInformations[group.titleId].next = Math.min(titleInformations[group.titleId].next, chapter.value);
						}
						// if check for updates, has mal title and last checked more than 12 hours ago (12*60*60*1000ms)
						if (checkUpdates && this.options.updateOnFollows && toUpdate.length < 7 &&
							!titleInformations[group.titleId].getsUpdated && titleInformations[group.titleId].mal != 0 &&
							(!titleInformations[group.titleId].lastMAL || (Date.now() - titleInformations[group.titleId].lastMAL) >= 43200000)) {
							toUpdate.push({
								myAnimeListId: titleInformations[group.titleId].mal,
								mangaDexId: group.titleId,
								lastMangaDexChapter: titleInformations[group.titleId].last,
								chapters: titleInformations[group.titleId].chapters || []
							});
							titleInformations[group.titleId].next = Infinity;
							titleInformations[group.titleId].getsUpdated = true;
							break; // no need to check this title any more
						}
					}
				}
			}
		}
		if (toUpdate.length) {
			(async toUpdate => {
				for (var i = 0; i < toUpdate.length; i++) {
					if (!this.loggedMyAnimeList) break;
					let manga = toUpdate[i];

					let ret = await this.fetchMyAnimeList(manga);
					if (ret.status >= 200 && ret.status < 400 && this.loggedMyAnimeList && manga.is_approved) {
						manga.currentChapter = manga.currentChapter || {};
						manga.currentChapter.chapter = Math.max(manga.lastMyAnimeListChapter, manga.lastMangaDexChapter);
						if (this.options.saveAllOpened) {
							this.insertChapter(manga.currentChapter.chapter, manga);
						}			
						await updateLocalStorage(manga, this.options);
					}
				}
				this.chapterListPage(false);
			})(toUpdate); // run in background (async)
		}

        /**
         * Hide Lower and Higher
         */
		if (this.options.hideLowerChapters || this.options.hideHigherChapters || this.options.hideLastRead) {
			for (let i = 0; i < lastChapter; i++) {
				let group = groups[i];
				
				// If there is data
				if (titleInformations[group.titleId] && checkTitle(group.titleId)) {
					let chapterCount = group.chapters.length;
					let highestChapter = Math.max.apply(Math, group.chapters.map(e => { return e.value; }));
					for (let j = 0; j < chapterCount; j++) {
						let chapter = group.chapters[j];
						chapter.hidden = ((this.options.hideHigherChapters &&
							titleInformations[group.titleId].next < chapter.value) ||
							(this.options.hideLowerChapters && titleInformations[group.titleId].last > chapter.value) ||
							(this.options.hideLastRead && titleInformations[group.titleId].last == chapter.value && titleInformations[group.titleId].next != Infinity));
						chapter.node.classList.toggle("is-hidden-chapter", chapter.hidden);
					}
					if (group.chapters[0].hidden) {
						// Display the title on the first not hidden chapter
						let j = 1;
						while (j < chapterCount && group.chapters[j].hidden) {
							j++;
						}
						if (j < chapterCount) {
							let link = document.createElement("a");
							link.textContent = group.name; link.className = "text-truncate";
							link.href = ["/title/", group.titleId].join(""); link.title = group.name;
							group.chapters[j].node.firstElementChild.appendChild(link);
						}
					}
				}
			}

			// Button
			let rows = document.querySelectorAll(".is-hidden-chapter");
			let hiddenCount = rows.length;

			let navBar = document.querySelector(".nav.nav-tabs");
			let button = document.querySelector(".mmdNav-hidden");
			let show = false;
			if (button) {
				show = !!button.firstChild.dataset.show;
				button.remove();
			}

			if (hiddenCount > 0) {
				button = document.createElement("li");
				button.className = "nav-item mmdNav mmdNav-hidden";
				let link = document.createElement("a");
				this.appendTextWithIcon(link, "eye", [!show ? "Show Hidden (" : "Hide Hidden (", hiddenCount, ")"].join(""));
				if (show) link.dataset.show = true;
				link.className = "nav-link"; link.href = "#";
				link.addEventListener("click", event => {
					event.preventDefault();
					clearDomNode(link);
					if (!link.dataset.show) {
						link.dataset.show = true;
						this.appendTextWithIcon(link, "eye", ["Hide Hidden (", hiddenCount, ")"].join(""));
						rows.forEach(node => {
							node.classList.add("is-visible");
						});
					} else {
						delete link.dataset.show;
						this.appendTextWithIcon(link, "eye", ["Show Hidden (", hiddenCount, ")"].join(""));
						rows.forEach(node => {
							node.classList.remove("is-visible");
						});
					}
				});
				button.appendChild(link);
				if (navBar.lastElementChild.classList.contains("ml-auto")) {
					navBar.insertBefore(button, navBar.lastElementChild);
				} else {
					navBar.appendChild(button);
				}
			}
		}

        /**
         * Highlight
         */
		if (this.options.highlightChapters) {
			let paintRow = (row, color) => {
				let max = row.childElementCount;
				for (let i = 0; i < max; i++) {
					row.children[i].style.backgroundColor = color;
				}
			};
			let colors = this.options.lastOpenColors, lastColor = colors.length, currentColor = 0;
			for (let i = 0; i < lastChapter; i++) {
				let group = groups[i];
				// If there is data
				if (titleInformations[group.titleId]) {
					let chapterCount = group.chapters.length;
					let outerColor = colors[currentColor];
					for (let j = 0; j < chapterCount; j++) {
						let chapter = group.chapters[j];
						chapter.node.classList.add("has-fast-in-transition");

						// toggle is loading
						if (titleInformations[group.titleId].getsUpdated)
							chapter.node.classList.toggle("is-loading", checkUpdates);

						if (checkTitle(group.titleId)) {
							if (titleInformations[group.titleId].next == chapter.value) {
								paintRow(chapter.node, this.options.nextChapterColor);
								group.selected = j;
								outerColor = this.options.nextChapterColor;
							} else if (titleInformations[group.titleId].last < chapter.value) {
								paintRow(chapter.node, this.options.higherChaptersColor);
							} else if (titleInformations[group.titleId].last > chapter.value) {
								paintRow(chapter.node, this.options.lowerChaptersColor);
							} else if (titleInformations[group.titleId].last == chapter.value) {
								paintRow(chapter.node, colors[currentColor]);
								group.selected = j;
							} else {
								paintRow(chapter.node, '');
							}
						}
					}
					if (group.selected > 0 && checkTitle(group.titleId)) {
						for (let j = 0; j < chapterCount; j++) {
							if (j == group.selected || group.chapters[j].hidden || group.chapters[j].value == group.chapters[group.selected].value) continue;
							group.chapters[j].node.firstElementChild.style.backgroundColor = outerColor;
						}
					}
					currentColor = (currentColor + 1) % lastColor;
				}
			}
		}

        /**
         * Tooltips
         */
    // only add tooltips on first iteration
		if (this.options.showTooltips && (!checkUpdates || !toUpdate.length)) {
			if (!this.tooltipContainer && !(this.tooltipContainer = document.querySelector("#mmd-tooltip"))) {
				this.tooltipContainer = document.createElement("div");
				this.tooltipContainer.id = "mmd-tooltip";
				document.body.appendChild(this.tooltipContainer);
			}
			for (let i = 0; i < lastChapter; i++) {
				let group = groups[i];
				if (!titleInformations[group.titleId] || checkTitle(group.titleId)) {
					let chapterCount = group.chapters.length;
					titleInformations[group.titleId] = titleInformations[group.titleId] || {};
					// clear the chapters on first title tooltip
					titleInformations[group.titleId].options = titleInformations[group.titleId].options || { clear: true };
					// Add events
					for (let j = 0; j < chapterCount; j++) {
						this.tooltip(
							group.chapters[j].node,
							group.titleId,
							titleInformations[group.titleId].chapters || [],
							titleInformations[group.titleId].options
						);
					}
				}
			}
		}


		// set all toUpdate to false
		if (!checkUpdates || !toUpdate.length) {
			for (let title in titleInformations) {
				if (titleInformations[title])
					if (titleInformations[title].getsUpdated)
						titleInformations[title].getsUpdated = false;
					if (titleInformations[title].options)
						delete titleInformations[title].options;
			}
		}
	}

	async titlePage() {
		this.manga.name = document.querySelector("h6.card-header").textContent.trim();
		this.manga.lastTitle = Date.now();
		this.manga.mangaDexId = /.+title\/(\d+)/.exec(this.pageUrl);
		// We always try to find the link, in case it was updated
		let myAnimeListUrl = document.querySelector("img[src$='/mal.png']");
		if (myAnimeListUrl !== null) {
			// Finish getting the mal link
			myAnimeListUrl = myAnimeListUrl.nextElementSibling.href;
			// Get MAL id of the manga from the mal link
			this.manga.myAnimeListId = Math.floor(/.+\/(\d+)/.exec(myAnimeListUrl)[1]);
		} else {
			this.manga.myAnimeListId = 0;
		}

		if (this.manga.mangaDexId === null) {
			let dropdown = document.getElementById("1");
			if (dropdown !== null) {
				this.manga.mangaDexId = Math.floor(dropdown.dataset.mangaId);
			}
		} else {
			this.manga.mangaDexId = Math.floor(this.manga.mangaDexId[1]);
		}
		this.mangaDexLoggedIn = (document.querySelector('button[disabled][title="You need to log in to use this function."]') == null);
		this.mangaDexStatus = false;
		this.mangaDexScore = 0;
		if (this.mangaDexLoggedIn) {
			let mangaDexStatus = document.querySelector('.disabled.dropdown-item.manga_follow_button');
			this.mangaDexStatus = (mangaDexStatus) ? mangaDexStatus.textContent.trim() : false;
			let mangaDexScore = document.querySelector('.disabled.dropdown-item.manga_rating_button');
			if (mangaDexScore) {
				this.mangaDexScore = Math.floor(mangaDexScore.id);
			}
		}

		// Fetch the manga information from the local storage
		let data = await storageGet(this.manga.mangaDexId);

		// If there is no entry try to find it
		if (data !== undefined) {
			this.manga.lastMangaDexChapter = data.last;
			this.manga.chapters = data.chapters || [];
			this.manga.currentChapter.chapter = this.manga.lastMangaDexChapter;
		}
		// Update everytime to save updated MAL id and lastTitle
		let storageSet = updateLocalStorage(this.manga, this.options);

		// Informations
		let parentNode = document.querySelector(".col-xl-9.col-lg-8.col-md-7");
		let informationsRow = document.querySelector(".mmdInfoRow");
		if (!informationsRow) {
			informationsRow = document.createElement("div");
			informationsRow.className = "row m-0 py-1 px-0 border-top mmdInfoRow";
			parentNode.insertBefore(informationsRow, parentNode.lastElementChild);
			let informationsLabel = document.createElement("div");
			informationsLabel.className = "col-lg-3 col-xl-2 strong";
			informationsLabel.textContent = "Status:";
			informationsRow.appendChild(informationsLabel);
		}
		this.informationsNode = document.querySelector(".mmdInfoNode");
		if (!this.informationsNode) {
			this.informationsNode = document.createElement("div");
			this.informationsNode.className = "col-lg-9 col-xl-10 mmdInfoNode";
			informationsRow.appendChild(this.informationsNode);
		}

		let appendErrorMessage = (message) => {
			let messageNode = document.createElement("span");
			messageNode.textContent = message;
			informationsRow.classList.add("mmd-background-info");
			this.informationsNode.appendChild(messageNode);
		};

		// If there is a existing mal link
		if (this.manga.myAnimeListId > 0) {
			// Fetch the edit page of the manga
			let ret = await this.fetchMyAnimeList();
			if (ret.status >= 200 && ret.status < 400) {
				if (this.loggedMyAnimeList) {
					if (this.manga.is_approved) {
						// Check if the manga is already in the reading list
						if (this.manga.in_list) {
							this.insertMyAnimeListInformations();
							this.manga.currentChapter.chapter = Math.max(this.manga.lastMyAnimeListChapter, this.manga.lastMangaDexChapter);
							if (this.options.saveAllOpened) {
								this.insertChapter(this.manga.currentChapter.chapter);
							}
							await storageSet.then(() => {
								updateLocalStorage(this.manga, this.options);
							});
						} else {
							clearDomNode(this.informationsNode);
							// Add a "Add to reading list" button
							let quickAddReading = this.createQuickButton("Start Reading", 1);
							// And a "Plan to read" button
							let quickAddPTR = this.createQuickButton("Add to Plan to Read list", 6);
							// Append
							this.informationsNode.appendChild(quickAddReading);
							this.informationsNode.appendChild(document.createTextNode(" "));
							this.informationsNode.appendChild(quickAddPTR);
						}
					} else {
						appendErrorMessage("The manga is still pending approval on MyAnimelist and can't be updated.");
					}
				} else {
					appendErrorMessage("Login on MyAnimeList to display informations.");
				}
			} else {
				appendErrorMessage(["Status code: ", ret.status, ". Open an issue if the code is more or equal to 400 and less than 500. Retry later."].join(''));
			}
		} else {
			appendErrorMessage("No MyAnimeList found. When one is added, MyMangaDex will find it if you visit this page again.");
		}
		this.highlightChapters();
	}

	// TODO: Save volume if there is one
	async updateChapter(delayed, oldChapter = undefined) {
		if (!delayed) {
			if (!this.options.updateOnlyInList || this.mangaDexStatus != false) {
				await this.updateManga();
			} else if (this.options.confirmChapter) {
				let newChapter = this.manga.currentChapter;
				if (oldChapter) {
					this.manga.currentChapter = oldChapter;
				}
				SimpleNotification.info({
					title: "Not in list",
					text: "The title is not in your **MangaDex** reading list and wasn't updated, but you can still update it.",
					image: this.getCurrentThumbnail(),
					buttons: [{
						value: "Update", type: "success",
						onClick: async n => {
							n.remove();
							this.manga.currentChapter = newChapter;
							await this.updateManga();
						}
					}, {
						value: "Close", type: "error",
						onClick: n => n.remove()
					}]
				}, { position: "bottom-left", duration: 10000 });
			}
		} else {
			if (oldChapter) {
				this.manga.currentChapter = oldChapter;
			}
			this.notification(NOTIFY.ERROR, "Chapter Delayed", "The chapter was not updated and saved since it is delayed on MangaDex.", this.getCurrentThumbnail());
		}
	}

	async singleChapterPageLegacy() {
		// We can use the info on the page if we don't change chapter while reading
		let chapter = document.querySelector("meta[property='og:title']").content;
		this.manga.currentChapter = this.getVolumeChapterFromString(chapter);
		chapter = document.querySelector("meta[property='og:image']").content;
		this.manga.mangaDexId = Math.floor(/manga\/(\d+)\.thumb.+/.exec(chapter)[1]);
		this.manga.chapterId = Math.floor(/\/(\d+)\/?/.exec(document.querySelector("meta[property='og:url']").content)[1]);
		// History
		if (this.options.updateHistoryPage) {
			this.history = storageGet("history");
		}
		// Informations
		await this.getTitleInfos();
		await this.fetchMyAnimeList();
		if (this.mangaDexStatus === undefined && (this.options.updateMDList || this.options.updateOnlyInList)) {
			await this.fetchTitleInfos();
		}

		// Get MAL Url from the database
		const delayed = !!document.querySelector("div.container > div.alert.alert-danger");
		this.updateChapter(delayed);
		if (this.manga.exist && this.manga.is_approved) {
			this.insertMyAnimeListButton(document.querySelector(".card-body .col-md-4.mb-1"), false);
		}
	}

	async singleChapterEvent(data, firstRun) {
		if (firstRun) {
			this.manga.mangaDexId = data.manga_id;
			this.manga.chapterId = data.id;

			if (this.options.updateHistoryPage) {
				this.history = storageGet("history");
			}
			// Informations
			await this.getTitleInfos();
			await this.fetchMyAnimeList();

			if (this.manga.exist && this.manga.is_approved) {
				this.insertMyAnimeListButton(document.querySelector(".reader-controls-actions.col-auto.row.no-gutters.p-1").lastElementChild);
			}

			if (this.mangaDexStatus === undefined && (this.options.updateMDList || this.options.updateOnlyInList)) {
				await this.fetchTitleInfos(false);
			}
		}

		let oldChapter = undefined;
		if (this.manga.chapterId != data.id) {
			oldChapter = this.manga.currentChapter;
		}
		this.manga.currentChapter = {
			volume: parseInt(data.volume) || 0,
			chapter: parseFloat(data.chapter) || 0
		};
		const delayed = data.status != "OK" && data.status != "external";
		this.updateChapter(delayed, oldChapter);
		this.manga.chapterId = data.id;
	}

	singleChapterPage() {
		this.manga.name = /scans\s*,\s+(.+)\s+mangadex/i.exec(document.querySelector("meta[name='keywords']").content)[1];
		const legacyReader = !document.getElementById("content").classList.contains("reader");
		if (legacyReader) {
			this.singleChapterPageLegacy();
			return;
		}

		let firstRun = true;
		// only injected scripts can access global variables, but we also need chrome (only in content scripts)
		// -> custom events to communicate
		function relayChapterEvent() {
			window.reader.model.on("chapterchange", (data) => {
				// note: this function needs to have an actual body to avoid a return
				// EventEmitter.js removes an event if return matches (default: true)
				document.dispatchEvent(new CustomEvent("mmdChapterChange", { detail: data._data }));
			});
		}
		injectScript(relayChapterEvent);

		document.addEventListener("mmdChapterChange", async (event) => {
			await this.singleChapterEvent(event.detail, firstRun);
			firstRun = false;
		});
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

	async historyPage() {
		if (!this.options.updateHistoryPage) return;
		let container = document.getElementById("history");
		let infoNode = container.querySelector("p");
		infoNode.textContent = ["Your last ", this.options.historySize, " read titles are listed below."].join("");
		// Load history
		this.history = await storageGet("history");
		if (this.history == undefined) {
			this.history = { list: [] };
			await storageSet("history", this.history);
		}
		// Add current elements to the history - first one is inserted last
		let mdTitles = Array.from(document.querySelectorAll(".large_logo.rounded.position-relative.mx-1.my-2")).reverse();
		for (let i = 0, max = mdTitles.length; i < max; i++) {
			let node = mdTitles[i];
			let chapterLink = node.querySelector("a[href^='/chapter/']");
			let title = {
				mangaDexId: Math.floor(/\/title\/(\d+)\/.+./.exec(node.querySelector("a[href^='/title/']").href)[1]),
				name: node.querySelector(".manga_title").textContent,
				chapterId: Math.floor(/\/chapter\/(\d+)/.exec(chapterLink.href)[1]),
				currentChapter: this.getVolumeChapterFromString(chapterLink.textContent)
			};
			// Save only if the title isn't already in the list or if the chapter is different
			if (!this.history[title.mangaDexId] ||
				Math.floor(this.history[title.mangaDexId].chapter) != title.chapterId) {
				await this.saveTitleInHistory(title);
			}
		}
		// Display additionnal history
		for (let i = this.history.list.length - 1; i >= 0; i--) {
			let entry = this.history[this.history.list[i]];
			let exist = container.querySelector(["a[href^='/title/", entry.id, "']"].join(""));
			let entryNode;
			if (!exist) {
				entryNode = this.buildHistoryEntryNode(entry);
				container.insertBefore(entryNode, container.lastElementChild);
			} else {
				entryNode = exist.parentElement.parentElement;
			}
			let title = await storageGet(entry.id);
			this.setCardLastRead(entryNode, (title || {}).lastTitle, entry.lastRead);
		}
		if (CHROME) {
			document.documentElement.setAttribute("onreset", "$(() => { $('[data-toggle=\"tooltip\"]').tooltip() })");
			document.documentElement.dispatchEvent(new CustomEvent("reset"));
			document.documentElement.removeAttribute("onreset");
		} else {
			window.wrappedJSObject.jQuery("[data-toggle='tooltip']").tooltip();
			XPCNativeWrapper(window.wrappedJSObject.jQuery);
		}
	}

	// END PAGE
}

let myMangaDex = new MyMangaDex();
myMangaDex.start();
