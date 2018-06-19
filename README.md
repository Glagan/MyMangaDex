# MyMangaDex

Script inspiré de KissAnimeList pour synchroniser ses mangas suivis sur MangaDex avec sa liste MyAnimeList

Start when document finished loading (document-end)

Follow page
* Highlight chapters if read
Manga page
* Write MAL information about the chapters read, score
* Highlight last read chapters / last open
Chapter page
* Update last chapter read to the current one if higher

Stored data
* MAL id, last open chapter (not saved on mal) and the sub chapter if there is one, for a MangaDex id
  * mangadex_id:{last_open, last_open_sub, mal_id}

---

Import favorites from kissmanga https://old.reddit.com/r/manga/comments/8qebu4/import_kissmanga_bookmarks_to_mangadex/

Useful page ? https://myanimelist.net/mangalist/Glagan/load.json?offset=&status=1

URL to edit manga on MAL: https://myanimelist.net/ownlist/manga/[id]/edit

URL to add a manga on MAL: https://myanimelist.net/ownlist/manga/add?selected_manga_id=[id]

Required header to POST
```javascript
{
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    }
}
```
Useful to auto set the finish date
```javascript
add_manga[finish_date][year] = Datec.getFullYear();
add_manga[finish_date][month] = Datec.getMonth()+1;
add_manga[finish_date][day] = Datec.getDate();
```

Colors used:
* Last open: rebeccapurple
* Actual last read chapter on mal: cadetblue
* All chapters lower than the last read and that are read: yellow (maybe)

---

Detect chapter number:
* Ch. [number]
Optionnal sub chapter (the floating point)
* Ch. [number].[sub_chapter]
And the volume number (optionnal) on
* Vol. [number]

Detection on the chapter page:
* optionnal Volume [number] and the chapter with optionnal sub chapter Chapter [number].[sub_chapter]

---

# Steps
## Follow page
1. For each row
  1. Check if manga is in local storage
  2. if row is the last open chapter, highlight it
  3. if row is lower than the last open chapter, delete it (useless)
2. if row is another chapter of a previous row
  * if it's the last open chapter, highlight it and all previous rows of the same manga
## Manga page
1. check if there is a entry for this manga in the local storage
2. if there is an entry
  1. add the mal id to the MyMangaDex object
  2. Fetch information on MyAnimeList
  3. Display them and hightlight last read chapter
3. if there is no entry
  1. check if there is a mal link
    * if there is a mal link
      1. add it to the MyMangaDex object
      2. save it i, the local storage
      3. Fetch information on MyAnimeList
      4. Display them and hightlight last read chapter
    * if there is no mal link
      1. add the link entry form
      2. Abort
## Chapter page
1. Check if there is an entry for this manga in the local storage
2. if there is an entry
  1. Fetch information on MyAnimeList
  2. Update the last read chapter on mal if it's lower than the current chapter
    * Set the manga to finish if it's the last chapter
    * Start reading the manga if it's the first chapter
3. if there is no entry
  1. Fetch mangadex manga page
  2. Search for a MyAnimeList link
    * if there is a link
      1. Save it to the local storage
      2. Fetch information on MyAnimeList
      3. Update the last read chapter on mal if it's lower than the current chapter (And do the same as higher)
    * if there is no mal link, abort

---

## Change log
Before release done:
* detect which page is the current one
* detect if user is logged in
* fetch last read chapter on mal and display it
* highlight last read chapter
* detect each chapters, with optionnal volume and "sub" chapter (eg: 18[.2])
* Better readme
* separated each pages in functions for clarity
* Check if there is a mal id stored to avoid looking for it
* Store the mal url in local storage
* Fetch MAL link from manga page if directly on chapter page
* Track of last_open (update on chapter page)
* Avoid looking twice for mal link by setting it to 0
* clear local storage when visiting https://mangadex.org/about
* update mal chapter according to the current reading chapter on chapter page
* Fetch all info of an entry to avoid erasing when updating
* Retrieve total_chapter and total_volume
* Notifications
* Manga start and end when tracking chapter count
* Better follow page
* Real performance improvement by removing is_logged_in and checkin directly when fetching
* Informations on options page
* Fetch all MAL links of all followed manga on MangaDex and set last read chapter
* Even better follow page, delete rows of lower chapter and avoid deleting rows with information
* Import and export MyMangaDex data to switch between browsers or keep save
* Fully functionning and easily customizable follow if options are added
* Handle pending manga on MyAnimeList
* Choose the username you want to import (not only Glagan now, eh)

