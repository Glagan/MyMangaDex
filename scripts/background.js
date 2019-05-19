// Context
window.browser = (function () {
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if ("action" in message && message.action == "fetch") {
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
                    sendResponse({
                        url: xhr.responseURL,
                        status: xhr.status,
                        headers: xhr.getAllResponseHeaders(),
                        body: (message.isJson) ? JSON.parse(xhr.responseText) : xhr.responseText,
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
            .catch(error => console.error(error));
        }
        return true;
    } else {
        throw new Error("No corresponding action for this message.");
    }
});