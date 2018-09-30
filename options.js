/**
 * Author: Glagan
 * See <https://github.com/Glagan/MyMangaDex> for more informations
 */

// Default options
let default_options = {
	colors: {
		last_read: "rgba(95, 158, 160, 0.6)", // cadetblue
		lower_chapter: "darkolivegreen",
		last_open: [
			"rgba(102, 51, 153, 0.6)", // rebeccapurple
			"rgba(75, 0, 130, 0.6)" // indigo
		],
		opened_chapters: "darkslategray"
	},
	hide_lower: true,
	last_only_higher: true,
	save_all_opened: true,
	max_save_opened: 100,
	auto_md_list: false,
	version: 1.7
};
// Deep clone doesn't work for .colors.last_open
let current_options = JSON.parse(JSON.stringify(default_options))

let options_fields = {
	colors: {
		last_read: {type: 'input', node: document.getElementById('last_read')},
		lower_chapter: {type: 'input', node: document.getElementById('lower_chapter')},
		last_open: [],
		opened_chapters: {type: 'input', node: document.getElementById('opened_chapters')}
	},
	hide_lower: {type: 'checkbox', node: document.getElementById('hide_lower')},
	last_only_higher: {type: 'checkbox', node: document.getElementById('last_only_higher')},
	save_all_opened: {type: 'checkbox', node: document.getElementById('save_all_opened')},
	auto_md_list: {type: 'checkbox', node: document.getElementById('auto_md_list')},
	max_save_opened: {type: 'input', node: document.getElementById('max_save_opened')}
};

// Panel
let current_panel = null;
let current_panel_button = null;

/**
 * Flash the background
 * Do it by adding a class and remove it with a setTimeout
 * To make it work the background have a transition on the background-color in the css
 * @param {string} back_class The class of the background to apply
 */
function flash_background(back_class) {
	document.getElementById("content").classList.add(back_class);
	setTimeout(() => {
		document.getElementById("content").classList.remove(back_class);
	}, 500);
}

/**
 * Save the options in local storage and flash the background to show when it's done
 * @param {Object} event The event of the Save button
 */
function saveOptions(event) {
	event.preventDefault();

	// Update current_options
	Object.keys(options_fields).forEach(field => {
		if (field == 'colors') {
			Object.keys(options_fields.colors).forEach(color => {
				if (color == 'last_open') {
					current_options.colors.last_open = [];
					options_fields.colors.last_open.forEach(open_color => {
						current_options.colors.last_open.push(open_color.node.value);
					});
				} else {
					current_options.colors[color] = options_fields.colors[color].node.value;
				}
			});
		} else {
			if (options_fields[field].type == 'input') {
				current_options[field] = options_fields[field].node.value;
			} else {
				current_options[field] = options_fields[field].node.checked;
			}
		}
	});

	// Update local storage
	return storage_set("options", current_options)
	.then(() => {
		console.log("Saved");
		// Flash green, saved with success
		flash_background("mmd-saved");
	}).catch((error) => {
		console.error(error);
		// Flash red, save failed
		flash_background("mmd-not-saved");
	});
}

/**
 * Restore the options from local storage when they're loaded
 */
function restoreOptions() {
	return storage_get("options")
	.then(res => {
		if (res == undefined) {
			res = default_options;
		}

		// Update current options, no last_open yet
		let colors = res.colors.last_open;
		deleteLastOpenColors();


		// Restore last_open colors
		colors.forEach(color => {
			addColor(color);
		});

		// Add "normal" options
		Object.keys(options_fields).forEach(field => {
			if (field == 'colors') {
				Object.keys(options_fields.colors).forEach(color => {
					if (color != 'last_open') {
						document.getElementById(color).value = res.colors[color];
					}
				});
			} else {
				if (options_fields[field].type == 'input') {
					document.getElementById(field).value = res[field];
				} else {
					document.getElementById(field).checked = res[field];
				}
			}
		});

		changeColorBox(document.getElementById('box_last_read'), res.colors.last_read);
		changeColorBox(document.getElementById('box_lower_chapter'), res.colors.lower_chapter);
		changeColorBox(document.getElementById('box_opened_chapters'), res.colors.opened_chapters);
	});
}

