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
    lastReadColor: "rgba(75, 180, 60, 0.6)",
    lowerChaptersColor: "rgba(180, 102, 75, 0.4)",
    higherChaptersColor: "transparent",
    nextChapterColor: "rgba(199, 146, 2, 0.4)",
    lastOpenColors: [
        "rgba(28, 135, 141, 0.8)",
        "rgba(22, 65, 87, 0.8)",
        "rgba(28, 103, 141, 0.8)"
    ],
    openedChaptersColor: "rgba(28, 135, 141, 0.4)",
    hideLowerChapters: true,
    hideHigherChapters: false,
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
    showFullCover: false,
    highlightChapters: true,
    showNotifications: true,
    showErrors: true,
    onlineSave: false,
    onlineURL: "https://mmd.nikurasu.org/api/",
    username: "",
    isLoggedIn: false,
    token: "",
    version: 2.3,
    subVersion: 3
};
