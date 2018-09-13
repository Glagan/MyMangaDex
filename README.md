# MyMangaDex

![Follow page Screenshot](screenshot.png)  
Firefox WebExtension that synchronize what you read on MangaDex.org to your MyAnimeList.net manga list.

## Why

Updating your manga one by one, by hand, when you have hundreds of them and read a lot of them each day is a long, tiring task...

## How to Install

You can install it from the [Firefox add-ons site](https://addons.mozilla.org/fr/firefox/addon/mymangadex/).

You can also install the extension from this repository, but the extension **will** be uninstalled when Firefox is closed and the data **could** be deleted at the same time.

1. Be sure that the version from the Firefox add-ons site is not installed (don't know what it would do, maybe just won't work)
2. Clone the repo
3. Go to [about:debugging](about:debugging)
4. Click "Load a temporary module"
5. Select any file of the cloned repo.
6. Done !

Works best with the MangaDex dark theme !

## How to use

You have to be logged on MyAnimeList or your list won't be updated, since the extension load pages and send requests like **you** would do, and no credentials is stored in the extension.  
You don't have to be logged on MangaDex but you can't access some really useful pages of MangaDex without an account.

Once you have it installed, you have nothing to do!  
Start reading manga and the add-on will track them automatically.

If you have a lot of manga, or if you're coming from another site and want to set your follow page up-to-date, you can use the **Import (MAL)** button on the **Follow Page** that will update the last open of all followed manga if they have a MyAnimeList entry.  
The import *could* be long if you have a lot of manga in your list, don't leave the page until it ends.

## Data Stored

I only store the least possible data:

* The last open chapter for each manga
* The MyAnimeList id for each manga
* A list of all opened chapters for each manga
* The list of options used to customize colors and other parameters

You can disable the option to save all opened chapters, and all of the data can be easily exported using the **Export (MMD)** on the **Follow page**.

## Features

MyMangaDex improve the following pages:

### "List" pages

Any page with a chapters list have the following improvements:

* Display the thumbnail of the manga when hovering
  * Only when one isn't available natively (so only when the list is in *simple-mode* display)
* Highlight last read chapters
* Remove or paint old chapters from the list.

You can also *import* your data from MyAnimeList on the **Follow** page (*import:* set the last read of every manga you follow on MangaDex using your MyAnimeList data)

### Manga page

* Show some informations about the manga entry on MyAnimeList if it exists
* Highlight your last read chapter and all opened chapters
* Start Reading the manga or add it to your Plan to Read list
* Add a MyAnimeList id if there isn't one

### Chapter page

* Automatically update the MyAnimeList manga entry to the current chapter number if it's the highest
* If it's the first chapter, the start date is set to today and the status is set to "Reading"
* If it's the last chapter, the finish date is set to today and the status is set to "Completed"
  * If the manga was in re-read mode, it is set as completed again and the re-read amount is incremented
* Avoid updating the chapter on MyAnimeList if the chapter is delayed by the group

## Useful links

* Extension inspired from [KissAnimeList](https://github.com/lolamtisch/KissAnimeList).
* [Import favorites from KissManga to MangaDex](https://old.reddit.com/r/manga/comments/8qebu4/import_kissmanga_bookmarks_to_mangadex/)

## Change log

### 1.6.3

* Fix options, oops.
* Updated Readme

### 1.6.1 (+ 1.6.2)

* Fix for the MangaDex update (/manga is now /title)

### 1.6

* Rereading
  * Can edit the "is_rereading" value in the edit modal
  * Added a "Re-read" button on the manga page when a manga is completed
* Avoid updating if the chapter is delayed

### 1.5.6 (+ 1.5.7)

* Fix not updating the last read

### 1.5.4 (+ 1.5.5)

* Update to support chapter change with the new reader
* Fix for Import (MAL)
* Fixed the modal header height

### 1.5.3

* Fixed the Addon .. Again !
  * This time it was MangaDex that updated
* Removed the "Follow Button" on lists page, and the corresponding option
  * MangaDex added them
* Minified vanilla-notify and mymangadex
* Moved the notification to the left, since the reader menu is now on the right
* Added the the MDList page to the list of pages containing lists of titles

### 1.5.2

* Fixed the Addon
  * Recent MyAnimeList broke it somehow :(
* Tooltips now appear faster and don't wait for the thumbnail to load fully

### 1.5

* Bug fixed
  * An empty chapter page (for when a group WILL publish a chapter, but isn't due to group delay) wasn't working
* Updating a MyAnimeList entry trough the Edit button now edit informations if they are displayed (Manga page)
* Added the /group and /user page to highlight chapters like in the /follows page
* Added the /group and /user page to the list of pages that contains a list of titles (to display the Follow/Read buttons)

### 1.4

* Modal to directly edit all informations from MyAnimeList
* Tooltip with thumbnail on pages with a list and without thumbnail
* "Reading" and "Plan to read" button on the pages with a list
* Detect if a MyAnimeList was added on MangaDex
* Bigger notifications
* Modified the thumbnail URL to avoid s1.

### 1.3

* Bugs fixed again
* Better main loop on the follow page
* Removed support for 1.1 (1.2 and higher are fine)
* Save only a certain amount of chapters * Default 100, option to change it
* Better updates handling

### 1.2

* Lot of bugs fixed
* Cleaner code (I hope)
* Keep track of any opened chapters and highlight them
* Show manga image and last 5 highest opened chapters when hovering the title

### 1.1 (1.0)

* Keep track of last open chapter for each manga
* Update manga info on MyAnimeList
* Import data from MyAnimeList
* Better follow page
* Display some informations and highlight last open on the manga page
* Export, import and delete MyMangaDex local storage
* Add a MyAnimeList link if there isn't one for a manga
* Some options

## TODO

* Auto add to Reading and Completed lists on MangaDex