function isEmpty(obj) {
	for (var x in obj) { return false; }
	return true;
}

function saveOptions(event) {
	event.preventDefault();

	// Put all last open colors in an array
	let last_open_colors = [];
	for (let open_color of Object.keys(open_colors)) {
		last_open_colors.push(open_colors[open_color]);
	}

	// Update local storage
	browser.storage.local.set({
		options: {
			colors: {
				last_read: document.querySelector("#last_read").value,
				lower_chapter: document.querySelector("#lower_chapter").value,
				last_open: last_open_colors
			},
			hide_lower: document.querySelector("#hide_lower").checked,
			follow_button: document.querySelector("#follow_button").checked,
			last_open_only_higher: document.querySelector("#last_open_only_higher").checked,
			save_all_opened: document.querySelector("#save_all_opened").checked
		}
	}).then(() => {
		console.log("Saved");
	});
}

function restoreOptions() {
	var storageItem = browser.storage.local.get("options");
	storageItem.then((res) => {
		if (isEmpty(res)) {
			res.options = default_opt;
		}

		let opt = res.options;
		document.querySelector("#last_read").value = opt.colors.last_read;
		document.querySelector("#last_read_color").style.backgroundColor = opt.colors.last_read;
		document.querySelector("#lower_chapter").value = opt.colors.lower_chapter;
		let i = 1;
		for (let open_color of opt.colors.last_open) {
			let id = addColor(open_color);
			document.querySelector("#last_open_" + id + "_color").style.backgroundColor = open_color;
		}
		document.querySelector("#lower_chapter_color").style.backgroundColor = opt.colors.lower_chapter;
		document.querySelector("#hide_lower").checked = opt.hide_lower;
		document.querySelector("#follow_button").checked = opt.follow_button;
		document.querySelector("#last_open_only_higher").checked = opt.last_open_only_higher;
		document.querySelector("#save_all_opened").checked = opt.save_all_opened;
	});
}

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
	} else if (node.type == "text") {
		node.value = default_opt[node_name];
		document.querySelector("#" + node_name + "_color").style.backgroundColor = default_opt[node_name];
	// Or it's a checkbox, no other choice right now
	} else {
		node.checked = default_opt[node_name];
	}
}

function changeColorBox(event) {
	let node_name = event.target.id;
	let node = document.querySelector("#" + node_name + "_color");

	node.style.backgroundColor = event.target.value;
}

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
		last_read: "cadetblue",
		lower_chapter: "darkolivegreen",
		last_open: [
			"rebeccapurple",
			"indigo"
		]
	},
	hide_lower: true,
	follow_button: false,
	last_open_only_higher: true,
	save_all_opened: false
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
document.querySelector("#default_hide_lower").addEventListener("click", restoreDefault);
document.querySelector("#default_follow_button").addEventListener("click", restoreDefault);
document.querySelector("#default_last_open_only_higher").addEventListener("click", restoreDefault);
document.querySelector("#default_save_all_opened").addEventListener("click", restoreDefault);
document.querySelector("#add-a-color").addEventListener("click", () => {
	addColor();
});

// Change the cute box
document.querySelector("#last_read").addEventListener("input", changeColorBox);
document.querySelector("#lower_chapter").addEventListener("input", changeColorBox);