/**
 * Do what it need to do.
 */
function restoreDefaultsLastOpen() {
	deleteLastOpenColors();

	default_options.colors.last_open.forEach(color => {
		addColor(color);
	});
}

/**
 * Restore the default options of a parameter
 * The button is related to the input with the id: default_[id]
 * @param {Object} event The event of the button clicked
 */
function restoreDefault(event) {
	let node_name = /default_(.+)/.exec(event.target.id)[1];
	let node = document.getElementById(node_name);

	// If it's last open colors remove all and add the 2
	if (node_name == "last_open") {
		restoreDefaultsLastOpen();
	// If it's an input
	} else if (node.type == "text" || node.type == "number") {
		node.value = default_options.colors[node_name] || default_options[node_name];

		if ('id' in node.dataset) {
			let color_box = document.getElementById("box_" + node.dataset.id);
			color_box.style.backgroundColor = node.value;
		}
	// Or it's a checkbox, no other choice right now
	} else {
		if (default_options.colors[node_name]) {
			node.checked = default_options.colors[node_name];
		} else {
			node.checked = default_options[node_name];
		}
	}
}

/**
 * Update a color box according to the input it's related to
 * @param {Object} box The node of the color box
 * @param {string} color The color
 */
function changeColorBox(box, color) {
	box.style.backgroundColor = color;
}

/**
 * Add a color to the open_colors object
 * Create a color box that is updated like other color inputs
 * @param {string} name The color name
 */
function addColor(name="") {
	let color_list = document.getElementById("last_open");
	current_options.colors.last_open.push(name);
	let id = current_options.colors.last_open.length-1;

	let color = document.createElement("li");
	color.id = "last_open_" + id;
	let trash_icon = document.createElement("i");
	trash_icon.className = "fas fa-trash";
	let trash_text = document.createElement("span");
	trash_text.textContent = "Remove";
	trash_text.addEventListener("click", event => {
		removeColor(id);
	});
	let color_box = document.createElement("span");
	color_box.className = "color-box";
	let color_input = document.createElement("input");
	color_input.dataset.id = id;
	color_input.type = "text";
	color_input.className = "color-input";
	color_input.value = name;
	color_input.addEventListener("input", event => {
		current_options.colors.last_open[id] = event.target.value;
		changeColorBox(color_box, event.target.value);
	});
	options_fields.colors.last_open.push({type: 'input', node: color_input});

	color.appendChild(trash_icon);
	color.appendChild(document.createTextNode(" "));
	color.appendChild(trash_text);
	color.appendChild(document.createTextNode(" "));
	color.appendChild(color_input);
	color.appendChild(color_box);
	color_list.insertBefore(color, color_list.lastElementChild);

	// Init
	changeColorBox(color_box, name);
}

/**
 * Remove a color added with add_color from the open_colors object
 * Can't remove the last color, there need to be at least one
 * @param {number} color_id The id of the color in the open_colors object
 */
function removeColor(id) {
	if (current_options.colors.last_open.length > 1) {
		let node = document.getElementById("last_open_" + id);
		node.parentElement.removeChild(node);
		current_options.colors.last_open.splice(id, 1);
		options_fields.colors.last_open.splice(id, 1);

		return true;
	}

	return false;
}

/**
 * Panel functions
 */
function openPanel(event) {
	let button;
	if (event.target.tagName == "I") {
		button = event.target.parentElement;
	} else {
		button = event.target;
	}
	button.classList.toggle('btn-primary');

	if (current_panel_button != null && current_panel_button != button) {
		current_panel_button.classList.toggle('btn-primary');
	}
	current_panel_button = button;

	let old_panel = current_panel;
	if (old_panel != null) {
		old_panel.classList.remove('open');
	}

	current_panel = document.getElementById(button.dataset.panel);
	if (current_panel == old_panel) {
		current_panel = null;
		current_panel_button = null;
	} else if (current_panel != null) {
		current_panel.classList.add('open');
	}
}

