const NOTIFY = { ERROR: 'error', INFO: 'info', SUCCESS: 'success', WARNING: 'warning', MESSAGE: 'message' };
class MyMangaDex {
	constructor() {
		this.pageUrl = window.location.href;
		this.pageType = '';
		this.loggedMyAnimeList = true;
		this.csrf = '';
		this.manga = {
			name: '',
			myAnimeListId: 0,
			lastMangaDexChapter: -1,
			mangaDexId: 0,
			chapterId: 0,
			chapters: [],
			currentChapter: { chapter: -1, volume: 0 },
		};
		this.fetched = false;
		this.myAnimeListImage = 'https://ramune.nikurasu.org/mymangadex/myanimelist.png';
		this.mmdImage = 'https://ramune.nikurasu.org/mymangadex/128.png';
		this.mmdCrossedImage = 'https://ramune.nikurasu.org/mymangadex/128b.png';
	}

	async start() {
		this.options = await loadOptions();
		let urls = {
			follows: 'follows',
			group: 'group',
			user: 'user',
			search: 'search',
			oldSearch: '?page=search',
			oldTitles: '?page=titles',
			featured: 'featured',
			titles: 'titles',
			genre: 'genre',
			list: 'list',
			title: 'title',
			chapter: 'chapter',
			history: 'history',
			manga: 'manga',
		};
		Object.keys(urls).forEach((key) => {
			urls[key] = `${domainName}/${urls[key]}`;
		});

		// Choose page
		if (
			(this.pageUrl.indexOf(urls.follows) > -1 && this.pageUrl.indexOf('/manga/') == -1) ||
			(this.pageUrl.indexOf(urls.group) > -1 &&
				(this.pageUrl.indexOf('/chapters/') > -1 ||
					(this.pageUrl.indexOf('/manga/') == -1 && this.pageUrl.indexOf('/comments') == -1))) ||
			(this.pageUrl.indexOf(urls.user) > -1 &&
				(this.pageUrl.indexOf('/chapters/') > -1 || this.pageUrl.indexOf('/manga/') == -1))
		) {
			this.pageType = 'chapterList';
			this.chapterListPage(this.pageUrl.indexOf(urls.follows) > -1);
		} else if (
			this.pageUrl.indexOf(urls.search) > -1 ||
			this.pageUrl.indexOf(urls.oldSearch) > -1 ||
			this.pageUrl.indexOf(urls.oldTitles) > -1 ||
			this.pageUrl.indexOf(urls.featured) > -1 ||
			this.pageUrl.indexOf(urls.titles) > -1 ||
			this.pageUrl.indexOf(urls.genre) > -1 ||
			this.pageUrl.indexOf(urls.list) > -1 ||
			(this.pageUrl.indexOf(urls.follows) > -1 && this.pageUrl.indexOf('/manga/') > -1) ||
			(this.pageUrl.indexOf(urls.group) > -1 && this.pageUrl.indexOf('/manga/') > -1) ||
			(this.pageUrl.indexOf(urls.user) > -1 && this.pageUrl.indexOf('/manga/') > -1)
		) {
			this.pageType = 'titlesList';
			this.titlesListPage();
		} else if (this.pageUrl.indexOf(urls.title) > -1 || this.pageUrl.indexOf(urls.manga) > -1) {
			this.pageType = 'title';
			this.titlePage();
		} else if (this.pageUrl.indexOf(urls.chapter) > -1 && this.pageUrl.indexOf('/comments') == -1) {
			this.pageType = 'singleChapter';
			this.singleChapterPage();
		} else if (this.pageUrl.indexOf(urls.history) > -1) {
			this.pageType = 'history';
			this.historyPage();
		}

		// clean up existing nodes
		// const oldDomNodes = document.querySelectorAll("body > .gn-wrapper, #mmd-tooltip, .nav-item.mmdNav");
		// oldDomNodes.forEach(node => node.remove());
		// const oldToolTips = document.querySelectorAll(".row[data-loaded=\"true\"]");
		// oldToolTips.forEach(node => node.removeAttribute("data-loaded"));

		const eyes = document.querySelectorAll(
			'.chapter-row .chapter_mark_read_button, .chapter-row .chapter_mark_unread_button'
		);
		eyes.forEach((eye) => eye.addEventListener('click', this.handleEyeClick.bind(this, eye)));
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
			action: 'fetch',
			url: `https://myanimelist.net/ownlist/manga/${manga.myAnimeListId}/edit?hideLayout`,
			options: {
				method: 'GET',
				cache: 'no-cache',
				credentials: 'include',
				redirect: 'follow',
			},
		});
		if (data.status >= 500) {
			this.notification(NOTIFY.ERROR, 'MyAnimeList error', 'MyAnimeList is unreacheable.');
			// init and set if it was redirected - redirected often means not in list or not approved
		} else if (data.url.indexOf('login.php') > -1) {
			if (CHROME) {
				this.notification(
					NOTIFY.ERROR,
					'Not logged in',
					'Login {{here|https://myanimelist.net/login.php}} on MyAnimeList !',
					this.myAnimeListImage,
					true
				);
			} else {
				this.notification(
					NOTIFY.ERROR,
					'Not logged in',
					`Login {{here|https://myanimelist.net/login.php}} on MyAnimeList !\n
					If you see this error while logged in, see {{this issue|https://github.com/Glagan/MyMangaDex/issues/5}} on **Github**.`,
					this.myAnimeListImage,
					true
				);
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
					return 'Re-reading';
				}
				return 'Reading';
			case 2:
				return 'Completed';
			case 3:
				return 'On hold';
			case 3:
				return 'Dropped';
			case 6:
				return 'Plan to read';
		}
		return '';
	}

	async updateManga(usePepper = true, setStatus = 1, force = false) {
		const doMyAnimeList =
			this.fetched && this.loggedMyAnimeList && this.manga.myAnimeListId > 0 && this.manga.exist;

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
			const isHigher = realChapter < 0 || realChapter > this.manga.lastMyAnimeListChapter;
			const isHigherDex =
				isHigher ||
				(this.manga.lastMangaDexChapter != -1 &&
					this.manga.currentChapter.chapter > this.manga.lastMangaDexChapter);
			if (!isHigherDex && this.options.saveOnlyHigher) {
				if (this.options.confirmChapter) {
					SimpleNotification.info(
						{
							title: 'Not updated',
							image: this.getCurrentThumbnail(),
							text:
								"Last read chapter on MyAnimelist is higher or equal to the current chapter and wasn't updated.\nYou can update it anyway or ignore this notification.",
							buttons: [
								{
									value: 'Update',
									type: 'success',
									onClick: (notification) => {
										notification.close();
										this.updateManga(usePepper, setStatus, true);
									},
								},
								{
									value: 'Close',
									type: 'error',
									onClick: (notification) => {
										notification.close();
									},
								},
							],
						},
						{ position: 'bottom-left', closeOnClick: false, duration: 10000 }
					);
				} else {
					this.notification(
						NOTIFY.INFO,
						'Not updated',
						"Last read chapter on MyAnimelist is higher or equal to the current chapter and wasn't updated.",
						this.getCurrentThumbnail()
					);
				}
				return;
			}

			/*let isNext = (realChapter < 0 ||
				//realChapter == this.manga.lastMyAnimeListChapter ||
				realChapter == this.manga.lastMyAnimeListChapter + 1); // ||
					//(!this.options.saveOnlyHigher && realChapter == this.manga.lastMyAnimeListChapter - 1));*/
			const maybeNext = isHigherDex && realChapter <= Math.floor(this.manga.lastMangaDexChapter) + 1;
			if (this.options.saveOnlyNext && this.manga.lastMyAnimeListChapter > 0 && !maybeNext) {
				if (this.options.confirmChapter) {
					SimpleNotification.info(
						{
							title: 'Not updated',
							image: this.getCurrentThumbnail(),
							text:
								"The current chapter is not the next one and it wasn't updated on **MyAnimelist**.\nYou can update it anyway or ignore this notification.",
							buttons: [
								{
									value: 'Update',
									type: 'success',
									onClick: (notification) => {
										notification.close();
										this.updateManga(usePepper, setStatus, true);
									},
								},
								{
									value: 'Close',
									type: 'error',
									onClick: (notification) => {
										notification.close();
									},
								},
							],
						},
						{ position: 'bottom-left', closeOnClick: false, sticky: true }
					);
				} else {
					this.notification(
						NOTIFY.INFO,
						'Not updated',
						"The current chapter is not the next one and it wasn't updated on **MyAnimelist**.",
						this.getCurrentThumbnail()
					);
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
				action: 'fetch',
				url: requestURL,
				options: {
					method: 'POST',
					body: body,
					redirect: 'follow',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					},
				},
			});
			this.manga.in_list = true;
		} else if (doMyAnimeList && !this.manga.is_approved) {
			this.notification(
				NOTIFY.INFO,
				'Not updated',
				"The manga is still pending approval on MyAnimelist and can't be updated.",
				this.myAnimeListImage,
				true
			);
		}

		if (usePepper) {
			if (this.manga.status == 6) {
				this.notification(
					NOTIFY.SUCCESS,
					'Plan to Read',
					`**${this.manga.name}** has been put in your endless Plan to read list !`,
					this.getCurrentThumbnail()
				);
			} else {
				if ('start_today' in this.manga) {
					delete this.manga.start_today;
					this.notification(
						NOTIFY.SUCCESS,
						'Started manga',
						`You started reading **${this.manga.name}** and it's start date was set to today.`,
						this.getCurrentThumbnail()
					);
				} else if ('started' in this.manga) {
					delete this.manga.started;
					this.notification(
						NOTIFY.SUCCESS,
						'Manga updated',
						`You started reading **${this.manga.name}** at chapter ${this.manga.lastMyAnimeListChapter}`,
						this.getCurrentThumbnail()
					);
				} else if (
					this.manga.lastMyAnimeListChapter >= 0 &&
					(this.manga.status != 2 || (this.manga.status == 2 && this.manga.is_rereading) || oldStatus == 2)
				) {
					this.notification(
						NOTIFY.SUCCESS,
						'Manga updated',
						`**${this.manga.name}** has been updated to chapter ${this.manga.currentChapter.chapter}${
							this.manga.total_chapter > 0 ? ` out of ${this.manga.total_chapter}` : ''
						}`,
						this.getCurrentThumbnail()
					);
				}
				if (oldStatus != 2 && this.manga.status == 2 && !this.manga.is_rereading) {
					if ('end_today' in this.manga) {
						delete this.manga.end_today;
						this.notification(
							NOTIFY.SUCCESS,
							'Manga completed',
							`You completed **${this.manga.name}** and it's finish date was set to today.`,
							this.getCurrentThumbnail()
						);
					} else {
						this.notification(
							NOTIFY.SUCCESS,
							'Manga updated',
							`**${this.manga.name}** was set as completed.`,
							this.getCurrentThumbnail()
						);
					}
				}
			}
		}

		if (
			this.options.updateMDList &&
			((doMyAnimeList && this.manga.status != oldStatus) ||
				(!doMyAnimeList && typeof this.mangaDexStatus === 'string' && this.mangaDexStatus != 'Reading') ||
				this.mangaDexStatus == false ||
				this.manga.completed !== undefined ||
				(this.options.updateOnlyInList &&
					(!this.mangaDexStatus ||
						(doMyAnimeList && this.mangaDexStatus != this.malToMdStatus(this.manga.status)))))
		) {
			if (doMyAnimeList) {
				this.mangaDexStatus = this.malToMdStatus(this.manga.status);
			} else {
				this.mangaDexStatus = 'Reading';
				this.manga.status = 1;
			}
			await this.updateMangaDexList('manga_follow', this.manga.status);
		}

		// We add the current chapter to the list of opened chapters if the option is on
		if (this.options.saveAllOpened && this.manga.currentChapter) {
			this.insertChapter(this.manga.currentChapter.chapter);
		}
		// Update History -- Before saving LocalStorage
		if (this.options.updateHistoryPage) {
			this.saveTitleInHistory(this.manga);
		}
		// Update local storage - after, it doesn't really matter
		this.manga.lastMangaDexChapter = this.manga.currentChapter.chapter;
		await updateLocalStorage(this.manga, this.options);
	}

	async quickAddOnMyAnimeList(status) {
		// Delete the row content, to avoid clicking on any button again and to prepare for new content
		this.informationsNode.textContent = 'Loading...';

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
		try {
			await browser.runtime.sendMessage({
				action: 'fetch',
				url: `${domain}ajax/actions.ajax.php?function=${func}&id=${
					this.manga.mangaDexId
				}&type=${type}&_=${Date.now()}`,
				options: {
					method: 'GET',
					redirect: 'follow',
					credentials: 'include',
					headers: {
						'X-Requested-With': 'XMLHttpRequest',
					},
				},
			});
			this.notification(NOTIFY.SUCCESS, undefined, 'Status on **MangaDex** updated');
		} catch (error) {
			this.mangaDexLoggedIn = false;
			this.notification(NOTIFY.ERROR, undefined, 'Error updating MDList');
		}
	}

	getVolumeChapterFromNode(node) {
		let chapter = node.dataset.chapter;

		// If it's a Oneshot or just attributes are empty, we use a regex on the title
		if (chapter == '') {
			// If the chapter isn't available in the attributes we get it with a good ol' regex
			return this.getVolumeChapterFromString(node.children[1].textContent);
		}

		chapter = parseFloat(chapter);
		return {
			volume: Math.floor(node.dataset.volume) || 0,
			chapter: isNaN(chapter) ? 0 : chapter,
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
			chapter: isNaN(chapter) ? 0 : chapter,
		};
	}

	appendTextWithIcon(node, icon, text) {
		let iconNode = document.createElement('span');
		iconNode.className = `fas fa-${icon} fa-fw`;
		iconNode.setAttribute('aria-hidden', true);
		node.appendChild(iconNode);
		node.appendChild(document.createTextNode(` ${text}`));
	}

	updateTooltipPosition(tooltip, row) {
		let rightColumn = tooltip.dataset.column == 'true';
		let rect = {
			tooltip: tooltip.getBoundingClientRect(),
			row: row.getBoundingClientRect(),
		};
		if (tooltip.childElementCount == 2) {
			let chapterRect = tooltip.lastElementChild.getBoundingClientRect();
			tooltip.firstElementChild.style.maxHeight = `${
				(window.innerHeight - 10) * (this.options.coverMaxHeight / 100) - chapterRect.height
			}px`;
		}
		// Calculate to place on the left of the main column by default
		let left = Math.max(5, rect.row.x - rect.tooltip.width - 5);
		let maxWidth = rect.row.left - 10;
		// Boundaries
		if ((this.options.showFullCover && rect.row.left < 400) || rect.row.left < 100) {
			if (rightColumn) {
				rect.lastChild = row.lastElementChild.getBoundingClientRect();
				maxWidth = rect.lastChild.left - 10;
			} else {
				rect.firstChild = row.firstElementChild.getBoundingClientRect();
				maxWidth = document.body.clientWidth - 10;
			}
		}
		tooltip.style.maxWidth = `${maxWidth}px`;
		// X axis
		setTimeout(() => {
			if ((this.options.showFullCover && rect.row.left < 400) || rect.row.left < 100) {
				if (rightColumn) {
					left = rect.lastChild.left - 5 - Math.min(maxWidth, rect.tooltip.width);
				} else {
					left = rect.firstChild.right + 5;
				}
			}
			tooltip.style.left = `${left}px`;
		}, 1);
		// Y axis
		rect.tooltip = tooltip.getBoundingClientRect();
		let top = window.scrollY + rect.row.y + rect.row.height / 2 - rect.tooltip.height / 2;
		if (top <= window.scrollY) {
			top = window.scrollY + 5;
		} else if (top + rect.tooltip.height > window.scrollY + window.innerHeight) {
			top = window.scrollY + window.innerHeight - rect.tooltip.height - 5;
		}
		tooltip.style.top = `${top}px`;
	}

	tooltip(node, id, chapters = [], options = undefined) {
		// Create tooltip
		options = options || {};
		let domId = `mmd-tooltip-${id}`;
		let tooltip = document.getElementById(domId);
		let tooltipThumb, spinner;

		if (!tooltip) {
			tooltip = document.createElement('div');
			tooltip.className = 'mmd-tooltip loading';
			tooltip.id = domId;
			tooltip.style.left = '-5000px';
			tooltip.style.maxHeight = `${(window.innerHeight - 10) * (this.options.coverMaxHeight / 100)}px`;
			spinner = document.createElement('i');
			spinner.className = 'fas fa-circle-notch fa-spin';
			tooltip.appendChild(spinner);
			this.tooltipContainer.appendChild(tooltip);
			// Thumbnail
			tooltipThumb = document.createElement('img');
			tooltipThumb.className = 'mmd-thumbnail loading';
			tooltipThumb.style.maxHeight = `${(window.innerHeight - 10) * (this.options.coverMaxHeight / 100)}px`;
			tooltip.appendChild(tooltipThumb);
		}

		// Append the chapters if there is
		if (this.options.saveAllOpened && chapters.length > 0) {
			tooltip.classList.add('has-chapters'); // Add a border below the image
			let add = false;
			let chaptersContainer = tooltip.querySelector('.mmd-tooltip-content');
			if (!chaptersContainer) {
				chaptersContainer = document.createElement('div');
				chaptersContainer.className = 'mmd-tooltip-content';
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
						this.appendTextWithIcon(chaptersContainer, 'eye', chapters[i]);
						chaptersContainer.appendChild(document.createElement('br'));
					}
				}
			}
		}

		if (tooltipThumb) {
			tooltipThumb.addEventListener('load', () => {
				delete tooltip.dataset.loading;
				tooltip.dataset.loaded = true;
				// Remove the spinner
				spinner.remove();
				tooltip.classList.remove('loading');
				tooltip.style.left = '-5000px';
				tooltipThumb.classList.remove('loading');
				// Update position
				if (tooltip.classList.contains('active')) {
					setTimeout(() => {
						this.updateTooltipPosition(tooltip, node);
					}, 1);
				}
			});
			let extensions = ['jpg', 'png', 'jpeg', 'gif'];
			tooltipThumb.addEventListener('error', () => {
				if (this.options.showFullCover) {
					let tryNumber = Math.floor(tooltipThumb.dataset.ext);
					if (Math.floor(tooltipThumb.dataset.ext) < extensions.length) {
						tooltipThumb.src = `${domain}images/manga/${id}.${extensions[tryNumber]}`;
						tooltipThumb.dataset.ext = tryNumber + 1;
					} else {
						tooltipThumb.src = '';
					}
				}
			});
		} else {
			tooltipThumb = tooltip.querySelector('.mmd-thumbnail');
			spinner = tooltip.querySelector('.fa-spin');
		}
		// Events
		let activateTooltip = (rightColumn) => {
			tooltip.dataset.column = rightColumn;
			tooltip.classList.add('active');
			if (tooltip.dataset.loading) {
				this.updateTooltipPosition(tooltip, node);
				return;
			}
			if (!tooltip.dataset.loaded) {
				tooltip.dataset.loading = true;
				// Will trigger 'load' event
				if (this.options.showFullCover) {
					tooltipThumb.src = `${domain}images/manga/${id}.jpg`;
					tooltipThumb.dataset.ext = 1;
				} else {
					tooltipThumb.src = `${domain}images/manga/${id}.thumb.jpg`;
				}
			}
			this.updateTooltipPosition(tooltip, node);
		};
		let disableTooltip = () => {
			tooltip.classList.remove('active');
			tooltip.style.left = '-5000px';
		};
		// First column
		node.firstElementChild.addEventListener('mouseenter', (event) => {
			event.stopPropagation();
			activateTooltip(false);
		});
		// Second column
		node.lastElementChild.addEventListener('mouseenter', (event) => {
			event.stopPropagation();
			activateTooltip(true);
		});
		// Row
		node.addEventListener('mouseleave', (event) => {
			event.stopPropagation();
			disableTooltip();
		});
		node.addEventListener('mouseout', (event) => {
			event.stopPropagation();
			if (event.target == node) {
				disableTooltip();
			}
		});
	}

	highlightChapters() {
		if (!this.options.highlightChapters) return;
		// Chapters list displayed
		let chapterList;
		try {
			chapterList = Array.from(document.querySelector('.chapter-container').children).reverse();
		} catch (e) {
			// probably because we're in reader, no chapters to highlight
			return;
		}

		// Collect language for each rows
		const languageMap = {};
		const rowLanguages = [];

		// Get the name of each "chapters" in the list - ignore first line
		let firstChapter;
		let foundNext = false;
		for (let i = 0; i < chapterList.length - 1; i++) {
			const element = chapterList[i];
			element.classList.add('has-fast-in-transition');
			let chapterVolume = this.getVolumeChapterFromNode(element.firstElementChild.firstElementChild);
			chapterVolume.chapterFloored = Math.floor(chapterVolume.chapter);

			if (firstChapter === undefined) {
				firstChapter = chapterVolume.chapter;
			}
			let maybeNext = chapterVolume.chapterFloored <= Math.floor(this.manga.lastMangaDexChapter) + 1;
			if (
				((this.manga.lastMyAnimeListChapter == -1 || this.manga.lastMangaDexChapter == -1) &&
					chapterVolume.chapter == firstChapter) ||
				(this.manga.lastMangaDexChapter == -1 &&
					this.manga.lastMyAnimeListChapter + 1 == chapterVolume.chapterFloored) ||
				(this.manga.lastMangaDexChapter != -1 &&
					chapterVolume.chapter > this.manga.lastMangaDexChapter &&
					maybeNext &&
					(foundNext === false || foundNext === chapterVolume.chapter))
			) {
				element.style.backgroundColor = this.options.nextChapterColor;
				foundNext = chapterVolume.chapter;
			} else if (
				this.manga.lastMyAnimeListChapter == chapterVolume.chapterFloored &&
				(this.manga.lastMangaDexChapter == -1 || chapterVolume.chapter == this.manga.lastMangaDexChapter)
			) {
				element.style.backgroundColor = this.options.lastReadColor;
			} else if (this.manga.lastMangaDexChapter == chapterVolume.chapter) {
				element.style.backgroundColor = this.options.lastOpenColors[0];
				// If save all opened is on we highlight them
			} else if (this.options.saveAllOpened) {
				let found = this.manga.chapters.find((value) => {
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

			// Assign row to it's language list
			if (this.options.separateLanguages) {
				const flag = element.querySelector('.flag');
				if (flag) {
					try {
						const code = /flag-(\w+)/.exec(flag.className)[1];
						rowLanguages.push({ code: code, node: element });
						languageMap[code] = flag.title;
						flag.title = `${flag.title} - ${code}`;
					} catch (error) {}
				}
			}
		}

		// Display or Hide other languages
		if (this.options.separateLanguages) {
			const navTabs = document.querySelector('ul.edit.nav.nav-tabs');
			if (navTabs) {
				// Find defaultLanguage
				const availableLanguages = Object.keys(languageMap);
				const hasWantedLanguage = availableLanguages.includes(this.options.defaultLanguage);
				const defaultLanguage = hasWantedLanguage ? this.options.defaultLanguage : 'all';

				// Update style to fix tab height
				for (const tab of navTabs.children) {
					tab.style.display = 'flex';
				}
				let currentTab = null;
				const hideAllExcept = (flag, tab) => {
					for (const row of rowLanguages) {
						if (flag == 'all' || row.code == flag) {
							row.node.classList.remove('is-hidden-chapter');
						} else {
							row.node.classList.add('is-hidden-chapter');
						}
					}
					if (currentTab) currentTab.classList.remove('active');
					currentTab = tab;
					currentTab.classList.add('active');
				};
				const createLanguageTab = (flag, name, title) => {
					const tab = document.createElement('li');
					tab.className = 'nav-item';
					const tabLink = document.createElement('a');
					tabLink.className = `nav-link tab-${flag}`;
					if (flag == this.options.defaultLanguage) {
						tabLink.classList.add('active');
					}
					tabLink.href = '#';
					tabLink.title = title;
					tabLink.addEventListener('click', (event) => {
						event.preventDefault();
						hideAllExcept(flag, tabLink);
					});
					const flagIcon = document.createElement('span');
					flagIcon.className = `rounded flag flag-${flag}`;
					const tabLanguage = document.createElement('span');
					tabLanguage.className = 'd-none d-md-inline';
					tabLanguage.textContent = name;
					tabLink.appendChild(flagIcon);
					tabLink.appendChild(document.createTextNode('\xA0'));
					tabLink.appendChild(tabLanguage);
					tab.appendChild(tabLink);
					navTabs.appendChild(tab);
					return tabLink;
				};

				// Add languages buttons
				const allTab = createLanguageTab('all', 'All Languages', 'Display chapters in all Languages');
				if (defaultLanguage == 'all') hideAllExcept(defaultLanguage, allTab);
				for (const language of availableLanguages) {
					const tab = createLanguageTab(
						language,
						languageMap[language],
						`Show only chapters in ${languageMap[language]}`
					);
					if (language == defaultLanguage) hideAllExcept(defaultLanguage, tab);
				}
			}
		}
	}

	addModalLabel(parent, labelName) {
		let row = document.createElement('div');
		row.className = 'row form-group';
		let label = document.createElement('label');
		label.className = 'col-sm-3 col-form-label';
		label.textContent = labelName;
		row.appendChild(label);
		let col = document.createElement('div');
		col.className = 'col px-0 my-auto';
		row.appendChild(col);
		parent.appendChild(row);
		return col;
	}

	addModalInput(parent, inputType, optionName, value, data = {}) {
		let input = document.createElement(inputType);
		input.className = 'form-control';
		input.value = value;
		input.dataset.mal = optionName;
		parent.appendChild(input);
		if (inputType == 'input') {
			input.type = data.type;
			if (data.type == 'number') {
				input.min = data.min;
				input.max = data.max;
				input.dataset.number = true;
			}
			if (data.type != 'checkbox') {
				input.placeholder = data.placeholder;
			} else {
				// Empty and style label
				parent.className = 'custom-control custom-checkbox form-check';
				// Input style
				input.id = optionName;
				input.className = 'custom-control-input';
				input.checked = value;
				// New label on the right
				let label = document.createElement('label');
				label.className = 'custom-control-label';
				label.textContent = data.label;
				label.setAttribute('for', optionName);
				parent.appendChild(label);
			}
		} else if (inputType == 'select') {
			if ('number' in data) {
				input.dataset.number = true;
			}
			data.elements.forEach((element) => {
				let option = document.createElement('option');
				if ('value' in element) {
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
		} else if (inputType == 'textarea') {
			input.placeholder = data.placeholder;
		}
	}

	addModalRow(parent, labelName, inputType, optionName, value, data = {}) {
		let col = this.addModalLabel(parent, labelName);
		if (!('placeholder' in data)) {
			data.placeholder = labelName;
		}
		this.addModalInput(col, inputType, optionName, value, data);
		return col;
	}

	modalControl(open) {
		if (CHROME) {
			document.documentElement.setAttribute('onreset', `$('#modal-mal').modal(${open ? '' : "'hide'"});`);
			document.documentElement.dispatchEvent(new CustomEvent('reset'));
			document.documentElement.removeAttribute('onreset');
		} else {
			// Same as for opening, unwrap and wrap jQuery
			if (open) {
				window.wrappedJSObject.jQuery('#modal-mal').modal();
			} else {
				window.wrappedJSObject.jQuery('#modal-mal').modal('hide');
			}
			XPCNativeWrapper(window.wrappedJSObject.jQuery);
		}
	}

	createMyAnimeListModal() {
		let modal = document.querySelector('#modal-mal');
		if (modal) modal.remove();
		// Container
		modal = document.createElement('div');
		modal.id = 'modal-mal';
		modal.className = 'modal show-advanced';
		modal.tabIndex = -1;
		modal.role = 'dialog';
		let modalDialog = document.createElement('div');
		modalDialog.className = 'modal-dialog modal-lg';
		modalDialog.role = 'document';
		modal.appendChild(modalDialog);
		let modalContent = document.createElement('div');
		modalContent.className = 'modal-content';
		modalDialog.appendChild(modalContent);

		// Header
		let modalHeader = document.createElement('div');
		modalHeader.className = 'modal-header';
		modalContent.appendChild(modalHeader);
		let modalTitle = document.createElement('h4');
		modalTitle.className = 'modal-title';
		modalTitle.textContent = 'MyAnimeList Informations';
		modalHeader.appendChild(modalTitle);
		let closeButton = document.createElement('button');
		closeButton.type = 'button';
		closeButton.className = 'close';
		closeButton.dataset.dismiss = 'modal';
		closeButton.textContent = '×';
		modalHeader.appendChild(closeButton);

		// Body
		let modalBody = document.createElement('div');
		modalBody.className = 'modal-body';
		modalContent.appendChild(modalBody);
		let bodyContainer = document.createElement('div');
		bodyContainer.className = 'container';
		modalBody.appendChild(bodyContainer);

		// Add all informations
		let nameCol = this.addModalLabel(bodyContainer, 'Title');
		nameCol.classList.add('mb-0');
		let nameLink = document.createElement('a');
		nameLink.textContent = this.manga.name;
		nameLink.href = `https://myanimelist.net/manga/${this.manga.myAnimeListId}`;
		nameCol.appendChild(nameLink);
		let deleteEntry = document.createElement('button');
		deleteEntry.className = 'btn btn-danger';
		deleteEntry.textContent = 'Delete on MyAnimeList';
		deleteEntry.addEventListener('click', async () => {
			await browser.runtime.sendMessage({
				action: 'fetch',
				url: `https://myanimelist.net/ownlist/manga/${this.manga.myAnimeListId}/delete`,
				options: {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: `csrf_token=${this.csrf}`,
				},
			});
			if (this.informationsNode != undefined) {
				clearDomNode(this.informationsNode);
				// Add a "Add to reading list" button
				let quickAddReading = this.createQuickButton('Start Reading', 1);
				// And a "Plan to read" button
				let quickAddPTR = this.createQuickButton('Add to Plan to Read list', 6);
				// Append
				this.informationsNode.appendChild(quickAddReading);
				this.informationsNode.appendChild(document.createTextNode(' '));
				this.informationsNode.appendChild(quickAddPTR);
			}
			this.notification(
				NOTIFY.SUCCESS,
				'Deleted',
				'The manga has been deleted on **MyAnimeList**.',
				this.myAnimeListImage
			);
			this.modalControl(false);
			this.highlightChapters();
		});
		let deleteCol = this.addModalLabel(bodyContainer, '');
		deleteCol.appendChild(deleteEntry);
		this.addModalRow(bodyContainer, 'Status', 'select', 'status', this.manga.status, {
			number: true,
			elements: [
				{ value: 1, text: 'Reading' },
				{ value: 2, text: 'Completed' },
				{ value: 3, text: 'On-Hold' },
				{ value: 4, text: 'Dropped' },
				{ value: 6, text: 'Plan to Read' },
			],
		});
		// START VOLUMES
		let volumesCol = this.addModalRow(
			bodyContainer,
			'Volumes Read',
			'input',
			'currentChapter.volume',
			this.manga.last_volume,
			{ type: 'number', min: 0, max: 9999 }
		);
		volumesCol.classList.add('input-group');
		let volumesOfContainer = document.createElement('div');
		volumesOfContainer.className = 'input-group-append';
		let volumesOf = document.createElement('span');
		volumesOf.className = 'input-group-text';
		volumesOf.textContent = `of ${this.manga.total_volume}`;
		volumesOfContainer.appendChild(volumesOf);
		volumesCol.appendChild(volumesOfContainer);
		// END VOLUMES // START CHAPTERS
		let chaptersCol = this.addModalRow(
			bodyContainer,
			'Chapters Read',
			'input',
			'currentChapter.chapter',
			this.manga.lastMyAnimeListChapter,
			{ type: 'number', min: 0, max: 9999 }
		);
		chaptersCol.classList.add('input-group');
		let chaptersOfContainer = document.createElement('div');
		chaptersOfContainer.className = 'input-group-append';
		let chaptersOf = document.createElement('span');
		chaptersOf.className = 'input-group-text';
		chaptersOf.textContent = `of ${this.manga.total_chapter}`;
		chaptersOfContainer.appendChild(chaptersOf);
		chaptersCol.appendChild(chaptersOfContainer);
		// END CHAPTERS
		this.addModalRow(bodyContainer, '', 'input', 'is_rereading', this.manga.is_rereading, {
			type: 'checkbox',
			label: 'Re-reading',
		});
		this.addModalRow(bodyContainer, 'Your score', 'select', 'score', this.manga.score, {
			number: true,
			elements: [
				{ value: '', text: 'Select score' },
				{ value: 10, text: '(10) Masterpiece' },
				{ value: 9, text: '(9) Great' },
				{ value: 8, text: '(8) Very Good' },
				{ value: 7, text: '(7) Good' },
				{ value: 6, text: '(6) Fine' },
				{ value: 5, text: '(5) Average' },
				{ value: 4, text: '(4) Bad' },
				{ value: 3, text: '(3) Very Bad' },
				{ value: 2, text: '(2) Horrible' },
				{ value: 1, text: '(1) Appalling' },
			],
		});
		// DATE START
		// prettier-ignore
		let months = [{ value: '', text: '' }, { value: 1, text: 'Jan' }, { value: 2, text: 'Feb' }, { value: 3, text: 'Mar' }, { value: 4, text: 'Apr' }, { value: 5, text: 'May' }, { value: 6, text: 'June' }, { value: 7, text: 'Jul' }, { value: 8, text: 'Aug' }, { value: 9, text: 'Sep' }, { value: 10, text: 'Oct' }, { value: 11, text: 'Nov' }, { value: 12, text: 'Dec' }];
		// prettier-ignore
		let days = [{ value: '' }, { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }, { value: 10 }, { value: 11 }, { value: 12 }, { value: 13 }, { value: 14 }, { value: 15 }, { value: 16 }, { value: 17 }, { value: 18 }, { value: 19 }, { value: 20 }, { value: 21 }, { value: 22 }, { value: 23 }, { value: 24 }, { value: 25 }, { value: 26 }, { value: 27 }, { value: 28 }, { value: 29 }, { value: 30 }, { value: 31 }];
		// prettier-ignore
		let years = [{ value: '' }, { value: 2020 }, { value: 2019 }, { value: 2018 }, { value: 2017 }, { value: 2016 }, { value: 2015 }, { value: 2014 }, { value: 2013 }, { value: 2012 }, { value: 2011 }, { value: 2010 }, { value: 2009 }, { value: 2008 }, { value: 2007 }, { value: 2006 }, { value: 2005 }, { value: 2004 }, { value: 2003 }, { value: 2002 }, { value: 2001 }, { value: 2000 }];
		let dateStart = this.addModalLabel(bodyContainer, 'Start date');
		dateStart.className = 'col px-0 my-auto form-inline input-group';
		this.addModalInput(dateStart, 'select', 'start_date.day', this.manga.start_date.day, {
			number: true,
			elements: days,
		});
		this.addModalInput(dateStart, 'select', 'start_date.month', this.manga.start_date.month, {
			number: true,
			elements: months,
		});
		this.addModalInput(dateStart, 'select', 'start_date.year', this.manga.start_date.year, {
			number: true,
			elements: years,
		});
		let appendStartToday = document.createElement('span');
		appendStartToday.className = 'input-group-append';
		let startToday = document.createElement('button');
		startToday.className = 'btn btn-secondary';
		startToday.textContent = 'Today';
		startToday.addEventListener('click', () => {
			let today = new Date();
			document.querySelector("[data-mal='start_date.day']").value = today.getDate();
			document.querySelector("[data-mal='start_date.month']").value = today.getMonth() + 1;
			document.querySelector("[data-mal='start_date.year']").value = today.getFullYear();
		});
		appendStartToday.appendChild(startToday);
		dateStart.appendChild(appendStartToday);
		let dateEnd = this.addModalLabel(bodyContainer, 'Finish date');
		dateEnd.className = 'col px-0 my-auto form-inline input-group';
		this.addModalInput(dateEnd, 'select', 'finish_date.day', this.manga.finish_date.day, {
			number: true,
			elements: days,
		});
		this.addModalInput(dateEnd, 'select', 'finish_date.month', this.manga.finish_date.month, {
			number: true,
			elements: months,
		});
		this.addModalInput(dateEnd, 'select', 'finish_date.year', this.manga.finish_date.year, {
			number: true,
			elements: years,
		});
		let appendEndToday = document.createElement('span');
		appendEndToday.className = 'input-group-append';
		let endToday = document.createElement('button');
		endToday.className = 'btn btn-secondary';
		endToday.textContent = 'Today';
		endToday.addEventListener('click', () => {
			let today = new Date();
			document.querySelector("[data-mal='finish_date.day']").value = today.getDate();
			document.querySelector("[data-mal='finish_date.month']").value = today.getMonth() + 1;
			document.querySelector("[data-mal='finish_date.year']").value = today.getFullYear();
		});
		appendEndToday.appendChild(endToday);
		dateEnd.appendChild(appendEndToday);
		// DATE END
		this.addModalRow(bodyContainer, 'Tags', 'textarea', 'tags', this.manga.tags);
		this.addModalRow(bodyContainer, 'Priority', 'select', 'priority', this.manga.priority, {
			number: true,
			elements: [
				{ value: 0, text: 'Low' },
				{ value: 1, text: 'Medium' },
				{ value: 2, text: 'High' },
			],
		});
		this.addModalRow(bodyContainer, 'Storage', 'select', 'storage_type', this.manga.storage_type, {
			number: true,
			elements: [
				{ value: '', text: 'None' },
				{ value: 1, text: 'Hard Drive' },
				{ value: 6, text: 'External HD' },
				{ value: 7, text: 'NAS' },
				{ value: 8, text: 'Blu-ray' },
				{ value: 2, text: 'DVD / CD' },
				{ value: 4, text: 'Retail Manga' },
				{ value: 5, text: 'Magazine' },
			],
		});
		this.addModalRow(bodyContainer, 'How many volumes ?', 'input', 'retail_volumes', this.manga.retail_volumes, {
			type: 'number',
			min: 0,
			max: 999,
		});
		this.addModalRow(bodyContainer, 'Total times re-read', 'input', 'total_reread', this.manga.total_reread, {
			type: 'number',
			min: 0,
			max: 999,
		});
		this.addModalRow(bodyContainer, 'Re-read value', 'select', 'reread_value', this.manga.reread_value, {
			number: true,
			elements: [
				{ value: '', text: 'Select reread value' },
				{ value: 1, text: 'Very Low' },
				{ value: 2, text: 'Low' },
				{ value: 3, text: 'Medium' },
				{ value: 4, text: 'High' },
				{ value: 5, text: 'Very High' },
			],
		});
		this.addModalRow(bodyContainer, 'Comments', 'textarea', 'comments', this.manga.comments);
		this.addModalRow(bodyContainer, 'Ask to discuss?', 'select', 'ask_to_discuss', this.manga.ask_to_discuss, {
			number: true,
			elements: [
				{ value: 0, text: 'Ask to discuss a chapter after you update the chapter #' },
				{ value: 1, text: "Don't ask to discuss" },
			],
		});
		this.addModalRow(bodyContainer, 'Post to SNS', 'select', 'sns_post_type', this.manga.sns_post_type, {
			number: true,
			elements: [
				{ value: 0, text: 'Follow default setting' },
				{ value: 1, text: 'Post with confirmation' },
				{ value: 2, text: 'Post every time (without confirmation)' },
				{ value: 3, text: 'Do not post' },
			],
		});

		// Footer
		let modalFooter = document.createElement('div');
		modalFooter.className = 'modal-footer';
		modalBody.appendChild(modalFooter);
		let modalSave = document.createElement('button');
		modalSave.type = 'button';
		modalSave.className = 'btn btn-success';
		this.appendTextWithIcon(modalSave, 'save', 'Save');
		modalSave.addEventListener('click', async () => {
			// Save each values
			let status;
			bodyContainer.querySelectorAll('[data-mal]').forEach((option) => {
				let keys = option.dataset.mal.split('.');
				if ('type' in option && option.type == 'checkbox') {
					this.manga[option.dataset.mal] = option.checked;
				} else if (keys.length == 2) {
					this.manga[keys[0]][keys[1]] = Math.floor(option.value) || option.value;
				} else if (keys == 'status') {
					status = option.value != '' ? Math.floor(option.value) : option.value;
				} else {
					this.manga[option.dataset.mal] =
						'number' in option.dataset && option.value != '' ? Math.floor(option.value) : option.value;
				}
			});

			await this.updateManga(false, status, true);
			this.notification(NOTIFY.SUCCESS, 'Manga Updated', undefined, this.myAnimeListImage);
			this.modalControl(false);
			this.highlightChapters(); // Highlight last again
			if (this.informationsNode != undefined) {
				this.insertMyAnimeListInformations();
			}
		});
		modalFooter.appendChild(modalSave);

		// Append
		document.body.appendChild(modal);
	}

	insertMyAnimeListButton(parentNode = undefined, rnew = true) {
		// Create the modal
		this.createMyAnimeListModal();

		// Insert on the header
		var button = document.createElement('a');
		button.title = 'Edit on MyAnimeList';
		button.dataset.toggle = 'modal';
		button.dataset.target = 'modal-mal';

		// Add icon and text
		if (parentNode === undefined) {
			button.className = 'btn btn-secondary float-right mr-1';
			this.appendTextWithIcon(button, 'edit', 'Edit on MyAnimeList');
		} else {
			button.className = `btn btn-secondary${rnew ? ' col m-1' : ''}`;
			this.appendTextWithIcon(button, 'edit', '');
		}
		// On click we hide or create the modal
		button.addEventListener('click', () => {
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
			let rereadButton = document.createElement('a');
			rereadButton.title = 'Re-read';
			// Add icon and text
			rereadButton.className = 'btn btn-secondary float-right mr-1';
			this.appendTextWithIcon(rereadButton, 'book-open', 'Re-read');
			// On click we hide or create the modal
			rereadButton.addEventListener('click', async () => {
				this.manga.currentChapter.chapter = 0;
				this.manga.lastMyAnimeListChapter = 0;
				this.manga.currentChapter.volume = 0;
				this.manga.last_volume = 0;
				this.manga.is_rereading = 1;

				await this.updateManga(false);
				this.insertMyAnimeListInformations();
				this.notification(
					NOTIFY.SUCCESS,
					'Re-reading',
					`You started re-reading **${this.manga.name}**`,
					this.getCurrentThumbnail()
				);
				// Update MangaDex to *Reading*
				if (this.options.updateMDList) {
					this.mangaDexStatus = 'Re-reading';
					await this.updateMangaDexList('manga_follow', 6);
				}
			});

			this.informationsNode.appendChild(rereadButton);
		}

		// Status
		let statusList = [
			{ color: 'blueviolet', text: 'Not on the list' },
			{ color: 'cornflowerblue', text: 'Reading' },
			{ color: 'darkseagreen', text: 'Completed' },
			{ color: 'orange', text: 'On-Hold' },
			{ color: 'firebrick', text: 'Dropped' },
			null,
			/* 5 doesn't exist */ { color: 'violet', text: 'Plan to Read' },
		];
		let status = document.createElement('span');
		status.style.color = statusList[this.manga.status].color;
		status.textContent = statusList[this.manga.status].text;
		this.informationsNode.appendChild(status);
		// Other "useful" informations
		this.informationsNode.appendChild(document.createElement('br'));
		this.appendTextWithIcon(
			this.informationsNode,
			'book',
			`Volume ${this.manga.last_volume}${
				Math.floor(this.manga.total_volume) > 0 ? ` out of ${this.manga.total_volume}` : ''
			}`
		);
		this.informationsNode.appendChild(document.createElement('br'));
		this.appendTextWithIcon(
			this.informationsNode,
			'bookmark',
			`Chapter ${this.manga.lastMyAnimeListChapter}${
				Math.floor(this.manga.total_chapter) > 0 ? ` out of ${this.manga.total_chapter}` : ''
			}${this.manga.is_rereading ? ' - Re-reading' : ''}`
		);
		this.informationsNode.appendChild(document.createElement('br'));
		if (this.manga.start_date.year != '') {
			this.appendTextWithIcon(
				this.informationsNode,
				'calendar-alt',
				`Start date ${this.manga.start_date.year}/${this.manga.start_date.month}/${this.manga.start_date.day}`
			);
			this.informationsNode.appendChild(document.createElement('br'));
		}
		if (this.manga.status == 2 && this.manga.finish_date.year != '') {
			this.appendTextWithIcon(
				this.informationsNode,
				'calendar-alt',
				`Finish date ${this.manga.finish_date.year}/${this.manga.finish_date.month}/${this.manga.finish_date.day}`
			);
			this.informationsNode.appendChild(document.createElement('br'));
		}
		let scoreText;
		if (this.manga.score == '') {
			scoreText = 'Not scored yet';
		} else {
			scoreText = `Scored ${this.manga.score} out of 10`;
		}
		this.appendTextWithIcon(this.informationsNode, 'star', scoreText);
	}

	async getTitleInfos() {
		let data = await storageGet(this.manga.mangaDexId);
		let outdatedMyAnimeList = false;
		// If there is no entry for mal link
		let notificationText = `Searching on the title page of **${this.manga.name}** to find a MyAnimeList id.`;
		if (data === undefined) {
			this.notification(NOTIFY.INFO, 'Searching MAL ID', notificationText, this.mmdImage);
		} else {
			// Get the mal id from the local storage
			Object.assign(this.manga, data);
			this.manga.myAnimeListId = data.mal;
			this.manga.lastMangaDexChapter = data.last;
			this.manga.chapters = data.chapters || [];
			// Check if there is an updated MAL id if lastTitle is older than 3 days (259200000ms)
			if (this.manga.myAnimeListId == 0 && (!data.lastTitle || Date.now() - data.lastTitle >= 259200000)) {
				this.notification(NOTIFY.INFO, 'Searching MAL ID', notificationText, this.mmdImage);
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
			action: 'fetch',
			url: `${domain}title/${this.manga.mangaDexId}`,
			options: {
				method: 'GET',
				cache: 'no-cache',
			},
		});
		this.manga.lastTitle = Date.now();
		// Scan the manga page for the mal icon and mal url
		let myAnimeListURL = /<a.+href='(.+)'>MyAnimeList<\/a>/.exec(data.body);
		// If regex is empty, there is no mal link, can't do anything
		if (data == undefined && myAnimeListURL == null && notifications) {
			this.notification(
				NOTIFY.ERROR,
				'No MyAnimeList ID',
				'Last open chapters are still saved.',
				this.mmdCrossedImage,
				true
			);
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
		if (manga.chapters.indexOf(chapter) === -1 && chapter >= 0) {
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
				position: 'bottom-left',
				sticky: sticky,
			};
			SimpleNotification[type](
				{
					title: title,
					image: image,
					text: text,
				},
				options
			);
		}
	}

	getChapterListGroups() {
		let chapterContainer = document.querySelector('.chapter-container');
		if (!chapterContainer) return [];
		let nodes = chapterContainer.children;
		let groups = [];
		if (nodes.length > 1) {
			let currentGroup = { chapters: [] };
			for (let i = 1; i < nodes.length; i++) {
				let chapterRow = nodes[i].querySelector('[data-chapter]');
				let titleId = Math.floor(chapterRow.dataset.mangaId);
				let isFirstRow = nodes[i].firstElementChild.childElementCount > 0;
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
		let quickButton = document.createElement('button');
		quickButton.className = 'btn btn-default';
		quickButton.textContent = content;
		quickButton.addEventListener('click', async () => {
			await this.quickAddOnMyAnimeList(status);
		});
		return quickButton;
	}

	async saveTitleInHistory(manga) {
		if (isNaN(+manga.mangadexId)) return;
		// Load History and initialize if it's empty
		if (!this.history) {
			this.history = await storageGet('history');
		}
		if (this.history == undefined) {
			this.history = [];
		}
		// Remove the manga id to the list if it's in -- it's added back at the end
		let index = this.history.indexOf(manga.mangaDexId);
		if (index >= 0) {
			this.history.splice(index, 1);
		}
		this.history.push(manga.mangaDexId);
		// Cut history if it's too long
		if (this.history.length > this.options.historySize) {
			let diff = this.history.length - this.options.historySize;
			this.history.splice(0, diff);
		}
		// Update manga to storage History informations
		manga.name = manga.name;
		manga.progress = manga.currentChapter || manga.progress;
		manga.lastRead = Date.now();
		await storageSet('history', this.history);
	}

	chapterStringFromObject(chapter) {
		if (chapter == null || chapter == undefined) return 'Chapter Unknown';
		if (typeof chapter != 'object') {
			return `Chapter ${chapter}`;
		}
		let string = [];
		if (chapter.volume > 0) {
			string.push(`Vol. ${chapter.volume} `);
		}
		if (chapter.chapter <= 0) {
			string.push('Chapter 0');
		} else {
			string.push(`Chapter ${chapter.chapter}`);
		}
		return string.join('');
	}

	setCardLastRead(card, title) {
		card.dataset.toggle = 'tooltip';
		card.dataset.placement = 'bottom';
		card.dataset.html = true;
		let date = new Date(title.lastTitle);
		let content = [];
		if (title.lastTitle) {
			content.push(
				`${date.getUTCDate()} ${date.toDateString().split(' ')[1]} ${date.getUTCFullYear()} ${
					date.toTimeString().split(' ')[0]
				}`
			);
		}
		if (title.lastRead) {
			date = new Date(title.lastRead);
			content.push(
				`<span style="color:rgb(51,152,182)"> ${date.getUTCDate()} ${
					date.toDateString().split(' ')[1]
				} ${date.getUTCFullYear()} ${date.toTimeString().split(' ')[0]}</span>`
			);
		}
		card.title = content.join('<br>');
	}

	buildHistoryEntryNode(id, title) {
		// Build
		let container = document.createElement('div');
		container.className = 'large_logo rounded position-relative mx-1 my-2 has-transition';
		let hover = document.createElement('div');
		hover.className = 'hover';
		let titleLinkImage = document.createElement('a');
		titleLinkImage.rel = 'noreferrer noopener';
		titleLinkImage.href = `/manga/${id}`;
		let titleImage = document.createElement('img');
		titleImage.className = 'rounded';
		titleImage.title = title.name;
		titleImage.src = `/images/manga/${id}.large.jpg`;
		titleImage.style.width = '100%';
		let informationsContainer = document.createElement('div');
		informationsContainer.className = 'car-caption px-2 py-1';
		let titleName = document.createElement('p');
		titleName.className = 'text-truncate m-0';
		let titleLinkName = document.createElement('a');
		titleLinkName.className = 'manga_title white';
		titleLinkName.title = title.name;
		titleLinkName.rel = 'noreferrer noopener';
		titleLinkName.href = `/title/${id}`;
		titleLinkName.textContent = title.name;
		let chapterInfo = document.createElement('p');
		chapterInfo.className = 'text-truncate m-0';
		let chapterLink = document.createElement('a');
		chapterLink.className = 'white';
		chapterLink.rel = 'noreferrer noopener';
		chapterLink.href = `/chapter/${title.chapterId}`;
		chapterLink.textContent = this.chapterStringFromObject(title.progress);
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
		return `${domain}images/manga/${this.manga.mangaDexId}.thumb.jpg`;
	}

	timeout(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
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

		if (this.pageType != 'title') {
			this.manga = { mangaDexId: dataNode.dataset.mangaId };
			await this.getTitleInfos();

			if (this.manga.myAnimeListId) await this.fetchMyAnimeList();
		}
		this.manga.currentChapter = this.manga.currentChapter || { chapter: -1, volume: 0 };
		this.manga.lastMangaDexChapter = this.manga.lastMangaDexChapter || this.manga.currentChapter.chapter;
		this.manga.chapters = this.manga.chapters || [];
		if (markUnread) {
			let updateLast = this.manga.lastMangaDexChapter == chapter;
			if (updateLast) {
				this.manga.currentChapter.chapter = 0;
				this.manga.lastMangaDexChapter = 0;
			}
			this.manga.chapters = this.manga.chapters.filter((chap) => {
				// update to next smaller chapter
				if (updateLast && chap < chapter) {
					this.manga.currentChapter.chapter = chap;
					this.manga.lastMangaDexChapter = chap;
					updateLast = false;
				}
				return chap != chapter;
			});
		} else {
			this.insertChapter(chapter);
			if (chapter > this.manga.lastMangaDexChapter || chapter > this.manga.lastMyAnimeListChapter) {
				this.manga.currentChapter.chapter = chapter;
				this.manga.lastMangaDexChapter = chapter;
			}
		}

		if (
			this.manga.myAnimeListId &&
			(!this.manga.lastMyAnimeListChapter ||
				Math.floor(this.manga.lastMangaDexChapter) != this.manga.lastMyAnimeListChapter)
		) {
			const { requestURL, body } = buildMyAnimeListBody(true, this.manga, this.csrf, this.manga.status || 1);
			await browser.runtime.sendMessage({
				action: 'fetch',
				url: requestURL,
				options: {
					method: 'POST',
					body: body,
					redirect: 'follow',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					},
				},
			});
			this.manga.lastMAL = Date.now();
		}

		// no need to wait until it's saved
		updateLocalStorage(this.manga, this.options);
		if (this.pageType == 'title') {
			this.highlightChapters();
		} else if (this.pageType == 'chapterList') {
			delete this.titleInformations[this.manga.mangaDexId];
			this.chapterListPage(false);
		}
		return true;
	}

	// END HELP / START PAGE

	async chapterListPage(checkUpdates = true) {
		if (
			!this.options.highlightChapters &&
			!this.options.hideLowerChapters &&
			!this.options.hideHigherChapters &&
			!this.options.hideLastRead &&
			!this.options.showTooltips
		) {
			return;
		} // Abort early if useless - no highlight, no hiding and no thumbnails
		let groups = this.getChapterListGroups();
		let lastChapter = groups.length;
		let titleInformations = this.titleInformations || {};
		this.titleInformations = titleInformations; // save object reference

		const checkTitle = (id) =>
			(checkUpdates && !titleInformations[id].getsUpdated) ||
			(!checkUpdates && titleInformations[id].getsUpdated);

		// collect information
		let toUpdate = [];
		for (let i = 0; i < lastChapter; i++) {
			let group = groups[i];
			// Get title informations from LocalStorage
			if (!titleInformations[group.titleId]) {
				titleInformations[group.titleId] = await storageGet(group.titleId);
				if (titleInformations[group.titleId]) {
					titleInformations[group.titleId].next = Math.floor(titleInformations[group.titleId].last) + 1;
					titleInformations[group.titleId].getsUpdated = !checkUpdates;
				}
			}

			// if there is data, find the next chapter
			// no need to check the title if an update is fetched anyways
			// but if it's the next pass, check it
			let informations = titleInformations[group.titleId];
			if (informations && checkTitle(group.titleId)) {
				let chapterCount = group.chapters.length;

				for (let j = 0; j < chapterCount; j++) {
					let chapter = group.chapters[j];

					// if higher chapter
					if (chapter.value > informations.last) {
						// might be next
						if (Math.floor(chapter.value) <= informations.last + 1) {
							informations.next = Math.min(informations.next, chapter.value);
						}
						// if check for updates, has mal title and last checked more than 12 hours ago (12*60*60*1000ms)
						if (
							checkUpdates &&
							this.options.updateOnFollows &&
							toUpdate.length < 7 &&
							!informations.getsUpdated &&
							informations.mal != 0 &&
							(!informations.lastMAL || Date.now() - informations.lastMAL >= 43200000)
						) {
							toUpdate.push(
								Object.assign({}, informations, {
									myAnimeListId: informations.mal,
									mangaDexId: group.titleId,
									lastMangaDexChapter: informations.last,
									chapters: informations.chapters || [],
								})
							);
							informations.next = Infinity;
							informations.getsUpdated = true;
							break; // no need to check this title any more
						}
					}
				}
			}
		}
		if (toUpdate.length) {
			(async (toUpdate) => {
				for (const manga of toUpdate) {
					if (!this.loggedMyAnimeList) break;
					let ret = await this.fetchMyAnimeList(manga);
					if (ret.status >= 200 && ret.status < 400 && this.loggedMyAnimeList && manga.is_approved) {
						manga.currentChapter = manga.currentChapter || {};
						manga.currentChapter.chapter = Math.max(
							manga.lastMyAnimeListChapter,
							manga.lastMangaDexChapter
						);
						if (this.options.saveAllOpened) {
							this.insertChapter(manga.currentChapter.chapter, manga);
						}
						await updateLocalStorage(manga, this.options);
					}
					await this.timeout(1000);
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
				let informations = titleInformations[group.titleId];

				// If there is data
				if (informations && checkTitle(group.titleId)) {
					let chapterCount = group.chapters.length;
					let highestChapter = Math.max.apply(
						Math,
						group.chapters.map((e) => {
							return e.value;
						})
					);
					for (let j = 0; j < chapterCount; j++) {
						let chapter = group.chapters[j];
						if (
							(chapter.hidden =
								(this.options.hideHigherChapters && informations.next < chapter.value) ||
								(this.options.hideLowerChapters && informations.last > chapter.value) ||
								(this.options.hideLastRead &&
									informations.last == chapter.value &&
									informations.next != Infinity))
						) {
							chapter.node.classList.add('is-hidden-chapter');
						}
					}
					if (group.chapters[0].hidden) {
						// Display the title on the first not hidden chapter
						let j = 1;
						while (j < chapterCount && group.chapters[j].hidden) {
							j++;
						}
						if (j < chapterCount) {
							let link = document.createElement('a');
							link.textContent = group.name;
							link.className = 'text-truncate';
							link.href = `/title/${group.titleId}`;
							link.title = group.name;
							group.chapters[j].node.firstElementChild.appendChild(link);
						}
					}
				}
			}

			// Button
			let rows = document.querySelectorAll('.is-hidden-chapter');
			let hiddenCount = rows.length;

			let navBar = document.querySelector('.nav.nav-tabs');
			let button = document.querySelector('.mmdNav-hidden');
			let show = false;
			if (button) {
				show = !!button.firstChild.dataset.show;
				button.remove();
			}

			if (hiddenCount > 0) {
				button = document.createElement('li');
				button.className = 'nav-item mmdNav mmdNav-hidden';
				let link = document.createElement('a');
				this.appendTextWithIcon(link, 'eye', `${!show ? 'Show' : 'Hide'} Hidden (${hiddenCount})`);
				if (show) link.dataset.show = true;
				link.className = 'nav-link';
				link.href = '#';
				link.addEventListener('click', (event) => {
					event.preventDefault();
					clearDomNode(link);
					if (!link.dataset.show) {
						link.dataset.show = true;
						this.appendTextWithIcon(link, 'eye', `Hide Hidden (${hiddenCount})`);
						rows.forEach((node) => {
							node.classList.add('is-visible');
						});
					} else {
						delete link.dataset.show;
						this.appendTextWithIcon(link, 'eye', `Show Hidden (${hiddenCount})`);
						rows.forEach((node) => {
							node.classList.remove('is-visible');
						});
					}
				});
				button.appendChild(link);
				if (navBar.lastElementChild.classList.contains('ml-auto')) {
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
			let colors = this.options.lastOpenColors,
				lastColor = colors.length,
				currentColor = 0;
			for (let i = 0; i < lastChapter; i++) {
				let group = groups[i];
				let informations = titleInformations[group.titleId];
				// If there is data
				if (informations) {
					let chapterCount = group.chapters.length;
					let outerColor = colors[currentColor];
					for (let j = 0; j < chapterCount; j++) {
						let chapter = group.chapters[j];
						chapter.node.classList.add('has-fast-in-transition');
						// toggle is loading
						if (informations.getsUpdated) {
							chapter.node.classList.toggle('is-loading', checkUpdates);
						}
						if (checkTitle(group.titleId)) {
							if (informations.next == chapter.value) {
								paintRow(chapter.node, this.options.nextChapterColor);
								group.selected = j;
								outerColor = this.options.nextChapterColor;
							} else if (informations.last < chapter.value) {
								paintRow(chapter.node, this.options.higherChaptersColor);
							} else if (informations.last > chapter.value) {
								paintRow(chapter.node, this.options.lowerChaptersColor);
							} else if (informations.last == chapter.value) {
								paintRow(chapter.node, colors[currentColor]);
								group.selected = j;
							} else {
								paintRow(chapter.node, '');
							}
						}
					}
					if (group.selected > 0 && checkTitle(group.titleId)) {
						for (let j = 0; j < chapterCount; j++) {
							if (
								j == group.selected ||
								group.chapters[j].hidden ||
								group.chapters[j].value == group.chapters[group.selected].value
							)
								continue;
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
		if (this.options.showTooltips) {
			if (!this.tooltipContainer && !(this.tooltipContainer = document.querySelector('#mmd-tooltip'))) {
				this.tooltipContainer = document.createElement('div');
				this.tooltipContainer.id = 'mmd-tooltip';
				document.body.appendChild(this.tooltipContainer);
			}
			for (let i = 0; i < lastChapter; i++) {
				let group = groups[i];
				if (!titleInformations[group.titleId] || checkTitle(group.titleId)) {
					let chapterCount = group.chapters.length;
					titleInformations[group.titleId] = titleInformations[group.titleId] || {};
					// clear the chapters on first title tooltip
					titleInformations[group.titleId].options = titleInformations[group.titleId].options || {
						clear: true,
					};
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
					if (titleInformations[title].getsUpdated) titleInformations[title].getsUpdated = false;
				if (titleInformations[title].options)
					// make sure to update tooltips (eye-click)
					delete titleInformations[title].options;
			}
		}
	}

	async titlePage() {
		// Name and ID
		this.manga.name = document.querySelector('h6.card-header').textContent.trim();
		this.manga.mangaDexId = /.+title\/(\d+)/.exec(this.pageUrl);
		if (this.manga.mangaDexId === null) {
			let dropdown = document.getElementById('1');
			if (dropdown !== null) {
				this.manga.mangaDexId = Math.floor(dropdown.dataset.mangaId);
			}
		} else {
			this.manga.mangaDexId = Math.floor(this.manga.mangaDexId[1]);
		}

		// Load local save
		let data = await storageGet(this.manga.mangaDexId);
		if (data !== undefined) {
			Object.assign(this.manga, data);
			this.manga.lastMangaDexChapter = data.last;
			this.manga.chapters = data.chapters || [];
			this.manga.currentChapter.chapter = data.last;
		}
		this.manga.lastTitle = Date.now();

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

		// MangaDex status
		this.mangaDexLoggedIn =
			document.querySelector('button[disabled][title="You need to log in to use this function."]') == null;
		this.mangaDexStatus = false;
		this.mangaDexScore = 0;
		if (this.mangaDexLoggedIn) {
			let mangaDexStatus = document.querySelector('.disabled.dropdown-item.manga_follow_button');
			this.mangaDexStatus = mangaDexStatus ? mangaDexStatus.textContent.trim() : false;
			let mangaDexScore = document.querySelector('.disabled.dropdown-item.manga_rating_button');
			if (mangaDexScore) {
				this.mangaDexScore = Math.floor(mangaDexScore.id);
			}
		}

		// Find Highest chapter
		if (this.options.checkHistoryLatest) {
			const highestNode = document.querySelector('[data-chapter]');
			if (highestNode !== null) {
				const highest = parseFloat(highestNode.dataset.chapter);
				if (!isNaN(highest) && (!this.manga.highest || this.manga.highest < highest)) {
					this.manga.highest = highest;
				}
			}
		}

		// Update everytime to save updated MAL id and lastTitle
		let storageSet = updateLocalStorage(this.manga, this.options);

		// Informations
		let parentNode = document.querySelector('.col-xl-9.col-lg-8.col-md-7');
		let informationsRow = document.querySelector('.mmdInfoRow');
		if (!informationsRow) {
			informationsRow = document.createElement('div');
			informationsRow.className = 'row m-0 py-1 px-0 border-top mmdInfoRow';
			parentNode.insertBefore(informationsRow, parentNode.lastElementChild);
			let informationsLabel = document.createElement('div');
			informationsLabel.className = 'col-lg-3 col-xl-2 strong';
			informationsLabel.textContent = 'Status:';
			informationsRow.appendChild(informationsLabel);
		}
		this.informationsNode = document.querySelector('.mmdInfoNode');
		if (!this.informationsNode) {
			this.informationsNode = document.createElement('div');
			this.informationsNode.className = 'col-lg-9 col-xl-10 mmdInfoNode';
			informationsRow.appendChild(this.informationsNode);
		}

		const appendErrorMessage = (message) => {
			const messageNode = document.createElement('span');
			messageNode.textContent = message;
			informationsRow.classList.add('mmd-background-info');
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
							this.manga.currentChapter.chapter = Math.max(
								this.manga.lastMyAnimeListChapter,
								this.manga.lastMangaDexChapter
							);
							if (this.options.saveAllOpened) {
								this.insertChapter(this.manga.currentChapter.chapter);
							}
							await storageSet.then(() => {
								updateLocalStorage(this.manga, this.options);
							});
						} else {
							clearDomNode(this.informationsNode);
							// Add a "Add to reading list" button
							let quickAddReading = this.createQuickButton('Start Reading', 1);
							// And a "Plan to read" button
							let quickAddPTR = this.createQuickButton('Add to Plan to Read list', 6);
							// Append
							this.informationsNode.appendChild(quickAddReading);
							this.informationsNode.appendChild(document.createTextNode(' '));
							this.informationsNode.appendChild(quickAddPTR);
						}
					} else {
						appendErrorMessage("The manga is still pending approval on MyAnimelist and can't be updated.");
					}
				} else {
					appendErrorMessage('Login on MyAnimeList to display informations.');
				}
			} else {
				if (ret.status >= 500) {
					appendErrorMessage(`Status code: ${ret.status}. MyAnimeList might be down, retry later.`);
				} else {
					appendErrorMessage(`Status code: ${ret.status}. Open an issue.`);
				}
			}
		} else {
			appendErrorMessage(
				'No MyAnimeList found. When one is added, MyMangaDex will find it if you visit this page again.'
			);
		}

		this.highlightChapters();

		// Add MangaDex Score to MyAnimeList score -- only if valid and in list
		if (this.mangaDexLoggedIn && this.loggedMyAnimeList && this.manga.is_approved) {
			const ratings = document.querySelectorAll('a.manga_rating_button');
			if (ratings && ratings.length == 10) {
				const dropdown = ratings[0].parentElement;
				let currentRating = null;
				for (const oldRating of ratings) {
					// Replace old node to remove all events
					let rating = oldRating.cloneNode(true);
					dropdown.replaceChild(rating, oldRating);
					rating.addEventListener('click', async (event) => {
						event.preventDefault();
						if (!this.manga.in_list) return;
						if (currentRating == rating) return;
						// Send requests
						await browser.runtime.sendMessage({
							action: 'fetch',
							url: `${domain}ajax/actions.ajax.php?function=manga_rating&id=${
								rating.dataset.mangaId
							}&rating=${rating.id}&_=${Date.now()}`,
							options: {
								method: 'GET',
								cache: 'no-cache',
								credentials: 'include',
								headers: {
									'X-Requested-With': 'XMLHttpRequest',
								},
							},
						});
						this.manga.score = +rating.id;
						this.mangaDexScore = +rating.id;
						await this.updateManga(false, this.manga.status, true);
						this.notification(
							NOTIFY.SUCCESS,
							'Rating updated',
							'Your rating has been updated on both **MyAnimeList** and **MangaDex**.'
						);
						// Update style
						if (currentRating) {
							currentRating.classList.remove('disabled');
						}
						currentRating = rating;
						rating.classList.add('disabled');
						dropdown.previousElementSibling.childNodes[1].textContent = ` ${rating.id} `;
					});
				}
				currentRating = dropdown.querySelector('.disabled');
			}
		}
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
				SimpleNotification.info(
					{
						title: 'Not in list',
						text:
							"The title is not in your **MangaDex** reading list and wasn't updated, but you can still update it.",
						image: this.getCurrentThumbnail(),
						buttons: [
							{
								value: 'Update',
								type: 'success',
								onClick: async (n) => {
									n.remove();
									this.manga.currentChapter = newChapter;
									await this.updateManga();
								},
							},
							{
								value: 'Close',
								type: 'error',
								onClick: (n) => n.remove(),
							},
						],
					},
					{ position: 'bottom-left', duration: 10000 }
				);
			}
		} else {
			if (oldChapter) {
				this.manga.currentChapter = oldChapter;
			}
			this.notification(
				NOTIFY.ERROR,
				'Chapter Delayed',
				'The chapter was not updated and saved since it is delayed on MangaDex.',
				this.getCurrentThumbnail()
			);
		}
	}

	async singleChapterPageLegacy() {
		// Informations
		let chapter = document.querySelector("meta[property='og:title']").content;
		chapter = document.querySelector("meta[property='og:image']").content;
		this.manga.mangaDexId = Math.floor(/manga\/(\d+)\.thumb.+/.exec(chapter)[1]);
		await this.getTitleInfos();
		// We can use the info on the page if we don't change chapter while reading
		this.manga.currentChapter = this.getVolumeChapterFromString(chapter);
		this.manga.chapterId = Math.floor(
			/\/(\d+)\/?/.exec(document.querySelector("meta[property='og:url']").content)[1]
		);

		await this.fetchMyAnimeList();
		if (this.mangaDexStatus === undefined && (this.options.updateMDList || this.options.updateOnlyInList)) {
			await this.fetchTitleInfos();
		}
		// Get MAL Url from the database
		const delayed = !!document.querySelector('div.container > div.alert.alert-danger');
		this.updateChapter(delayed);
		if (this.manga.exist && this.manga.is_approved) {
			this.insertMyAnimeListButton(document.querySelector('.card-body .col-md-4.mb-1'), false);
		}
	}

	async singleChapterEvent(data, firstRun) {
		if (firstRun) {
			// Informations
			this.manga.mangaDexId = data.manga_id;
			await this.getTitleInfos();

			this.manga.chapterId = data.id;
			await this.fetchMyAnimeList();

			if (this.manga.exist && this.manga.is_approved) {
				this.insertMyAnimeListButton(
					document.querySelector('.reader-controls-actions.col-auto.row.no-gutters.p-1').lastElementChild
				);
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
			chapter: parseFloat(data.chapter) || 0,
		};
		const delayed = data.status != 'OK' && data.status != 'external';
		this.updateChapter(delayed, oldChapter);
		this.manga.chapterId = data.id;
	}

	singleChapterPage() {
		this.manga.name = /scans\s*,\s+(.+)\s+mangadex/i.exec(
			document.querySelector("meta[name='keywords']").content
		)[1];
		const legacyReader = !document.querySelector('.reader-controls-container');
		if (legacyReader) {
			this.singleChapterPageLegacy();
			return;
		}

		let firstRun = true;
		// only injected scripts can access global variables, but we also need chrome (only in content scripts)
		// -> custom events to communicate
		function relayChapterEvent() {
			let addEvent = () =>
				window.reader.model.on('chapterchange', (data) => {
					// note: this function needs to have an actual body to avoid a return
					// EventEmitter.js removes an event if return matches (default: true)
					document.dispatchEvent(new CustomEvent('mmdChapterChange', { detail: data._data }));
				});
			// If the MangaDex reader still hasn't been loaded, check every 50ms
			if (window.reader === undefined) {
				let c = setInterval(() => {
					if (window.reader !== undefined) {
						clearInterval(c);
						addEvent();
					}
				}, 50);
			} else addEvent();
		}
		injectScript(relayChapterEvent);

		document.addEventListener('mmdChapterChange', async (event) => {
			await this.singleChapterEvent(event.detail, firstRun);
			firstRun = false;
		});
	}

	titlesListPage() {
		let founds = document.querySelectorAll('.row.m-0.border-bottom');
		let max = founds.length;

		// if there is no table the list is not expanded or simple
		if (max == 0 || !this.options.showTooltips) {
			return;
		}

		// Create the tooltip holder
		this.tooltipContainer = document.createElement('div');
		this.tooltipContainer.id = 'mmd-tooltip';
		document.body.appendChild(this.tooltipContainer);

		// Create the tooltips
		for (let i = 1; i < max; i++) {
			let id = /title\/(\d+)\/?.*/.exec(
				founds[i].firstElementChild.firstElementChild.firstElementChild.children[1].href
			)[1];
			this.tooltip(founds[i], id);
		}
	}

	/**
	 * Return an object of highest chapters found in the follow page with title IDs as keys
	 * method: 1 for Reading list, 0 for all lists
	 */
	async fetchFollowPage(parser, page, method) {
		const before = Date.now();
		const response = await browser.runtime.sendMessage({
			action: 'fetch',
			url: `https://mangadex.org/follows/chapters/${method}/${page}/`,
			options: {
				method: 'GET',
				cache: 'no-cache',
				credentials: 'include',
				redirect: 'follow',
			},
		});
		let result = {
			titles: false,
			isLastPage: false,
			maxPage: 0,
			requestTime: Date.now() - before,
		};
		if (response.status >= 200 && response.status < 400) {
			const body = parser.parseFromString(response.body, 'text/html');
			// Check if we're out of bounds
			if (body.querySelector('#chapters .alert.alert-warning') != null) {
				result.titles = true;
				result.isLastPage = true;
				return result;
			}
			// Get titles
			const rows = body.querySelectorAll('[data-manga-id]');
			result.titles = {};
			rows.forEach((element) => {
				const id = element.dataset.mangaId;
				const chapter = parseFloat(element.dataset.chapter);
				if (result.titles[id] === undefined) {
					result.titles[id] = chapter;
				} else {
					result.titles[id] = Math.max(result.titles[id], chapter);
				}
			});
			// Last page
			const lastPageNode = body.querySelector('nav > ul.pagination > li.disabled:last-child');
			result.isLastPage = lastPageNode != null;
			// Page count
			if (result.isLastPage) {
				result.maxPage = page;
			} else {
				// Find the max page
				const maxPageNode = body.querySelector(
					`nav > ul.pagination > .page-item:last-child > a[href^="/follows/chapters/${method}/"]`
				);
				if (maxPageNode) {
					const res = /\/follows\/chapters\/\d\/(\d+)\/?/.exec(maxPageNode.href);
					result.maxPage = res !== null ? Math.floor(res[1]) : page;
				}
			}
		} else {
			result.isLastPage = true;
		}
		return result;
	}

	async historyPage() {
		if (!this.options.updateHistoryPage) return;
		let container = document.getElementById('history');
		let infoNode = container.querySelector('p');
		const resetInfo = () => {
			infoNode.textContent = `Your last ${this.options.historySize} read titles are listed below.`;
		};
		resetInfo();
		// Load history -- and related Titles
		let localTitles = {};
		this.history = await storageGet('history');
		if (this.history === undefined) {
			this.history = [];
			await storageSet('history', this.history);
		} else if (this.history.length > 0) {
			localTitles = await storageGet(this.history);
		}
		// Add current elements to the history - first one is inserted last
		let mdTitles = Array.from(
			document.querySelectorAll('.large_logo.rounded.position-relative.mx-1.my-2')
		).reverse();
		for (const node of mdTitles) {
			let chapterLink = node.querySelector("a[href^='/chapter/']");
			const mangaDexId = Math.floor(/\/title\/(\d+)\/.+./.exec(node.querySelector("a[href^='/title/']").href)[1]);
			let title = {
				name: node.querySelector('.manga_title').textContent,
				chapterId: Math.floor(/\/chapter\/(\d+)/.exec(chapterLink.href)[1]),
				progress: this.getVolumeChapterFromString(chapterLink.textContent),
			};
			// Check if the title is in the history
			if (this.history.indexOf(mangaDexId) < 0) {
				// If it wasn't, it's not loaded
				localTitles[mangaDexId] = await storageGet(mangaDexId);
			}
			// Create a new Title if it doesn't exists -- it will be saved in the next condition
			if (localTitles[mangaDexId] === undefined) {
				localTitles[mangaDexId] = {
					chapters: [],
					last: -1,
					mal: 0,
				};
			}
			// Save only if the title isn't already in the list or if the chapter is different
			if (this.history.indexOf(mangaDexId) < 0 || localTitles[mangaDexId].chapterId != title.chapterId) {
				await this.saveTitleInHistory({ mangaDexId: mangaDexId });
				Object.assign(localTitles[mangaDexId], title);
				await storageSet(mangaDexId, localTitles[mangaDexId]);
			}
		}
		// Display additionnal history
		let historyCards = {};
		for (let i = this.history.length - 1; i >= 0; i--) {
			const titleId = this.history[i];
			const title = localTitles[titleId];
			if (title !== undefined) {
				let exist = container.querySelector(`a[href^='/title/${titleId}']`);
				let entryNode;
				if (!exist) {
					entryNode = this.buildHistoryEntryNode(titleId, title);
					container.insertBefore(entryNode, container.lastElementChild);
				} else {
					entryNode = exist.parentElement.parentElement;
				}
				this.setCardLastRead(entryNode, title);
				historyCards[titleId] = entryNode;
			}
		}
		// Enable jQuery tooltips
		if (CHROME) {
			document.documentElement.setAttribute('onreset', `$(() => { $('[data-toggle="tooltip"]').tooltip() })`);
			document.documentElement.dispatchEvent(new CustomEvent('reset'));
			document.documentElement.removeAttribute('onreset');
		} else {
			window.wrappedJSObject.jQuery("[data-toggle='tooltip']").tooltip();
			XPCNativeWrapper(window.wrappedJSObject.jQuery);
		}
		// Check latests chapters
		if (this.options.checkHistoryLatest) {
			// Highlight with current state
			for (const titleId in localTitles) {
				const title = localTitles[titleId];
				if (title.highest !== undefined && historyCards[titleId] !== undefined) {
					if (title.highest <= title.last) {
						historyCards[titleId].classList.add('history-up');
					} else if (title.highest > title.last) {
						historyCards[titleId].classList.add('history-down');
					}
				}
			}
			// Add "Refresh" button -- only if last fetch was >24h
			const parser = new DOMParser();
			const historySize = Object.keys(historyCards).length;
			let pauseTimer = false;
			const lastHistory = await storageGet('lastHistory');
			if (lastHistory === undefined || Date.now() - lastHistory >= 24 * 60 * 60 * 1000) {
				const initializedHistory = await storageGet('initializedHistory');
				const alert = document.createElement('div');
				alert.className = 'alert alert-primary';
				if (!initializedHistory) {
					alert.textContent = `
						You never initialized your History.
						It is recommend to do it at least once to highlight every cards.`;
				} else {
					alert.textContent = `
						You refresh your history more than 24h ago and you can refresh it again.
						It is not recommended to do it often, and it does nothing if you didn't add new titles to your list.`;
				}
				alert.appendChild(document.createTextNode('\xA0'));
				const refreshButton = document.createElement('button');
				refreshButton.className = 'btn btn-primary';
				refreshButton.textContent = 'Refresh';
				let busy = false;
				refreshButton.addEventListener('click', async (event) => {
					event.preventDefault();
					if (!busy) {
						busy = true;
						pauseTimer = true;
						refreshButton.style.display = 'none';
						document.body.appendChild(refreshButton);
						const firstRow = document.createElement('span');
						const secondRow = document.createElement('span');
						alert.textContent = '';
						alert.appendChild(firstRow);
						alert.appendChild(document.createElement('br'));
						alert.appendChild(secondRow);
						// Fetch ALL pages until it is done
						let localTitles = {};
						let found = [];
						let currentPage = (await storageGet('lastHistoryPage')) || 1;
						let toUpdate = [];
						let alreadyLoaded = [];
						let average = 0;
						let maxPage = 1;
						const before = Date.now();
						while (true) {
							// Display loading status
							firstRow.textContent = `Loading Follow page ${currentPage} out of ${maxPage}, found ${found.length} out of ${historySize} Titles.`;
							// Wait between MangaDex requests
							if (currentPage > 1) {
								const estimated = Math.floor(((1500 + average) * (maxPage - currentPage)) / 1000);
								const disp = [];
								if (estimated >= 60) disp.push(Math.floor(estimated / 60), 'min', ' ');
								disp.push(estimated % 60, 's');
								secondRow.textContent = `Estimated time to complete ${disp.join('')}.`;
								await new Promise((resolve) => setTimeout(resolve, 1500));
							}
							const res = await this.fetchFollowPage(parser, currentPage, 0);
							const { titles, isLastPage, requestTime } = res;
							if (typeof titles === 'object') {
								// Filter found titles to avoid loading them again for nothing
								const foundIds = Object.keys(titles);
								let titleIds = foundIds.filter((id) => {
									return alreadyLoaded.indexOf(id) < 0;
								});
								// Update local data for new found titles
								if (titleIds.length > 0) {
									alreadyLoaded.push(...titleIds);
									Object.assign(localTitles, await storageGet(titleIds));
								}
								for (const titleId in titles) {
									// Only update if the title is in local save and has an history card
									if (localTitles[titleId] !== undefined && historyCards[titleId] !== undefined) {
										const highestChapter = Math.max(
											titles[titleId],
											localTitles[titleId].highest || 0
										);
										if (highestChapter <= localTitles[titleId].last) {
											historyCards[titleId].classList.remove('history-down');
											historyCards[titleId].classList.add('history-up');
										} else if (highestChapter > localTitles[titleId].last) {
											historyCards[titleId].classList.remove('history-up');
											historyCards[titleId].classList.add('history-down');
										}
										if (found.indexOf(titleId) < 0) {
											found.push(titleId);
										}
										// Update highest chapter for the titles
										if (
											!localTitles[titleId].highest ||
											localTitles[titleId].highest < highestChapter
										) {
											localTitles[titleId].highest = highestChapter;
											toUpdate.push(titleId);
										}
									}
								}
							} else if (title === false) {
								this.notification(
									NOTIFY.ERROR,
									'MangaDex error',
									'There was an error while making a request to **MangaDex**, retry later.'
								);
								break;
							}
							if (currentPage == 1) {
								average = requestTime;
							} else {
								average = (average + requestTime) / 2;
							}
							maxPage = res.maxPage;
							// Save updated titles every loop if the user reload the page
							let updateObject = {
								lastHistoryPage: currentPage,
							};
							if (toUpdate.length > 0) {
								for (const id of toUpdate) {
									updateObject[id] = localTitles[id];
								}
								toUpdate = [];
							}
							await storageSet(null, updateObject);
							if (isLastPage) break;
							currentPage++;
						}
						// Update with initializedHistory and the last time
						await storageSet(null, {
							lastHistoryPage: undefined,
							initializedHistory: true,
							lastHistory: Date.now(),
						});
						// Done
						pauseTimer = false;
						const doneAlert = document.createElement('div');
						doneAlert.className = 'alert alert-success';
						const totalTime = Math.floor((Date.now() - before) / 1000);
						const disp = [];
						if (totalTime >= 60) disp.push(Math.floor(totalTime / 60), 'min', ' ');
						disp.push(totalTime % 60, 's');
						doneAlert.textContent = `Done ! ${currentPage} pages were loaded in ${disp.join(
							''
						)}. Click to close.`;
						doneAlert.addEventListener('click', (event) => {
							event.preventDefault();
							doneAlert.remove();
						});
						alert.parentElement.insertBefore(doneAlert, alert);
						alert.remove();
						refreshButton.remove();
					}
				});
				alert.appendChild(refreshButton);
				infoNode.parentElement.insertBefore(alert, infoNode);
			}
			// Load auto-update
			const checkHistoryLatest = async () => {
				resetInfo();
				let localTitles = {};
				let currentPage = 1;
				let found = [];
				let status = document.createElement('span');
				infoNode.appendChild(status);
				// Fetch follow page until all titles have a state
				let toUpdate = [];
				let alreadyLoaded = [];
				while (currentPage <= 2 && found.length < historySize) {
					// Display loading status
					status.textContent = ` Loading Follow page ${currentPage}, found ${found.length} out of ${historySize} Titles.`;
					// Wait between MangaDex requests
					if (currentPage > 1) {
						await new Promise((resolve) => setTimeout(resolve, 1500));
					}
					const { titles, isLastPage } = await this.fetchFollowPage(parser, currentPage, 1);
					if (typeof titles === 'object') {
						// Filter found titles to avoid loading them again for nothing
						const foundIds = Object.keys(titles);
						let titleIds = foundIds.filter((id) => {
							return alreadyLoaded.indexOf(id) < 0;
						});
						// Update local data for new found titles
						if (titleIds.length > 0) {
							alreadyLoaded.push(...titleIds);
							Object.assign(localTitles, await storageGet(titleIds));
						}
						for (const titleId in titles) {
							// Only update if it hasn't been already, the chapter is in local save and has an history card
							if (localTitles[titleId] !== undefined && historyCards[titleId] !== undefined) {
								const highestChapter = Math.max(titles[titleId], localTitles[titleId].highest || 0);
								if (highestChapter <= localTitles[titleId].last) {
									historyCards[titleId].classList.remove('history-down');
									historyCards[titleId].classList.add('history-up');
								} else if (highestChapter > localTitles[titleId].last) {
									historyCards[titleId].classList.remove('history-up');
									historyCards[titleId].classList.add('history-down');
								}
								if (found.indexOf(titleId) < 0) {
									found.push(titleId);
								}
								// Update highest chapter for the titles
								if (!localTitles[titleId].highest || localTitles[titleId].highest < highestChapter) {
									localTitles[titleId].highest = highestChapter;
									toUpdate.push(titleId);
								}
							}
						}
					} else if (titles === false) {
						this.notification(
							NOTIFY.ERROR,
							'MangaDex error',
							'There was an error while making a request to **MangaDex**, retry later.'
						);
						break;
					}
					currentPage++;
					if (isLastPage) break;
				}
				status.textContent = ` Loaded Titles status, next update in `;
				let timer = document.createElement('span');
				timer.textContent = '30:00';
				status.appendChild(timer);
				status.appendChild(document.createTextNode('.'));
				// Refresh Status every 30min
				let untilRefresh = 1800;
				const interval = setInterval(() => {
					if (pauseTimer) return;
					untilRefresh--;
					timer.textContent = `${Math.floor(untilRefresh / 60)}:${(
						'00' + Math.floor(untilRefresh % 60)
					).slice(-2)}`;
					if (untilRefresh == 0) {
						clearInterval(interval);
						checkHistoryLatest();
					}
				}, 1000);
				// Update localTitles found with an highest chapter
				if (toUpdate.length > 0) {
					let updateObject = {};
					for (const id of toUpdate) {
						updateObject[id] = localTitles[id];
					}
					await storageSet(null, updateObject);
				}
			};
			checkHistoryLatest();
		}
	}

	// END PAGE
}

let myMangaDex = new MyMangaDex();
myMangaDex.start();