## TODO
* Manga page:
  * offset
  * add mal link if there isn't on the page
* Modal to directly edit all informations of a manga
* Add a "fusion" checkbox on import

---

## Possible displays in follow page
1. 1 single lower chapter
  * Delete it
2. 1 single higher chapter
  * Keep it
3. 1 single equal chapter
  * Paint it rebeccapurple
4. A list of all lower chapter
  * Delete all of them
5. A list of all higher chapter (with optionnal lower chapter after)
  * Keep them all
  * Delete all lower chapters
6. A list with lower chapter before a equal or higher chapter
  * Delete all lower unless it's the first line
  * Build tree to the last equal chapter

Order to process
1. Loop through all nodes in the main table
2. When the first column is empty, create a "serie" entry in the "series" array
  * Feed data: manga_id, highest_on_list, dom_nodes, first_line_chapter (+_sub)
3. Look for all patterns when the whole array as been processed for each "serie" entry
4. Delete and paint each nodes everytime

## Legacy code
Optionnal way to fetch manga and chapter info on chapter page:
```javascript
MyMangaDex.manga_name = document.getElementsByClassName("panel-title")[0].textContent;

var chapter_select = document.querySelector("button[data-id='jump_chapter']");
var volume_and_chapter = /(Volume\s(\d+)|).*(Chapter\s(\d+))\.*(\d+)*/.exec(chapter_select.title);
MyMangaDex.current_chapter = {
  volume: volume_and_chapter[2],
  chapter: volume_and_chapter[4],
  sub_chapter: volume_and_chapter[5]
}
```
Add a follow button on search page
```javascript
if (MyMangaDex.url.indexOf("page=search") > -1) {
  var result_list = document.getElementsByClassName("table table-striped table-condensed")[0].children[1].children;
  var i = 0;
  for (var manga of result_list) {
    // One manga takes two rows, for the thumbnail (???)
    if (i%2 == 0) {
      var regex = /manga\/(\d+)\/(.+)/.exec(manga.children[2].children[0].href);
      var id = regex[1];
      var name = regex[2];
      var button = document.createElement("a");
      button.textContent = "Follow";
      button.className = "btn btn-default";
      button.addEventListener("click", (event) => {
        event.preventDefault();

        fetch("https://mangadex.org/ajax/actions.ajax.php?function=manga_follow&id=" + id + "&type=1")
        .then((data) => {
          vNotify.success({title: "Manga followed", text: "<b>" + name + "</b> is now in the reading list.", position: "bottomRight"});
        }, (error) => {
          console.error(error);
        })
      })
      manga.children[2].appendChild(document.createTextNode(" "));
      manga.children[2].appendChild(button);
    }
    i++;
  }
}
```
Code on follow page for a set as last open button
```javascript
let set_as_open = document.createElement("button");
set_as_open.className = "btn btn-default";
set_as_open.textContent = "Set as open";
set_as_open.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();

  event.target.parentElement.parentElement.style.backgroundColor = "rebeccapurple";
  event.target.style.display = "none";

  browser.storage.local.get(manga_id)
  .then((data) => {
      // Create new entry if the manga isn't in local storage
      if (isEmpty(data)) {
          data[manga_id] = {
              mal_id: -1,
              manga_image: ""
          };
      }

      data[manga_id].mangadex_id = manga_id;
      data[manga_id].manga_name = manga_name;
      data[manga_id].last_open = volume_and_chapter[4];
      data[manga_id].last_open_sub = volume_and_chapter[5];

      update_last_open(data[manga_id])
      .then(() => {
          event.target.parentElement.removeChild(event.target);
      });
  })
});
element.children[2].appendChild(set_as_open);
```
Code on manga_page for the set as last open button (when checking data)
```javascript
// If the entry was added from the follow page
// The image might be null and the mal_id was set to -1
/*else*/ if (MyMangaDex.mal_id == -1) {
    MyMangaDex.mal_url = document.querySelector("img[src='/images/misc/mal.png'");
    MyMangaDex.manga_image = document.querySelector("img[title='Manga image']").src;

    if (MyMangaDex.mal_url !== null) {
        MyMangaDex.mal_url = MyMangaDex.mal_url.nextElementSibling.href;
        MyMangaDex.mal_id = /.+\/(\d+)/.exec(MyMangaDex.mal_url)[1];
    } else {
        has_a_mal_link = false;
        MyMangaDex.mal_id = 0;
    }

    update_last_open(MyMangaDex);
}
```
Hell i typed this so much
```javascript
try {
} catch (error) {
  console.error(error);
}
```