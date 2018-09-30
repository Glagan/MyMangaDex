/**
 * Author: Glagan
 * See <https://github.com/Glagan/MyMangaDex> for more informations
 */

 /**
 * source: https: //stackoverflow.com/a/34491287/7794671
 * Count the number of properties of an object to test if it's empty
 * Could add more tests but it was enough for this extension
 * @param {Object} obj The object to test
 */
function is_empty(obj) {
    for (let x in obj) { return false; }
    return true;
}

/**
 * Fetch data from the storage and directly return the real value
 * Return undefined if the data isn't stored or the data as it was stored if it exist
 * @param {string} key The key of the data to fetch in the storage
 */
function storage_get(key) {
    return browser.storage.local.get((key === null) ? null : key + "")
    .then(res => {
        return (key === null) ? res : res[key];
    }).catch(error => {
        console.error(error);
    });
}

/**
 * Insert the data argument directly with the key argument, to avoid creationg an object when calling storage.set()
 * If key is null, the data object just replace everything in storage
 * @param {*} key The key of the data to insert or null
 * @param {Object} data The data to insert
 */
function storage_set(key, data) {
    return browser.storage.local.set((key === null) ? data : {[key]:data})
    .catch(error => {
        console.error(error);
    });
}

/**
 * Insert the chapter in the chapters list, ordered highest to lowest and check the length to be lesser or equal to the option
 * @param {Array} chapters The list of chapters
 * @param {Object} chapter A chapter and volume object
 */
function insert_chapter(chapters, chapter) {
    if (chapters.indexOf(chapter) === -1) {
        if (chapters.length == 0) {
            chapters.push(chapter);
        } else {
            let i = 0;
            let max = chapters.length;
            let higher = true;
            // Chapters are ordered
            while (i < max && higher) {
                if (chapters[i] < chapter) {
                    higher = false;
                } else {
                    i++;
                }
            }
            chapters.splice(i, 0, chapter);

            // Check the length
            while (chapters.length > MMD_options.max_save_opened) {
                chapters.pop();
            }
        }
    }
}