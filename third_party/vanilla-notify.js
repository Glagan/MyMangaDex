var vNotify = (function () {
    var options = {
        fadeInDuration: 1000,
        fadeOutDuration: 1000,
        fadeInterval: 50,
        visibleDuration: 5000,
        postHoverVisibleDuration: 500,
        sticky: false
    };

    var info = function (params) {
        params.notifyClass = "vnotify-info";
        return addNotify(params);
    };

    var success = function (params) {
        params.notifyClass = "vnotify-success";
        return addNotify(params);
    };

    var error = function (params) {
        params.notifyClass = "vnotify-error";
        return addNotify(params);
    };

    var warning = function (params) {
        params.notifyClass = "vnotify-warning";
        return addNotify(params);
    };

    var notify = function (params) {
        params.notifyClass = "vnotify-notify";
        return addNotify(params);
    };

    var custom = function (params) {
        return addNotify(params);
    };

    var addNotify = function (params) {
        if (!params.title && !params.text) {
            return null;
        }

        var frag = document.createDocumentFragment();

        var item = document.createElement("div");
        item.classList.add("vnotify-item");
        item.classList.add(params.notifyClass);
        item.addEventListener("click", function () {
            remove(item);
        });
        item.style.opacity = 0;

        item.options = getOptions(params);

        if (params.image !== undefined) {
            item.appendChild(addImage(params.image));
        }

        var body = addBody(item);

        if (params.title) {
            body.appendChild(addTitle(params.title));
        }
        if (params.text !== undefined) {
            body.appendChild(addText(params.text));
        }

        item.appendChild(body);

        item.visibleDuration = item.options.visibleDuration; //option

        var hideNotify = function () {
            item.fadeInterval = fade("out", item.options.fadeOutDuration, item);
        };

        var resetInterval = function () {
            clearTimeout(item.interval);
            clearTimeout(item.fadeInterval);
            item.style.opacity = null;
            item.visibleDuration = item.options.postHoverVisibleDuration;
        };

        var hideTimeout = function () {
            item.interval = setTimeout(hideNotify, item.visibleDuration);
        };

        frag.appendChild(item);
        var container = getNotifyContainer();
        container.appendChild(frag);

        item.addEventListener("mouseover", resetInterval);

        fade("in", item.options.fadeInDuration, item);

        if (!item.options.sticky) {
            item.addEventListener("mouseout", hideTimeout);
            hideTimeout();
        }

        return item;
    };

    var addImage = function (image_url) {
        var item = document.createElement("img");
        item.classList.add("vnotify-image");
        item.src = image_url;
        return item;
    };

    var addBody = function () {
        var item = document.createElement("div");
        item.classList.add("vnotify-body");
        return item;
    };

    var addText = function (text) {
        var item = document.createElement("div");
        item.classList.add("vnotify-text");
        item.textContent = text;
        return item;
    };

    var addTitle = function (title) {
        var item = document.createElement("div");
        item.classList.add("vnotify-title");
        item.textContent = title;
        return item;
    };

    var getNotifyContainer = function () {
        var positionClass = "vn-bottom-left";
        var container = document.querySelector("." + positionClass);
        return container ? container : createNotifyContainer(positionClass);
    };

    var createNotifyContainer = function (positionClass) {
        var frag = document.createDocumentFragment();
        container = document.createElement("div");
        container.classList.add("vnotify-container");
        container.classList.add(positionClass);
        container.setAttribute("role", "alert");

        frag.appendChild(container);
        document.body.appendChild(frag);

        return container;
    };

    var getOptions = function (opts) {
        return {
            fadeInDuration: opts.fadeInDuration || options.fadeInDuration,
            fadeOutDuration: opts.fadeOutDuration || options.fadeOutDuration,
            fadeInterval: opts.fadeInterval || options.fadeInterval,
            visibleDuration: opts.visibleDuration || options.visibleDuration,
            postHoverVisibleDuration: opts.postHoverVisibleDuration || options.postHoverVisibleDuration,
            sticky: opts.sticky != null ? opts.sticky : options.sticky
        };
    };

    var remove = function (item) {
        item.style.display = "none";
        item.outerHTML = "";
        item = null;
    };

    //New fade - based on http://toddmotto.com/raw-javascript-jquery-style-fadein-fadeout-functions-hugo-giraudel/
    var fade = function (type, ms, el) {
        var isIn = type === "in",
            opacity = isIn ? 0 : el.style.opacity || 1,
            goal = isIn ? 0.9 : 0,
            gap = options.fadeInterval / ms;

        if (isIn) {
            el.style.display = "flex";
            el.style.opacity = opacity;
        }

        function func() {
            opacity = isIn ? opacity + gap : opacity - gap;
            el.style.opacity = opacity;

            if (opacity <= 0) {
                remove(el);
                checkRemoveContainer();
            }
            if ((!isIn && opacity <= goal) || (isIn && opacity >= goal)) {
                window.clearInterval(fading);
            }
        }

        var fading = window.setInterval(func, options.fadeInterval);
        return fading;
    };

    var checkRemoveContainer = function () {
        var item = document.querySelector(".vnotify-item");
        if (!item) {
            var container = document.querySelectorAll(".vnotify-container");
            for (var i = 0; i < container.length; i++) {
                container[i].outerHTML = "";
                container[i] = null;
            }
        }
    };

    return {
        info: info,
        success: success,
        error: error,
        warning: warning,
        notify: notify,
        custom: custom,
        options: options
    };
})();