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

### List pages

Any page with a chapters list have the following improvements:

* Display the thumbnail of the manga when hovering
  * Only when one isn't available natively (so only when the list is in *simple-mode* display)
* Highlight last read chapters
* Remove or paint old chapters from the list.

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

### MAL Import

The import from MAL feature set the last read chapter of every manga you follow on MangaDex using your MyAnimeList data.

### MDList update

Options is off by default.  
When starting or completing a manga, the status of the manga will be updated to "Reading" or "Completed".

## Useful links

* Extension inspired from [KissAnimeList](https://github.com/lolamtisch/KissAnimeList).
* [Import favorites from KissManga to MangaDex](https://old.reddit.com/r/manga/comments/8qebu4/import_kissmanga_bookmarks_to_mangadex/)