/**
 * Delete
 */
function deleteLastOpenColors() {
	let color_list = document.getElementById("last_open");
	while (color_list.firstChild) {
		if (color_list.firstChild.id == "add_color_row") {
			break;
		}
		color_list.removeChild(color_list.firstChild);
	}
	current_options.colors.last_open = [];
	options_fields.colors.last_open = [];
}

/**
 * Delete the save and replace it with a default one
 */
function deleteSave() {
	// Clear
	browser.storage.local.clear();

	// Set the default options
	storage_set("options", default_options)
	.then(() => {
		// Close panel
		openPanel({target: document.getElementById('open-delete')});

		flash_background("mmd-saved");
		restoreOptions();
	})
    .catch(error => {
        console.error(error);
        flash_background("mmd-not-saved");
	});
}


/**
 * Import a MyMangaDex, override current save or merge with it
 */
function importMMD() {
	// try catch if JSON can't be parsed
	try {
		let imported_data = JSON.parse(document.getElementById('save-import-content').value);

		let promises = [];
		// If we merge the import, the current data won't be deleted
		// If there is an entry, the last open will be set to the highest of the two entries
		if (document.getElementById('save-merge').checked) {
			for (let mangadex_id in imported_data) {
				if (mangadex_id == "options") {
					promises.push(
						storage_set("options", imported_data)
					);
				} else {
					promises.push(
						storage_get(mangadex_id)
						.then(data => {
							let to_insert = imported_data[mangadex_id + ""];

							// If there is an entry we set it to the highest last chapter and we mix all opened chapters
							let manga = data[mangadex_id];
							if (manga !== undefined) {
								to_insert.last = Math.max(manga.last, to_insert.last);

								// Merge chapters
								if (to_insert.chapters !== undefined) {
									for (let chapter of manga.chapters) {
										insert_chapter(to_insert.chapters, chapter);
									}

									while (to_insert.chapters.length > current_options.max_save_opened) {
										to_insert.chapters.pop();
									}
								} else {
									to_insert.chapters = manga.chapters || [];
								}
							}

							// Insert the entry in the local storage
							return storage_set(mangadex_id, to_insert);
						})
					);
				}
			}
		} else {
			promises.push(
				storage_set(null, imported_data)
			);
		}

		// We wait until we checked all data
		Promise.all(promises)
		.then(() => {
			openPanel({target: document.getElementById('open-import')});
			restoreOptions();
			flash_background("mmd-saved");
			document.getElementById('save-import-content').value = "";
		});
	} catch (error) {
		flash_background("mmd-not-saved");
		console.error(error);
	}
}

/**
 * Helpful function to avoid to write 2 lines each time
 * @param {Object} output_node The node that display the import output
 * @param {string} text The string to append in the display
 */
function append_to_output_and_scroll(output_node, text) {
	output_node.value += "\n" + text;
	output_node.scrollTop = output_node.scrollHeight;
}

/**
 * Update the last chapter of a manga entry, with a MangaDex id as a key
 * Update only to the highest if the option is on
 * Also update the chapters regardless of the option
 * @param {Object} manga A manga object that will be updated
 */
