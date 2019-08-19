var CHROME = false;
window.browser = (function () {
    if (window.chrome && window.browser === undefined) {
        CHROME = true;
    }
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();
// Object containing all options
// Is initialized with the default options
let defaultOptions = {
    lastReadColor: "rgba(75, 180, 60, 0.4)",
    lowerChaptersColor: "rgba(180, 102, 75, 0.4)",
    lastOpenColors: [
        "rgba(102, 51, 153, 0.6)",
        "rgba(75, 0, 130, 0.6)"
    ],
    openedChaptersColor: "rgba(102, 75, 180, 0.6)",
    hideLowerChapters: true,
    saveOnlyHigher: true,
    saveOnlyNext: false,
    confirmChapter: true,
    saveAllOpened: true,
    maxChapterSaved: 100,
    updateHistoryPage: false,
    updateOnlyInList: false,
    historySize: 100,
    updateMDList: false,
    showTooltips: true,
    highlightChapters: true,
    showNotifications: true,
    showErrors: true,
    onlineSave: false,
    onlineURL: "https://mmd.nikurasu.org/api/",
    username: "",
    isLoggedIn: false,
    token: "",
    version: 2.2,
    subVersion: 3
};
