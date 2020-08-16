// Context
var CHROME = false;
window.browser = (function () {
	if (window.chrome && window.browser === undefined) {
		CHROME = true;
	}
	return window.msBrowser || window.browser || window.chrome;
})();

function sendRequest(message, sendResponse) {
	return fetch(message.url, message.options)
		.then(async (response) => {
			return {
				url: response.url,
				status: response.status,
				headers: JSON.parse(JSON.stringify(response.headers)),
				body: message.isJson ? await response.json() : await response.text(),
			};
		})
		.then((response) => sendResponse(response))
		.catch((error) => {
			console.error(error);
			sendResponse({
				url: message.url,
				status: 0,
				headers: {},
				body: message.isJson ? {} : '',
			});
		});
}

function sendRequestWithCookies(message, cookies, sendResponse) {
	message.options.headers['X-Cookie'] = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
	return sendRequest(message, sendResponse);
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if ('action' in message) {
		if (message.action == 'fetch') {
			// Options
			message.isJson = 'isJson' in message && message.isJson;
			message.options = Object.assign(
				{},
				{
					method: 'GET',
					body: null,
					credentials: 'same-origin',
					headers: {},
				},
				message.options || {}
			);
			// Get cookieStoreId for containers in Firefox
			if (message.options.credentials == 'same-origin' || message.options.credentials == 'include') {
				// Get cookies related to the cookieStore and send an X-Cookie header along the request
				if (CHROME) {
					// Chrome doesn't seem to change anything even with a different cookeStoreId
					sendRequest(message, sendResponse);
				} else {
					// Firefox has the cookieStoreId if cookies permission is set
					const cookieStoreId = sender.tab.cookieStoreId;
					browser.cookies
						.getAll({ url: message.url, storeId: cookieStoreId })
						.then((cookies) => sendRequestWithCookies(message, cookies, sendResponse));
				}
			} else sendRequest(message, sendResponse);
			return true;
		} else if (message.action == 'openOptions') {
			return browser.runtime.openOptionsPage();
		} else {
			throw new Error('No valid action for this message.');
		}
	} else {
		throw new Error('No action for this message.');
	}
});

browser.browserAction.onClicked.addListener(() => {
	browser.runtime.openOptionsPage();
});

if (!CHROME) {
	async function setMyAnimeListCookies(details) {
		// Only update requests sent by MyMangaDex
		if (CHROME || details.originUrl.indexOf('moz-extension://') < 0) {
			return { requestHeaders: details.requestHeaders };
		}
		// Replace Cookie headers by X-Cookie value
		const headers = [];
		for (const header of details.requestHeaders) {
			const headerName = header.name.toLowerCase();
			if (headerName === 'x-cookie') {
				headers.push({
					name: 'Cookie',
					value: header.value,
				});
			} else if (headerName !== 'cookie') {
				headers.push(header);
			}
		}
		return { requestHeaders: headers };
	}

	// prettier-ignore
	browser.webRequest.onBeforeSendHeaders.addListener(setMyAnimeListCookies,
		{ urls: ['https://myanimelist.net/*'] },
		[ 'blocking', 'requestHeaders' ]
	);
}