function update_manga_local_storage(manga) {
	manga.last = ((manga.current.chapter > manga.last && current_options.last_only_higher) || !current_options.last_only_higher) ? manga.current.chapter : manga.last;
	return storage_set(manga.id, {
		mal: manga.mal,
		last: manga.last,
		chapters: manga.chapters
	});
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
	// Abort if data already retrieved and only 1 page
	if (offset > 0 && offset < 300) {
		append_to_output_and_scroll(output_node, "Done fetching MyAnimeList manga.");
		return;
	}
    append_to_output_and_scroll(output_node, "Fetching MyAnimeList manga from " + offset + " to " + (offset+300));

    return fetch("https://myanimelist.net/mangalist/" + username + "/load.json?offset=" + offset + "&status=7", {
        method: 'GET',
        redirect: 'follow',
        credentials: 'include'
	}).then(response => response.json())
	.then(data => {
        if (data.hasOwnProperty("errors")) {
            append_to_output_and_scroll(output_node, data.errors[0].message);
        } else {
            // Insert each manga fetched in the list
            for (let manga of data) {
                mal_manga[parseInt(manga.manga_id)] = parseInt(manga.num_read_chapters);
            }

			if (!dummy) {
				// If there is 300 items, we might have reached the list limit so we try again
				if (data.length == 300) {
					return fetch_mal_manga_list(mal_manga, username, output_node, offset + 300);
				} else {
					append_to_output_and_scroll(output_node, "Done fetching MyAnimeList manga.");
				}
			}
        }
    }).catch(error => {
		flash_background("mmd-not-saved");
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
function fetch_mangadex_manga_list(mangadex_list, output_node, page=1, max_page=1) {
    append_to_output_and_scroll(output_node, "Fetching MangaDex follow page manga " + page + ((max_page > 1) ? " of " + max_page : ""));

    return fetch("https://mangadex.org/follows/manga/0/0/" + page + "/", {
        method: 'GET',
        redirect: 'follow',
        credentials: 'include'
	}).then(data => data.text())
	.then(text => {
		let regex = /href="\/title\/(\d+)\/.+"(?:\s*class)/g;
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
			let regex = /Showing\s\d+\sto\s\d+\sof\s(\d+)\stitles/.exec(text);
			if (regex !== null) {
				max_page = Math.ceil(regex[1] / 100);
			}
		}

		// We fetch the next page if required
		if (page < max_page) {
			return fetch_mangadex_manga_list(mangadex_list, output_node, page+1, max_page);
		} else {
			append_to_output_and_scroll(output_node, "Done fetching MangaDex follow manga.");
		}
    }).catch(error => {
		flash_background("mmd-not-saved");
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
async function update_all_manga_with_mal_data(mal_list, mangadex_list, output_node, index=0) {
	append_to_output_and_scroll(output_node, "Updating " + (index + 1) + "/" + mangadex_list.length);

	// 1 request per 500ms -> 2 request per sec to avoid spamming
	/*if (last_request > 0) {
		let wait = new Date().getTime() - last_request;
		if (wait < 500) {
			*/await new Promise(resolve => {
				setTimeout(() => {
					resolve();
				}, 500/*-wait*/);
			});/*
		}
	}*/

    return fetch("https://mangadex.org/title/" + mangadex_list[index], {
        method: 'GET',
        cache: 'no-cache'
	}).then(data => data.text())
	.then(text => {
		// Scan the manga page for the mal icon and mal url
		let manga_name = /<title>(.+)\s*\(Title\)\s*-\s*MangaDex<\/title>/.exec(text)[1];
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
				}
			});
		} else {
			// Finish gettint the mal url
			mal_url = mal_url[1];
			// If there is a mal link, add it and save it in local storage
			manga.mal = parseInt(/.+\/(\d+)/.exec(mal_url)[1]);

			// Search for data from the mal_list object
			if (manga.mal in mal_list) {
				manga.last = mal_list[manga.mal];

				// Add last max_save_opened chapters since the current one in the opened array
				if (current_options.save_all_opened) {
					let min = Math.max(manga.last - current_options.max_save_opened, 0);
					for (let i = manga.last; i > min; i--) {
						manga.chapters.push(i);
					}
				}
			}

			// Update last open for the manga
			append_to_output_and_scroll(output_node, "-> Set to Chapter " + manga.last);
			return update_manga_local_storage(manga).then(() => {
				index++;
				if (index < mangadex_list.length) {
					return update_all_manga_with_mal_data(mal_list, mangadex_list, output_node, index);
				} else {
					append_to_output_and_scroll(output_node, "Done.");
				}
			});
		}
    }).catch(error => {
		flash_background("mmd-not-saved");
		append_to_output_and_scroll(output_node, "Updating " + (index + 1) + " Failed");
		console.error(error);

		// Keep going
		index++;
		if (index < mangadex_list.length) {
			return update_all_manga_with_mal_data(mal_list, mangadex_list, output_node, index);
		} else {
			append_to_output_and_scroll(output_node, "Done.");
		}
    });
}

async function importMAL() {
	let mal_username = document.getElementById('mal-username').value;
	let result_container = document.getElementById('mal-import-status');
	document.getElementById('mal-import').disabled = true;

	if (mal_username != "") {
		// Arrays with the data
		let mal_manga = {};
		let mangadex_manga = [];

		// Show the status box
		result_container.style.display = 'block';
		result_container.value = "Starting... don't close this tab.";
		document.getElementById('import-panel').classList.remove('h-480');
		document.getElementById('import-panel').classList.add('h-580');

		// Start a dummy request to MyAnimeList to see if we can fetch the data
		await fetch_mal_manga_list(mal_manga, mal_username, result_container, 0, true)
		.then(async () => {
			if (Object.keys(mal_manga).length == 0) {
				flash_background("mmd-not-saved");
				append_to_output_and_scroll(result_container, "Empty MAL manga list, aborting.");
				document.getElementById('mal-import').disabled = false;
			} else {
				// Start fetching the data
				await fetch_mal_manga_list(mal_manga, mal_username, result_container, Object.keys(mal_manga).length);
				await fetch_mangadex_manga_list(mangadex_manga, result_container);
				await update_all_manga_with_mal_data(mal_manga, mangadex_manga, result_container);

				flash_background("mmd-saved")
				document.getElementById('mal-import').disabled = false;
			}
		})
	} else {
		document.getElementById('mal-import').disabled = false;
		flash_background("mmd-not-saved");
		console.error("Empty MAL username");
	}
}

// Start
document.addEventListener('DOMContentLoaded', () => {
	// Only start when options loaded
	restoreOptions()
	.then(() => {
		// Save event
		document.getElementById("save").addEventListener("click", saveOptions);

		// Restore defaults
		document.getElementById("default_last_read").addEventListener("click", restoreDefault);
		document.getElementById("default_last_open").addEventListener("click", restoreDefault);
		document.getElementById("default_lower_chapter").addEventListener("click", restoreDefault);
		document.getElementById("default_opened_chapters").addEventListener("click", restoreDefault);
		document.getElementById("default_hide_lower").addEventListener("click", restoreDefault);
		document.getElementById("default_last_only_higher").addEventListener("click", restoreDefault);
		document.getElementById("default_max_save_opened").addEventListener("click", restoreDefault);
		document.getElementById("default_save_all_opened").addEventListener("click", restoreDefault);
		document.getElementById("default_auto_md_list").addEventListener("click", restoreDefault);
		document.getElementById("add-a-color").addEventListener("click", () => {
			addColor();
		});

		// Change the cute box
		document.getElementById("last_read").addEventListener("input", event => {
			changeColorBox(document.getElementById('box_last_read'), event.target.value);
		});
		document.getElementById("lower_chapter").addEventListener("input", event => {
			changeColorBox(document.getElementById('box_lower_chapter'), event.target.value);
		});
		document.getElementById("opened_chapters").addEventListener("input", event => {
			changeColorBox(document.getElementById('box_opened_chapters'), event.target.value);
		});

		// Add listener for data panels
		document.getElementById("open-export").addEventListener("click", event => {
			openPanel(event);

			// Load save
			storage_get(null)
			.then(data => {
				document.getElementById('save-content').value = JSON.stringify(data);
			});
		});
		document.getElementById("open-import").addEventListener("click", openPanel);
		document.getElementById("open-delete").addEventListener("click", openPanel);

		// Delete
		document.getElementById("delete-save").addEventListener("click", deleteSave);

		// Copy
		document.getElementById("save-content").addEventListener("click", event => {
			event.target.select();
		});

		// Import MMD
		document.getElementById('save-import').addEventListener("click", importMMD);

		// Import MAL
		document.getElementById('mal-import').addEventListener("click", importMAL);
	});
});