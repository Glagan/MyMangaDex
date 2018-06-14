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
* Last opened chapter for each manga (manga id, manga name, chapter url, chapter name)
* MAL url for a manga on mangadex (mal url, mangadex url)

--

Useful page ? https://myanimelist.net/mangalist/Glagan/load.json?offset=&status=1
URL to edit manga on MAL: https://myanimelist.net/ownlist/manga/[id]/edit
URL to add a manga on MAL: https://myanimelist.net/ownlist/manga/add?selected_manga_id=[id]
Required header to POST
headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
},

--

Detect chapter number:
* Ch. [number]
And the volume number (optionnal) on
* Vol. [number]

--

Colors:
* Last open: rebeccapurple
* Actual last read chapter on mal: cadetblue

--

Before release done:
* detect which page is the current one
* detect if user is logged in
* TODO: check only every x minutes or so but check when sending data
* fetch last read chapter on mal and display it
* highlight last read chapter
* detect each chapters, with optionnal volume and "sub" chapter (eg: 18[.2])

Todo:
* Follow page:
** Highlight if last_read
* Manga page:
** highlight last open on list
** offset
** button to add manga to reading list
** add mal link if there isn't on the page
* chapter page:
** edit last read on mal and last opened
** add manga to reading list if not in