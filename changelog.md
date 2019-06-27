# Changelog

## 2.1

* Added support for the /history page on MangaDex

## 2.0.5

* Added www subdomain of MangaDex

## 2.0

* Online Save
  * Import, Export or Download the list
  * Disabled by default
  * Manage online list (update credentials, token and delete the list)
* Updated options layout, again
* Added a *Download* button for **Export (MMD)**
* Added an file select button for the **Import (MMD)**
* Added support for the new */genre* page on MangaDex
* Added a *Show Lower* button on chapter list pages to show hidden chapters
* Fix MD list status when auto-updating it
* Fix Date buttons in MAL modal
* Fix MAL id detection

## 1.9.10 + 1.9.11

* Fix icon in options page
* Final fix for the "Export (MAL)" feature
* Save empty new entries when exporting to MAL

## 1.9.9

* Added warnings in the options
* Fix for the "Export (MAL)" feature, again

## 1.9.8

* Fix for the "Export (MAL)" feature

## 1.9.7

* Added a "Copy" button when exporting a MyMangaDex save
* Added a "Delete on MyAnimeList" button inside the MAL Modal
* Added "Export (MAL)" option, thanks @Nvyous
* Added an option to remove the "No MAL Flag" added in the previous version
* Save MyAnimeList id directly on title page to avoid not saving it if there is a MyAnimeList error
* Fix higher chapter detection to avoid updating on MyAnimeList for chapter with floating point

## 1.9.6

* Add a "No MAL" icon when there is no MyAnimeList id in chapters list
* Removed useless code in the paintOrHide function
* Fix logged in MyAnimeList detection
* Added a message to fill the gap on title list when not logged in
* Updated notification to check for undefined in vanilla notify rather than when calling the function
* Fix add click to paint event only if the option is enabled

## 1.9.4

* Fix "start date set to today" notification when reading multiple chapters of a new title

## 1.9.3

* Fix hiding first row with a chapter lower than another

## 1.9.2

* Added the forgotten "Today" button in the MyAnimeList modal
* Added back the "painting when opening a chapter in another tab" feature

## 1.9.1

* Added "Today" button in the modal
* Added back the event for painting a chapter in a chapters list on middle-click

## 1.9

* Added more options to disable things:
  * Disable highlights
  * Disable notifications
  * Disable error notifications
* Restored and fixed pages with a list of titles
  * The page was detected as a title page
* Updated the highlight on chapters list
  * More simple and to support the new option
* Made notifications close by cliking on it
  * To make it easier on Mobile devices
* Fix "Not logged in" notification on new unread manga
* Removed a console.log
* Replaced console.error with notifications
* Removed "auxclick" (middle click) painting the background on chapters list

## 1.8

* Chrome version
* Added more MangaDex list status update
  * When Re-reading, Adding to Plan to Read, Adding on hold or dropping
* Minify bash script
* Updated MyAnimeList Modal
  * Follow the MangaDex style and use bootstrap classes
  * Now update all displayed values when updating them
* Tooltips are now correctly displayed when resizing the window
* Chapters with floating point are correctly saved in chapters list
* Converted Promise to async/await
  * Minimum required version is now Firefox 61
* Option page once again reworked
* Updated default colors
* Updated README and better screenshots
* Converted to camelCase
* Removed the form to add a MyAnimeList ID
* Removed the merge option when importing MyMangaDex save

## 1.7.2

* Fix the Random page of MangaDex
  * There is no id in the URL and the extension was using only the URL to find one

## 1.7.1

* Fix MMD import

## 1.7

* Moved the Import, Export and Delete buttons to the options
* Reworked the options a bit
* Added the auto update of MDList
  * Starting or completing a manga can now set the Reading or Completed status on MangaDex
  * Options is off by default
* Fix MAL import
* Added some notifications when there is an update and a first time use notification
* Moved the changelog to it's own file
* Moved css files to their folder

## 1.6.3

* Fix options, oops.
* Updated Readme

## 1.6.1 (+ 1.6.2)

* Fix for the MangaDex update (/manga is now /title)

## 1.6

* Rereading
  * Can edit the "is_rereading" value in the edit modal
  * Added a "Re-read" button on the manga page when a manga is completed
* Avoid updating if the chapter is delayed

## 1.5.6 (+ 1.5.7)

* Fix not updating the last read

## 1.5.4 (+ 1.5.5)

* Update to support chapter change with the new reader
* Fix for Import (MAL)
* Fixed the modal header height

## 1.5.3

* Fixed the Addon .. Again !
  * This time it was MangaDex that updated
* Removed the "Follow Button" on lists page, and the corresponding option
  * MangaDex added them
* Minified vanilla-notify and mymangadex
* Moved the notification to the left, since the reader menu is now on the right
* Added the the MDList page to the list of pages containing lists of titles

## 1.5.2

* Fixed the Addon
  * Recent MyAnimeList broke it somehow :(
* Tooltips now appear faster and don't wait for the thumbnail to load fully

## 1.5

* Bug fixed
  * An empty chapter page (for when a group WILL publish a chapter, but isn't due to group delay) wasn't working
* Updating a MyAnimeList entry trough the Edit button now edit informations if they are displayed (Manga page)
* Added the /group and /user page to highlight chapters like in the /follows page
* Added the /group and /user page to the list of pages that contains a list of titles (to display the Follow/Read buttons)

## 1.4

* Modal to directly edit all informations from MyAnimeList
* Tooltip with thumbnail on pages with a list and without thumbnail
* "Reading" and "Plan to read" button on the pages with a list
* Detect if a MyAnimeList was added on MangaDex
* Bigger notifications
* Modified the thumbnail URL to avoid s1.

## 1.3

* Bugs fixed again
* Better main loop on the follow page
* Removed support for 1.1 (1.2 and higher are fine)
* Save only a certain amount of chapters * Default 100, option to change it
* Better updates handling

## 1.2

* Lot of bugs fixed
* Cleaner code (I hope)
* Keep track of any opened chapters and highlight them
* Show manga image and last 5 highest opened chapters when hovering the title

## 1.1 (1.0)

* Keep track of last open chapter for each manga
* Update manga info on MyAnimeList
* Import data from MyAnimeList
* Better follow page
* Display some informations and highlight last open on the manga page
* Export, import and delete MyMangaDex local storage
* Add a MyAnimeList link if there isn't one for a manga
* Some options
