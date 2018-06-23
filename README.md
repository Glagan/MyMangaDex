# MyMangaDex
Extension inspired from [KissAnimeList](https://github.com/lolamtisch/KissAnimeList) that synchronyze what you read on MangaDex.org to your MyAnimeList.net manga list.

* Why?  
Updating your manga one by one, by hand, when you have hundreds of them and read a lot of them each day is a long, tiring task...
* Why no KissAnimeList fork?  
I find the current script too "full". It's complicated, and there is a lot of useless features (for myself).  
It was easier to just build a new script from scratch with only what was needed.  
Also, MangaDex offer MyAnimeList links on each manga page (Thanks to the community), unlike KissManga, so there is no need for an additionnal database to check, so the script would have been very different only for MangaDex.
* What you need buddy  
I only store the least possible data:  
An entry for each MangaDex manga that hold the last open chapter, the MyAnimeList id, the MangaDex image of the manga (as a filename) and the list of all opened chapters for each manga (can be disabled)

## How to Install
You can install it from the [Firefox add-ons site](https://addons.mozilla.org/fr/firefox/addon/mymangadex/).

If you want to have some kind of experimentale experience, you can install it directly from this repo:
1. Be sure that the version from the Firefox add-ons site is not installed (don't know what it would do, maybe just won't work)
2. Clone the repo
3. Go to [about:debugging](about:debugging)
4. Click "Load a temporary module"
5. Select any file of the cloned repo, and it's working.
6. Open an issue to tell me how bad it is.

Works best with the MangaDex dark theme !

## How to use
Once you have it installed, you have nothing to do!  
Start reading manga and the add-on will track them automatically.  
But if you have a lot of manga, or if you're coming from another site and want to set your follow page up-to-date, you can use the "Import (MAL)" button on the follow page that will update the last open of all followed manga if they have a MyAnimeList entry.

## Features
MyMangaDex improve 3 pages:
### Follow page
* Highlight last read chapters
* Remove old chapters from the list.
You can also import your data from MyAnimeList here (The last read of every manga you follow on MangaDex)

### Manga page
* Show some information about the manga entry on MyAnimeList if it exists
* Highlight your last read chapter and all opened chapters if you want

### Chapter page
* Automatically update the MyAnimeList manga entry to the current chapter number if it's the highest
* If it's the first chapter, the start date is set to today and the status is set to "Reading"
* If it's the last chapter, the finish date is set to today and the status is set to "Completed"

## Useful links
* Import favorites from KissManga to MangaDexx https://old.reddit.com/r/manga/comments/8qebu4/import_kissmanga_bookmarks_to_mangadex/

## Colors used
* Last opened chapters in the follow page : rebeccapurple and indigo
* Lower than last opened chapter in the follow page : darkolivegreen
* Actual last read chapter on MyAnimeList: cadetblue
* Opened chapter: darkslategrey

You can change them in the options.

---

## Change log
### 1.2
Lot of bugs fixed  
- [x] Cleaner code (I hope)
- [x] Keep track of any opened chapters and highlight them
- [x] Show manga image on title hover

### 1.1 (1.0)
- [x] Keep track of last open chapter for each manga
- [x] Update manga info on MyAnimeList
- [x] Import data from MyAnimeList
- [x] Better follow page
- [x] Display some informations and highlight last open on the manga page
- [x] Export, import and delete MyMangaDex local storage
- [x] Add a MyAnimeList link if there isn't one for a manga
- [x] Some options

## TODO
- [ ] Modal to directly edit all informations
- [ ] Re-reading
- [ ] Show last opened chapters order by highest on the manga tooltip