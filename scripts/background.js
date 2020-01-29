// Context
window.browser = (function () {
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if ("action" in message) {
        if (message.action == "fetch") {
            // Options
            message.isJson = ("isJson" in message && message.isJson);
            message.options = Object.assign({}, {
                method: "GET", body: null, credentials: "same-origin", headers: {}
            }, message.options || {});
            // XMLHttpRequest or Fetch
            if ("with" in message && message.with == "xhr") {
                let xhr = new XMLHttpRequest();
                xhr.addEventListener("readystatechange", () => {
                    if (xhr.readyState == 4) {
						let body;
						try {
							body = (message.isJson) ? JSON.parse(xhr.responseText) : xhr.responseText;
						} catch (error) {
							body = (message.isJson) ? {} : "";
						}
                        sendResponse({
                            url: xhr.responseURL,
                            status: xhr.status,
                            headers: xhr.getAllResponseHeaders(),
                            body: body
                        });
                    }
                });
                xhr.open(message.options.method, message.url, true);
                Object.keys(message.options.headers).forEach(name => {
                    xhr.setRequestHeader(name, message.options.headers[name]);
                });
                if (message.options.credentials == "include") {
                    xhr.withCredentials = true;
                }
                xhr.send(message.options.body);
            } else {
                fetch(message.url, message.options)
                .then(async response => {
                    return {
                        url: response.url,
                        status: response.status,
                        headers: response.headers,
                        body: (message.isJson) ? await response.json() : await response.text(),
                    };
                })
                .then(response => sendResponse(response))
                .catch(error => {
					console.error(error);
					sendResponse({
						url: message.url,
						status: 0,
						headers: {},
						body: (message.isJson) ? {} : ""
					});
				});
            }
            return true;
        } else if (message.action == "openOptions") {
            return browser.runtime.openOptionsPage();
        } else {
            throw new Error("No valid action for this message.");
        }
    } else {
        throw new Error("No action for this message.");
    }
});