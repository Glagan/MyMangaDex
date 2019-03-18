// Context
window.browser = (function () {
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action == "fetch") {
        fetch(message.url, message.options || {})
        .then(async response => {
            return {
                url: response.url,
                status: response.status,
                headers: response.headers,
                body: (message.isJson !== undefined && message.isJson) ? await response.json() : await response.text(),
            }
        })
        .then(response => sendResponse(response))
        .catch(error => console.error(error));
        return true;
    } else {
        console.error("No corresponding action for this message.");
    }
});