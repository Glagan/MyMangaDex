// https://stackoverflow.com/a/34491287/7794671
/**
 * Count the number of properties of an object to test if it's empty
 * Could add more tests but it was enough for this extension
 * @param {Object} obj The object to test
 */
function isEmpty(obj) {
	for (var x in obj) { return false; }
	return true;
}

/**
 * Flash the background
 * Do it by adding a class and remove it with a setTimeout
 * To make it work the background have a transition on the background-color in the css
 * @param {string} back_class The class of the background to apply
 */
function flash_background(back_class) {
	document.querySelector("#content").classList.add(back_class);
	setTimeout(() => {
		document.querySelector("#content").classList.remove(back_class);
	}, 500);
}

/**
 * Save the options in local storage and flash the background to show when it's done
 * @param {Object} event The event of the Save button
 */
function saveOptions(event) {
	event.preventDefault();

	// Put all last open colors in an array
	let last_open_colors = [];
	for (let open_color of Object.keys(open_colors)) {
		last_open_colors.push(open_colors[open_color]);
	}

	// Update local storage
	console.log(document.getElementById("follow_button").checked);
	browser.storage.local.set({
		options: {
			colors: {
				last_read: document.getElementById("last_read").value,
				lower_chapter: document.getElementById("lower_chapter").value,
				last_open: last_open_colors,
				opened_chapters: document.getElementById("opened_chapters").value
			},
			hide_lower: document.getElementById("hide_lower").checked,
			last_only_higher: document.getElementById("last_only_higher").checked,
			max_save_opened: parseInt(document.getElementById("max_save_opened").value),
			save_all_opened: document.getElementById("save_all_opened").checked,
			version: default_opt.version
		}
	}).then(() => {
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
	var storageItem = browser.storage.local.get("options");
	storageItem.then((res) => {
		if (isEmpty(res)) {
			res.options = default_opt;
		} else {
			res.options = {
				colors: {
					last_read: res.options.colors.last_read || default_opt.colors.last_read,
					lower_chapter: res.options.colors.lower_chapter || default_opt.colors.lower_chapter,
					last_open: res.options.colors.last_open || default_opt.colors.last_open,
					opened_chapters: res.options.colors.opened_chapters || default_opt.colors.opened_chapters
				},
				hide_lower: res.options.hide_lower,
				last_only_higher: res.options.last_only_higher,
				max_save_opened: res.options.max_save_opened,
				save_all_opened: res.options.save_all_opened,
				version: res.options.version || default_opt.version
			};
		}

		let opt = res.options;
		document.querySelector("#last_read").value = opt.colors.last_read;
		document.querySelector("#last_read_color").style.backgroundColor = opt.colors.last_read;
		document.querySelector("#lower_chapter").value = opt.colors.lower_chapter;
		document.querySelector("#lower_chapter_color").style.backgroundColor = opt.colors.lower_chapter;
		document.querySelector("#opened_chapters").value = opt.colors.opened_chapters;
		document.querySelector("#opened_chapters_color").style.backgroundColor = opt.colors.opened_chapters;
		let i = 1;
		for (let open_color of opt.colors.last_open) {
			let id = addColor(open_color);
			document.querySelector("#last_open_" + id + "_color").style.backgroundColor = open_color;
		}
		document.querySelector("#hide_lower").checked = opt.hide_lower;
		document.querySelector("#last_only_higher").checked = opt.last_only_higher;
		document.querySelector("#max_save_opened").value = opt.max_save_opened;
		document.querySelector("#save_all_opened").checked = opt.save_all_opened;

		document.querySelector("#content").classList.add("mmd-background-transition");
	});
}

/**
 * Restore the default options of a parameter
 * The button is related to the input with the id: default_[id]
 * @param {Object} event The event of the button clicked
 */
function restoreDefault(event) {
	let node_name = /default_(.+)/.exec(event.target.id)[1];
	let node = document.querySelector("#" + node_name);

	// If it's last open colors remove all and add the 2
	if (node_name == "last_open") {
		let color_list = document.querySelector("#last_open");
		for (let open_color of Object.keys(open_colors)) {
			color_list.removeChild(document.querySelector("#last_open_" + open_color).parentElement);
		}
		open_colors = {};

		let i = 1;
		for (let open_color of default_opt.colors.last_open) {
			let id = addColor(open_color);
			document.querySelector("#last_open_" + id + "_color").style.backgroundColor = open_color;
		}
	// If it's an input
	} else if (node.type == "text" || node.type == "number") {
		node.value = default_opt.colors[node_name] || default_opt[node_name];
		let color_box = document.querySelector("#" + node_name + "_color");
		if (color_box) {
			color_box.style.backgroundColor = node.value;
		}
	// Or it's a checkbox, no other choice right now
	} else {
		if (default_opt.colors[node_name]) {
			node.checked = default_opt.colors[node_name];
		} else {
			node.checked = default_opt[node_name];
		}
	}
}

/**
 * Update a color box according to the input it's related to
 * @param {Object} event The even of the input related to the color box
 */
function changeColorBox(event) {
	let node_name = event.target.id;
	let node = document.querySelector("#" + node_name + "_color");

	node.style.backgroundColor = event.target.value;
}

/**
 * Add a color to the open_colors object
 * Create a color box that is updated like other color inputs
 * @param {string} name The color name
 */
function addColor(name="") {
	let color_list = document.querySelector("#last_open");
	let id = Object.keys(open_colors).length + 1;
	while(open_colors.hasOwnProperty(id)) {
		id++;
	}
	open_colors[id] = name;

	let color = document.createElement("li");
	let trash_icon = document.createElement("i");
	trash_icon.className = "fas fa-trash";
	let trash_text = document.createElement("span");
	trash_text.textContent = "Remove";
	trash_text.addEventListener("click", (event) => {
		removeColor(id);
	});
	let color_input = document.createElement("input");
	color_input.id = "last_open_" + id;
	color_input.type = "text";
	color_input.className = "color-input";
	color_input.value = name;
	color_input.addEventListener("input", (event) => {
		open_colors[id] = event.target.value;
		changeColorBox(event);
	});
	let color_box = document.createElement("span");
	color_box.id = "last_open_" + id + "_color";
	color_box.className = "color-box";

	color.appendChild(trash_icon);
	color.appendChild(document.createTextNode(" "));
	color.appendChild(trash_text);
	color.appendChild(document.createTextNode(" "));
	color.appendChild(color_input);
	color.appendChild(color_box);
	color_list.insertBefore(color, color_list.lastElementChild);

	return id;
}

/**
 * Remove a color added with add_color from the open_colors object
 * Can't remove the last color, there need to be at least one
 * @param {number} color_id The id of the color in the open_colors object
 */
function removeColor(color_id) {
	if (Object.keys(open_colors).length > 1) {
		let node = document.querySelector("#last_open_" + color_id);
		node.parentElement.parentElement.removeChild(node.parentElement);
		delete open_colors[color_id];

		return true;
	}

	return false;
}

// Default options
let default_opt = {
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
	version: 1.4
};

// Last open colors
let open_colors = {
};

// Start
document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("#save").addEventListener("click", saveOptions);

// Restore defaults
document.querySelector("#default_last_read").addEventListener("click", restoreDefault);
document.querySelector("#default_last_open").addEventListener("click", restoreDefault);
document.querySelector("#default_lower_chapter").addEventListener("click", restoreDefault);
document.querySelector("#default_opened_chapters").addEventListener("click", restoreDefault);
document.querySelector("#default_hide_lower").addEventListener("click", restoreDefault);
document.querySelector("#default_last_only_higher").addEventListener("click", restoreDefault);
document.querySelector("#default_max_save_opened").addEventListener("click", restoreDefault);
document.querySelector("#default_save_all_opened").addEventListener("click", restoreDefault);
document.querySelector("#add-a-color").addEventListener("click", () => {
	addColor();
});

// Change the cute box
document.querySelector("#last_read").addEventListener("input", changeColorBox);
document.querySelector("#lower_chapter").addEventListener("input", changeColorBox);
document.querySelector("#opened_chapters").addEventListener("input", changeColorBox);