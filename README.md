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
An entry for each MangaDex manga that hold the last open chapter, the sub chapter if it exist, the MyAnimeList id and the MangaDex image of the manga (as a filename)

## How to Install
Right now, you shouldn't. Even, how did you find this repo ?
First of all, it only works on Firefox right now.
If you really want to try it:
1. Clone the repo
2. Go to [about:debugging](about:debugging)
3. Click "Load a temporary module"
4. Select any file of the cloned repo, and it's working.
Open an issue to tell me how bad it is.  
Works best with the dark theme !

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
* Highlight your last read chapter

### Chapter page
* Automatically update the MyAnimeList manga entry to the current chapter number if it's the highest

## Useful links
* Import favorites from KissManga to MangaDexx https://old.reddit.com/r/manga/comments/8qebu4/import_kissmanga_bookmarks_to_mangadex/

## Colors used
* Last open: rebeccapurple or indigo
* Actual last read chapter on MyAnimeList: cadetblue

---

## Change log
Before release done:
- [x] Keep track of last open chapter for each manga
- [x] Update manga info on MyAnimeList
- [x] Import data from MyAnimeList
- [x] Better follow page
- [x] Display some informations and highlight last open on the manga page
- [x] Export, import and delete MyMangaDex local storage
- [x] Add a MyAnimeList link if there isn't one for a manga
- [x] Some options

## TODO
* Manga page:
  * [ ] Offset
* [ ] Modal to directly edit all informations
* [ ] Store all read chapters and highlight them
* [ ] Clean up

## Legacy code
Add a follow button on search page (not working)
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
Code on follow page for a set as last open button (not working)
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
Code on manga_page for the set as last open button (when checking data) (not working)
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