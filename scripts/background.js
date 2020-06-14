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
			fetch(message.url, message.options)
				.then(async response => {
					return {
						url: response.url,
						status: response.status,
						headers: JSON.parse(JSON.stringify(response.headers)),
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

browser.browserAction.onClicked.addListener(() => {
	browser.runtime.openOptionsPage();
});
