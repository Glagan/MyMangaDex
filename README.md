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
  * if there is an entry
    1. add the mal id to the MyMangaDex object
    2. Fetch information on MyAnimeList
    3. Display them and hightlight last read chapter
  * if there is no entry
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
  * if there is an entry
    1. Fetch information on MyAnimeList
    2. Update the last read chapter on mal if it's lower than the current chapter
      * Set the manga to finish if it's the last chapter
      * Start reading the manga if it's the first chapter
  * if there is no entry
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

## TODO
* Manga page:
  * offset
  * button to add manga to reading list/plan to read
  * add mal link if there isn't on the page
* Modal to directly edit all informations of a manga
* "Init" page to fetch all mangas from batoto and myanimelist to sync them

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