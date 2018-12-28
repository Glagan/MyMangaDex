class SimpleNotification {
    /**
     * Set the default options of SimpleNotification
     * @param {object} options Options object to override the defaults
     */
    static options(options) {
        SimpleNotification.default = Object.assign({}, SimpleNotification.default, options);
    }

    /**
     * Create a wrapper and add it to the wrappers object
     * Valid default position: top-right, top-left, bottom-right, bottom-left
     * @param {string} position The position of the wrapper
     */
    static makeWrapper(position) {
        let fragment = document.createDocumentFragment();
        let wrapper = document.createElement("div");
        wrapper.className = "gn-wrapper gn-" + position;
        fragment.appendChild(wrapper);
        document.body.appendChild(fragment);
        SimpleNotification.wrappers[position] = wrapper;
    }

    /**
     * Create and append a notification
     * Options: duration, fadeout, position, image
     * @param {array} classes Array of classes to add to the notification
     * @param {string} text The title inside the notification
     * @param {string} text The text inside the notification
     * @param {object} options The options of the notifications
     */
    static create(classes, title, text, notificationOptions) {
        // Abort if empty
        if ((title == undefined || title == "") && (text == undefined || text == ""))
            return;
        // Merge options
        let options = Object.assign({}, SimpleNotification.default, notificationOptions);
        // Create wrapper if needed
        if (SimpleNotification.wrappers[options.position] == undefined) {
            SimpleNotification.makeWrapper(options.position);
        }
        // Create the notification
        let fragment = document.createDocumentFragment();
        let notification = document.createElement("div");
        // Events
        // Delete the notification on click
        notification.addEventListener("click", () => {
            SimpleNotification.destroy(notification, 0);
        });
        // Pause on hover if not sticky
        if (!options.sticky) {
            notification.addEventListener("mouseenter", event => {
                event.target.lastElementChild.style.animationPlayState = "paused";
            });
            notification.addEventListener("mouseleave", event => {
                event.target.lastElementChild.style.animationPlayState = "running";
            });
        }
        // Apply Style
        notification.className = "gn-notification";
        classes.forEach(element => {
            notification.classList.add(element);
        });
        // Add elements
        if (title != undefined && title != "") {
            let notificationTitle = document.createElement("h1");
            notificationTitle.textContent = title;
            notification.appendChild(notificationTitle);
        }
        let hasImage = options.image != undefined && options.image != "";
        let hasText = text != undefined && text != "";
        if (hasImage || hasText) {
            let notificationContent = document.createElement("div");
            notificationContent.className = "gn-content";
            if (hasImage) {
                let notificationImage = document.createElement("img");
                notificationImage.src = options.image;
                notificationContent.appendChild(notificationImage);
            }
            if (hasText) {
                let notificationText = document.createElement("p");
                notificationText.textContent = text;
                notificationContent.appendChild(notificationText);
            }
            notification.appendChild(notificationContent);
        }
        // Add progress bar if not sticky
        let notificationLife;
        if (options.sticky == undefined || options.sticky == false) {
            notificationLife = document.createElement("span");
            notificationLife.className = "gn-lifespan";
            // Set the time before removing the notification
            notificationLife.style.animationDuration = options.duration + "ms";
            notificationLife.classList.add("gn-extinguish");
            // Destroy the notification when the animation end
            notificationLife.addEventListener("animationend", event => {
                if (event.animationName == "shorten") {
                    SimpleNotification.destroy(notification, options.fadeout);
                }
            });
            notification.appendChild(notificationLife);
        }
        // Display
        fragment.appendChild(notification);
        SimpleNotification.wrappers[options.position].appendChild(fragment);
    }

    /**
     * Remove a notification from the screen
     * @param {object} notification The notification to remove
     */
    static destroy(notification, fadeout) {
        if (fadeout == 0) {
            notification.parentElement.removeChild(notification);
        }

        // Add the fadeout animation
        notification.style.animationDuration = fadeout + "ms";
        notification.classList.add("gn-fadeout");
        // Pause and reset fadeout on hover
        notification.addEventListener("mouseenter", event => {
            event.target.classList.remove("gn-fadeout");
        });
        notification.addEventListener("mouseleave", event => {
            event.target.classList.add("gn-fadeout");
        });
        // When fadeout end, remove the node from the wrapper
        notification.addEventListener("animationend", event => {
            if (event.animationName == "fadeout") {
                notification.parentElement.removeChild(notification);
            }
        });
    }

    /**
     * Create a notification with the "success" style
     * @param {string} title Title of the notification
     * @param {string} text Content of the notification
     * @param {object} options Options used for the notification
     */
    static success(title, text, options = {}) {
        return SimpleNotification.create(["gn-success"], title, text, options);
    }

    /**
     * Create a notification with the "info" style
     * @param {string} title Title of the notification
     * @param {string} text Content of the notification
     * @param {object} options Options used for the notification
     */
    static info(title, text, options = {}) {
        return SimpleNotification.create(["gn-info"], title, text, options);
    }

    /**
     * Create a notification with the "error" style
     * @param {string} title Title of the notification
     * @param {string} text Content of the notification
     * @param {object} options Options used for the notification
     */
    static error(title, text, options = {}) {
        return SimpleNotification.create(["gn-error"], title, text, options);
    }

    /**
     * Create a notification with the "warning" style
     * @param {string} title Title of the notification
     * @param {string} text Content of the notification
     * @param {object} options Options used for the notification
     */
    static warning(title, text, options = {}) {
        return SimpleNotification.create(["gn-warning"], title, text, options);
    }

    /**
     * Create a notification with the "message" style
     * @param {string} title Title of the notification
     * @param {string} text Content of the notification
     * @param {object} options Options used for the notification
     */
    static message(title, text, options = {}) {
        return SimpleNotification.create(["gn-message"], title, text, options);
    }

    /**
     * Make a notification with custom classes
     * @param {array} classes The classes of the notification
     * @param {string} title Title of the notification
     * @param {string} text Content of the notification
     * @param {object} options Options used for the notification
     */
    static custom(classes, title, text, options) {
        return SimpleNotification.create(classes, title, text, options);
    }
}
SimpleNotification.wrappers = {};
SimpleNotification.default = {
    image: undefined,
    position: "top-right",
    duration: 4000,
    fadeout: 750,
    sticky: false
};