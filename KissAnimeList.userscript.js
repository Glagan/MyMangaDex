// ==UserScript==
// @name        KissAnimeList
// @version     0.92.4
// @description Integrates MyAnimeList into various sites, with auto episode tracking.
// @author      lolamtisch@gmail.com
// @license 	CC-BY-4.0; https://creativecommons.org/licenses/by/4.0/legalcode
// @license 	MIT
// @supportURL  https://github.com/lolamtisch/KissAnimeList/issues
// @homepageURL https://github.com/lolamtisch/KissAnimeList
// @iconURL     https://raw.githubusercontent.com/lolamtisch/KissAnimeList/dev/Screenshots/KAL_Logo.png
//
// @include     /^https?:\/\/kissanime\.ru\/(Anime\/|BookmarkList)/
// @include     /^https?:\/\/kissanime\.to\/(Anime\/|BookmarkList)/
//
// @include     /^https?:\/\/kissmanga\.com\/(manga\/|BookmarkList)/
//
// @include     /^https?:\/\/myanimelist.net\/((anime(list)?|manga(list)?)(\.php\?.*id=|\/)|character|people|search)/
//
// @include     /^https?://www.masterani.me\/anime\/(info|watch)\//
//
// @include     /^https?:\/\/(w+.?\.)?9anime\.to\/watch\//
// @include     /^https?:\/\/(w+.?\.)?9anime\.is\/watch\//
// @include     /^https?:\/\/(w+.?\.)?9anime\.ru\/watch\//
// @include     /^https?:\/\/(w+.?\.)?9anime\.ch\/watch\//
//
// @include     /^https?:\/\/(www\.)?crunchyroll.com\//
// @exclude     /^https?:\/\/(www\.)?crunchyroll.com\/($|acct|anime|comics|edit|email|forum|home|inbox|library|login|manga|newprivate|news|notifications|order|outbox|pm|search|store|user|videos)/
//
// @include     /^https?:\/\/(w+.?\.)?gogoanime\.tv\/([^/]+$|category\/)/
// @include     /^https?:\/\/(w+.?\.)?gogoanime\.io\/([^/]+$|category\/)/
// @include     /^https?:\/\/(w+.?\.)?gogoanime\.in\/([^/]+$|category\/)/
// @include     /^https?:\/\/(w+.?\.)?gogoanime\.se\/([^/]+$|category\/)/
// @exclude     /^https?:\/\/(w+.?\.)?gogoanime\.(tv|io|in|se)\/(.*.html|anime-List)/
//
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @resource    materialCSS https://code.getmdl.io/1.3.0/material.indigo-pink.min.css
// @resource    materialFont https://fonts.googleapis.com/icon?family=Material+Icons
// @resource    materialjs https://code.getmdl.io/1.3.0/material.min.js
// @resource    simpleBarCSS https://unpkg.com/simplebar@latest/dist/simplebar.css
// @resource    simpleBarjs https://unpkg.com/simplebar@latest/dist/simplebar.js
//
// @connect     www.google.com
// @connect     ipv4.google.com
// @connect     myanimelist.net
// @connect     kissanimelist.firebaseio.com
// @connect     www.crunchyroll.com
// @connect     kissanime.ru
// @connect     kissmanga.com
// @connect     9anime.to
// @connect     9anime.is
// @connect     9anime.ru
// @connect     9anime.ch
// @connect     www3.gogoanime.tv
// @connect     www.masterani.me
// @connect     *
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_listValues
// @grant       GM_deleteValue
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_openInTab
// @grant       GM_notification
// @run-at      document-start
// @namespace https://greasyfork.org/users/92233
// ==/UserScript==

(function() {
    'use strict';
//if (window.top != window.self) {return; }
//TODO: temporary workaround

    var googleover = 0;
    var debug = 0;

    var con = console;
    con = {
        log: function() {},
        error: function() {},
        debug: function() {}
    };

    var element = new Image();

    var debugging = GM_getValue('debugging', 0 );

    if(debugging){
        debug = 1;
        con.log = function(){
            var args = Array.prototype.slice.call(arguments);
            args.unshift("color: blue;");
            args.unshift("%c[KAL]");
            console.log.apply(console, args);
        }
    }else{
        Object.defineProperty(element, 'id', {
          get: function () {
            debug = 1;
            con.log = function(){
                var args = Array.prototype.slice.call(arguments);
                args.unshift("color: blue;");
                args.unshift("%c[KAL]");
                console.log.apply(console, args);
            }
          }
        });
    }
    console.log('%cKissAnimeList ['+GM_info.script.version+']', element,);



    var malBookmarks = GM_getValue( 'malBookmarks', 1 );
    var classicBookmarks = GM_getValue( 'classicBookmarks', 0 );
    if(classicBookmarks === 0){
        var BookmarksStyle = 1;
    }

    var tagLinks = GM_getValue( 'tagLinks', 1 );
    var epPredictions = GM_getValue( 'epPredictions', 1 );
    var newEpInterval = GM_getValue( 'newEpInterval', 'null' );
    var newEpNotification = GM_getValue( 'newEpNotification', 1 );
    var newEpBorder = GM_getValue( 'newEpBorder', 'ff0000' );
    var openInBg = GM_getValue( 'openInBg', 1 );
    var newEpCR = GM_getValue( 'newEpCR', 0 );

    var searchLinks = GM_getValue( 'searchLinks', 1 );
    var kissanimeLinks = GM_getValue( 'kissanimeLinks', 1 );
    var kissmangaLinks = GM_getValue( 'kissmangaLinks', 1 );
    var masteraniLinks = GM_getValue( 'masteraniLinks', 1 );
    var nineanimeLinks = GM_getValue( 'nineanimeLinks', 1 );
    var crunchyrollLinks = GM_getValue( 'crunchyrollLinks', 1 );
    var gogoanimeLinks = GM_getValue( 'gogoanimeLinks', 1 );

    var malThumbnail = GM_getValue( 'malThumbnail', 100 );

    var miniMALonMal = GM_getValue( 'miniMALonMal', 0 );
    var posLeft = GM_getValue( 'posLeft', 'left' );
    var outWay = GM_getValue( 'outWay', 1 );
    var miniMalWidth = GM_getValue( 'miniMalWidth', '30%' );
    var miniMalHeight = GM_getValue( 'miniMalHeight', '90%' );

    var displayFloatButton = GM_getValue( 'displayFloatButton', 1 );

    var episodeInfoBox = GM_getValue( 'episodeInfoBox', 0 );
    var episodeInfoSynopsis = GM_getValue( 'episodeInfoSynopsis', 1 );
    var episodeInfoImage = GM_getValue( 'episodeInfoImage', 1 );
    var episodeInfoSubtitle = GM_getValue( 'episodeInfoSubtitle', 1 );

    var autoTracking = GM_getValue( 'autoTracking', 1 );

    var delay = GM_getValue( 'delay', 3 );

    var currentMalData = null;

    var loadingText = 'Loading';

    var curVersion = GM_info.script.version;

    function changelog(){
        if(curVersion != GM_getValue( 'Version', null )){
            var message = '<div style="text-align: left;">';
            if(GM_getValue( 'Version', null ) != null){
                switch(curVersion) {
                    case '0.86.4':
                        message += 'Kissanimelist (v0.86)<br/>- 9anime Support<br/>- Link to last streaming page on Myanimelist\'s Animelist (Tags have to be activated)';
                        break;
                    case '0.86.5':
                        message += 'Kissanimelist (v0.86.5)<br/>- add config Page (Can be found in Mal profile settings)';
                        break;
                    case '0.87.1':
                        message += 'Kissanimelist (v0.87.1)<br/>- Materialize UI<br/>- Add miniMAL popup';
                        break;
                    case '0.87.3':
                        message += 'Kissanimelist (v0.87.3)<br/>- Crunchyroll Support (Video page only)<br/>- Added MAL classic bookmark support<br/>- Added next episode links in MAL bookmarks';
                        break;
                    case '0.87.8':
                        message += 'Kissanimelist (v0.87.8)<br/>- Android Support<br/>- Added Autoupdate delay settings';
                        break;
                    case '0.87.9':
                        message += 'Kissanimelist (v0.87.9)<br/>- Gogoanime Support<br/>- Crunchyroll multiple season support';
                        break;
                    case '0.89.0':
                        message += 'Check out the new <a href="https://discord.gg/cTH4yaw">Discord channel</a>!<br/><br/>Kissanimelist (v0.89.0)</br>- Add Search to miniMAL</br>- Add MyAnimeList Bookmarks to miniMAL</br>- MyAnimeList Tags don\'t need to be activated anymore</br>- Mal2Crunchyroll links now hides remaining seasons</br>';
                        break;
                    case '0.90.0':
                        message += 'Changelog (v0.90.0):<br/>    - Added a shortcut for MiniMAL ( CTRL + M )<br/>    - Added MiniMAL position and dimension settings<br/>    - Added an option for displaying \'Episode Hoverinfo\'<br/>    - Added miniMAL to MyAnimeList<br/>    - Changed the \'Add to Mal\'-message, to a non-blocking message<br/>    - Fixed the database structure<br/><br/>New on KissAnimeLists <a href="https://discord.gg/cTH4yaw">Discord</a>:<br/>    - Feed showing newly added episodes for each of the supported streaming sites.';
                        break;
                    case '0.90.2':
                        message += 'KissAnimeList (v0.90.2):<br/>    - Added support for 9anime.is and 9anime.ru';
                        break;
                    case '0.91.0':
                        message += 'Changelog (v0.91.0):<br/><br/> [Added]  <br/> - Feature: Thumbnails on MAL have been enlarged, with added resizing options. <br/> - Feature: "Move out of the way"-feature, which moves the video when miniMAL is opened. <br/> - Feature: "Continue watching"-links has been added to both the Overview-tab in miniMAL, and to the details-tab on MAL. <br/> - Info-bubbles has been added to the settings tab in miniMAL. <br/><br/> [Changed] <br/> - Updated the miniMAL styling. <br/><br/> [Fixed] <br/> - miniMAL-button didn\'t always appear.';
                        break;
                    case '0.91.1':
                        message += 'KissAnimeList (v0.91.1):<br/><br/>  [Fixed] <br/> - KAL now works with 9anime\'s new layout';
                        break;
                    case '0.91.2':
                        message += 'KissAnimeList (v0.91.2):<br/><br/>  [Fixed] <br/> - New database-structure for 9anime urls';
                        break;
                    case '0.91.3':
                        message += 'KissAnimeList (v0.91.3):<br/><br/>  [Fixed] <br/> - Improved title recognition on 9anime & MasterAnime';
                        break;
                    case '0.91.4':
                        message += 'KissAnimeList (v0.91.4):<br/><br/> [Added] <br/> - Support for 9anime.ch  <br/> <br/> [Fixed] <br/> - "MAL thumbnails" and "Episode Hoverinfo" not working in Opera <br/> - The miniMAL-button was not appearing for anime\'s without a MAL-url';
                        break;
                    case '0.92.1':
                        message += 'KissAnimeList (v0.92.0):<br/><br/> [Added] <br/>- Feature: Display a tentative episode number and air time for anime.  <br/>- Feature: If autotracking is deactivated - Display a popup for manually updating  <br/>- Mangalist integration <br/>- Added a section for characters to miniMAL.  <br/>- Added anime/manga switches for miniMAL\'s search and bookmarks <br/>- Feature: Episode/Chapter releases check [BETA] (Deactivated by default) <br/> ';
                        break;
                }
            }else{
                message += '<h2>Welcome to <a href="https://greasyfork.org/en/scripts/27564-kissanimelist">KissAnimeList</a></h2><br/>Support:<br/><a href="https://discord.gg/cTH4yaw">Discord Channel</a><br/><a href="https://github.com/lolamtisch/KissAnimeList">GitHub</a> <a href="https://github.com/lolamtisch/KissAnimeList/issues">Issues</a>';
            }
            if(message != '<div style="text-align: left;">'){
                message += '</div><button class="okChangelog" style="background-color: transparent; border: none; color: rgb(255,64,129);margin-top: 10px;cursor: pointer;">Close</button>'
                flashm(message, false, false, true);
                $('.okChangelog').click(function(){
                    GM_setValue( 'Version', curVersion );
                    $('.flashPerm').remove();
                });
            }else{
                GM_setValue( 'Version', curVersion );
            }
        }
    }

    function getDeclaration(kalUrl){
    var Kal = {};

    if( kalUrl.indexOf("kissanime.ru") > -1 ){
        //#########Kissanime#########
        Kal.domain = 'http://kissanime.ru';
        Kal.textColor = '#d5f406';
        Kal.dbSelector = 'Kissanime';
        Kal.listType = 'anime';
        Kal.bookmarkCss = ".listing tr td:nth-child(1){height: 150px;padding-left: 125px;} .listing tr td{vertical-align: top;}";
        Kal.bookmarkFixCss = ".bigBarContainer {margin: 0px; width: 630px !important; text-align: left; float: left;}";
        Kal.videoSelector = '#divContentVideo';

        Kal.init = function() {
            checkdata();
        }

        Kal.imageCache = function(selector) {
            return $('#rightside').find('img').attr('src');
        };

        Kal.isOverviewPage = function() {
            if(typeof kalUrl.split('/')[5] != 'undefined'){
                if($('#centerDivVideo').length){
                    return false;
                }
            }
            return true;
        };
        Kal.episodeListSelector = function() {
            return $(".listing a");
        };
        Kal.episodeListElementHref = function(selector) {
            return $.absoluteLink(selector.attr('href'));
        };
        Kal.episodeListElementTitle = function(selector) {
            return selector.text().replace($('.bigChar').text(),'');
        };
        Kal.episodeListNextElement = function(selector, index) {
            if ((index-1) > -1) {
                return Kal.episodeListSelector().eq(index-1);
            }
            return $();
        };
        Kal.handleNextLink = function(truelink, anime){
            return truelink;
        };

        Kal.urlEpisodePart = function(url) {
            return url.split("/")[5].split("?")[0];
        };
        Kal.urlAnimeIdent = function(url) {
            return url.split('/').slice(0,5).join('/');
        };
        Kal.urlAnimeSelector = function(url) {
            return url.split("/")[4].split("?")[0];
        };
        Kal.urlAnimeTitle = function(url) {
            return Kal.urlAnimeSelector(url);
        };

        Kal.EpisodePartToEpisode = function(string) {
            var temp = [];
            temp = string.match(/[e,E][p,P][i,I]?[s,S]?[o,O]?[d,D]?[e,E]?\D?\d{3}/);
            if(temp !== null){
                string = temp[0];
            }
            temp = string.match(/\d{3}/);
            if(temp === null){
                temp = string.match(/\d{2,}\-/);
                if(temp === null){
                    string = 0;
                }else{
                    string = temp[0];
                }
            }else{
                string = temp[0];
            }
            return string;
        };

        Kal.uiPos = function(selector) {
            selector.insertAfter($(".bigChar").first());
        };
        Kal.uiWrongPos = function(selector) {
            selector.insertAfter($(".bigChar").first());
        };
        Kal.uiHeadPos = function(selector) {
            selector.appendTo($(".barTitle").first());
        };

        Kal.docReady = function(data) {
            return $( document).ready(data);
        };

        Kal.normalUrl = function(){
            return Kal.urlAnimeIdent(kalUrl);
        };

        Kal.epListReset = function(selector) {
            selector.parent().parent().css("background-color","initial");
        };
        Kal.epListActive = function(selector) {
            selector.parent().parent().css("background-color","#002966");
        };

        Kal.bookmarkEntrySelector = function() {
            return $(".trAnime");
        };

        Kal.nextEpLink = function(url) {
            return url+'/'+$('#selectEpisode option:selected').next().val();
        };

        Kal.classicBookmarkButton = function(selector, checkClassic) {
            selector.before('<div><input type="checkbox" id="classicBookmarks" '+checkClassic+' > Classic styling</div><div class="clear2">&nbsp;</div>');
        };
        Kal.bookmarkButton = function(selector, check) {
            selector.before('<div><input type="checkbox" id="malBookmarks" '+check+' > MyAnimeList Bookmarks</div><div class="clear2">&nbsp;</div>');
        };

        Kal.BookmarksStyleAfterLoad = function() {
            if( BookmarksStyle == 1 ){
                var optionsTarget = $("#optionsTarget");
                var blackSpacer = "";
            }else{
                var optionsTarget = $("#divIsShared");
                var blackSpacer = '<th id="endSpacer" width="36%" style="border: 0;">';
            }
            $(".head").html('<th id="cssTableSet" style="min-width:120px;padding-right: 5px;"></th><th></th>'+blackSpacer+'</th>');
            $( ".listing tr td:nth-child(1)" ).before("<td class='Timage' style='padding-left: 0;'></td>");
            $( ".listing tr td:nth-child(1)" ).css("height","150px");
            optionsTarget.after('<div class="clear2">&nbsp;</div><div><button type="button" id="clearCache">Clear Cache</button></div>');
            $("#clearCache").click( function(){
                clearCache();
            });
        };
        //###########################
    }else if( kalUrl.indexOf("kissmanga.com") > -1 ){
        //#########Kissmanga#########
        Kal.domain = 'http://kissmanga.com';
        Kal.textColor = '#72cefe';
        Kal.dbSelector = 'Kissmanga';
        Kal.listType = 'manga';
        Kal.bookmarkCss = ".listing tr td:nth-child(1){height: 150px;padding-left: 125px;} .listing tr td{vertical-align: top;}";
        if(classicBookmarks == 0){
            Kal.bookmarkCss += '#leftside{width: 581px !important;} #rightside{ float: left !important; margin-left: 30px;}';
        }
        Kal.bookmarkFixCss = "";
        BookmarksStyle = "";

        Kal.init = function() {
            Kal.docReady(function(){
                if(!Kal.isOverviewPage()){
                    $('#divImage > p').each(function(index, el) {
                        $(this).attr('id', index+1).addClass('kal-image');
                    });
                    var hash = window.location.hash;
                    setTimeout(function(){
                        var page = parseInt(hash.substring(1));
                        window.location.hash = '';
                        window.location.hash = hash;

                        if($( "button:contains('Load Manga')" ).length){
                            $( "button:contains('Load Manga')").click(function(){
                                manga_loader();
                            });
                        }
                        if($('.ml-images').length){
                            manga_loader();
                        }
                        function manga_loader(){
                            setTimeout(function(){
                                var tempDocHeight = $(document).height();
                                if(hash && !(isNaN(page))) findPage();
                                function findPage(){
                                    if($(".ml-images .ml-counter:contains('"+page+"')").length){
                                        $("html, body").animate({ scrollTop: $(".ml-images .ml-counter:contains('"+page+"')").prev().offset().top }, "slow");
                                    }else{
                                        $("html, body").animate({ scrollTop: $(document).height() }, 0);
                                        setTimeout(function(){
                                            $('html').scroll();
                                            if(tempDocHeight != $(document).height()){
                                                tempDocHeight = $(document).height();
                                                findPage();
                                            }
                                        }, 500);
                                    }
                                }
                            }, 2000);
                        }
                        var delayUpate = 1;
                        $(document).scroll(function() {
                            if(delayUpate){
                                delayUpate = 0;
                                setTimeout(function(){ delayUpate = 1; }, 2000);
                                $('.kal-image').each(function(index, el) {
                                    if($(this).isInViewport()){
                                        if(window.location.hash != '#'+$(this).attr('id')){
                                            history.pushState({}, null, '#'+$(this).attr('id'));
                                            checkdata();
                                        }
                                        return false;
                                    }
                                });
                                $('.ml-images img').each(function(index, el) {
                                    if($(this).isInViewport()){
                                        if(window.location.hash != '#'+$(this).next().text()){
                                            history.pushState({}, null, '#'+$(this).next().text());
                                            checkdata();
                                        }
                                        return false;
                                    }
                                });
                            }
                        });
                    }, 5000);
                }
            });
            checkdata();
        }

        Kal.imageCache = function(selector) {
            return $('#rightside').find('img').attr('src');
        };

        Kal.isOverviewPage = function() {
            if($("#malp").width() !== null){
                return true;
            }else{
                return false;
            }
        };
        Kal.episodeListSelector = function() {
            return $(".listing a");
        };
        Kal.episodeListElementHref = function(selector) {
            return $.absoluteLink(selector.attr('href'));
        };
        Kal.episodeListElementTitle = function(selector) {
            return selector.text().replace($('.bigChar').text(),'');
        };
        Kal.episodeListNextElement = function(selector, index) {
            if ((index-1) > -1) {
                return Kal.episodeListSelector().eq(index-1);
            }
            return $();
        };
        Kal.handleNextLink = function(truelink, anime){
            return truelink;
        };

        Kal.urlEpisodePart = function(url) {
            return url.split("/")[5].split("?")[0];
        };
        Kal.urlAnimeIdent = function(url) {
            return url.split('/').slice(0,5).join('/');
        };
        Kal.urlAnimeSelector = function(url) {
            return url.split("/")[4].split("?")[0];
        };
        Kal.urlAnimeTitle = function(url) {
            return Kal.urlAnimeSelector(url);
        };

        Kal.EpisodePartToEpisode = function(string) {
            var temp = [];
            try{
                string = string.replace($('.bigChar').attr('href').split('/')[2],'');
            }catch(e){string = string.replace(kalUrl.split("/")[4],'');}
            temp = string.match(/[c,C][h,H][a,A]?[p,P]?[t,T]?[e,E]?[r,R]?\D?\d+/);
            if(temp === null){
                string = string.replace(/[V,v][o,O][l,L]\D?\d+/,'');
                temp = string.match(/\d{3}/);
                if(temp === null){
                    temp = string.match(/\d+/);
                    if(temp === null){
                        string = 0;
                    }else{
                        string = temp[0];
                    }
                }else{
                    string = temp[0];
                }
            }else{
                string = temp[0].match(/\d+/)[0];
            }
            return string;
        };

        Kal.uiPos = function(selector) {
            selector.insertAfter($(".bigChar").first());
        };
        Kal.uiWrongPos = function(selector) {
            selector.insertAfter($(".bigChar").first());
        };
        Kal.uiHeadPos = function(selector) {
            selector.appendTo($(".barTitle").first());
        };

        Kal.docReady = function(data) {
            return $( document).ready(data);
        };

        Kal.normalUrl = function(){
            return Kal.urlAnimeIdent(kalUrl);
        };

        Kal.epListReset = function(selector) {
            selector.parent().parent().css("background-color","initial");
        };
        Kal.epListActive = function(selector) {
            selector.parent().parent().css("background-color","#002966");
        };

        Kal.bookmarkEntrySelector = function() {
            return $(".listing tr:not(.head)");
        };

        Kal.nextEpLink = function(url) {
            return kalUrl;
        };

        Kal.classicBookmarkButton = function(selector, checkClassic) {
            $("#rightside .barContent div").last().after('<div><input type="checkbox" id="classicBookmarks" '+checkClassic+' > Classic styling</div><div class="clear2">&nbsp;</div>');
        };
        Kal.bookmarkButton = function(selector, check) {
            $("#rightside .barContent div").last().after('<div class="clear2" style="border-bottom: 1px solid #DDD2A4;">&nbsp;</div><div class="clear2">&nbsp;</div><div><input type="checkbox" id="malBookmarks" '+check+' > MyAnimeList Bookmarks</div>');
        };

        Kal.BookmarksStyleAfterLoad = function() {
            $(".head").html('<th id="cssTableSet" style="min-width:120px;padding-right: 5px;"></th><th></th>');//<th width="21%" style=""></th>');
            $( ".listing tr td:nth-child(1)" ).before("<td class='Timage' style='padding-left: 0;'></td>");
            $( ".listing tr td:nth-child(1)" ).css("height","150px");
            $("#rightside .barContent div").last().after('<div class="clear2">&nbsp;</div><div><button type="button" id="clearCache">Clear Cache</button></div>');
            $("#clearCache").click( function(){
                clearCache();
            });
        };
        //###########################
    }else if( kalUrl.indexOf("masterani.me") > -1 ){
        //#########Masterani.me#########
        Kal.domain = 'https://www.masterani.me';
        Kal.textColor = 'white';
        Kal.dbSelector = 'Masterani';
        Kal.listType = 'anime';
        Kal.bookmarkCss = "";
        Kal.bookmarkFixCss = "";
        Kal.videoSelector = '.ui.embed';
        var winLoad = 0;

        Kal.init = function() {
            checkdata();
        }

        Kal.imageCache = function(selector) {
            return $('.class').first().find('img').attr('src');
        };

        Kal.isOverviewPage = function() {
            if(Kal.normalUrl().split('/')[4] !== 'watch'){
                return true;
            }else{
                return false;
            }
        };
        Kal.episodeListSelector = function() {
            return $(".thumbnail a.title");
        };
        Kal.episodeListElementHref = function(selector) {
            return $.absoluteLink(selector.attr('href'));
        };
        Kal.episodeListElementTitle = function(selector) {
            return selector.find("div").text()+' ('+selector.find("span").text()+')';
        };
        Kal.episodeListNextElement = function(selector, index) {
            if ((index+1) > -1) {
                return Kal.episodeListSelector().eq(index+1);
            }
            return $();
        };
        Kal.handleNextLink = function(truelink, anime){
            $('.menu.pagination').off('click').on( "click", function() {
                handleanime(anime);
            });
            if(truelink == null){
                var nextEp = parseInt(anime['.add_anime[num_watched_episodes]'])+1;
                if(nextEp <= parseInt(anime['totalEp'])){
                    return '<a style="color: white;" href="/anime/watch/'+Kal.normalUrl().replace(/#[^#]*$/, "").replace(/\?[^\?]*$/, "").split("/")[5]+'/'+nextEp+'">Ep. '+nextEp+'</a>';
                }
            }
            return truelink;
        };

        Kal.urlEpisodePart = function(url) {
            return url.split("/")[6].split("?")[0];
        };
        Kal.urlAnimeIdent = function(url) {
            return url.split('/').slice(0,6).join('/');
        };
        Kal.urlAnimeSelector = function(url) {
            return url.split("/")[5].split("?")[0];
        };
        Kal.urlAnimeTitle = function(url) {
            return Kal.urlAnimeSelector(url).replace(/^\d*-/,'');
        };

        Kal.EpisodePartToEpisode = function(string) {
            return string;
        };

        Kal.uiPos = function(selector) {
            selector.prependTo($("#stats").first());
        };
        Kal.uiWrongPos = function(selector) {
            selector.css('margin-top','5px').appendTo($(".ui.info.list").first());
        };
        Kal.uiHeadPos = function(selector) {
            selector.appendTo($("h1").first());
        };

        $(window).load(function(){
            winLoad = 1;
        });
        if(kalUrl.indexOf("/info/") > -1){
            Kal.docReady = function(data) {
                var checkExist = setInterval(function() {
                    if ($('#stats').length) {
                        clearInterval(checkExist);
                        if(winLoad == 0){
                            //winLoad = 1;alert();
                            return $(window).load(data);
                        }else{
                            return $( document).ready(data);
                        }
                    }
                }, 500);
            };
        }else{
            Kal.docReady = function(data) {
                return $( document).ready(data);
            }
        };

        Kal.normalUrl = function(){
            return Kal.urlAnimeIdent(kalUrl);
        };

        Kal.epListReset = function(selector) {
            selector.parent().parent().css("background-color","initial");
        };
        Kal.epListActive = function(selector) {
            selector.parent().parent().css("background-color","#002966");
        };

        Kal.bookmarkEntrySelector = function() {
            return $(".trAnime");
        };

        Kal.nextEpLink = function(url) {
            return 'https://www.masterani.me'+$('#watch .anime-info .actions a').last().attr('href');
        };

        Kal.classicBookmarkButton = function(selector, checkfix) {
        };
        Kal.bookmarkButton = function(selector, check) {
        };

        Kal.BookmarksStyleAfterLoad = function() {
        };
        //###########################
    }else if( kalUrl.indexOf("9anime.") > -1 ){
        //#########9anime#########
        Kal.domain = 'https://'+window.location.hostname;
        Kal.textColor = '#694ba1';
        Kal.dbSelector = '9anime';
        Kal.listType = 'anime';
        Kal.bookmarkCss = "";
        Kal.bookmarkFixCss = "";
        Kal.videoSelector = '#player';
        var winLoad = 0;

        Kal.init = function() {
            GM_addStyle('.headui a {color: inherit !important;}');
            var tempEpisode = "";
            Kal.docReady(function(){
                document.addEventListener("load", event =>{
                    var curEpisode = $(".servers .episodes a.active").attr('data-base');
                    if(curEpisode !== tempEpisode){
                        tempEpisode =  curEpisode;
                        if($('.servers').height() == null){
                            tempEpisode = "";
                            return;
                        }
                        if(curEpisode != ''){
                            var animechange = {};
                            animechange['.add_anime[num_watched_episodes]'] = parseInt(curEpisode);
                            animechange['checkIncrease'] = 1;
                            animechange['forceUpdate'] = 1;
                            setanime( Kal.normalUrl(),animechange);
                        }
                    }
                }, true);
            });
            checkdata();
        }

        Kal.imageCache = function(selector) {
            return $('.class').first().find('img').attr('src');
        };

        Kal.isOverviewPage = function() {
            if(Kal.normalUrl().split('/')[4] !== 'watch'){
                return true;
            }else{
                return false;
            }
        };
        Kal.episodeListSelector = function() {
            return $(".servers .episodes a");
        };
        Kal.episodeListElementHref = function(selector) {
            return $.absoluteLink(selector.attr('href'))+'?ep='+selector.attr('data-base');
        };
        Kal.episodeListElementTitle = function(selector) {
            if(selector.text() == ''){
                return '';
            }
            return 'Episode '+selector.text();
        };
        Kal.episodeListNextElement = function(selector, index) {
            if ((index+1) > -1) {
                return Kal.episodeListSelector().eq(index+1);
            }
            return $();
        };
        Kal.handleNextLink = function(truelink, anime){
            return truelink;
        };

        Kal.urlEpisodePart = function(url) {
            return url.split('?ep=')[1];
        };
        Kal.urlAnimeIdent = function(url) {
            return url.split('/').slice(0,5).join('/');
        };
        Kal.urlAnimeSelector = function(url) {
                url = url.split("/")[4].split("?")[0];
            if( url.indexOf(".") > -1 ){
                url = url.split(".")[1];
            }
            return url;
        };
        Kal.urlAnimeTitle = function(url) {
            return url.split("/")[4].split("?")[0].split(".")[0];
        };

        Kal.EpisodePartToEpisode = function(string) {
            return string;
        };

        Kal.uiPos = function(selector) {
            $('<div class="widget info"><div class="widget-body"> '+selector.html()+'</div></div>').insertBefore($(".widget.info").first());
        };
        Kal.uiWrongPos = function(selector) {
            selector.css('font-size','14px').insertBefore($("#info").first());
            $('.title').first().css('display', 'inline-block');
        };
        Kal.uiHeadPos = function(selector) {
            selector.addClass('title').css('margin-right','0').appendTo($(".widget.player .widget-title").first());
        };

        $(window).load(function(){
            winLoad = 1;
        });
        if(kalUrl.indexOf("/info/") > -1){
            Kal.docReady = function(data) {
                var checkExist = setInterval(function() {
                    if ($('#stats').length) {
                        clearInterval(checkExist);
                        if(winLoad == 0){
                            //winLoad = 1;alert();
                            return $(window).load(data);
                        }else{
                            return $( document).ready(data);
                        }
                    }
                }, 500);
            };
        }else{
            Kal.docReady = function(data) {
                return $( document).ready(data);
            }
        };

        Kal.normalUrl = function(){
            return Kal.urlAnimeIdent(kalUrl);
        };

        Kal.epListReset = function(selector) {
            selector.css("border-style","none");
        };
        Kal.epListActive = function(selector) {
            selector.css("border-color","#002966").css("border-width","2px").css("border-style","solid");
        };

        Kal.bookmarkEntrySelector = function() {
            return $(".trAnime");
        };

        Kal.nextEpLink = function(url) {
            return Kal.domain+$(".servers .episodes a.active").parent('li').next().find('a').attr('href');
        };

        Kal.classicBookmarkButton = function(selector, checkfix) {
        };
        Kal.bookmarkButton = function(selector, check) {
        };

        Kal.BookmarksStyleAfterLoad = function() {
        };
        //###########################
    }else if( kalUrl.indexOf("crunchyroll.com") > -1 ){
        //TODO:
        //http://www.crunchyroll.com/ace-of-the-diamond
        //http://www.crunchyroll.com/trinity-seven
        //#########Crunchyroll#########
        if(kalUrl == 'http://www.crunchyroll.com/'){
            return;
        }
        Kal.domain = 'http://www.crunchyroll.com';
        Kal.textColor = 'black';
        Kal.dbSelector = 'Crunchyroll';
        Kal.listType = 'anime';
        Kal.bookmarkCss = "";
        Kal.bookmarkFixCss = "";
        Kal.videoSelector = '#showmedia_video_box_wide,#showmedia_video_box';
        GM_addStyle('.headui a {color: black !important;} #malp{margin-bottom: 8px;}');

        Kal.init = function() {
            $( document).ready(function(){
                if( $('.season-dropdown').length > 1){
                    $('.season-dropdown').append('<span class="exclusivMal" style="float: right; margin-right: 20px; color: #0A6DA4;" onclick="return false;">MAL</span>');
                    $('.exclusivMal').click(function(){
                        $('#showview_content').before('<div><a href="'+kalUrl.split('?')[0]+'">Show hidden seasons</a></div>');
                        var thisparent =  $(this).parent();
                        $('.season-dropdown').not(thisparent).siblings().remove();
                        $('.season-dropdown').not(thisparent).remove();
                        $('.portrait-grid').css('display','block').find("li.group-item img.landscape").each(function() {
                            void 0 === $(this).attr("src") && $(this).attr("src", $(this).attr("data-thumbnailUrl"))
                        }),
                        $('.exclusivMal').remove();
                        checkdata();
                    });
                    var season = new RegExp('[\?&]' + 'season' + '=([^&#]*)').exec(kalUrl);
                    if(season != null){
                        season = season[1] || null;
                        if(season != null){
                            season = decodeURIComponent(decodeURI(season));
                            $('.season-dropdown[title="'+season+'" i] .exclusivMal').first().click();
                        }
                    }
                    return;
                }else{
                    checkdata();
                }
            });
        }

        Kal.imageCache = function(selector) {
            return $('#rightside').find('img').attr('src');
        };

        Kal.isOverviewPage = function() {
            if(typeof kalUrl.split('/')[4] != 'undefined'){
                if($('#showmedia_video').length){
                    return false;
                }
            }
            return true;
        };
        Kal.episodeListSelector = function() {
            return $("#showview_content_videos .list-of-seasons .group-item a");
        };
        Kal.episodeListElementHref = function(selector) {
            return $.absoluteLink(selector.attr('href'));
        };
        Kal.episodeListElementTitle = function(selector) {
            return selector.find('.series-title').text();
        };
        Kal.episodeListNextElement = function(selector, index) {//TODO
            if ((index-1) > -1) {
                return Kal.episodeListSelector().eq(index-1);
            }
            return $();
        };
        Kal.handleNextLink = function(truelink, anime){
            return truelink;
        };

        Kal.urlEpisodePart = function(url) {
            return url.split("/")[4];
        };
        Kal.urlAnimeIdent = function(url) {
            return url.split('/').slice(0,4).join('/');
        };
        /*$( document).ready(function(){//TODO
            var seasons = 0;
            $('.season-dropdown').each(function(index){
                seasons = 1;
                checkdata('.season-dropdown:nth-child('+index+') ');
                $('.season-dropdown:nth-child('+index+')').css('background-color','red');
                //alert($(this).text());
            });

            if(seasons == 0){
                alert($('#source_showview h1 span').text());
            }


            var script = ($("#template_body script")[1]).innerHTML;
            script = script.split('mediaMetadata =')[1].split('"name":"')[1].split(' -')[0];
            alert(script);
        });*/
        Kal.urlAnimeSelector = function(url) {
            if(Kal.isOverviewPage()){
                if( $('.season-dropdown').length > 1){
                    $('<div>Kissanimelist does not support multiple seasons on one page</div>').uiPos();
                    throw new Error('Kissanimelist does not support multiple seasons');
                }else{
                    if($('.season-dropdown').length){
                        return $('.season-dropdown').first().text();
                    }else{
                        return $('#source_showview h1 span').text();
                    }
                }
            }else{
                var script = ($("#template_body script")[1]).innerHTML;
                script = script.split('mediaMetadata =')[1].split('"name":"')[1].split(' -')[0];
                script = JSON.parse('"' + script.replace('"', '\\"') + '"');
                //console.log(script);
                return script;
                return url.split("/")[3];
            }
        };
        Kal.urlAnimeTitle = function(url) {
            return Kal.urlAnimeSelector(url);
        };

        Kal.EpisodePartToEpisode = function(string) {
            var temp = [];
            temp = string.match(/[e,E][p,P][i,I]?[s,S]?[o,O]?[d,D]?[e,E]?\D?\d+/);
            if(temp !== null){
                string = temp[0];
            }else{
                string = '';
            }
            temp = string.match(/\d+/);
            if(temp === null){
                string = 1;
            }else{
                string = temp[0];
            }
            return string;
        };

        Kal.uiPos = function(selector) {//TODO
            if(Kal.isOverviewPage()){
                //selector.insertAfter($("h1.ellipsis"));
                selector.insertBefore($("#tabs").first());
                $('#malStatus option').css('background-color','#f2f2f2');
                $('#malUserRating option').css('background-color','#f2f2f2');
                //selector.prependTo($('.season-dropdown'));
            }
        };
        Kal.uiWrongPos = function(selector) {//TODO after second element
            //selector.prependTo($("#sidebar_elements").first());
        };
        Kal.uiHeadPos = function(selector) {//TODO
            selector.appendTo($(".ellipsis").first());
        };

        Kal.docReady = function(data) {
            return $( document).ready(data);
        };

        Kal.normalUrl = function(){
            return Kal.urlAnimeIdent(kalUrl);
        };

        Kal.epListReset = function(selector) {
            selector.css("background-color","#fff");
        };
        Kal.epListActive = function(selector) {
            selector.css("background-color","#b2d1ff");
        };

        Kal.bookmarkEntrySelector = function() {
            //return $(".trAnime");
        };

        Kal.nextEpLink = function(url) {
            return 'http://www.crunchyroll.com'+$('.collection-carousel-media-link-current').parent().next().find('.link').attr('href');
        };

        Kal.classicBookmarkButton = function(selector, checkClassic) {

        };
        Kal.bookmarkButton = function(selector, check) {

        };

        Kal.BookmarksStyleAfterLoad = function() {

        };
        //###########################
    }else if( kalUrl.indexOf("gogoanime.") > -1 ){
        //#########Gogoanime.tv#########
        if(!kalUrl.split('/')[3]){
            return;
        }
        Kal.domain = kalUrl.split('/').slice(0,3).join('/')+'/';
        Kal.textColor = 'white';
        Kal.dbSelector = 'Gogoanime';
        Kal.listType = 'anime';
        Kal.bookmarkCss = "";
        Kal.bookmarkFixCss = "";
        Kal.videoSelector = '.anime_video_body_watch_items';
        var winLoad = 0;

        Kal.init = function() {
            GM_addStyle('.headui a {color: inherit !important;}');
            checkdata();
        }

        Kal.imageCache = function(selector) {
            return $('.class').first().find('img').attr('src');
        };

        Kal.isOverviewPage = function() {
            if(kalUrl.split('/')[3] === 'category'){
                return true;
            }else{
                return false;
            }
        };
        Kal.episodeListSelector = function() {
            return $("#episode_related a");
        };
        Kal.episodeListElementHref = function(selector) {
            return Kal.domain+selector.attr('href').replace(' /','');
        };
        Kal.episodeListElementTitle = function(selector) {
            return selector.find("div.name").text();
        };
        Kal.episodeListNextElement = function(selector, index) {
            if ((index-1) > -1) {
                return Kal.episodeListSelector().eq(index-1);
            }
            return $();
        };
        Kal.handleNextLink = function(truelink, anime){
            if(truelink == null){
                var nextEp = parseInt(anime['.add_anime[num_watched_episodes]'])+1;
                if(nextEp <= parseInt(anime['totalEp'])){
                    return '<a style="color: white;" href="/'+Kal.normalUrl().split('/')[4]+'-episode-'+nextEp+'">Ep '+nextEp+'</a>';
                }
            }
            return truelink;
        };

        Kal.urlEpisodePart = function(url) {
            return url.split("/")[3].split("?")[0].split('episode-')[1];
        };
        Kal.urlAnimeIdent = function(url) {
            if(url.split('/')[3] === 'category'){
                return url.split('/').slice(0,5).join('/');
            }else{
                return url.split('/').slice(0,3).join('/') + '/category/' + url.split("/")[3].split("?")[0].split('-episode')[0];
            }
        };
        Kal.urlAnimeSelector = function(url) {
            return url.split("/")[4].split("?")[0];
        };
        Kal.urlAnimeTitle = function(url) {
            return Kal.urlAnimeSelector(url);
        };

        Kal.EpisodePartToEpisode = function(string) {
            return string;
        };

        Kal.uiPos = function(selector) {
            selector.prependTo($(".anime_info_body").first());
        };
        Kal.uiWrongPos = function(selector) {//TODO
            selector.css('margin-top','5px').appendTo($(".ui.info.list").first());
        };
        Kal.uiHeadPos = function(selector) {//TODO
            selector.appendTo($("h1").first());
        };

        Kal.docReady = function(data) {
            return $( document).ready(data);
        };

        Kal.normalUrl = function(){
            return Kal.urlAnimeIdent(kalUrl);
        };

        Kal.epListReset = function(selector) {
            selector.css("background-color","#363636");
        };
        Kal.epListActive = function(selector) {
            selector.css("background-color","#002966");
        };

        Kal.bookmarkEntrySelector = function() {
        };

        Kal.nextEpLink = function(url) {
            var url = Kal.domain + 's..' + $('.anime_video_body_episodes_r a').last().attr('href');
            return url.replace('/s..','');
        };

        Kal.classicBookmarkButton = function(selector, checkfix) {
        };
        Kal.bookmarkButton = function(selector, check) {
        };

        Kal.BookmarksStyleAfterLoad = function() {
        };
        //###########################
    }else if( kalUrl.indexOf("myanimelist.net") > -1 ){
        googleover = 1;
        Kal.listType = kalUrl.split('/')[3];
        Kal.isOverviewPage = function() {
            return false;
        };
        Kal.urlAnimeSelector = function(url) {
            return $('.h1 span').first().text();
        };
        Kal.urlAnimeTitle = function(url) {
            return Kal.urlAnimeSelector(url);
        };
        Kal.docReady = function(data) {
            return $( document).ready(data);
        };
    }

    return Kal;
    }

    var K = getDeclaration(window.location.href);

    //#######Anime or Manga######
    if(K.listType == 'anime'){
        var googleMalUrl = "site:myanimelist.net/Anime/+-site:myanimelist.net/Anime/genre/+-site:myanimelist.net/anime/season/+";
        var middleType = 'episodes';
        var middleVerb = 'watched';

        var planTo = 'Plan to Watch';
        var watching = 'Watching'
    }else{
        var googleMalUrl = "site:myanimelist.net/manga/+-site:myanimelist.net/manga/genre/+-site:myanimelist.net/manga/season/+";
        var middleType = 'chapters';
        var middleVerb = 'read';

        var planTo = 'Plan to Read';
        var watching = 'Reading'
    }
    //###########################

    $.absoluteLink = function(url) {
        if (typeof url === "undefined") {
            return url;
        }
        if(!url.startsWith("http")) { url = K.domain + url;}
        return url;
    };
    $.titleToDbKey = function(title) {
        if( window.location.href.indexOf("crunchyroll.com") > -1 ){
            return encodeURIComponent(title.toLowerCase().split('#')[0]).replace(/\./g, '%2E');
        }
        return title.toLowerCase().split('#')[0].replace(/\./g, '%2E');
    };

    //ignore loading
    if(document.title == "Please wait 5 seconds..."){
        con.log("loading");
        return;
    }

    if( window.location.href.indexOf("id="+GM_getValue( 'checkFail', 0 )) > -1 ){
        $(window).load(function(){
            GM_setValue( 'checkFail', 0 )
        });
    }

    function handleanime(anime){
        $('.MalLogin').css("display","initial");
        $('#AddMalDiv').remove();

        miniMalButton(anime['malurl']);

        if(GM_getValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.urlAnimeIdent(K.normalUrl())))+'/image' , null) == null ){
            try{
                GM_setValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.urlAnimeIdent(K.normalUrl())))+'/image', K.imageCache('') );
            }catch(e){}
        }
        if(anime['login'] === 0){
            $('.MalLogin').css("display","none");
            $("#MalData").css("display","flex");
            $("#MalInfo").text("");
            $("#malRating").attr("href", anime['malurl']);
            $("#malRating").after("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Please log in on <a target='_blank' href='https://myanimelist.net/login.php'>MyAnimeList!<a>");
            getcommondata(anime['malurl']);
            return;
        }
        if(K.isOverviewPage()){
            $("#flash").attr("anime", anime['.'+K.listType+'_id']);
            $("#malRating").attr("href", anime['malurl']);
            if(isNaN(anime['.add_'+K.listType+'[status]'])){
                $('.MalLogin').css("display","none");
                $("#malRating").after("<span id='AddMalDiv'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href='#' id='AddMal' onclick='return false;'>Add to Mal</a></span>")
                $('#AddMal').click(function() {
                    var anime = {};
                    anime['.add_'+K.listType+'[status]'] = 6;
                    anime['forceUpdate'] = 1;
                    setanime(K.normalUrl(),anime);
                });
            }else{
                $("#malTotal").text(anime['totalEp']);
                if(anime['totalEp'] == 0){
                   $("#malTotal").text('?');
                }
                if(anime['forceUpdate'] != 2){
                    $("#malStatus").val(anime['.add_'+K.listType+'[status]']);
                    $("#malEpisodes").val(anime['.add_anime[num_watched_episodes]']);
                    $("#malUserRating").val(anime['.add_'+K.listType+'[score]']);

                    //####Manga####
                    $("#malVolumes").val(anime['.add_manga[num_read_volumes]']);
                    $("#malChapters").val(anime['.add_manga[num_read_chapters]']);
                }
                $("#malTotalVol").text(anime['totalVol']);
                if(anime['totalVol'] == 0){
                   $("#malTotalVol").text('?');
                }
                $("#malTotalCha").text(anime['totalChap']);
                if(anime['totalChap'] == 0){
                   $("#malTotalCha").text('?');
                }
                //#############
            }
            $("#MalData").css("display","flex");
            $("#MalInfo").text("");

            getcommondata(anime['malurl']);

            var episodelink;
            var linkbackup = null;
            var truelink = null;
            $('.lastOpen').remove();
            K.episodeListSelector().each(function( index ) {
                if(K.listType == 'anime'){
                    if(debug){
                        $(this).after('  Episode: '+urlToEpisode(K.episodeListElementHref($(this))));
                    }
                    try{
                        episodelink = urlToEpisode(K.episodeListElementHref($(this)));
                    }catch(e) {
                        episodelink = 1;
                    }
                    K.epListReset($(this));
                    if(episodelink == parseInt(anime['.add_anime[num_watched_episodes]'])){
                        K.epListActive($(this));
                        if(typeof K.episodeListElementHref(K.episodeListNextElement($(this), index)) !== "undefined"){
                            truelink = '<a style="color: white;" href="'+K.episodeListElementHref(K.episodeListNextElement($(this), index))+'">'+K.episodeListElementTitle(K.episodeListNextElement($(this), index))+'</a>';
                        }
                    }
                }else{
                    if(debug){
                        $(this).after('   Chapter: '+urlToChapter(K.episodeListElementHref($(this))));
                        $(this).after('Volume: '+urlToVolume(K.episodeListElementHref($(this))));
                    }
                    episodelink = urlToChapter(K.episodeListElementHref($(this)));
                    K.epListReset($(this));
                    if($(this).attr('href') == commentToUrl(anime['.add_manga[comments]'])){
                        $(this).parent().parent().css("background-color","#861515");
                        linkbackup = '<a style="color: red;" href="'+K.episodeListElementHref(K.episodeListNextElement($(this), index))+'">'+K.episodeListElementTitle(K.episodeListNextElement($(this), index))+'</a>';
                        $(this).prepend('<span class="lastOpen">[Last opened]</span>');
                    }
                    if(episodelink == parseInt(anime['.add_manga[num_read_chapters]']) && parseInt(anime['.add_manga[num_read_chapters]']) != 0){
                        $(this).parent().parent().css("background-color","#002966");
                        truelink = '<a style="color: white;" href="'+K.episodeListElementHref(K.episodeListNextElement($(this), index))+'">'+K.episodeListElementTitle(K.episodeListNextElement($(this), index))+'</a>';
                    }
                }
            });
            truelink = K.handleNextLink(truelink, anime);
            if(K.listType == 'anime'){
                $(".headui").html(truelink);
            }else{
                if(truelink == null){
                    if(linkbackup != null){
                        $(".headui").html(linkbackup);
                    }
                }else{
                    $(".headui").html(truelink);
                }
            }
        }else{
            if(K.listType == 'anime'){
                //update
                try{
                    var curEpisode = urlToEpisode(window.location.href);
                }catch(e) {
                    var curEpisode = 1;
                }
                //if(curEpisode > anime['.add_anime[num_watched_episodes]']){
                var animechange = {};
                animechange['.add_anime[num_watched_episodes]'] = curEpisode;
            }else{
                //update
                var curChapter = urlToChapter(window.location.href);
                var curVolume = urlToVolume(window.location.href);
                //if(curChapter > anime['.add_manga[num_read_volumes]']){
                var animechange = {};
                animechange['.add_manga[num_read_chapters]'] = curChapter;
                animechange['.add_manga[num_read_volumes]'] = curVolume;
            }
            animechange['checkIncrease'] = 1;
            setTimeout(function() {
                setanime( K.normalUrl(),animechange);
            }, delay * 1000);
        }
    }

    function urlToEpisode(url){
        var string = K.urlEpisodePart(url);
        string = K.EpisodePartToEpisode(string);
        var Offset = GM_getValue(K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.urlAnimeIdent(url)))+'/Offset' , null);
        if( Offset != null){
            string = parseInt(string)+parseInt(Offset);
        }
        if(parseInt(string) == 0){
            string = 1;
        }
        return parseInt(string);
    }

    function urlToChapter(url){
        return urlToEpisode(url);
    }

    function urlToVolume(string){
        try{
            string = string.match(/[V,v][o,O][l,L]\D?\d{3}/)[0];
            string = string.match(/\d+/)[0].slice(-3);
        }catch(e){
            string = 1;
        }
        return parseInt(string);
    }

    function commentToUrl(comment){
        if(comment.indexOf("last:^") > -1){
            try{
                comment = comment.split("last:^")[1].split("^")[0];
                comment = comment.split("http://kissmanga.com")[1];
                comment = comment.split("#")[0];
            }catch(e){}
        }
        return comment;
    }

    function handleTag(update, current, nextEp){
        if(tagLinks == 0){return current;}
        var addition = "last::"+ btoa(update) +"::";
        if(current.indexOf("last::") > -1){
            current = current.replace(/last::[^\^]*\:\:/,addition);
        }else{
            current = current+','+addition;
        }

        if(update.indexOf("masterani.me") > -1 && update.indexOf("/watch/") > -1){
            update = update.replace('/watch/','/info/');
        }
        if(K.listType == 'anime'){
            GM_setValue( update+'/next', nextEp);
        }else{
            GM_setValue( update+'/next', 'manga');
        }

        GM_setValue( update+'/nextEp', K.nextEpLink(update));
        return current;
    }

    function handleanimeupdate( anime, current){
        if(K.listType == 'anime'){
            if(anime['checkIncrease'] === 1){
                anime['.add_anime[tags]'] = handleTag(K.urlAnimeIdent(window.location.href), current['.add_anime[tags]'], anime['.add_anime[num_watched_episodes]']+1);
                if(current['.add_anime[num_watched_episodes]'] >= anime['.add_anime[num_watched_episodes]']){
                    if((anime['.add_anime[status]'] === 2 || current['.add_anime[status]'] === 2) && anime['.add_anime[num_watched_episodes]'] === 1){
                        if (confirm('Rewatch anime?')) {
                            anime['.add_anime[is_rewatching]'] = 1;
                        }else{
                            return null;
                        }
                    }else{
                        return null;
                    }
                }
            }
            if(current['.add_anime[status]'] !== 2 && parseInt(anime['.add_anime[num_watched_episodes]']) === current['totalEp'] && parseInt(anime['.add_anime[num_watched_episodes]']) != 0 ){
                if (confirm('Set as completed?')) {
                    anime['.add_anime[status]'] = 2;
                    if(current['.add_anime[finish_date][day]'] === ''){
                        var Datec = new Date();
                        anime['.add_anime[finish_date][year]'] = Datec.getFullYear();
                        anime['.add_anime[finish_date][month]'] = Datec.getMonth()+1;
                        anime['.add_anime[finish_date][day]'] = Datec.getDate();
                    }
                }
            }
            if(anime['checkIncrease'] === 1){
                if(current['.add_anime[status]'] === 2 && anime['.add_anime[num_watched_episodes]'] === current['totalEp'] && current['.add_anime[is_rewatching]'] === 1){
                    if (confirm('Finish rewatching?')) {
                        anime['.add_anime[is_rewatching]'] = 0;
                        if(current['.add_anime[num_watched_times]'] === ''){
                            anime ['.add_anime[num_watched_times]'] = 1;
                        }else{
                            anime ['.add_anime[num_watched_times]'] = parseInt(current['.add_anime[num_watched_times]'])+1;
                        }
                    }
                }
                if(current['.add_anime[status]'] !== 1 && current['.add_anime[status]'] !== 2 && anime['.add_anime[status]'] !== 2){
                    if (confirm('Start watching?')) {
                        anime['.add_anime[status]'] = 1;
                    }else{
                        return null;
                    }
                }
                if(current['.add_anime[start_date][day]'] === ''){
                    var Datec = new Date();
                    anime['.add_anime[start_date][year]'] = Datec.getFullYear();
                    anime['.add_anime[start_date][month]'] = Datec.getMonth()+1;
                    anime['.add_anime[start_date][day]'] = Datec.getDate();
                }
            }
            if(current['.add_anime[status]'] !== 2 && anime['.add_anime[status]'] == 2 && parseInt(anime['.add_anime[num_watched_episodes]']) !== current['totalEp']){
                anime['.add_anime[num_watched_episodes]'] = current['totalEp'];
            }
            return anime;
        }else{
            if(anime['checkIncrease'] === 1){
                current['checkIncrease'] = 1;
                anime['.add_manga[tags]'] = handleTag(K.urlAnimeIdent(window.location.href), current['.add_manga[tags]'], anime['.add_manga[num_read_chapters]']+1);
                if(current['.add_manga[num_read_chapters]'] >= anime['.add_manga[num_read_chapters]']){
                    if((anime['.add_manga[status]'] === 2 || current['.add_manga[status]'] === 2) && anime['.add_manga[num_read_chapters]'] === 1){
                        if (confirm('Reread Manga?')) {
                            anime['.add_manga[is_rereading]'] = 1;
                        }else{
                            return null;
                        }
                    }else{
                        return null;
                    }
                }
            }
            if(current['.add_manga[status]'] !== 2 && parseInt(anime['.add_manga[num_read_chapters]']) === current['totalChap'] && parseInt(anime['.add_manga[num_read_chapters]']) != 0){
                if (confirm('Set as completed?')) {
                    anime['.add_manga[status]'] = 2;
                    if(current['.add_manga[finish_date][day]'] === ''){
                        var Datec = new Date();
                        anime['.add_manga[finish_date][year]'] = Datec.getFullYear();
                        anime['.add_manga[finish_date][month]'] = Datec.getMonth()+1;
                        anime['.add_manga[finish_date][day]'] = Datec.getDate();
                    }
                }
            }
            if(anime['checkIncrease'] === 1){
                if(current['.add_manga[status]'] === 2 && anime['.add_manga[num_read_chapters]'] === current['totalChap'] && current['.add_manga[is_rereading]'] === 1){
                    if (confirm('Finish rereading?')) {
                        anime['.add_manga[is_rereading]'] = 0;
                        if(current['.add_manga[num_read_times]'] === ''){
                            anime ['.add_manga[num_read_times]'] = 1;
                        }else{
                            anime ['.add_manga[num_read_times]'] = parseInt(current['.add_manga[num_read_times]'])+1;
                        }
                    }
                }
                if(current['.add_manga[status]'] !== 1 && current['.add_manga[status]'] !== 2 && anime['.add_manga[status]'] !== 2){
                    if (confirm('Start reading?')) {
                        anime['.add_manga[status]'] = 1;
                    }else{
                        return null;
                    }
                }
                if(current['.add_manga[start_date][day]'] === ''){
                    var Datec = new Date();
                    anime['.add_manga[start_date][year]'] = Datec.getFullYear();
                    anime['.add_manga[start_date][month]'] = Datec.getMonth()+1;
                    anime['.add_manga[start_date][day]'] = Datec.getDate();
                }
            }
            if(current['.add_manga[status]'] !== 2 && anime['.add_manga[status]'] == 2 && parseInt(anime['.add_manga[num_read_chapters]']) !== current['totalChap']){
                anime['.add_manga[num_read_chapters]'] = current['totalChap'];
                anime['.add_manga[num_read_volumes]'] = current['totalVol'];
            }
            return anime;
        }
    }

    function getcommondata(url){
        var requestUrl = url
        var id = requestUrl.split('/')[4];
        if(requestUrl.split('/')[3].toLowerCase() == 'anime'){
            requestUrl = 'https://myanimelist.net/includes/ajax.inc.php?t=64&id='+id;
        }else{
            requestUrl = 'https://myanimelist.net/includes/ajax.inc.php?t=65&id='+id;
        }
        GM_xmlhttpRequest({
            method: "GET",
            url: requestUrl,
            synchronous: false,
            onload: function(response) {
                var data = response.responseText;
                //currentMalData = data;
                var rating = data.split('Score:</span>')[1].split('<')[0];
                $("#malRating").attr("href", url).text(rating);
                if($('#info-popup').css('display') == 'block' && $("#info-iframe").contents().find('#backbutton').css('display') == 'none'){
                    fillIframe(url, currentMalData);
                }
            }
        });
    }
    var fireExists = 0;
    function getanime(thisUrl , callback, absolute = false, localListType = K.listType) {
        var thisUrl = thisUrl;
        var url = '';
        var malurl = '';
        var title = K.urlAnimeTitle(thisUrl);
        if(absolute === false){
            //url = "http://myanimelist.net/anime.php?q=" + encodeURI(formattitle(title));
            //url = "http://www.google.com/search?btnI&q=site:myanimelist.net/Anime/+-site:myanimelist.net/Anime/genre/+-site:myanimelist.net/anime/season/+"+encodeURI(formattitle(title));
            url = 'https://kissanimelist.firebaseio.com/Data2/'+K.dbSelector+'/'+encodeURIComponent($.titleToDbKey(K.urlAnimeSelector(thisUrl))).toLowerCase()+'/Mal.json';
            if(GM_getValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(thisUrl))+'/Mal' , null) !== null ){
                //if(con != console){
                    url = GM_getValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(thisUrl))+'/Mal' , null);
                //}
                con.log('[GET] Cache:', url);
            }

        }else{
            url = absolute;
        }

        if(url == '' || url == null){
            GM_setValue(K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.normalUrl()))+'/Mal' , null);
            loadingText = "No Mal Entry!";
            $("#MalInfo").text("No Mal Entry!");
            miniMalButton(null);
            return;
        }

        if(url.indexOf("myanimelist.net/"+localListType+"/") > -1 && url.indexOf("google") === -1) {
            con.log("[GET] MyAnimeList: ", url);
            if(googleover === 0){
                local_setValue( thisUrl, url );
            }
            malurl = url;
            url = 'https://myanimelist.net/ownlist/'+localListType+'/'+url.split('/')[4]+'/edit?hideLayout';//TODOsplit4 ersetzten
        }
        con.log("[GET] Request:",url);

        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            synchronous: false,
            onload: function(response) {
                if(response.finalUrl != null){
                    url = response.finalUrl;
                }
                url = firefoxUrl(url, response.responseText);
                if(url.split("/").length > 6 && url.indexOf("myanimelist.net/"+localListType) > -1 && url.indexOf("google") === -1){
                    var partes = url.split("/");
                    url = partes[0]+"/"+partes[1]+"/"+partes[2]+"/"+partes[3]+"/"+partes[4]+"/"+partes[5];
                    getanime(thisUrl, callback, url);
                    return;
                }

                if(url.indexOf("kissanimelist.firebaseio.com") > -1) {
                    con.log("[GET] Firebase:",response.response);
                    if(response.response !== 'null' && !(response.response.indexOf("error") > -1)){
                        fireExists = 1;
                        //url = response.response.replace('"', '').replace('"', '');
                        url = 'https://myanimelist.net/'+localListType+'/'+response.response.split('"')[1]+'/'+response.response.split('"')[3];
                        if(response.response.split('"')[1] == 'Not-Found'){
                            $("#MalInfo").text("Not Found!");
                            miniMalButton(null);
                            return;
                        }
                    }else{
                        url = "http://www.google.com/search?btnI&q="+googleMalUrl+encodeURI(formattitle(title));
                    }
                    getanime(thisUrl, callback, url);
                    return;
                }

                if(url.indexOf("ipv4.google.com") > -1) {
                    googleover = 1;
                    K.docReady(function() {
                        flashm( "Google Overloaded <br> <a target='_blank' href='"+url+"'>Solve captcha<a>" , true);
                        url = "http://myanimelist.net/"+localListType+".php?q=" + encodeURI(formattitle(title));
                        getanime(thisUrl, callback, url);
                    });
                    return;
                }

                if(url.indexOf(localListType+".php") > -1) {
                    var data = response.responseText;
                    var link = data.split(' <a class="hoverinfo_trigger" href="')[1].split('"')[0];
                    getanime(thisUrl, callback, link);
                    return;
                }

                if(url.indexOf("google.") > -1) {
                    googleover = 0;
                    var data = response.responseText;
                    if(data.indexOf("getElementById('captcha')") > -1){ //Firefox no absolute url workaround TODO:
                        googleover = 1;
                        K.docReady(function() {
                            flashm( "Google Overloaded", true);// <br> <a target='_blank' href='"+url+"'>Solve captcha<a>" , true);
                            url = "http://myanimelist.net/"+localListType+".php?q=" + encodeURI(formattitle(title));
                            getanime(thisUrl, callback, url);
                        });
                        return;
                    }
                    try{
                        var link = data.split('class="g"')[1].split('a href="')[1].split('"')[0];
                        if(link.indexOf("/url?") > -1){
                            link = link.split("?q=")[1].split("&")[0];
                        }
                        getanime(thisUrl, callback, link);
                    }catch(e){
                        url = "http://myanimelist.net/"+localListType+".php?q=" + encodeURI(formattitle(title));
                        getanime(thisUrl, callback, url);
                    }
                } else {
                    if(url.indexOf("myanimelist.net/"+localListType+"/") > -1) {
                        con.log("[GET] Mal: ",url);
                        if(googleover === 0){
                            local_setValue( thisUrl, url );
                        }
                        getanime(thisUrl, callback, url);
                    }else{
                        if(url.indexOf("myanimelist.net/login.php") > -1 || response.responseText.indexOf("Unauthorized") > -1) {
                            flashm( "Please log in on <a target='_blank' href='https://myanimelist.net/login.php'>MyAnimeList!<a>" , true);
                            var anime = {};
                            anime['login'] = 0;
                            anime['malurl'] = malurl;
                            K.docReady(function() {
                                callback(anime);
                            });
                        }else{
                            if(url.indexOf("myanimelist.net/"+localListType+".php") > -1) {
                                $("#MalInfo").text("Not Found!");
                                flashm( "Anime not found" , true);
                                miniMalButton(null);
                                return;
                            }
                            var anime = getObject(response.responseText,malurl,localListType);
                            K.docReady(function() {
                                callback(anime);
                            });
                        }
                    }
                }
            }
        });
    }



    function getObject(data,url,localListType){
        if (typeof data.split('<form name="')[1] === "undefined") {
            flashm( "MAL is down or otherwise giving bad data <a href='"+url+"'>[Check]</a>" , true);
        }
        if(localListType == 'anime'){
            var anime = {};
            anime['malurl'] = url;
            anime['.csrf_token'] =  data.split('\'csrf_token\'')[1].split('\'')[1].split('\'')[0];
            if(data.indexOf('Add Anime') > -1) {
                anime['addanime'] = 1;
            }
            data = data.split('<form name="')[1].split('</form>')[0];

            anime['totalEp'] = parseInt(data.split('id="totalEpisodes">')[1].split('<')[0]);
            anime['name'] = data.split('<a href="')[1].split('">')[1].split('<')[0];
            anime['.anime_id'] = parseInt(data.split('name="anime_id"')[1].split('value="')[1].split('"')[0]); //input
            anime['.aeps'] = parseInt(data.split('name="aeps"')[1].split('value="')[1].split('"')[0]);
            anime['.astatus'] = parseInt(data.split('name="astatus"')[1].split('value="')[1].split('"')[0]);
            anime['.add_anime[status]'] = parseInt(getselect(data,'add_anime[status]'));
            //Rewatching
            if(data.split('name="add_anime[is_rewatching]"')[1].split('>')[0].indexOf('checked="checked"') >= 0){
                anime['.add_anime[is_rewatching]'] = 1;
            }
            //
            anime['.add_anime[num_watched_episodes]'] = parseInt(data.split('name="add_anime[num_watched_episodes]"')[1].split('value="')[1].split('"')[0]);
            if( isNaN(anime['.add_anime[num_watched_episodes]']) ){ anime['.add_anime[num_watched_episodes]'] = ''; }
            anime['.add_anime[score]'] = getselect(data,'add_anime[score]');
            anime['.add_anime[start_date][month]'] = getselect(data,'add_anime[start_date][month]');
            anime['.add_anime[start_date][day]'] = getselect(data,'add_anime[start_date][day]');
            anime['.add_anime[start_date][year]'] = getselect(data,'add_anime[start_date][year]');
            anime['.add_anime[finish_date][month]'] = getselect(data,'add_anime[finish_date][month]');
            anime['.add_anime[finish_date][day]'] = getselect(data,'add_anime[finish_date][day]');
            anime['.add_anime[finish_date][year]'] = getselect(data,'add_anime[finish_date][year]');
            anime['.add_anime[tags]'] = data.split('name="add_anime[tags]"')[1].split('>')[1].split('<')[0];//textarea
            anime['.add_anime[priority]'] = getselect(data,'add_anime[priority]');
            anime['.add_anime[storage_type]'] = getselect(data,'add_anime[storage_type]');
            anime['.add_anime[storage_value]'] = data.split('name="add_anime[storage_value]"')[1].split('value="')[1].split('"')[0];
            anime['.add_anime[num_watched_times]'] = data.split('name="add_anime[num_watched_times]"')[1].split('value="')[1].split('"')[0];
            anime['.add_anime[rewatch_value]'] = getselect(data,'add_anime[rewatch_value]');
            anime['.add_anime[comments]'] = data.split('name="add_anime[comments]"')[1].split('>')[1].split('<')[0];
            anime['.add_anime[is_asked_to_discuss]'] = getselect(data,'add_anime[is_asked_to_discuss]');
            anime['.add_anime[sns_post_type]'] = getselect(data,'add_anime[sns_post_type]');
            anime['.submitIt'] = data.split('name="submitIt"')[1].split('value="')[1].split('"')[0];
            con.log('[GET] Object:',anime);
            return anime;
        }else{
            var anime = {};
            anime['malurl'] = url;
            anime['.csrf_token'] =  data.split('\'csrf_token\'')[1].split('\'')[1].split('\'')[0];
            if(data.indexOf('Add Manga') > -1) {
                anime['addmanga'] = 1;
            }
            data = data.split('<form name="')[1].split('</form>')[0];

            anime['totalVol'] = parseInt(data.split('id="totalVol">')[1].split('<')[0]);
            anime['totalChap'] = parseInt(data.split('id="totalChap">')[1].split('<')[0]);
            anime['name'] = data.split('<a href="')[1].split('">')[1].split('<')[0];
            anime['.entry_id'] = parseInt(data.split('name="entry_id"')[1].split('value="')[1].split('"')[0]);
            anime['.manga_id'] = parseInt(data.split('name="manga_id"')[1].split('value="')[1].split('"')[0]); //input
            anime['volumes'] = parseInt(data.split('id="volumes"')[1].split('value="')[1].split('"')[0]);
            anime['mstatus'] = parseInt(data.split('id="mstatus"')[1].split('value="')[1].split('"')[0]);
            anime['.add_manga[status]'] = parseInt(getselect(data,'add_manga[status]'));
            //Rewatching
            if(data.split('name="add_manga[is_rereading]"')[1].split('>')[0].indexOf('checked="checked"') >= 0){
                anime['.add_manga[is_rereading]'] = 1;
            }
            //
            anime['.add_manga[num_read_volumes]'] = parseInt(data.split('name="add_manga[num_read_volumes]"')[1].split('value="')[1].split('"')[0]);
            if( isNaN(anime['.add_manga[num_read_volumes]']) ){ anime['.add_manga[num_read_volumes]'] = ''; }
            anime['.add_manga[num_read_chapters]'] = parseInt(data.split('name="add_manga[num_read_chapters]"')[1].split('value="')[1].split('"')[0]);
            if( isNaN(anime['.add_manga[num_read_chapters]']) ){ anime['.add_manga[num_read_chapters]'] = ''; }
            anime['.add_manga[score]'] = getselect(data,'add_manga[score]');
            anime['.add_manga[start_date][month]'] = getselect(data,'add_manga[start_date][month]');
            anime['.add_manga[start_date][day]'] = getselect(data,'add_manga[start_date][day]');
            anime['.add_manga[start_date][year]'] = getselect(data,'add_manga[start_date][year]');
            anime['.add_manga[finish_date][month]'] = getselect(data,'add_manga[finish_date][month]');
            anime['.add_manga[finish_date][day]'] = getselect(data,'add_manga[finish_date][day]');
            anime['.add_manga[finish_date][year]'] = getselect(data,'add_manga[finish_date][year]');
            anime['.add_manga[tags]'] = data.split('name="add_manga[tags]"')[1].split('>')[1].split('<')[0];//textarea
            anime['.add_manga[priority]'] = getselect(data,'add_manga[priority]');
            anime['.add_manga[storage_type]'] = getselect(data,'add_manga[storage_type]');
            anime['.add_manga[num_retail_volumes]'] = data.split('name="add_manga[num_retail_volumes]"')[1].split('value="')[1].split('"')[0];
            anime['.add_manga[num_read_times]'] = data.split('name="add_manga[num_read_times]"')[1].split('value="')[1].split('"')[0];
            anime['.add_manga[reread_value]'] = getselect(data,'add_manga[reread_value]');
            anime['.add_manga[comments]'] = data.split('name="add_manga[comments]"')[1].split('>')[1].split('<')[0];
            anime['.add_manga[is_asked_to_discuss]'] = getselect(data,'add_manga[is_asked_to_discuss]');
            anime['.add_manga[sns_post_type]'] = getselect(data,'add_manga[sns_post_type]');
            anime['.submitIt'] = data.split('name="submitIt"')[1].split('value="')[1].split('"')[0];
            con.log('[GET] Object:', anime);
            return anime;
        }
    }

    var continueAllowed = 1;
    function setanime(thisUrl ,anime, actual = null, localListType = K.listType) {
        var undoAnime = $.extend({}, actual);
        if(actual === null){
            var absolute = false;
            if(anime['malurl'] != null){
                absolute = anime['malurl'];
            }
            getanime(thisUrl, function(actual){setanime(thisUrl , anime, actual, localListType);}, absolute, localListType);
            return;
        }

        var change = $.extend({},anime);

        if(anime['checkIncrease'] === 1 && autoTracking === 0 && continueAllowed){
            if(actual['.add_anime[num_watched_episodes]'] < anime['.add_anime[num_watched_episodes]'] ||
               actual['.add_manga[num_read_chapters]'] < anime['.add_manga[num_read_chapters]']){
                if(localListType == 'anime'){
                    var epis = 'episode: '+anime['.add_anime[num_watched_episodes]'];
                }else{
                    var epis = 'chapter: <b>'+anime['.add_manga[num_read_chapters]']+'</b>';
                }
                var message = '<button class="sync" style="margin-bottom: 8px; background-color: transparent; border: none; color: rgb(255,64,129);margin-top: 10px;cursor: pointer;">Update MAL to '+epis+'</button>';
                flashm( message , true, true );
                $('.sync').click(function(){
                    $('.flashinfo').remove();
                    continueAllowed = 0;
                    setanime(thisUrl ,anime, actual, localListType);
                });
            }
            return;
        }
        continueAllowed = 1;

        if(localListType == 'anime'){
            var url = "https://myanimelist.net/ownlist/anime/"+actual['.anime_id']+"/edit";
            if(actual['addanime'] === 1){
                url = "https://myanimelist.net/ownlist/anime/add?selected_series_id="+actual['.anime_id'];
                flashConfirm('Add "'+actual['name']+'" to MAL?', function(){continueCall();}, function(){
                    if(change['checkIncrease'] == 1){
                        episodeInfo(change['.add_anime[num_watched_episodes]'], actual['malurl']);
                    }
                });
                return;
            }
        }else{
            var url = "https://myanimelist.net/ownlist/manga/"+actual['.manga_id']+"/edit";
            if(actual['addmanga'] === 1){
                url = "https://myanimelist.net/ownlist/manga/add?selected_manga_id="+actual['.manga_id'];
                flashConfirm('Add "'+actual['name']+'" to MAL?', function(){continueCall();}, function(){});
                return;
            }
        }

        continueCall();

        function continueCall(){
            anime = handleanimeupdate( anime, actual );
            if(anime === null){
                if(change['checkIncrease'] == 1 && localListType == 'anime'){
                    episodeInfo(change['.add_anime[num_watched_episodes]'], actual['malurl']);
                }
                return;
            }
            $.each( anime, function( index, value ){
                actual[index] = value;
            });
            anime = actual;
            var parameter = "";


            $.each( anime, function( index, value ){
                if(index.charAt(0) == "."){
                    if(!( (index === '.add_anime[is_rewatching]' || index === '.add_manga[is_rereading]') && parseInt(anime[index]) === 0)){
                        parameter += encodeURIComponent (index.substring(1))+"="+encodeURIComponent (value)+"&";
                    }
                }
            });

            con.log('[SET] URL:', url);
            con.log('[SET] Object:', anime);

            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                synchronous: false,
                data: parameter,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
                },
                onload: function(response) {
                    //con.log(response);//.responseText);
                    if(anime['no_flash'] !== 1){
                        if(response.responseText.indexOf('Successfully') >= 0){
                            if(localListType == 'anime'){
                                var message = anime['name'];
                                var split = '<br>';
                                var totalEp = anime['totalEp'];
                                if (totalEp == 0) totalEp = '?';
                                if(typeof change['.add_anime[status]'] != 'undefined'){
                                    var statusString = "";
                                    switch (parseInt(anime['.add_anime[status]'])) {
                                        case 1:
                                            statusString = watching;
                                            break;
                                        case 2:
                                            statusString = 'Completed';
                                            break;
                                        case 3:
                                            statusString = 'On-Hold';
                                            break;
                                        case 4:
                                            statusString = 'Dropped';
                                            break;
                                        case 6:
                                            statusString = planTo;
                                            break;
                                    }
                                    message += split + statusString;
                                    split = ' | '
                                }
                                if(typeof change['.add_anime[num_watched_episodes]'] != 'undefined'){
                                    message += split + 'Episode: ' + anime['.add_anime[num_watched_episodes]']+"/"+totalEp;
                                    split = ' | '
                                }
                                if(typeof change['.add_anime[score]'] != 'undefined' && anime['.add_anime[score]'] != ''){
                                    message += split + 'Rating: ' + anime['.add_anime[score]'];
                                    split = ' | '
                                }
                                if(anime['checkIncrease'] == 1){
                                    message += '<br><button class="undoButton" style="background-color: transparent; border: none; color: rgb(255,64,129);margin-top: 10px;cursor: pointer;">Undo</button>';
                                    if(!episodeInfoBox){
                                        flashm( message , false);
                                        $('.undoButton').click(function(){
                                            undoAnime['checkIncrease'] = 0;
                                            setanime(thisUrl, undoAnime, null, localListType);
                                        });
                                    }else{
                                        episodeInfo(change['.add_anime[num_watched_episodes]'], actual['malurl'], message, function(){
                                            undoAnime['checkIncrease'] = 0;
                                            setanime(thisUrl, undoAnime, null, localListType);
                                            $('.info-Mal-undo').remove();
                                            if($('.flashinfo>div').text() == ''){
                                                $('.flashinfo').remove();
                                            }
                                        });
                                    }
                                }else{
                                    flashm( message , false);
                                }
                            }else{
                                var message = anime['name'];
                                var split = '<br>';
                                var totalVol = anime['totalVol'];
                                if (totalVol == 0) totalVol = '?';
                                var totalChap = anime['totalChap'];
                                if (totalChap == 0) totalChap = '?';
                                if(typeof change['.add_manga[status]'] != 'undefined'){
                                    var statusString = "";
                                    switch (parseInt(anime['.add_manga[status]'])) {
                                        case 1:
                                            statusString = watching;
                                            break;
                                        case 2:
                                            statusString = 'Completed';
                                            break;
                                        case 3:
                                            statusString = 'On-Hold';
                                            break;
                                        case 4:
                                            statusString = 'Dropped';
                                            break;
                                        case 6:
                                            statusString = planTo;
                                            break;
                                    }
                                    message += split + statusString;
                                    split = ' | '
                                }
                                if(typeof change['.add_manga[num_read_volumes]'] != 'undefined'){
                                    message += split + 'Volume: ' + anime['.add_manga[num_read_volumes]']+"/"+totalVol;
                                    split = ' | '
                                }
                                if(typeof change['.add_manga[num_read_chapters]'] != 'undefined'){
                                    message += split + 'Chapter: ' + anime['.add_manga[num_read_chapters]']+"/"+totalChap;
                                    split = ' | '
                                }
                                if(typeof change['.add_manga[score]'] != 'undefined' && anime['.add_manga[score]'] != ''){
                                    message += split + 'Rating: ' + anime['.add_manga[score]'];
                                    split = ' | '
                                }
                                if(anime['checkIncrease'] == 1){
                                    message += '<br><button class="undoButton" style="background-color: transparent; border: none; color: rgb(255,64,129);margin-top: 10px;cursor: pointer;">Undo</button>';
                                    if(!episodeInfoBox){
                                        flashm( message , false);
                                        $('.undoButton').click(function(){
                                            undoAnime['checkIncrease'] = 0;
                                            setanime(thisUrl, undoAnime, null, localListType);
                                        });
                                    }else{
                                        message = "<div class='info-Mal-undo' style='white-space: nowrap; margin-top: 15px; /*margin-left: 15px;*/'> "+ message +"</div>";
                                        flashm ( message , false, true);
                                        $('.undoButton').click(function(){
                                            undoAnime['checkIncrease'] = 0;
                                            setanime(thisUrl, undoAnime, null, localListType);
                                            $('.info-Mal-undo').remove();
                                            if($('.flashinfo>div').first().text() == ''){
                                                $('.flashinfo').remove();
                                            }
                                        });
                                    }
                                }else{
                                    flashm( message , false);
                                }
                            }
                        }else{
                            flashm( "Anime update failed" , true);
                            if(anime['checkIncrease'] !== 1){
                                try{
                                    checkdata();
                                }catch(e){}
                            }
                        }
                        if(anime['forceUpdate'] == 1 || anime['forceUpdate'] == 2){
                            try{
                                checkdata();
                            }catch(e){}
                        }
                    }
                }
            });
        }

    }
    function firefoxUrl(url, html){
        if(html.indexOf('property="og:url"') > -1){
            url = html.split('<meta property="og:url"')[1].split('content="')[1].split('"')[0];
        }
        return url;
    }

    function local_setValue( thisUrl, malurl, newCorrection = false){
        if( (!(thisUrl.indexOf("myAnimeList.net/") >= 0)) && ( GM_getValue(K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(thisUrl))+'/Mal' , null) == null || newCorrection || GM_getValue(K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(thisUrl))+'/Crunch' , null) == 'no')){
            var param = { Kiss: thisUrl, Mal: malurl};
            if(K.dbSelector == 'Crunchyroll'){
                param = { Kiss: window.location.href+'?..'+$.titleToDbKey(K.urlAnimeSelector()), Mal: malurl};
                if(K.isOverviewPage()){
                    param = null;
                    if(GM_getValue(K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(thisUrl))+'/Crunch' , null) == null){
                        GM_setValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(thisUrl))+'/Crunch', 'no' );
                    }
                }else{
                    GM_setValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(thisUrl))+'/Crunch', 'yes' );
                }
            }

            var toDB = 1;

            if(fireExists) toDB = 0;

            if(newCorrection){
                toDB = 0;
                if (confirm('Submit database correction request? \n If it does not exist on MAL, please leave empty.')) {
                    toDB = 1;
                    param['newCorrection'] = true;
                }
            }


            if(toDB == 1){
                GM_xmlhttpRequest({
                    url: 'https://kissanimelist.firebaseio.com/Data2/Request/'+K.dbSelector+'Request.json',
                    method: "POST",
                    data: JSON.stringify(param),
                    onload: function () {
                        con.log("[DB] Send to database:",param);
                    },
                    onerror: function(error) {
                        con.log("[DB] Send to database:",error);
                    }
                });
            }
        }
        GM_setValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(thisUrl))+'/Mal', malurl );
    }

    function getselect(data, name){
        var temp = data.split('name="'+name+'"')[1].split('</select>')[0];
        if(temp.indexOf('selected="selected"') > -1){
            temp = temp.split('<option');
            for (var i = 0; i < temp.length; ++i) {
                if(temp[i].indexOf('selected="selected"') > -1){
                    return temp[i].split('value="')[1].split('"')[0];
                }
            }
        }else{
            return '';
        }
    }

    function flashm(text,error = true, info = false, permanent = false){
        if(!$('#flash-div-top').length){
            initflashm();
        }
        con.log("[Flash] Message:",text);
        if(error === true){
            var colorF = "#3e0808";
        }else{
            var colorF = "#323232";
        }

        if(permanent){
            $('#flash-div-top').prepend('<div class="flashPerm" style="display:none;"><div style="display:table; pointer-events: all; background-color: red;padding: 14px 24px 14px 24px; margin: 0 auto; margin-top: -2px; max-width: 60%; -webkit-border-radius: 20px;-moz-border-radius: 20px;border-radius: 2px;color: white;background:'+colorF+'; ">'+text+'</div></div>');
            $('.flashPerm').delay(2000).slideDown(800);
        }else{
            if(info){
                $('.flashinfo').removeClass('flashinfo').delay(2000).fadeOut({
                    duration: 400,
                    queue: false,
                    complete: function() { $(this).remove(); }});
                $('#flashinfo-div').addClass('hover').append('<div class="flashinfo" style="display:none; max-height: 5000px; margin-top: -8px;"><div style="display:table; pointer-events: all; background-color: red; margin: 0 auto; margin-top: -2px; max-width: 60%; -webkit-border-radius: 20px;-moz-border-radius: 20px;border-radius: 2px;color: white;background:'+colorF+'; "><div style="max-height: 60vh; overflow-y: auto; padding: 14px 24px 14px 24px;">'+text+'</div></div></div>');
                $('.flashinfo').slideDown(800).delay(4000).queue(function() { $('#flashinfo-div').removeClass('hover'); $(this).css('max-height', '8px');});
            }else{
                $('.flash').removeClass('flash').fadeOut({
                    duration: 400,
                    queue: false,
                    complete: function() { $(this).remove(); }});
                var mess ='<div class="flash" style="display:none;"><div style="display:table; pointer-events: all; background-color: red;padding: 14px 24px 14px 24px; margin: 0 auto; margin-top: 20px; max-width: 60%; -webkit-border-radius: 20px;-moz-border-radius: 20px;border-radius: 2px;color: white;background:'+colorF+'; ">'+text+'</div></div>';
                if($('.flashinfo').length){
                    $('.flashinfo').before(mess);
                }else{
                    $('#flash-div').append(mess);
                }
                $('.flash').slideDown(800).delay(4000).slideUp(800, function() { $(this).remove(); });
            }
        }
    }

    function flashConfirm(message, yesCall, cancelCall){
        $('.flashPerm').remove();
        var rNumber = Math.floor((Math.random() * 1000) + 1);
        message = '<div style="text-align: left;">' + message + '</div><div style="display: flex; justify-content: space-around;"><button class="Yes'+rNumber+'" style="background-color: transparent; border: none; color: rgb(255,64,129);margin-top: 10px; cursor:pointer;">OK</button><button class="Cancel'+rNumber+'" style="background-color: transparent; border: none; color: rgb(255,64,129);margin-top: 10px; cursor:pointer;">CANCEL</button></div>';
        flashm(message, false, false, true);
        $( '.Yes'+rNumber ).click(function(){
            $(this).parentsUntil('.flashPerm').remove();
            yesCall();
        });
        $( '.Cancel'+rNumber ).click(function(){
            $(this).parentsUntil('.flashPerm').remove();
            cancelCall();
        });
    }

    function initflashm(){
        GM_addStyle('.flashinfo{\
                        transition: max-height 2s;\
                     }\
                     .flashinfo:hover{\
                        max-height:5000px !important;\
                        z-index: 2147483647;\
                     }\
                     .flashinfo .synopsis{\
                        transition: max-height 2s, max-width 2s ease 2s;\
                     }\
                     .flashinfo:hover .synopsis{\
                        max-height:9999px !important;\
                        max-width: 500px !important;\
                        transition: max-height 2s;\
                     }\
                     #flashinfo-div{\
                      z-index: 2;\
                      transition: 2s;\
                     }\
                     #flashinfo-div:hover, #flashinfo-div.hover{\
                      z-index: 2147483647;\
                     }\
                     \
                     #flash-div-top, #flash-div, #flashinfo-div{\
                        font-family: "Helvetica","Arial",sans-serif;\
                        color: white;\
                        font-size: 14px;\
                        font-weight: 400;\
                        line-height: 17px;\
                     }\
                     #flash-div-top h2, #flash-div h2, #flashinfo-div h2{\
                        font-family: "Helvetica","Arial",sans-serif;\
                        color: white;\
                        font-size: 14px;\
                        font-weight: 700;\
                        line-height: 17px;\
                        padding: 0;\
                        margin: 0;\
                     }\
                     #flash-div-top a, #flash-div a, #flashinfo-div a{\
                        color: #DF6300;\
                     }');

        $('body').after('<div id="flash-div-top" style="text-align: center;pointer-events: none;position: fixed;top:0px;width:100%;z-index: 2147483647;left: 0;"></div>\
            <div id="flash-div" style="text-align: center;pointer-events: none;position: fixed;bottom:0px;width:100%;z-index: 2147483647;left: 0;"><div id="flash" style="display:none;  background-color: red;padding: 20px; margin: 0 auto;max-width: 60%;          -webkit-border-radius: 20px;-moz-border-radius: 20px;border-radius: 20px;background:rgba(227,0,0,0.6);"></div></div>\
            <div id="flashinfo-div" style="text-align: center;pointer-events: none;position: fixed;bottom:0px;width:100%;left: 0;">');
    }

    function updatebutton(){
        buttonclick();
    }

    function buttonclick(){
        var anime = {};
        if(K.listType == 'anime'){
            anime['.add_anime[num_watched_episodes]'] = $("#malEpisodes").val();
        }else{
            anime['.add_manga[num_read_volumes]'] = $("#malVolumes").val();
            anime['.add_manga[num_read_chapters]'] = $("#malChapters").val();
        }
        anime['.add_'+K.listType+'[score]'] = $("#malUserRating").val();
        anime['.add_'+K.listType+'[status]'] = $("#malStatus").val();
        anime['forceUpdate'] = 2;

        setanime(K.normalUrl(), anime);
    }

    function formattitle(title) {
        con.log("[TITLE] Title:",title);

        title = title.replace(/-dub$/i,'');
        title = title.replace(/-sub$/i,'');
        title = title.replace(/\(dub\)$/i,'');
        title = title.replace(/\(sub\)$/i,'');

        title = title.replace(' ','-');
        title = title.replace(' ','-');
        title = title.replace(' ','-');
        title = title.replace(' ','-');
        title = title.replace(' ','-');
        title = title.replace(' ','-');
        title = title.replace(' ','-');
        title = title.replace(' ','-');
        title = title.replace(' ','-');
        title = title.replace("s2"," 2nd season");
        title = title.replace("s3"," 3nd season");
        title = title.replace("s4"," 4nd season");
        title = title.replace("s5"," 5nd season");
        title = title.replace("s6"," 6nd season");
        title = title.replace("s7"," 7nd season");
        title = title.replace("s8"," 8nd season");
        title = title.replace("s9"," 9nd season");
        //title = title.replace(/[-,.?:'"\\!@#$%^&\-_=+`~;]/g,"");
        con.log("[TITLE] Formated:",title);
        return title;
    }

    function episodeInfo(episode, malUrl, message = '', clickCallback = function(){}){
        //message = '';
        if(episodeInfoBox){
            con.log('[Hover] Episode:',malUrl+'/episode/'+episode);
            GM_xmlhttpRequest({
                url: malUrl+'/episode/'+episode,
                method: "GET",
                onload: function (response) {
                    if(response.response != null){
                        if( response.response.indexOf("Sorry, this anime doesn't seem to have any episode information yet.") > -1 ){
                            if(message == ''){
                                return;

                            }
                        }
                        if(message != ''){
                            message = "<div class='info-Mal-undo' style='white-space: nowrap; margin-top: 15px; /*margin-left: 15px;*/'> "+ message +"</div>";
                        }
                        var data = response.response;
                        var synopsis = '';
                        var epTitle = '';
                        var epSubTitle = '';
                        var imgUrl = "";
                        try{
                            epTitle = data.split('class="fs18 lh11"')[1].split('</h2>')[0].split('</span>')[1];
                            if(epTitle.trim() != '<span class="ml8 icon-episode-type-bg">'){
                                epTitle = '#'+episode+" - "+epTitle+'<br>';
                            }else{
                                epTitle = '';
                            }
                        }catch(e){}

                        if(episodeInfoSubtitle){
                            try{
                                epSubTitle = data.split('<p class="fn-grey2"')[1].split('</p>')[0].split('>')[1].replace(/^\s+/g, "");
                                epSubTitle = " <small>"+epSubTitle+'</small><br>';
                            }catch(e){}
                        }

                        if(episodeInfoSynopsis){
                            try{
                                synopsis = data.split('Synopsis</h2>')[1].split('</div>')[0].replace(/^\s+/g, "");
                                if( synopsis.indexOf("badresult") > -1 || synopsis == ""){
                                    synopsis = "";
                                }else{
                                    synopsis = '<div style="border: 1px solid; margin-top: 15px; padding: 8px;">'+synopsis+'</div>';
                                }
                            }catch(e){}
                        }

                        var imgHtml = '';
                        if(episodeInfoImage){
                            try{
                                imgUrl = data.split('"isCurrent":true')[0].split('{').slice(-1)[0].split('"thumbnail":"')[1].split('"')[0].replace(/\\\//g, '/');
                            }catch(e){}


                            if(imgUrl != ''){
                                imgHtml = '<img style = "margin-top: 15px; height: 100px;" src="'+imgUrl+'"/>';
                            }
                        }
                        var synopsisHtml = '<div style="overflow: hidden; text-align: left; max-width: 0; max-height: 0;" class="synopsis">'+synopsis+'</div>';

                        if(epTitle != ''){
                            flashm ( '<div class="flasm-hover" style="/*display: flex;*/ align-items: center;"><div style="white-space: nowrap;"">'+epTitle + epSubTitle + imgHtml + "</div>"+ message +" </div>" + synopsisHtml, false, true);
                        }else if( message != '' ){
                            flashm ( message , false, true);
                        }

                        $('.undoButton').click(clickCallback);
                    }
                },
                onerror: function(error) {
                    con.log("[episodeInfo] error:",error);
                }
            });
        }
    }

    var miniMalButtonLate = '';
    var miniMalButtonKey = 0;
    function miniMalButton(url = null){
        miniMalButtonLate = url;
        $(".open-info-popup").unbind('click').show().click( function(){
            if($('#info-popup').css('display') == 'none'){
                document.getElementById('info-popup').style.display = "block";
                fillIframe(url, currentMalData);
                $('.floatbutton').fadeOut();
            }else{
                document.getElementById('info-popup').style.display = "none";
                $('.floatbutton').fadeIn();
            }
        });

        if(!miniMalButtonKey){
            miniMalButtonKey = 1;
            $("#info-iframe").contents().keydown(function(e) {
                keys(e);
            });

            $(document).keydown(function(e) {
                keys(e);
            });
        }

        function keys(e){
            if (e.ctrlKey && e.keyCode === 77) {
                if($('#info-popup').css('display') == 'none'){
                    document.getElementById('info-popup').style.display = "block";
                    fillIframe(url, currentMalData);
                    $('.floatbutton').fadeOut();
                }else{
                    document.getElementById('info-popup').style.display = "none";
                    $('.floatbutton').fadeIn();
                }
            }
        }
    }

    function atobURL( encoded ){
        try{
            return atob( encoded );
        }catch(e){
            return encoded;
        }
    }

    $.urlParam = function(name){
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results==null){
           return null;
        }
        else{
           return decodeURI(results[1]) || 0;
        }
    }

    function getTooltip(text, style = '', direction = 'top'){
        var rNumber = Math.floor((Math.random() * 1000) + 1);
        return '<div id="tt'+rNumber+'" class="icon material-icons" style="font-size:16px; line-height: 0; color: #7f7f7f; padding-bottom: 20px; padding-left: 3px; '+style+'"> &#x1F6C8;</div>\
        <div class="mdl-tooltip mdl-tooltip--'+direction+' mdl-tooltip--large" for="tt'+rNumber+'">'+text+'</div>';
    }

    //Status: 1 = watching | 2 = completed | 3 = onhold | 4 = dropped | 6 = plan to watch | 7 = all
    function getUserList(status = 1, localListType = 'anime', singleCallback = null, finishCallback = null, fullListCallback = null, continueCall = null, username = null, offset = 0, templist = []){
        con.log('[UserList]', 'username: '+username, 'status: '+status, 'offset: '+offset);
        if(username == null){
            getMalUserName(function(usernameTemp){
                if(usernameTemp == false){
                    flashm( "Please log in on <a target='_blank' href='https://myanimelist.net/login.php'>MyAnimeList!<a>" , true);
                }else{
                    getUserList(status, localListType, singleCallback, finishCallback, fullListCallback, continueCall, usernameTemp, offset, templist);
                }
            });
            return;
        }
        var url = 'http://myanimelist.net/'+localListType+'list/'+username+'/load.json?offset='+offset+'&status='+status;
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            synchronous: false,
            onload: function(response) {
                var data = $.parseJSON(response.response);
                if(singleCallback){
                    if(!data.length) singleCallback(false, 0, 0);
                    for (var i = 0; i < data.length; i++) {
                        singleCallback(data[i], i+offset+1, data.length+offset);
                    }
                }
                if(fullListCallback){
                    templist = templist.concat(data);
                }
                if(data.length > 299){
                    if(continueCall){
                        continueCall(function(){
                            getUserList(status, localListType, singleCallback, finishCallback, fullListCallback, continueCall, username, offset + 300, templist);
                        });
                    }else{
                        getUserList(status, localListType, singleCallback, finishCallback, fullListCallback, continueCall, username, offset + 300, templist);
                    }
                }else{
                    if(fullListCallback) fullListCallback(templist);
                    if(finishCallback) finishCallback();
                }
            }
        });
    }

    function getMalUserName(callback){
        var url = 'https://myanimelist.net/editlist.php?hideLayout';
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            synchronous: false,
            onload: function(response) {
                try{
                    var username = response.response.split('USER_NAME = "')[1].split('"')[0];
                }catch(e){
                    var username = false;
                }
                con.log('[Username]', username);
                callback(username);
            }
        });
    }

    $.fn.isInViewport = function() {
        var elementTop = $(this).offset().top;
        var elementBottom = elementTop + $(this).outerHeight();
        var viewportTop = $(window).scrollTop();
        var viewportBottom = viewportTop + $(window).height();
        return elementBottom > viewportTop && elementTop < viewportBottom;
    };

    var uiLoaded = 0;

    function checkdata(){
        if(K.normalUrl() !== ""){
            getanime(K.normalUrl(), function(anime){handleanime(anime);});
        }else{
            alert(error);
        }

        K.docReady(function() {
            var wrapStart = '<span style="display: inline-block;">';
            var wrapEnd = '</span>';

            var ui = '<p id="malp">';
            ui += '<span id="MalInfo">'+loadingText+'</span>';

            ui += '<span id="MalData" style="display: none; justify-content: space-between; flex-wrap: wrap;">';

            ui += wrapStart;
            ui += '<span class="info">Mal Score: </span>';
            ui += '<a id="malRating" style="color: '+K.textColor+';min-width: 30px;display: inline-block;" target="_blank" href="">____</a>';
            ui += wrapEnd;

            //ui += '<span id="MalLogin">';
            wrapStart = '<span style="display: inline-block; display: none;" class="MalLogin">';

            ui += wrapStart;
            ui += '<span class="info">Status: </span>';
            ui += '<select id="malStatus" style="font-size: 12px;background: transparent; border-width: 1px; border-color: grey; color: '+K.textColor+'; text-decoration: none; outline: medium none;">';
            //ui += '<option value="0" style="background: #111111;color: '+K.textColor+';"></option>';
            ui += '<option value="1" style="background: #111111;color: '+K.textColor+';">'+watching+'</option>';
            ui += '<option value="2" style="background: #111111;color: '+K.textColor+';">Completed</option>';
            ui += '<option value="3" style="background: #111111;color: '+K.textColor+';">On-Hold</option>';
            ui += '<option value="4" style="background: #111111;color: '+K.textColor+';">Dropped</option>';
            ui += '<option value="6" style="background: #111111;color: '+K.textColor+';">'+planTo+'</option>';
            ui += '</select>';
            ui += wrapEnd;

            if(K.listType == 'anime'){
                var middle = '';
                middle += wrapStart;
                middle += '<span class="info">Episodes: </span>';
                middle += '<span style="color: '+K.textColor+'; text-decoration: none; outline: medium none;">';
                middle += '<input id="malEpisodes" value="0" style="background: transparent; border-width: 1px; border-color: grey; text-align: right; color: '+K.textColor+'; text-decoration: none; outline: medium none;" type="text" size="1" maxlength="4">';
                middle += '/<span id="malTotal">0</span>';
                middle += '</span>';
                middle += wrapEnd;

            }else{
                var middle = '';
                middle += wrapStart;
                middle += '<span class="info">Volumes: </span>';
                middle += '<span style="color: '+K.textColor+'; text-decoration: none; outline: medium none;">';
                middle += '<input id="malVolumes" value="0" style="background: transparent; border-width: 1px; border-color: grey; text-align: right; color: '+K.textColor+'; text-decoration: none; outline: medium none;" type="text" size="1" maxlength="4">';
                middle += '/<span id="malTotalVol">0</span>';
                middle += '</span>';
                middle += wrapEnd;


                middle += wrapStart;
                middle += '<span class="info">Chapters: </span>';
                middle += '<span style="color: '+K.textColor+'; text-decoration: none; outline: medium none;">';
                middle += '<input id="malChapters" value="0" style="background: transparent; border-width: 1px; border-color: grey; text-align: right; color: '+K.textColor+'; text-decoration: none; outline: medium none;" type="text" size="1" maxlength="4">';
                middle += '/<span id="malTotalCha">0</span>';
                middle += '</span>';
                middle += wrapEnd;
            }

            ui += middle;


            ui += wrapStart;
            ui += '<span class="info">Your Score: </span>';
            ui += '<select id="malUserRating" style="font-size: 12px;background: transparent; border-width: 1px; border-color: grey; color: '+K.textColor+'; text-decoration: none; outline: medium none;"><option value="" style="background: #111111;color: '+K.textColor+';">Select</option>';
            ui += '<option value="10" style="background: #111111;color: '+K.textColor+';">(10) Masterpiece</option>';
            ui += '<option value="9" style="background: #111111;color: '+K.textColor+';">(9) Great</option>';
            ui += '<option value="8" style="background: #111111;color: '+K.textColor+';">(8) Very Good</option>';
            ui += '<option value="7" style="background: #111111;color: '+K.textColor+';">(7) Good</option>';
            ui += '<option value="6" style="background: #111111;color: '+K.textColor+';">(6) Fine</option>';
            ui += '<option value="5" style="background: #111111;color: '+K.textColor+';">(5) Average</option>';
            ui += '<option value="4" style="background: #111111;color: '+K.textColor+';">(4) Bad</option>';
            ui += '<option value="3" style="background: #111111;color: '+K.textColor+';">(3) Very Bad</option>';
            ui += '<option value="2" style="background: #111111;color: '+K.textColor+';">(2) Horrible</option>';
            ui += '<option value="1" style="background: #111111;color: '+K.textColor+';">(1) Appalling</option>';
            ui += '</select>';
            ui += wrapEnd;

            //ui += '</span>';
            ui += '</span>';
            ui += '</p>';

            var uihead ='';
            uihead += '<p class="headui" style="float: right; margin: 0; margin-right: 10px">';
            uihead += '';
            uihead += '<p>';

            var uiwrong ='';

            uiwrong += '<button class="open-info-popup mdl-button" style="display:none; margin-left: 6px;">MAL</button>';


            if(!uiLoaded){
                uiLoaded = 1;
                K.uiPos($(ui));
                K.uiWrongPos($(uiwrong));
                K.uiHeadPos($(uihead));

                $( "#malEpisodes" ).change(function() {
                    updatebutton();
                });
                //####Manga####
                $( "#malVolumes" ).change(function() {
                    updatebutton();
                });
                $( "#malChapters" ).change(function() {
                    updatebutton();
                });
                //#############
                $( "#malUserRating" ).change(function() {
                    updatebutton();
                });
                $( "#malStatus" ).change(function() {
                    updatebutton();
                });

                createIframe();
                //#######Kissanime#######
                $("#btnRemoveBookmark").click(function() {
                    var anime = {};
                    anime['.add_'+K.listType+'[status]'] = 4;
                    anime['forceUpdate'] = 1;
                    setanime(K.normalUrl(),anime);
                });

                $("#btnAddBookmark").click(function() {
                    var anime = {};
                    anime['.add_'+K.listType+'[status]'] = 6;
                    anime['forceUpdate'] = 1;
                    setanime(K.normalUrl(),anime);
                });
                //#######################
            }
        });


    }
    var xml ="";
    var foundAnime = [];

    //var imageBackup = "Mal-img";
    var image = "image";

    function getMalXml(user = "", callback = null){
        var url = "https://myanimelist.net/editprofile.php?go=privacy";
        if(user !== ""){
            url = "https://myanimelist.net/malappinfo.php?u="+user+"&status=all&type="+K.listType;
            con.log("XML Url:", url);
        }
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            synchronous: false,
            onload: function(response) {
                if(url ===  "https://myanimelist.net/editprofile.php?go=privacy"){
                    try{
                        user = response.responseText.split('<a href="https://myanimelist.net/profile/')[1].split('"')[0];
                    }catch(e){
                        flashm( "Please log in on <a target='_blank' href='https://myanimelist.net/login.php'>MyAnimeList!<a>" , true);
                        $('.listing tr td:nth-child(1)').css('height', 'initial');
                        $('.listing tr td:nth-child(1)').css('padding-left', '0');
                        return;
                    }
                    con.log("User:" ,user);
                    getMalXml(user, callback);
                    return;
                }
                if(callback == null){
                    xml = $(response.responseXML);
                    setAll();
                }else{
                    callback( $(response.responseXML) );
                }
            }
        });
    }

    function encodeurl(string){
        return encodeURIComponent(encodeURIComponent(string).replace('.', '%2E'));
    }

    function setBookmarkAnime(value, baseurl, target, last = 0){
        var id = value.split("/")[4];
        con.log(id);
        foundAnime.push(id);
        var xmlAnime = xml.find('series_'+K.listType+'db_id:contains('+id+')').parent();

        getdata(baseurl, function(value) { setimage(value, xmlAnime, target, baseurl); }, image);

        if(xmlAnime.length === 0){
            if(id == 'Not-Found'){
                target.find(".MalData").first().append("No Mal");
            }else{
                target.find(".MalData").first().append("<a href='#' onclick='return false;'>Add to Mal</a>").find("a").click(function() {
                    var anime = {};
                    anime['.add_'+K.listType+'[status]'] = 6;
                    setanime(baseurl,anime);
                });
            }
        }else{
            var totalEp = xmlAnime.find("series_"+middleType).first().text();
            if(totalEp === '0'){
                totalEp = "?";
            }

            setepisode (xmlAnime.find("my_"+middleVerb+"_"+middleType).first().text(), totalEp , target, baseurl);
            setstatus (xmlAnime.find("my_status").first().text() , target, baseurl);
            setscore (xmlAnime.find("my_score").first().text() , target, baseurl);
        }
        if(last === 1){ //TODO:
            con.log(foundAnime);
            //MalExistsOnKiss(foundAnime);
        }
    }

    function setimage(value, xmlAnime, target, baseurl){
        if(classicBookmarks == 0){
            if(typeof value === "undefined" || value === null){
                if(baseurl === ""){
                    return;
                }
                //getdata(baseurl, function(value) { setimage(value, xmlAnime, target, ""); }, imageBackup);
                return;
            }
            target.find("td").first().html("<img src='"+value+"' width='120px' height='150px'></img>");
            /*target.find("td").first().find("img").error(function() {
                //TODO: Send to Database and only execute one time so no loop
                getdata(baseurl, function(value) { setimage(value, xmlAnime, target, ""); }, imageBackup);
            });*/
        }
    }

    function setepisode(episode, totalEp, target, baseurl){
        target.find(".MalData").first().append('<div class="malEpisode"><input class="input" type="number" min="0" max="'+totalEp+'" value="'+episode+'" size="1" maxlength="4" style="display: none;background: transparent; border-width: 1px; border-color: grey; text-align: right; color: '+K.textColor+'; text-decoration: none; outline: medium none; max-width: 50px;"/><span class="normal">'+episode+'</span> / '+totalEp+'</div>');

        target.find(".MalData").first().find('.malEpisode').click(
          function() {
            $( this ).find('.input').css('display', 'initial');
            $( this ).find('.normal').css('display', 'none');
          }).change(function() {
            var anime = {};
            anime['.add_'+K.listType+'[num_'+middleVerb+'_'+middleType+']'] = $(this).parent().find('.malEpisode').find('.input').val();
            anime['.add_'+K.listType+'[status]'] = $(this).parent().find('.malStatus').val();
            anime['.add_'+K.listType+'[score]'] = $(this).parent().find('.malUserRating').val();
            setanime(baseurl,anime);
          });
    }

    function setstatus(value, target, baseurl){
        if(target.find(".malStatus").first().height() === null){
            var ui = "";
            ui += '<select class="malStatus" style="width: 100%; font-size: 12px; background: transparent; border-width: 0px; border-color: grey; color: '+K.textColor+'; text-decoration: none; outline: medium none;">';
            //ui += '<option value="0" style="background: #111111;color: #d5f406;"></option>';
            ui += '<option value="1" style="background: #111111;color: '+K.textColor+';">'+watching+'</option>';
            ui += '<option value="2" style="background: #111111;color: '+K.textColor+';">Completed</option>';
            ui += '<option value="3" style="background: #111111;color: '+K.textColor+';">On-Hold</option>';
            ui += '<option value="4" style="background: #111111;color: '+K.textColor+';">Dropped</option>';
            ui += '<option value="6" style="background: #111111;color: '+K.textColor+';">'+planTo+'</option>';
            ui += '</select>';
            target.find(".MalData").first().append(""+ui).find('.malStatus').change(function() {
                var anime = {};
                anime['.add_'+K.listType+'[num_'+middleVerb+'_'+middleType+']'] = $(this).parent().find('.malEpisode').find('.input').val();
                anime['.add_'+K.listType+'[status]'] = $(this).parent().find('.malStatus').val();
                anime['.add_'+K.listType+'[score]'] = $(this).parent().find('.malUserRating').val();
                setanime(baseurl,anime);
            });
        }
        target.find(".malStatus").first().val(value);
    }

    function setscore(value, target, baseurl){
        if(target.find(".malUserRating").first().height() === null){
            var ui = "";
            ui += '<select class="malUserRating" style="width: 100%; font-size: 12px; background: transparent; border-width: 0px; border-color: grey; color: '+K.textColor+'; text-decoration: none; outline: medium none;"><option value="" style="background: #111111;color: '+K.textColor+';">Select</option>';
            ui += '<option value="10" style="background: #111111;color: '+K.textColor+';">(10) Masterpiece</option>';
            ui += '<option value="9" style="background: #111111;color: '+K.textColor+';">(9) Great</option>';
            ui += '<option value="8" style="background: #111111;color: '+K.textColor+';">(8) Very Good</option>';
            ui += '<option value="7" style="background: #111111;color: '+K.textColor+';">(7) Good</option>';
            ui += '<option value="6" style="background: #111111;color: '+K.textColor+';">(6) Fine</option>';
            ui += '<option value="5" style="background: #111111;color: '+K.textColor+';">(5) Average</option>';
            ui += '<option value="4" style="background: #111111;color: '+K.textColor+';">(4) Bad</option>';
            ui += '<option value="3" style="background: #111111;color: '+K.textColor+';">(3) Very Bad</option>';
            ui += '<option value="2" style="background: #111111;color: '+K.textColor+';">(2) Horrible</option>';
            ui += '<option value="1" style="background: #111111;color: '+K.textColor+';">(1) Appalling</option>';
            ui += '</select>';
            target.find(".MalData").first().append("</br>"+ui).find('.malUserRating').change(function() {
                var anime = {};
                anime['.add_'+K.listType+'[num_'+middleVerb+'_'+middleType+']'] = $(this).parent().find('.malEpisode').find('.input').val();
                anime['.add_'+K.listType+'[status]'] = $(this).parent().find('.malStatus').val();
                anime['.add_'+K.listType+'[score]'] = $(this).parent().find('.malUserRating').val();
                setanime(baseurl,anime);
            });
        }
        target.find(".malUserRating").first().val(value);
    }

    function clearCache(){
        con.log('Before',GM_listValues());
        var cacheArray = GM_listValues();
        $.each( cacheArray, function( index, cache){
            if(/^[^/]+\/[^/]+\/Mal$/.test(cache)){
                GM_deleteValue(cache);
            }
            if(/^[^/]+\/[^/]+\/MalToKiss$/.test(cache)){
                GM_deleteValue(cache);
            }
            if(/^[^/]+\/[^/]+\/bdid$/.test(cache)){
                GM_deleteValue(cache);
            }
            if(/^[^/]+\/[^/]+\/image$/.test(cache)){
                GM_deleteValue(cache);
            }
            if(/^newEp_.*/.test(cache)){
                GM_deleteValue(cache);
            }
        });
        con.log('After',GM_listValues());
        flashm( "Cache Cleared" , false);
    }

    function MalExistsOnKiss(animelist){
        var row = "";
        var xmlEntry = "";
        $(".listing").html("");//TODO remove;
        xml.find('series_'+K.listType+'db_id').each(function(index){
            if((jQuery.inArray( $(this).text(), animelist ) ) < 0){
                con.log($(this).text());
                xmlEntry = $(this).parent();
                row = "";
                row += '<tr class="trAnime">';
                row += '<td class="Timage" style="padding-left: 0px; height: 150px; vertical-align: top;">';
                row += '<img src="'+xmlEntry.find("series_image").first().text()+'" width="120px" height="150px">';
                row += '</td>';
                row += '<td style="vertical-align: top;">';
                row += '<div class="title" style="padding-bottom: 10px;">';
                row += '<a class="aAnime" href="https://myanimelist.net/'+K.listType+'/'+xmlEntry.find("series_"+K.listType+"db_id").first().text()+'">'+xmlEntry.find("series_title").first().text()+'</a>';
                row += '</div>';
                row += '</td>';
                row += '</tr>';

                $(".listing").before(row);
            }
        });


    }

    function getdata(baseurl, callback, parth = ""){
        if(GM_getValue(K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(baseurl))+'/'+parth , null) !== null ){
            con.log("cache:", K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(baseurl))+'/'+parth);
            var value = GM_getValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(baseurl))+'/'+parth , null);
            callback(value);
        }else{
            con.log("db:", K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(baseurl))+'/'+parth);
            var url = 'https://kissanimelist.firebaseio.com/Data2/'+K.dbSelector+'/'+encodeURIComponent(encodeURIComponent($.titleToDbKey(K.urlAnimeSelector(baseurl)))).toLowerCase()+'/'+parth+'.json';
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                synchronous: false,
                onload: function(response) {
                    //con.log(response);
                    if( response.responseText != null  && response.responseText != 'null'){
                        var newResponse = response.responseText.slice(1, -1);
                        if(parth == 'Mal'){
                            newResponse = 'https://myanimelist.net/'+K.listType+'/'+response.responseText.split('"')[1]+'/'+response.responseText.split('"')[3];
                        }
                        GM_setValue(K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(baseurl))+'/'+parth , newResponse);
                        callback(newResponse);
                    }
                }
            });
        }
    }

    function setAll(){
        K.docReady(function() {

            K.bookmarkEntrySelector().each(function() {
                var thistd = $(this).find("td").first();
                $(this).find("td").first().children().first().wrap('<div class="title" style="padding-bottom: 10px;"></div>');
                var append = '<div style="width: 50%; float: left;" class="kissData"></div><div style="width: 50%; float: left;" class="MalData"></div>';
                $(this).find("td").first().append(append);


                $(this).find("td").each(function(index){

                    if(index > 0){
                        $(this).appendTo(thistd.find(".kissData"));
                        //text += $(this).html()+"<br/>";
                        //$(this).remove();
                    }else{
                        //text += '<div class="title" style="padding-bottom: 10px;">'+$(this).html()+'</div><div style="width: 50%; float: left;" class="kiss">';
                    }
                });
                $(this).find("td").first().find("td").append("<br />").contents().unwrap();
            });
            if($("#cssTableSet").height() === null){
                K.BookmarksStyleAfterLoad();
            }else{
                return;
            }

            var len = K.bookmarkEntrySelector().length;
            K.bookmarkEntrySelector().bind('inview', function (event, visible) {
                if (visible === true) {
                    var baseurl = $.absoluteLink($(this).find("a").first().attr('href'));
                    var target = $(this);
                    getdata(baseurl,function(value) { setBookmarkAnime(value, baseurl, target); }, "Mal");
                    $(this).unbind('inview');
                }
            });
            $(window).scroll();
        });
    }
    function displaySites(responsearray, page){
        if($('#'+page+'Links').width() == null){
            $('#siteSearch').before('<h2 id="'+page+'Links" class="mal_links"><img src="https://www.google.com/s2/favicons?domain='+responsearray['url'].split('/')[2]+'"> '+page+'</h2><br class="mal_links" />');
        }
        if($("#info-iframe").contents().find('#'+page+'Links').width() == null){
            $("#info-iframe").contents().find('.stream-block-inner').append('<li class="mdl-list__item mdl-list__item--three-line"><span class="mdl-list__item-primary-content"><span><img style="padding-bottom: 3px;" src="https://www.google.com/s2/favicons?domain='+responsearray['url'].split('/')[2]+'"> '+page+'</span><span id="'+page+'Links" class="mdl-list__item-text-body"></span></span></li>');
        }
        $('#'+page+'Links').after('<div class="mal_links"><a target="_blank" href="'+responsearray['url']+'">'+responsearray['title']+'</a><div>');
        $("#info-iframe").contents().find('#'+page+'Links').append('<div><a target="_blank" href="'+responsearray['url']+'">'+responsearray['title']+'</a><div>');
        $("#info-iframe").contents().find('.stream-block').show();
    }

    function getSites(sites, page){
        $.each(sites, function(index, value){
            if( GM_getValue( value+'/'+encodeURIComponent(index)+'/MalToKiss', null) != null ){
                con.log('[2Kiss] Cache' );
                var responsearray = $.parseJSON(GM_getValue( value+'/'+encodeURIComponent(index)+'/MalToKiss', null));
                displaySites(responsearray, page);
            }else{
                GM_xmlhttpRequest({
                    url: 'https://kissanimelist.firebaseio.com/Data2/'+value+'/'+encodeURIComponent(index)+'.json',
                    method: "GET",
                    onload: function (response) {
                        con.log('[2Kiss] ',response.response);
                        if(response.response != null){
                            var responsearray = $.parseJSON(response.response);
                            if( value == 'Crunchyroll' ){
                                responsearray['url'] = responsearray['url'] + '?season=' + index;
                            }
                            GM_setValue( value+'/'+encodeURIComponent(index)+'/MalToKiss', '{"title":"'+responsearray['title']+'","url":"'+responsearray['url']+'"}' );
                            displaySites(responsearray, page);
                        }
                    },
                    onerror: function(error) {
                        con.log("error: "+error);
                    }
                });
            }
        });
    }

    function setKissToMal(malUrl){
        $(document).ready(function() {
            $('.mal_links').remove();
            var type = malUrl.split('/')[3];
            var uid = malUrl.split('/')[4].split("?")[0];
            var sites = new Array();
            var sitesName = new Array();
            var searchLinks = 0;
            if(type == 'anime'){
                if(kissanimeLinks != 0){
                    sites.push('Kissanime');
                    sitesName['Kissanime'] = 'KissAnime';
                    searchLinks = 1;
                }
                if(masteraniLinks != 0){
                    sites.push('Masterani');
                    sitesName['Masterani'] = 'MasterAnime';
                    searchLinks = 1;
                }
                if(nineanimeLinks != 0){
                    sites.push('9anime');
                    sitesName['9anime'] = '9anime';
                    searchLinks = 1;
                }
                if(crunchyrollLinks != 0){
                    sites.push('Crunchyroll');
                    sitesName['Crunchyroll'] = 'Crunchyroll';
                    searchLinks = 1;
                }
                if(gogoanimeLinks != 0){
                    sites.push('Gogoanime');
                    sitesName['Gogoanime'] = 'Gogoanime';
                    searchLinks = 1;
                }
            }else{
                if(kissmangaLinks != 0){
                    sites.push('Kissmanga');
                    sitesName['Kissmanga'] = 'KissManga';
                    searchLinks = 1;
                }
            }
            if(searchLinks != 0){
                $('h2:contains("Information")').before('<h2 id="siteSearch" class="mal_links">Search</h2><br class="mal_links" />');
                if(type == 'anime'){
                    $('#siteSearch').after('<div class="mal_links"></div>');
                    if(masteraniLinks != 0) $('#siteSearch').after('<div class="mal_links"><a target="_blank" href="http://www.google.com/search?q=site:www.masterani.me/anime/info/+'+encodeURI($('#contentWrapper > div:first-child span').text())+'">MasterAnime (Google)</a> <a target="_blank" href="https://www.masterani.me/anime?search='+$('#contentWrapper > div:first-child span').text()+'">(Site)</a></div>');
                    if(gogoanimeLinks != 0) $('#siteSearch').after('<div class="mal_links"><a target="_blank" href="http://www.gogoanime.tv/search.html?keyword='+$('#contentWrapper > div:first-child span').text()+'">Gogoanime</a></div>');
                    if(crunchyrollLinks != 0) $('#siteSearch').after('<div class="mal_links"><a target="_blank" href="http://www.crunchyroll.com/search?q='+$('#contentWrapper > div:first-child span').text()+'">Crunchyroll</a></div>');
                    if(nineanimeLinks != 0) $('#siteSearch').after('<div class="mal_links"><a target="_blank" href="https://9anime.to/search?keyword='+$('#contentWrapper > div:first-child span').text()+'">9anime</a></div>');
                    if(kissanimeLinks != 0) $('#siteSearch').after('<form class="mal_links" target="_blank" action="http://kissanime.ru/Search/Anime" id="kissanimeSearch" method="post" _lpchecked="1"><a href="#" onclick="return false;" class="submitKissanimeSearch">KissAnime</a><input type="hidden" id="keyword" name="keyword" value="'+$('#contentWrapper > div:first-child span').text()+'"/></form>');
                    $('.submitKissanimeSearch').click(function(){
                      $('#kissanimeSearch').submit();
                    });
                }else{
                    $('#siteSearch').after('<form class="mal_links" target="_blank" action="http://kissmanga.com/Search/Manga" id="kissmangaSearch" method="post" _lpchecked="1"><a href="#" onclick="return false;" class="submitKissmangaSearch">KissManga</a><input type="hidden" id="keyword" name="keyword" value="'+$('#contentWrapper > div:first-child span').text()+'"/></form>');
                    $('.submitKissmangaSearch').click(function(){
                      $('#kissmangaSearch').submit();
                    });
                }
            }else{
                $('h2:contains("Information")').before('<div class="mal_links" id="siteSearch"></div>');
            }
            $.each( sites, function( index, page ){
                var url = 'https://kissanimelist.firebaseio.com/Data2/Mal'+type+'/'+uid+'/Sites/'+page+'.json';
                GM_xmlhttpRequest({
                    url: url,
                    method: "GET",
                    onload: function (response) {
                        con.log('[2Kiss]', url, response.response);
                        if(response.response != 'null'){
                            getSites($.parseJSON(response.response), sitesName[page]);
                        }
                    },
                    onerror: function(error) {
                        con.log("[setKissToMal] error:",error);
                    }
                });
            });
       });
    }

    function malThumbnails(){
        if(window.location.href.indexOf("/pics") > -1){
            return;
        }
        if(window.location.href.indexOf("/pictures") > -1){
            return;
        }
        if(malThumbnail == "0"){
            return;
        }
        var height = parseInt(malThumbnail);
        var width = Math.floor(height/144*100);

        var surHeight = height+4;
        var surWidth = width+4;
        GM_addStyle('.picSurround img:not(.noKal){height: '+height+'px !important; width: '+width+'px !important;}');
        GM_addStyle('.picSurround img.lazyloaded.kal{width: auto !important;}');
        GM_addStyle('.picSurround:not(.noKal) a{height: '+surHeight+'px; width: '+surWidth+'px; overflow: hidden; display: flex; justify-content: center;}');

        try{
            window.onload = function(){ overrideLazyload(); };
            document.onload = function(){ overrideLazyload(); };
        }catch(e){
            $(document).ready(function(){ overrideLazyload(); });
        }

        function overrideLazyload() {
            var tags = document.querySelectorAll(".picSurround img:not(.kal)");
            var url = '';
            for (var i = 0; i < tags.length; i++) {
                var regexDimensions = /\/r\/\d*x\d*/g;
                if(tags[i].hasAttribute("data-src")){
                    url = tags[i].getAttribute("data-src");
                }else{
                    url = tags[i].getAttribute("src");
                }

                if ( regexDimensions.test(url) || /voiceactors.*v.jpg$/g.test(url) ) {
                    if(!(url.indexOf("100x140") > -1)){
                        tags[i].setAttribute("data-src", url);
                        url = url.replace(/v.jpg$/g, '.jpg');
                        tags[i].setAttribute("data-srcset", url.replace(regexDimensions, ''));
                        tags[i].classList.add('lazyload');
                    }
                    tags[i].classList.add('kal');
                }else{
                    tags[i].closest(".picSurround").classList.add('noKal');
                    tags[i].classList.add('kal');
                    tags[i].classList.add('noKal');
                }
            }
        }
    }
    var tagToContinueNumber = 0;
    function tagToContinue(){
        tagToContinueNumber++;
        if(tagLinks == 0){
            return false;
        }
        if(tagToContinueNumber > 1){
            alternativeTagOnSite();
            return true;
        }
        $(window).load(function(){
            var checkExist = setInterval(function() {
                if ($('.list-item').first().length || $('.header_cw').first().length){
                    clearInterval(checkExist);
                    var url = '';
                    //Classic List formating

                    var span = '';
                    if($('#list_surround').length){
                        span = 'span';
                    };

                    $('#list_surround table').addClass("list-table-data");
                    $('#list_surround table .animetitle').parent().addClass("title").addClass("data");
                    $('#list_surround table .animetitle').addClass("link");
                    $('.table_header').each(function(index){
                        if($(this).find('strong a:contains(Progress), a:contains(Chapters)').length){
                            $('#list_surround table td[class^="td"]:nth-child('+(index+1)+')').addClass("progress").addClass("data").find('a span').addClass('link');
                        }
                        if($('strong:contains(Tags)').length){
                            $('#list_surround table td[class^="td"]:nth-child('+(index+1)+')').addClass("tags");  //.css('background-color','red');
                        }
                    })
                    //

                    tagToContinueEpPrediction();

                    if( $('.header-title.tags').length || $('.td1.tags').length){
                        $('.tags span a').each(function( index ) {
                            if($(this).text().indexOf("last::") > -1 ){
                                url = atobURL( $(this).text().split("last::")[1].split("::")[0] );
                                setStreamLinks(url, $(this).closest('.list-table-data'));
                                if($(this).closest('.list-table-data').find('.watching , .reading').length || $('#list_surround').length){
                                    checkForNewEpisodes(url, $(this).closest('.list-table-data'), $(this).closest('.list-table-data').find('.title .link '+span).text(), $(this).closest('.list-table-data').find('.link img.image').attr('src'));
                                }
                                if($('#list_surround').length){
                                    $(this).remove();
                                }else{
                                    $(this).parent().remove();
                                }
                            }
                        });
                        startCheckForNewEpisodes();
                    }else{
                        alternativeTagOnSite();
                    }

                    return true;
                }
            }, 300);
        });
    }

    function alternativeTagOnSite(){
        if($('.list-table').length){
            con.log('[BOOK] Modern Tags');
            var data = $.parseJSON($('.list-table').attr('data-items'));
            $.each(data,function(index, el) {
                if(el['tags'].indexOf("last::") > -1){
                    var url = atobURL( el['tags'].split("last::")[1].split("::")[0] );
                    setStreamLinks(url, $('.list-item a[href^="'+el[K.listType+'_url']+'"]').parent().parent('.list-table-data'));
                    if( parseInt(el['status']) === 1 ){
                        checkForNewEpisodes(url, $('.list-item a[href^="'+el[K.listType+'_url']+'"]').parent().parent('.list-table-data'), el[K.listType+'_title'], el[K.listType+'_image_path']);
                    }
                }
            });
            startCheckForNewEpisodes();
        }else{
            con.log('[BOOK] Classic Tags');
            alternativTagToContinue();
        }
    }

    function alternativTagToContinue(){
        var user = window.location.href.split('/')[4].split('?')[0];
        K.listType = window.location.href.split('.net/')[1].split('list')[0];
        url = "https://myanimelist.net/malappinfo.php?u="+user+"&status=all&type="+K.listType;
        con.log("[BOOK] XML Url:", url);
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            synchronous: false,
            onload: function(response) {
                //con.log(response);
                var xml = $(response.responseXML);
                var title = '';
                var xmlAnime = '';
                var span = '';
                if($('#list_surround').length){
                    span = 'span';
                };
                $('.list-table-data').each(function( index ) {
                    title = $(this).find('.title .link '+span).text();
                    xmlAnime = xml.find('series_title:contains('+title+')').first().parent();
                    if(xmlAnime.find('my_tags').text().indexOf("last::") > -1 ){
                        url = atobURL( xmlAnime.find('my_tags').text().split("last::")[1].split("::")[0] );
                        setStreamLinks(url, $(this));
                        if(parseInt(xmlAnime.find('my_status').text()) === 1){
                            checkForNewEpisodes(url, $(this), xmlAnime.find('series_title').text(), xmlAnime.find('series_image').text());
                        }
                    }
                });
                startCheckForNewEpisodes();
            }
        });
    }

    function setStreamLinks(url, tableData){
        if(url.indexOf("masterani.me") > -1 && url.indexOf("/watch/") > -1){
            url = url.replace('/watch/','/info/');
        }
        var icon = '<img src="https://www.google.com/s2/favicons?domain='+url.split('/')[2]+'">'
        $(tableData).find('.data.title .link').after('<a class="stream" title="'+url.split('/')[2]+'" target="_blank" style="margin: 0 5px;" href="'+url+'">'+icon+'</a>');


        if(parseInt($(tableData).find('.data.progress .link').text().trim().replace(/\/.*/,''))+1 == GM_getValue( url+'/next') || GM_getValue( url+'/next') == 'manga'){
            if(typeof GM_getValue( url+'/nextEp') != 'undefined' && !( GM_getValue( url+'/nextEp').match(/undefined$/) )){
                $(tableData).find('.stream').after('<a class="nextStream" title="Next Episode" target="_blank" style="margin: 0 5px 0 0; color: #BABABA;" href="'+ GM_getValue( url+'/nextEp')+'">'+'<img src="https://raw.githubusercontent.com/lolamtisch/KissAnimeList/master/Screenshots/if_Double_Arrow_Right_1063903.png" width="16" height="16">'+'</a>');
            }
        }
    }

    function detailsPopup(){
        $(window).load(function(){
            $('a[href*="editlist.php"]').click(function(){
                $('.editlist').remove();
                $('body').after('<div class="editlist" style="position: fixed; width: 80%; height: 60%; top: 20%; left: 10%;"><div onclick="this.parentElement.remove();" style="position: absolute; right: -15px; top: -15px; border-radius: 50%;-moz-border-radius: 50%;-webkit-border-radius: 50%;background-color: black;color: white;height: 30px;width: 30px;" class="closeEditList">X</div><iframe style="border: none; height: 100%; width: 100%;" src="'+$(this).attr('href')+'&hideLayout" /></div>')
                return false;
            });
        });
    }

    function tagToContinueEpPrediction(){
        var modernList = 0;
        $('.list-table .list-item').each(function(){
            modernList = 1;
            var el = $(this);
            var malid = el.find('.link').first().attr('href').split('/')[2];
            epPrediction( malid , function(timestamp, airing, diffWeeks, diffDays, diffHours, diffMinutes){
                el.find('.data.progress span').first().after( epPredictionMessage(timestamp, airing, diffWeeks, diffDays, diffHours, diffMinutes) );
            });
        });

        if(modernList) return;

        //Classic
        $('.progress.data').each(function(){
            var el = $(this).closest('.list-table-data');
            var malid = el.find('.link').first().attr('href').split('/')[2];
            epPrediction( malid , function(timestamp, airing, diffWeeks, diffDays, diffHours, diffMinutes){
                el.find('.data.progress').first().prepend( epPredictionMessage(timestamp, airing, diffWeeks, diffDays, diffHours, diffMinutes) );
            });
        });

        function epPredictionMessage(timestamp, airing, diffWeeks, diffDays, diffHours, diffMinutes){
            if(airing){
                diffWeeks = diffWeeks - (new Date().getFullYear() - new Date(timestamp).getFullYear()); //Remove 1 week between years
                if(diffWeeks < 50){
                    var titleMsg = 'Next episode estimated in '+diffDays+'d '+diffHours+'h '+diffMinutes+'m';
                    return '<a class="kal-ep-pre" ep="'+(diffWeeks+1)+'" title="'+titleMsg+'">['+(diffWeeks+1)+']</a> ';
                }
            }
        }
    }
    if(K.dbSelector == 'Kissanime'){
        $( document).ready( function(){
            if( window.location.href.indexOf("BookmarkList") > -1 ){
                var catOptions = '';
                catOptions +='<option value="">Select</option>';
                $.each(lstCats, function( index, value ) {
                  catOptions +='<option value="'+value+'">'+value+'</option>';
                });
                catOptions = '<select class="selectCats" style="width: 200px; font-size: 14px;">'+catOptions+'</select>';
                con.log(catOptions);
                GM_setValue(K.dbSelector+'catOptions',catOptions);
                $('.trAnime').each(function(){
                    var aurl = $.absoluteLink($(this).find('.aAnime').attr('href'));
                    con.log(K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.urlAnimeIdent(aurl)))+'/bdid',$(this).find('.aCategory').attr('bdid'));
                    GM_setValue(K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.urlAnimeIdent(aurl)))+'/bdid',$(this).find('.aCategory').attr('bdid'));
                });
            }else{
                var bdid = GM_getValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.urlAnimeIdent(K.normalUrl())))+'/bdid', null);
                if(bdid != null){
                    $('#spanBookmarkManager').before('<a class="aCategory" href="#" onclick="return false;" title="Move to other folder"><img border="0" style="vertical-align:middle" src="/Content/Images/folder.png"> Folder</a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
                    $('.aCategory').click(function () {
                        $(this).hide();
                        var aCat= $(this);
                        $(this).after(GM_getValue(K.dbSelector+'catOptions',""));
                        $('body').on('change', '.selectCats', function() {
                            var element  = $(this);
                            var strUncate = ' Uncategorized';
                            var categoryName = $(this).val();
                            if (categoryName == ''){return;}
                            if (categoryName == strUncate)
                                categoryName = "";
                            $.ajax({
                                type: "POST",
                                url: "/ChangeBookmarkCategory",
                                data: "bdid=" + bdid + "&category=" + categoryName,
                                success: function (message) {
                                    if (message != "!error!") {
                                        element.remove();
                                        aCat.show();
                                        flashm( "Successfull" , false);
                                    }
                                    else {
                                        flashm( "Failed");
                                    }
                                }
                            });
                        });
                    });
                }
            }
        });
    }
    function createIframe(){
        if( !($('#info-popup').length) ){
            //var position = 'width: 80%; height: 70%; position: absolute; top: 15%; left: 10%';
            var position = 'max-width: 100%; max-height: 100%; min-width: 500px; min-height: 300px; width: '+miniMalWidth+'; height: '+miniMalHeight+'; position: absolute; bottom: 0%; '+ posLeft +': 0%';//phone
            if($(window).width() < 500){
              position = 'width: 100vw; height: 100%; position: absolute; top: 0%; '+ posLeft +': 0%';
            }
            var material = '<dialog class="modal-kal" id="info-popup" style="pointer-events: none;display: none; position: fixed;z-index: 9999;left: 0;top: 0;bottom: 0;width: 100%; height: 100%; background-color: transparent; padding: 0; margin: 0; border: 0;">';
            material += '<div id="modal-content" class="modal-content-kal" Style="pointer-events: all; background-color: #f9f9f9; margin: 0; '+position+'">';
            //material += '<iframe id="info-iframe" style="height:100%;width:100%;border:0;"></iframe>';
            material += '<div class="kal-tempHeader" style="position:  absolute; width: 100%; height:  103px; background-color: rgb(63,81,181); "></div>';
            material += '</div>';
            material += '</dialog>';
            $('body').after(material);

            GM_addStyle('.modal-content-kal.fullscreen{width: 100% !important;height: 100% !important; bottom: 0 !important;'+ posLeft +': 0 !important;}\
                         .modal-content-kal{-webkit-transition: all 0.5s ease; -moz-transition: all 0.5s ease; -o-transition: all 0.5s ease; transition: all 0.5s ease;}\
                         .floatbutton:hover {background-color:rgb(63,81,181);}\
                         .floatbutton:hover div {background-color:white;}\
                         .floatbutton div {background-color:black;-webkit-transition: all 0.5s ease;-moz-transition: all 0.5s ease;-o-transition: all 0.5s ease;transition: all 0.5s ease;}\
                         .floatbutton {\
                            z-index: 9999;display: none; position:fixed; bottom:40px; right:40px; border-radius: 50%; font-size: 24px; height: 56px; margin: auto; min-width: 56px; width: 56px; padding: 0; overflow: hidden; background: rgba(158,158,158,.2); box-shadow: 0 1px 1.5px 0 rgba(0,0,0,.12), 0 1px 1px 0 rgba(0,0,0,.24); line-height: normal; border: none;\
                            font-weight: 500; text-transform: uppercase; letter-spacing: 0; will-change: box-shadow; transition: box-shadow .2s cubic-bezier(.4,0,1,1),background-color .2s cubic-bezier(.4,0,.2,1),color .2s cubic-bezier(.4,0,.2,1); outline: none; cursor: pointer; text-decoration: none; text-align: center; vertical-align: middle; padding: 16px;\
                         }\
                         .mdl-button{\
                            background: #3f51b5; color: #fff;box-shadow: 0 2px 2px 0 rgba(0,0,0,.14), 0 3px 1px -2px rgba(0,0,0,.2), 0 1px 5px 0 rgba(0,0,0,.12);\
                            border: none; border-radius: 2px;\
                         }');

            var iframe = document.createElement('iframe');
            iframe.setAttribute("id", "info-iframe");
            iframe.setAttribute("style", "height:100%;width:100%;border:0;");
            iframe.onload = function() {
                executejs(GM_getResourceText("materialjs"));
                executejs(GM_getResourceText("simpleBarjs"));
                var head = $("#info-iframe").contents().find("head");
                head.append('<style>#material .mdl-card__supporting-text{width: initial} .mdl-layout__header .mdl-textfield__label:after{background-color: red !important;}</style>');
                head.append('<style>\
                              .alternative-list .mdl-list{\
                                max-width: 100%;\
                                margin: 0;\
                                padding: 0;\
                              }\
                              .alternative-list .mdl-list__item{\
                                height: auto;\
                              }\
                              .alternative-list .mdl-list__item-primary-content{\
                                height: auto !important;\
                              }\
                              .alternative-list .mdl-list__item-primary-content a{\
                                display: block;\
                              }\
                              .alternative-list .mdl-list__item-text-body{\
                                height: auto !important;\
                              }\
                              \
                              .coverinfo .mdl-chip{\
                                height: auto;\
                              }\
                              .coverinfo .mdl-chip .mdl-chip__text{\
                                white-space: normal;\
                                line-height: 24px;\
                              }\
                              \
                              \
                              .mdl-layout__content::-webkit-scrollbar{\
                                width: 10px !important;\
                                background-color: #F5F5F5;\
                              }\
                              .mdl-layout__content::-webkit-scrollbar-thumb{\
                                background-color: #c1c1c1 !important;\
                              }\
                              .simplebar-track{\
                                width: 10px !important;\
                                background-color: #F5F5F5;\
                              }\
                              .simplebar-scrollbar{\
                                background-color: #c1c1c1 !important;\
                              }\
                              .simplebar-track.horizontal{\
                                display: none;\
                              }\
                              \
                              .simplebar-scrollbar{\
                                border-radius: 0px !important;\
                                right: 0 !important;\
                                width: 100% !important;\
                                opacity: 1 !important;\
                              }\
                              .simplebar-scrollbar.visible:before{\
                                display: none;\
                              }\
                              .simplebar-content{\
                                margin-right: -7px !important;\
                              }\
                              .simplebar-track{\
                                margin-top: -2px;\
                                margin-bottom: -2px;\
                              }\
                              a{\
                                text-decoration: none;\
                              }\
                              .mdl-layout__tab-panel a:hover{\
                                text-decoration: underline;\
                              }\
                              .mdl-cell{\
                                background-color: #fefefe;\
                              }\
                              \
                              #material.simple-header .mdl-layout__header .mdl-layout__tab-bar-container{\
                                display: none;\
                              }\
                              \
                              .newEp {\
                                  position: absolute;\
                                  background-color: #dedede;\
                                  height: 25px;\
                                  width: 29px;\
                                  top: 3px;\
                                  right: -4px;\
                                  background-repeat: no-repeat;\
                                  background-position: 4px 3px;\
                                  background-image: url(https://github.com/google/material-design-icons/blob/master/social/1x_web/ic_notifications_none_black_18dp.png?raw=true);\
                              }\
                            </style>');
                head.append('<style>'+GM_getResourceText("materialCSS")+'</style>');
                head.append('<style>'+GM_getResourceText("materialFont")+'</style>');
                head.append('<style>'+GM_getResourceText("simpleBarCSS")+'</style>');
                //templateIframe(url, data);
                if(displayFloatButton == 1){
                    var floatbutton = '<button class="open-info-popup floatbutton" style="">';
                    floatbutton += '<i class="my-float" style="margin-top:22px;"><div style="width: 100%; height: 4px; margin-bottom: 15%;"></div><div style="width: 100%; height: 4px; margin-bottom: 15%;"></div><div style="width: 100%; height: 4px"></div></i></button>';
                    $('#info-popup').after(floatbutton);
                    if(miniMalButtonLate != ''){
                      miniMalButton(miniMalButtonLate);
                    }
                    /*$('.open-info-popup').click(function() {
                        if($('#info-popup').css('display') == 'none'){
                            $('.floatbutton').fadeOut();
                        }
                    });*/
                }
            };
            document.getElementById("modal-content").appendChild(iframe);
        }
    }

    function templateIframe(url, data){
        var material = '\
        <div id="material" style="height: 100%;"><div class="mdl-layout mdl-js-layout mdl-layout--fixed-header\
                    mdl-layout--fixed-tabs">\
          <header class="mdl-layout__header" style="min-height: 0;">\
            <button class="mdl-layout__drawer-button" id="backbutton" style="display: none;"><i class="material-icons">arrow_back</i></button>\
            <div class="mdl-layout__header-row">\
                <!--<span class="mdl-layout-title malTitle malClear"></span>--!>\
                <button class="mdl-button mdl-js-button mdl-button--icon mdl-layout__drawer-button" id="book" style="">\
                  <i class="material-icons" class="material-icons md-48">book</i>\
                </button>\
                <div class="mdl-textfield mdl-js-textfield mdl-textfield--expandable" id="SearchButton" style="margin-left: -57px; margin-top: 3px; padding-left: 40px;">\
                  <label class="mdl-button mdl-js-button mdl-button--icon" for="headMalSearch">\
                    <i class="material-icons">search</i>\
                  </label>\
                  <div class="mdl-textfield__expandable-holder">\
                    <input class="mdl-textfield__input" type="text" id="headMalSearch">\
                    <label class="mdl-textfield__label" for="headMalSearch"></label>\
                  </div>\
                </div>\
                <button class="mdl-button mdl-js-button mdl-button--icon mdl-layout__drawer-button" id="material-fullscreen" style="left: initial; right: 40px;">\
                  <i class="material-icons" class="material-icons md-48">fullscreen</i>\
                </button>\
                <button class="mdl-button mdl-js-button mdl-button--icon mdl-layout__drawer-button" id="close-info-popup" style="left: initial; right: 0;">\
                    <i class="material-icons close">close</i>\
                </button>\
            </div>\
            <!-- Tabs -->\
            <div class="mdl-layout__tab-bar mdl-js-ripple-effect">';
            material += '\
            <a href="#fixed-tab-1" class="mdl-layout__tab is-active">Overview</a>\
            <a href="#fixed-tab-2" class="mdl-layout__tab reviewsTab">Reviews</a>\
            <a href="#fixed-tab-3" class="mdl-layout__tab recommendationTab">Recommendations</a>\
            <!--<a href="#fixed-tab-4" class="mdl-layout__tab">Episodes</a>-->\
            <a href="#fixed-tab-5" class="mdl-layout__tab settingsTab">Settings</a>';
            material += '\
            </div>\
          </header>\
          <main class="mdl-layout__content" data-simplebar>';
            material += '\
            <section class="mdl-layout__tab-panel is-active" id="fixed-tab-1">\
              <div id="loadOverview" class="mdl-progress mdl-js-progress mdl-progress__indeterminate" style="width: 100%; position: absolute;"></div>\
              <div class="page-content">\
              <div class="mdl-grid">\
                <div class="mdl-cell mdl-cell--1-col mdl-cell--8-col-tablet mdl-cell--6-col-phone mdl-shadow--4dp stats-block malClear" style="min-width: 120px;">\
                    \
                </div>\
                <div class="mdl-grid mdl-cell mdl-shadow--4dp coverinfo malClear" style="display:block; flex-grow: 100; min-width: 70%;">\
                  <div class="mdl-card__media mdl-cell mdl-cell--2-col" style="background-color: transparent; float:left; padding-right: 16px;">\
                      <img class="malImage malClear" style="width: 100%; height: auto;"></img>\
                  </div>\
                  <div class="mdl-cell mdl-cell--12-col">\
                      <a class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect malClear malLink" href="" style="float: right;" target="_blank"><i class="material-icons">open_in_new</i></a>\
                      <h1 class="malTitle mdl-card__title-text malClear" style="padding-left: 0px; overflow:visible;"></h1>\
                      <div class="malAltTitle mdl-card__supporting-text malClear" style="padding: 10px 0 0 0px; overflow:visible;"></div>\
                  </div>\
                  <div class="malDescription malClear mdl-cell mdl-cell--10-col" style="overflow: hidden;"></div>\
                </div>\
                <div class="mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-shadow--4dp data-block mdl-grid mdl-grid--no-spacing malClear">\
                    \
                </div>\
                <div class="mdl-grid mdl-grid--no-spacing mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-shadow--4dp related-block alternative-list mdl-grid malClear">\
                    \
                </div>\
                <div style="display: none;" class="mdl-grid mdl-grid--no-spacing mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-shadow--4dp mdl-grid alternative-list stream-block malClear">\
                    <ul class="mdl-list stream-block-inner">\
                    \
                    </ul>\
                </div>\
                <div class="mdl-grid mdl-grid--no-spacing mdl-cell mdl-cell--12-col mdl-shadow--4dp characters-block mdl-grid malClear" style="display: none;"></div>\
                <div class="mdl-grid mdl-grid--no-spacing mdl-cell mdl-cell--12-col mdl-shadow--4dp info-block mdl-grid malClear">\
                    \
                </div>\
              </div>\
              </div>\
            </section>\
            <section class="mdl-layout__tab-panel" id="fixed-tab-2">\
              <div id="loadReviews" class="mdl-progress mdl-js-progress mdl-progress__indeterminate" style="width: 100%; position: absolute;"></div>\
              <div class="page-content malClear" id="malReviews"></div>\
            </section>\
            <section class="mdl-layout__tab-panel" id="fixed-tab-3">\
              <div id="loadRecommendations" class="mdl-progress mdl-js-progress mdl-progress__indeterminate" style="width: 100%; position: absolute;"></div>\
              <div class="page-content malClear" id="malRecommendations"></div>\
            </section>\
            <section class="mdl-layout__tab-panel" id="fixed-tab-4">\
              <div id="loadEpisode" class="mdl-progress mdl-js-progress mdl-progress__indeterminate" style="width: 100%; position: absolute;"></div>\
              <div class="page-content malClear" id="malEpisodes"></div>\
            </section>';
            material +='\
            <section class="mdl-layout__tab-panel" id="fixed-tab-5">\
              <div class="page-content malClear" id="malConfig"></div>\
            </section>';
          material +='</main>\
        </div>\
        <div id="malSearchPop" style="display: none; z-index: 10; position: fixed;">\
          <div data-simplebar style="height: calc(100% - 60px); z-index: 10; width: 100%; position: fixed !important; top: 60px; background-color: #f9f9f9; width: 100%;position: fixed; top: 60px; background-color: #f9f9f9;">\
          <div id="malSearchPopInner"></div>\
          </div>\
        </div>';
        //material += '</div>';
        $("#info-iframe").contents().find("body").append(material);
        var modal = document.getElementById('info-popup');

        $("#info-iframe").contents().find("#close-info-popup").click( function(){
            modal.style.display = "none";
            $('.floatbutton').fadeIn();
            outOfTheWay();
            //$('body').css('overflow','initial');
        });

        $("#info-iframe").contents().find("#backbutton").click( function(){
            //alert();getcommondata();
            $("#info-iframe").contents().find('.mdl-layout__tab:eq(0) span').trigger( "click" );
            $(this).hide();
            $("#info-iframe").contents().find('#SearchButton').css('margin-left', '-57px');
            $("#info-iframe").contents().find('#book').css('left', '0px');
            if(currentMalData == null){
                fillIframe(url, data);
            }
            fillIframe(url, currentMalData);
        });

        $("#info-iframe").contents().find("#material-fullscreen").click( function(){
            if($('.modal-content-kal.fullscreen').length){
                $(".modal-content-kal").removeClass('fullscreen');
                $(this).find('i').text('fullscreen');
            }else{
                $(".modal-content-kal").addClass('fullscreen');
                $(this).find('i').text('fullscreen_exit');
            }
        });

        var timer;
        $("#info-iframe").contents().find("#headMalSearch").on("input", function(){
          clearTimeout(timer);
          timer = setTimeout(function(){
            if($("#info-iframe").contents().find("#headMalSearch").val() == ''){
              $("#info-iframe").contents().find('#malSearchPop').hide();
            }else{
              $("#info-iframe").contents().find('#malSearchPop').show();
              searchMal($("#info-iframe").contents().find("#headMalSearch").val(), K.listType, '#malSearchPopInner', function(){
                $("#info-iframe").contents().find("#malSearchPop .searchItem").unbind('click').click(function(event) {
                  $("#info-iframe").contents().find("#headMalSearch").val('').trigger("input").parent().parent().removeClass('is-dirty');
                  $("#info-iframe").contents().find('.malClear').hide();
                  $("#info-iframe").contents().find('.mdl-progress__indeterminate').show();
                  $("#info-iframe").contents().find("#backbutton").show();
                  $("#info-iframe").contents().find('#SearchButton').css('margin-left', '-17px');
                  $("#info-iframe").contents().find('#book').css('left', '40px');
                  $("#info-iframe").contents().find('.mdl-layout__tab:eq(0) span').trigger( "click" );
                  fillIframe($(this).attr('malhref'));
                });
              });
            }
          }, 300);
        });

        $("#info-iframe").contents().find("#book").click(function() {
          if($("#info-iframe").contents().find("#book.open").length){
            $("#info-iframe").contents().find("#book").toggleClass('open');
            $("#info-iframe").contents().find('#malSearchPop').hide();
          }else{
            $("#info-iframe").contents().find("#book").toggleClass('open');
            $("#info-iframe").contents().find('#malSearchPop').show();
            iframeBookmarks( $("#info-iframe").contents().find('#malSearchPopInner') );
          }
        });
        $('.kal-tempHeader').remove();
    }

    function fillIframe(url, data = null){
        // Iframe is missing
        if(!$("#info-iframe").length){
            $('#info-popup').remove();
            alert('The miniMAL iframe could not be loaded.\nThis could be caused by an AdBlocker, such as 9anime Companion\'s AdBlock-option.');
        }
        outOfTheWay();
        $("#info-iframe").contents().find('.malClear').hide();
        $("#info-iframe").contents().find('.mdl-progress__indeterminate').show();

        if( !/\/(manga|anime)\//i.test(url) && url != null){
          //alert(url);
          url = '';
        }

        if(data == null && url != null && url != ''){
            getAjaxData(url, function(newdata){
                fillIframe(url, newdata);
            });
            return;
        }
        if( !($("#info-iframe").contents().find('#material').length) ){
            templateIframe(url,data);
        }

        if(url == null | url == '' | data == '404'){
          $("#info-iframe").contents().find('#material').addClass('simple-header');
          $("#info-iframe").contents().find('.mdl-layout__tab-panel.is-active').removeClass('is-active');
          $("#info-iframe").contents().find('.mdl-layout__tab-panel').last().addClass('is-active');
        }else{
          $("#info-iframe").contents().find('#material').removeClass('simple-header');
        }

        iframeConfig(url, data);
        iframeOverview(url, data);
        $("#info-iframe").contents().find('.reviewsTab').off('click').one('click',function(){
            iframeReview(url, data);
            fixIframeLink();
        });
        //iframeEpisode(url, data);
        $("#info-iframe").contents().find('.recommendationTab').off('click').one('click',function(){
            iframeRecommendations(url, data);
        });
        $("#info-iframe").contents().find('.mdl-layout__tab.is-active').trigger( "click" );
        executejs('componentHandler.upgradeDom();');
        fixIframeLink();
    }

    function iframeConfig(url, data){
        try{
            var settingsUI = '<ul class="demo-list-control mdl-list" style="margin: 0px; padding: 0px;">\
            <div class="mdl-grid">';
            try{
              var malUrl = GM_getValue(K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.normalUrl()))+'/Mal' , null);
            }catch(e){
              var malUrl = null;
            }
            if(malUrl == url){
                settingsUI += '<div class="mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet mdl-shadow--4dp">\
                                <div class="mdl-card__title mdl-card--border">\
                                    <h2 class="mdl-card__title-text">';
                                    if(data != null && data != '404'){
                                      settingsUI += data.split('itemprop="name">')[1].split('<')[0];
                                    }else{
                                      settingsUI += 'Not Found';
                                    }
                                    settingsUI +=
                                    '</h2>\
                                </div>\
                                  <div class="mdl-list__item">\
                                  <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 100%;">\
                                      <input class="mdl-textfield__input" style="padding-right: 18px;" type="number" step="1" id="malOffset" value="'+GM_getValue(K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.normalUrl()))+'/Offset' , '')+'">\
                                  <label class="mdl-textfield__label" for="malOffset">Episode Offset</label>\
                                    '+getTooltip('Input the episode offset, if an anime has 12 episodes, but uses the numbers 0-11 rather than 1-12, you simply type " +1 " in the episode offset.','float: right; margin-top: -17px;','left')+'\
                                  </div>\
                                </div>\
                                <div class="mdl-list__item" style="padding-bottom: 0;padding-top: 0;">\
                                <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 100%;">\
                                    <input class="mdl-textfield__input" style="padding-right: 18px;" type="text" id="malUrlInput" value="'+malUrl+'">\
                                <label class="mdl-textfield__label" for="malUrlInput">MyAnimeList Url</label>\
                                  '+getTooltip('Only change this URL if it points to the wrong anime page on MAL.','float: right; margin-top: -17px;','left')+'\
                                </div>\
                              </div>\
                              \
                              <div class="mdl-list__item" style="padding-bottom: 0;padding-top: 0;">\
                              <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 100%;">\
                                <label class="mdl-textfield__label" for="malSearch">\
                                  Search\
                                </label>\
                                  <input class="mdl-textfield__input" style="padding-right: 18px;" type="text" id="malSearch">\
                                  '+getTooltip('This field is for finding an anime, when you need to replace the "MyAnimeList Url" shown above.<br>To make a search, simply begin typing the name of an anime, and a list with results will automatically appear as you type.','float: right; margin-top: -17px;','left')+'\
                              </div>\
                              </div>\
                              <div class="mdl-list__item" style="min-height: 0; padding-bottom: 0; padding-top: 0;">\
                                <div class="malResults" id="malSearchResults"></div>\
                              </div>\
                              \
                              <div class="mdl-list__item">\
                                <button class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored" id="malSubmit">Update</button>\
                                <button class="mdl-button mdl-js-button mdl-button--raised mdl-button--accent" id="malReset" style="margin-left: 5px;">Reset</button>\
                                </div>\
                              </div>';

            }
                settingsUI += '<div class="mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet mdl-shadow--4dp">\
                            <div class="mdl-card__title mdl-card--border">\
                                <h2 class="mdl-card__title-text">General</h2>\
                                </div>';
                settingsUI += materialCheckbox(autoTracking,'autoTracking','Autotracking'+getTooltip('Autotracking is the function where this script automatically updates the anime´s you watch with your MAL account.','','bottom'));
                settingsUI += '<li class="mdl-list__item">\
                                  <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 100%;">\
                                      <input class="mdl-textfield__input" type="number" step="1" id="malDelay" value="'+delay+'">\
                                  <label class="mdl-textfield__label" for="malDelay">Autotracking delay (Seconds)</label>\
                                  </div>\
                              </li>';
                settingsUI += '</div>';

                settingsUI += '<div class="mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet mdl-shadow--4dp">\
                            <div class="mdl-card__title mdl-card--border">\
                                <h2 class="mdl-card__title-text">MAL Bookmark Page</h2>\
                                </div>';
                settingsUI += materialCheckbox(tagLinks,'tagLinks','Continue watching links'+getTooltip('If enabled: On your MAL Anime List and the bookmark list in miniMAL, an icon-link will be added to the last used streaming site you were using to watch an anime.<br>Simply click the icon to continue watching the anime.'));
                settingsUI += materialCheckbox(epPredictions,'epPredictions','Predict episode number');
                settingsUI += '<li class="mdl-list__item">\
                                  <span class="mdl-list__item-primary-content">\
                                      Check for new episodes\
                                  </span>\
                                  <span class="mdl-list__item-secondary-action">\
                                    <select name="myinfo_score" id="newEpInterval" class="inputtext mdl-textfield__input" style="outline: none;">\
                                      <option value="null">Off</option>\
                                      <option value="3600000">1 Hour</option>\
                                      <option value="43200000">12 Hour</option>\
                                      <option value="0">Always</option>\
                                    </select>\
                                  </span>\
                              </li>';
                settingsUI += '<li class="mdl-list__item">\
                                  <span class="mdl-list__item-primary-content">\
                                    Border Color <a href="https://www.webpagefx.com/web-design/color-picker/" target="_blank"><div id="newEpBorder_color" style="width: 20px; border: 1px solid grey; height: 20px; margin-left: 5px; background-color: #'+newEpBorder+'"/></a>\
                                  </span>\
                                  <div class="mdl-list__item-secondary-action">\
                                      <select name="newEpBorder_dropdown" id="newEpBorder_dropdown" class="inputtext mdl-textfield__input" style="outline: none;">\
                                        <option value="c">Custom</option>\
                                        <option value="ff0000">Red</option>\
                                        <option value="2e51a2">MAL Blue</option>\
                                        <option value=" ">Off</option>\
                                      </select>\
                                      <input class="mdl-textfield__input" type="text" id="newEpBorder" size="6" maxlength="6" value="'+newEpBorder+'">\
                                  </div>\
                              </li>';
                settingsUI += materialCheckbox(newEpNotification,'newEpNotification','Notifications');
                settingsUI += materialCheckbox(openInBg,'openInBg','Load cookies in background');
                settingsUI += materialCheckbox(newEpCR,'newEpCR','CR-Unblocker Extension');
                settingsUI += '</div>';

                settingsUI += '<div class="mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet mdl-shadow--4dp">\
                            <div class="mdl-card__title mdl-card--border">\
                                <h2 class="mdl-card__title-text">Streaming Site Links</h2>';

                settingsUI += getTooltip('If disabled, the streaming site will no longer appear in an animes sidebar on MAL.');

                settingsUI += '</div>';


                settingsUI += materialCheckbox(kissanimeLinks,'kissanimeLinks','KissAnime');
                settingsUI += materialCheckbox(masteraniLinks,'masteraniLinks','MasterAnime');
                settingsUI += materialCheckbox(nineanimeLinks,'nineanimeLinks','9anime');
                settingsUI += materialCheckbox(crunchyrollLinks,'crunchyrollLinks','Crunchyroll');
                settingsUI += materialCheckbox(gogoanimeLinks,'gogoanimeLinks','Gogoanime');
                settingsUI += materialCheckbox(kissmangaLinks,'kissmangaLinks','KissManga');
                settingsUI += '</div>';

                settingsUI += '<div class="mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet mdl-shadow--4dp">\
                            <div class="mdl-card__title mdl-card--border">\
                                <h2 class="mdl-card__title-text">MyAnimeList</h2>\
                                    </div>';
                settingsUI += '<li class="mdl-list__item">\
                                  <span class="mdl-list__item-primary-content">\
                                      Thumbnails\
                                  '+getTooltip('The option is for resizing the thumbnails on MAL.<br>Like thumbnails for characters, people, recommendations, etc.')+'\
                                  </span>\
                                  <span class="mdl-list__item-secondary-action">\
                                    <select name="myinfo_score" id="malThumbnail" class="inputtext mdl-textfield__input" style="outline: none;">\
                                      <option value="144">Large</option>\
                                      <option value="100">Medium</option>\
                                      <option value="60">Small</option>\
                                      <option value="0">MAL Default</option>\
                                    </select>\
                                  </span>\
                              </li>';
                settingsUI += '</div>';

                settingsUI += '<div class="mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet mdl-shadow--4dp">\
                                <div class="mdl-card__title mdl-card--border">\
                                  <h2 class="mdl-card__title-text">miniMAL</h2>\
                                  <span style="margin-left: auto; color: #7f7f7f;">Shortcut: Ctrl + m</span>\
                                </div>';
                settingsUI += '<li class="mdl-list__item">\
                                  <span class="mdl-list__item-primary-content">\
                                      Display to the\
                                  </span>\
                                  <span class="mdl-list__item-secondary-action">\
                                    <select name="myinfo_score" id="posLeft" class="inputtext mdl-textfield__input" style="outline: none;">\
                                      <option value="left">Left</option>\
                                      <option value="right">Right</option>\
                                    </select>\
                                  </span>\
                              </li>';
                settingsUI += materialCheckbox(miniMALonMal,'miniMALonMal','Display on MyAnimeList');
                settingsUI += materialCheckbox(displayFloatButton,'displayFloatButton','Floating menu button');

                settingsUI += materialCheckbox(outWay,'outWay','Move video out of the way');
                settingsUI += '<li class="mdl-list__item" style="display: inline-block; width: 50%;">\
                                  <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 100%;">\
                                      <input class="mdl-textfield__input" type="text" step="1" id="miniMalHeight" value="'+miniMalHeight+'">\
                                  <label class="mdl-textfield__label" for="miniMalHeight">Height (px / %)\
                                  </label>\
                                  </div>\
                              </li>';
                settingsUI += '<li class="mdl-list__item" style="display: inline-block; width: 50%;">\
                                  <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 100%;">\
                                      <input class="mdl-textfield__input" type="text" step="1" id="miniMalWidth" value="'+miniMalWidth+'">\
                                  <label class="mdl-textfield__label" for="miniMalWidth">Width (px / %)</label>\
                                  </div>\
                              </li>';
                settingsUI += '</div>';

                settingsUI += '<div class="mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet mdl-shadow--4dp hoverinfoDeact">';
                settingsUI += materialCheckbox(episodeInfoBox,'episodeInfoBox','Episode Hoverinfo'+getTooltip('<img style="width: 200%; margin-bottom: -16px; margin-top: -16px; margin-left: -200px; margin-right: -200px;" src="https://raw.githubusercontent.com/lolamtisch/KissAnimeList/master/Screenshots/2fhq9cL.gif" alt="Episode Hoverinfo">'), true);
                settingsUI += '<div class="mdl-card__title mdl-card--border" style="padding: 0;"></div>';
                settingsUI += materialCheckbox(episodeInfoSynopsis,'episodeInfoSynopsis','Synopsis'+getTooltip('If enabled, the episode-synopsis from MAL will be displayed in the Episode Hoverinfo.'));
                settingsUI += materialCheckbox(episodeInfoImage,'episodeInfoImage','Image'+getTooltip('If enabled, the episode-image from MAL will be displayed in the Episode Hoverinfo.'));
                settingsUI += materialCheckbox(episodeInfoSubtitle,'episodeInfoSubtitle','Alternative Title'+getTooltip('If enabled, the alternative title for the episode, will be displayed in the Episode Hoverinfo. Example using the anime "Fate/Apocrypha":<br>Title: "Apocrypha: The Great Holy Grail War"<br>Subtitle: "Gaiten: Seihai Taisen (外典:聖杯大戦)"'));
                settingsUI += '</div>';

                settingsUI += '<div class="mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet mdl-shadow--4dp">\
                            <div class="mdl-card__title mdl-card--border">\
                                <h2 class="mdl-card__title-text">ETC</h2>\
                                </div>';
                settingsUI += materialCheckbox(debugging,'debugging','Debugging');
                settingsUI += '<li class="mdl-list__item"><button type="button" id="clearCache" class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored">Clear Cache</button></li>';
                settingsUI += '</div>';

            $("#info-iframe").contents().find('#malConfig').html(settingsUI);

            $("#info-iframe").contents().find("#malReset").click( function(){
                GM_deleteValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.normalUrl()))+'/Mal' );
                flashm( "MyAnimeList url reset" , false);
                checkdata();
            });

            $("#info-iframe").contents().find("#malSubmit").click( function(){
                var murl = $("#info-iframe").contents().find("#malUrlInput").val();
                local_setValue(K.normalUrl(), murl, true);
                flashm( "new url '"+murl+"' set." , false);
                checkdata();
            });

            $("#info-iframe").contents().find("#malDelay").on("input", function(){
                var tempDelay = $("#info-iframe").contents().find("#malDelay").val();
                if(tempDelay !== null){
                    if(tempDelay !== ''){
                        delay = tempDelay;
                        GM_setValue( 'delay', tempDelay );
                        flashm( "New delay ("+delay+") set." , false);
                    }else{
                        delay = 3;
                        GM_deleteValue( 'delay' );
                        flashm( "Delay reset" , false);
                    }
                }
            });

            $("#info-iframe").contents().find("#miniMalWidth").on("input", function(){
                var miniMalWidth = $("#info-iframe").contents().find("#miniMalWidth").val();
                if(miniMalWidth !== null){
                    if(miniMalWidth !== ''){
                        GM_setValue( 'miniMalWidth', miniMalWidth );
                        flashm( "New Width ("+miniMalWidth+") set." , false);
                    }else{
                        miniMalWidth = '30%';
                        GM_deleteValue( 'miniMalWidth' );
                        flashm( "Width reset" , false);
                    }
                }
                $("#modal-content").css('width', miniMalWidth);
            });

            $("#info-iframe").contents().find("#miniMalHeight").on("input", function(){
                var miniMalHeight = $("#info-iframe").contents().find("#miniMalHeight").val();
                if(miniMalHeight !== null){
                    if(miniMalHeight !== ''){
                        GM_setValue( 'miniMalHeight', miniMalHeight );
                        flashm( "New Height ("+miniMalHeight+") set." , false);
                    }else{
                        miniMalHeight = '90%';
                        GM_deleteValue( 'miniMalHeight' );
                        flashm( "Height reset" , false);
                    }
                }
                $("#modal-content").css('height', miniMalHeight);
            });

            $("#info-iframe").contents().find("#malOffset").on("input", function(){
                var Offset = $("#info-iframe").contents().find("#malOffset").val();
                if(Offset !== null){
                    if(Offset !== ''){
                        GM_setValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.normalUrl()))+'/Offset', Offset );
                        flashm( "New Offset ("+Offset+") set." , false);
                    }else{
                        GM_deleteValue( K.dbSelector+'/'+$.titleToDbKey(K.urlAnimeSelector(K.normalUrl()))+'/Offset' );
                        flashm( "Offset reset" , false);
                    }
                }
            });

            var timer;
            $("#info-iframe").contents().find("#malSearch").on("input", function(){
              clearTimeout(timer);
              timer = setTimeout(function(){
                searchMal( $("#info-iframe").contents().find("#malSearch").val(), K.listType, '.malResults', function(){
                  $("#info-iframe").contents().find("#malSearchResults .searchItem").unbind('click').click(function(event) {
                    $("#info-iframe").contents().find('#malUrlInput').val($(this).attr('malhref'));
                    $("#info-iframe").contents().find('#malSearch').val('');
                    $("#info-iframe").contents().find('#malSearchResults').html('');
                  });
                });
              }, 300);
            });

            $("#info-iframe").contents().find("#clearCache").click( function(){
                clearCache();
            });

            $("#info-iframe").contents().find('#autoTracking').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('autoTracking', 1);
                    autoTracking = 1;
                }else{
                    GM_setValue('autoTracking', 0);
                    autoTracking = 0;
                }
            });
            $("#info-iframe").contents().find('#tagLinks').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('tagLinks', 1);
                    tagLinks = 1;
                }else{
                    GM_setValue('tagLinks', 0);
                    tagLinks = 0;
                }
            });
            $("#info-iframe").contents().find('#newEpNotification').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('newEpNotification', 1);
                    newEpNotification = 1;
                }else{
                    GM_setValue('newEpNotification', 0);
                    newEpNotification = 0;
                }
            });
            $("#info-iframe").contents().find('#openInBg').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('openInBg', 1);
                    openInBg = 1;
                }else{
                    GM_setValue('openInBg', 0);
                    openInBg = 0;
                }
            });
            $("#info-iframe").contents().find('#newEpCR').change(function(){
                if($(this).is(":checked")){
                    alert('Only activate this option if you have the Extension CR-Unblocker installed!');
                    GM_setValue('newEpCR', 1);
                    newEpCR = 1;
                }else{
                    GM_setValue('newEpCR', 0);
                    newEpCR = 0;
                }
            });

            $("#info-iframe").contents().find('#kissmangaLinks').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('kissmangaLinks', 1);
                    kissmangaLinks = 1;
                }else{
                    GM_setValue('kissmangaLinks', 0);
                    kissmangaLinks = 0;
                }
            });

            $("#info-iframe").contents().find('#kissanimeLinks').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('kissanimeLinks', 1);
                    kissanimeLinks = 1;
                }else{
                    GM_setValue('kissanimeLinks', 0);
                    kissanimeLinks = 0;
                }
            });
            $("#info-iframe").contents().find('#masteraniLinks').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('masteraniLinks', 1);
                    masteraniLinks = 1;
                }else{
                    GM_setValue('masteraniLinks', 0);
                    masteraniLinks = 0;
                }
            });
            $("#info-iframe").contents().find('#nineanimeLinks').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('nineanimeLinks', 1);
                    nineanimeLinks = 1;
                }else{
                    GM_setValue('nineanimeLinks', 0);
                    nineanimeLinks = 0;
                }
            });
            $("#info-iframe").contents().find('#crunchyrollLinks').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('crunchyrollLinks', 1);
                    crunchyrollLinks = 1;
                }else{
                    GM_setValue('crunchyrollLinks', 0);
                    crunchyrollLinks = 0;
                }
            });
            $("#info-iframe").contents().find('#gogoanimeLinks').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('gogoanimeLinks', 1);
                    gogoanimeLinks = 1;
                }else{
                    GM_setValue('gogoanimeLinks', 0);
                    gogoanimeLinks = 0;
                }
            });

            $("#info-iframe").contents().find("#posLeft").val(posLeft);
            $("#info-iframe").contents().find("#posLeft").change(function(){
              GM_setValue( 'posLeft', $("#info-iframe").contents().find("#posLeft").val() );
            });

            $("#info-iframe").contents().find('#displayFloatButton').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('displayFloatButton', 1);
                    displayFloatButton = 1;
                }else{
                    GM_setValue('displayFloatButton', 0);
                    displayFloatButton = 0;
                }
            });
            $("#info-iframe").contents().find('#episodeInfoBox').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('episodeInfoBox', 1);
                    episodeInfoBox = 1;
                }else{
                    GM_setValue('episodeInfoBox', 0);
                    episodeInfoBox = 0;
                }
            });
            $("#info-iframe").contents().find('#episodeInfoSynopsis').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('episodeInfoSynopsis', 1);
                    episodeInfoSynopsis = 1;
                }else{
                    GM_setValue('episodeInfoSynopsis', 0);
                    episodeInfoSynopsis = 0;
                }
            });
            $("#info-iframe").contents().find('#episodeInfoImage').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('episodeInfoImage', 1);
                    episodeInfoImage = 1;
                }else{
                    GM_setValue('episodeInfoImage', 0);
                    episodeInfoImage = 0;
                }
            });
            $("#info-iframe").contents().find('#episodeInfoSubtitle').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('episodeInfoSubtitle', 1);
                    episodeInfoSubtitle = 1;
                }else{
                    GM_setValue('episodeInfoSubtitle', 0);
                    episodeInfoSubtitle = 0;
                }
            });

            $("#info-iframe").contents().find('#miniMALonMal').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('miniMALonMal', 1);
                    miniMALonMal = 1;
                }else{
                    GM_setValue('miniMALonMal', 0);
                    miniMALonMal = 0;
                }
            });

            $("#info-iframe").contents().find('#outWay').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('outWay', 1);
                    outWay = 1;
                }else{
                    GM_setValue('outWay', 0);
                    outWay = 0;
                }
            });

            $("#info-iframe").contents().find("#malThumbnail").val(malThumbnail);
            $("#info-iframe").contents().find("#malThumbnail").change(function(){
              GM_setValue( 'malThumbnail', $("#info-iframe").contents().find("#malThumbnail").val() );
            });

            $("#info-iframe").contents().find('#debugging').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('debugging', 1);
                    debugging = 1;
                }else{
                    GM_setValue('debugging', 0);
                    debugging = 0;
                }
            });

            $("#info-iframe").contents().find('#epPredictions').change(function(){
                if($(this).is(":checked")){
                    GM_setValue('epPredictions', 1);
                    epPredictions = 1;
                }else{
                    GM_setValue('epPredictions', 0);
                    epPredictions = 0;
                }
            });

            $("#info-iframe").contents().find("#newEpInterval").val(newEpInterval);
            $("#info-iframe").contents().find("#newEpInterval").change(function(){
              GM_setValue( 'newEpInterval', $("#info-iframe").contents().find("#newEpInterval").val() );
            });

            $("#info-iframe").contents().find("#newEpBorder").change(function(){
              GM_setValue( 'newEpBorder', $("#info-iframe").contents().find("#newEpBorder").val() );
              $("#info-iframe").contents().find('#newEpBorder_color').css('background-color', '#'+$("#info-iframe").contents().find("#newEpBorder").val());
            });

            $("#info-iframe").contents().find("#newEpBorder_dropdown").val(newEpBorder);
            $("#info-iframe").contents().find("#newEpBorder_dropdown").change(function(){
              var dvalue=  $("#info-iframe").contents().find("#newEpBorder_dropdown").val();
              if(dvalue == 'c'){
                $("#info-iframe").contents().find("#newEpBorder").show();
              }else{
                $("#info-iframe").contents().find("#newEpBorder").hide();

                $("#info-iframe").contents().find("#newEpBorder").val( dvalue );
                $("#info-iframe").contents().find("#newEpBorder").trigger("change");
                if(dvalue == ' '){
                  $("#info-iframe").contents().find('#newEpBorder_color').css('background-color','transparent');
                }
              }
            });
            $("#info-iframe").contents().find("#newEpBorder_dropdown").trigger("change");

            $("#info-iframe").contents().find('#malConfig').show();
        }catch(e) {console.log('[iframeConfig] Error:',e);}
    }

    function iframeOverview(url, data){
        $("#info-iframe").contents().find('#loadOverview').hide();
        try{
            var image = data.split('js-scrollfix-bottom')[1].split('<img src="')[1].split('"')[0];
            $("#info-iframe").contents().find('.malImage').attr("src",image).show();
            $("#info-iframe").contents().find('.coverinfo').show();
        }catch(e) {console.log('[iframeOverview] Error:',e);}

        try{
            var title = data.split('itemprop="name">')[1].split('<')[0];
            $("#info-iframe").contents().find('.malTitle').html(title).show();
            $("#info-iframe").contents().find('.coverinfo').show();
        }catch(e) {console.log('[iframeOverview] Error:',e);}

        try{
            $("#info-iframe").contents().find('.malLink').attr('href',url).show();
        }catch(e) {console.log('[iframeOverview] Error:',e);}

        try{
            var description = data.split('itemprop="description">')[1].split('</span')[0];
            $("#info-iframe").contents().find('.malDescription').html('<p style="color: black;">'+description+'</p>').show();
            $("#info-iframe").contents().find('.coverinfo').show();
        }catch(e) {console.log('[iframeOverview] Error:',e);}

        try{
            var statsBlock = data.split('<h2>Statistics</h2>')[1].split('<h2>')[0];
            var html = $.parseHTML( statsBlock );
            var statsHtml = '<ul class="mdl-list mdl-grid mdl-grid--no-spacing mdl-cell mdl-cell--12-col" style="display: flex; justify-content: space-around;">';
            $.each($(html).filter('div').slice(0,5), function( index, value ) {
                statsHtml += '<li class="mdl-list__item mdl-list__item--two-line" style="padding: 0; padding-left: 10px; padding-right: 3px; min-width: 18%;">';
                    statsHtml += '<span class="mdl-list__item-primary-content">';
                        statsHtml += '<span>';
                            statsHtml += $(this).find('.dark_text').text();
                        statsHtml += '</span>';
                        statsHtml += '<span class="mdl-list__item-sub-title">';
                            statsHtml += $(this).find('span[itemprop=ratingValue]').height() != null ? $(this).find('span[itemprop=ratingValue]').text() : $(this).clone().children().remove().end().text();
                        statsHtml += '</span>';
                    statsHtml += '</span>';
                statsHtml += '</li>';
            });
            statsHtml += '</ul>';
            $("#info-iframe").contents().find('.stats-block').html(statsHtml).show();
        }catch(e) {console.log('[iframeOverview] Error:',e);}

        try{
            var altTitle = data.split('<h2>Alternative Titles</h2>')[1].split('<h2>')[0];
            altTitle = altTitle.replace(/spaceit_pad/g,'mdl-chip" style="margin-right: 5px;');
            $("#info-iframe").contents().find('.malAltTitle').html(altTitle);
            $("#info-iframe").contents().find('.malAltTitle .mdl-chip').contents().filter(function() {
                return this.nodeType == 3 && $.trim(this.textContent) != '';
            }).wrap('<span class="mdl-chip__text" />');
            $("#info-iframe").contents().find('.malAltTitle').show();
        }catch(e) {console.log('[iframeOverview] Error:',e);}

        try{
            var infoBlock = data.split('<h2>Information</h2>')[1].split('<h2>')[0];
            var html = $.parseHTML( infoBlock );
            var infoHtml = '<ul class="mdl-grid mdl-grid--no-spacing mdl-list mdl-cell mdl-cell--12-col">';
            $.each($(html).filter('div'), function( index, value ) {
                if((index + 4) % 4 == 0 && index != 0){
                    //infoHtml +='</ul><ul class="mdl-list mdl-cell mdl-cell--3-col mdl-cell--4-col-tablet">';
                }
                infoHtml += '<li class="mdl-list__item mdl-list__item--three-line mdl-cell mdl-cell--3-col mdl-cell--4-col-tablet">';
                    infoHtml += '<span class="mdl-list__item-primary-content">';
                        infoHtml += '<span>';
                            infoHtml += $(this).find('.dark_text').text();
                        infoHtml += '</span>';
                        infoHtml += '<span class="mdl-list__item-text-body">';
                            $(this).find('.dark_text').remove();
                            infoHtml += $(this).html();
                            //$(this).find('*').each(function(){infoHtml += $(this)[0].outerHTML});
                            //infoHtml += $(this).find('span[itemprop=ratingValue]').height() != null ? $(this).find('span[itemprop=ratingValue]').text() : $(this).clone().children().remove().end().text();
                        infoHtml += '</span>';
                    infoHtml += '</span>';
                infoHtml += '</li>';
            });
            infoHtml += '</ul>';
            $("#info-iframe").contents().find('.info-block').html(infoHtml).show();
        }catch(e) {console.log('[iframeOverview] Error:',e);}

        try{
            var relatedBlock = data.split('Related ')[1].split('</h2>')[1].split('<h2>')[0];
            var related = $.parseHTML( relatedBlock );
            var relatedHtml = '<ul class="mdl-list">';
            $.each($(related).filter('table').find('tr'), function( index, value ) {
                relatedHtml += '<li class="mdl-list__item mdl-list__item--two-line">';
                    relatedHtml += '<span class="mdl-list__item-primary-content">';
                        relatedHtml += '<span>';
                            relatedHtml += $(this).find('.borderClass').first().text();
                        relatedHtml += '</span>';
                        relatedHtml += '<span class="mdl-list__item-sub-title">';
                            relatedHtml += $(this).find('.borderClass').last().html();
                        relatedHtml += '</span>';
                    relatedHtml += '</span>';
                relatedHtml += '</li>';
            });
            relatedHtml += '</ul>';
            $("#info-iframe").contents().find('.related-block').html(relatedHtml).show();
            $("#info-iframe").contents().find('.related-block .mdl-list__item-sub-title').each(function(){$(this).html($(this).children()); });
            $("#info-iframe").contents().find('#material .related-block a').each(function() {
              $(this).click(function(e) {
                $("#info-iframe").contents().find('.malClear').hide();
                $("#info-iframe").contents().find('.mdl-progress__indeterminate').show();
                $("#info-iframe").contents().find("#backbutton").show();
                $("#info-iframe").contents().find('#SearchButton').css('margin-left', '-17px');
                $("#info-iframe").contents().find('#book').css('left', '40px');
                fillIframe($(this).attr('href'));
              }).attr('onclick','return false;');
            });
        }catch(e) {console.log('[iframeOverview] Error:',e);}

        try{
              var localListType = url.split('/')[3];
              var dataBlock = data.split('id="addtolist"')[1].split('<div id="myinfoDisplay"')[0];
              if (~data.indexOf("header-menu-login")){
                  dataBlock = "Please log in on <a target='_blank' href='https://myanimelist.net/login.php'>MyAnimeList!<a>";
              }else{
                  dataBlock = dataBlock.substring(dataBlock.indexOf(">") + 1);
              }
              $("#info-iframe").contents().find('.data-block').html(dataBlock).show();
              $("#info-iframe").contents().find('.data-block tr:not(:last-child)').each(function(){
                  var label = $(this).find('.spaceit').first().text();
                  //$(this).find('.spaceit').first().html('<span>'+label+'</span>');
                  $(this).replaceWith($('<li class="mdl-list__item mdl-list__item--three-line">\
                      <span class="mdl-list__item-primary-content">\
                          <span>'+label+'</span>\
                          <span class="mdl-list__item-text-body">'+$(this).find('.spaceit').last().html()+'</span>\
                      </span>\
                      \</li>'));
              });
              $("#info-iframe").contents().find('#myinfo_status,#myinfo_score').addClass('mdl-textfield__input').css('outline', 'none');
              $("#info-iframe").contents().find('#myinfo_watchedeps,#myinfo_chapters,#myinfo_volumes').addClass('mdl-textfield__input').css('width','35px').css('display','inline-block');
              $("#info-iframe").contents().find('.inputButton').addClass('mdl-button mdl-js-button mdl-button--raised mdl-button--colored').css('margin-right','5px');
              $("#info-iframe").contents().find('.data-block li').last().after('<li class="mdl-list__item">'+$("#info-iframe").contents().find('.inputButton').first().parent().html()+'</li>');
              $("#info-iframe").contents().find('.data-block tr').remove();
              $("#info-iframe").contents().find('.js-'+localListType+'-update-button, .js-'+localListType+'-add-button').click(function (){
                  var anime = {};
                  if(localListType == 'anime'){
                      anime['.add_anime[num_watched_episodes]'] = parseInt($("#info-iframe").contents().find('#myinfo_watchedeps').val() );
                      if(isNaN(anime['.add_anime[num_watched_episodes]'])){
                          anime['.add_anime[num_watched_episodes]'] = 0;
                      }
                  }else{
                      anime['.add_manga[num_read_volumes]'] = parseInt($("#info-iframe").contents().find('#myinfo_volumes').val() );
                      if(isNaN(anime['.add_manga[num_read_volumes]'])){
                          anime['.add_manga[num_read_volumes]'] = 0;
                      }
                      anime['.add_manga[num_read_chapters]'] = parseInt($("#info-iframe").contents().find('#myinfo_chapters').val() );
                      if(isNaN(anime['.add_manga[num_read_chapters]'])){
                          anime['.add_manga[num_read_chapters]'] = 0;
                      }
                  }
                  anime['.add_'+localListType+'[score]'] = parseInt($("#info-iframe").contents().find('#myinfo_score').val() );
                  if(anime['.add_'+localListType+'[score]'] == 0){
                      anime['.add_'+localListType+'[score]'] = '';
                  }
                  anime['.add_'+localListType+'[status]'] = parseInt($("#info-iframe").contents().find('#myinfo_status').val() );
                  if(K.isOverviewPage()){
                    anime['forceUpdate'] = 2;
                  }
                  anime['malurl'] = url;

                  setanime(url, anime, null, localListType);
              });
              epPrediction(url.split('/')[4], function(timestamp, airing, diffWeeks, diffDays, diffHours, diffMinutes, episode){
                if(airing){
                    if(episode){
                        var titleMsg = 'Next episode estimated in '+diffDays+'d '+diffHours+'h '+diffMinutes+'m';
                        $("#info-iframe").contents().find('[id="curEps"]').before('<span title="'+titleMsg+'">['+episode+']</span> ');
                    }
                }
              });
        }catch(e) {console.log('[iframeOverview] Error:',e);}

        try{
            var characterBlock = data.split('detail-characters-list')[1].split('</h2>')[0];
            var html = $.parseHTML( '<div class="detail-characters-list '+characterBlock );
            var temphtml = '';
            var charFound = 0;
            var tempWrapHtml = '<div class="mdl-card__actions clicker">\
                <h1 class="mdl-card__title-text" style="float: left;">Characters</h1>\
                <i class="material-icons mdl-accordion__icon mdl-animation--default remove" style="float: right; margin-top: 3px;">expand_more</i>\
            </div>\
            <div class="mdl-grid mdl-card__actions mdl-card--border" id="characterList" style="justify-content: space-between; display: none;"></div>';
            tempWrapHtml += '</div>';
            $.each($(html).find(':not(td) > table'), function( index, value ) {
                if(!index) charFound = 1;
                var regexDimensions = /\/r\/\d*x\d*/g;
                var charImg = $(this).find('img').first().attr("data-src");
                if ( regexDimensions.test(charImg)){
                    charImg = charImg.replace(regexDimensions, '');
                }else{
                    charImg = 'https://myanimelist.cdn-dena.com/images/questionmark_23.gif';
                }

                temphtml += '<div>';
                    temphtml += '<div class="mdl-grid" style="width: 126px;">';
                        temphtml += '<div style="width: 100%; height: auto;">';
                            temphtml += '<img style="height: auto; width: 100%;"src="'+charImg+'">';
                        temphtml += '</div>';
                        temphtml += '<div class="">';
                            temphtml += $(this).find('.borderClass .spaceit_pad').first().parent().html();
                        temphtml += '</div>';
                    temphtml += '</div>';
                temphtml += '</div>';

            });
            for(var i=0; i < 10; i++){
                temphtml +='<div class="listPlaceholder" style="height: 0;"><div class="mdl-grid" style="width: 126px;"></div></div>';
            }
            if(charFound) $("#info-iframe").contents().find('.characters-block').html(tempWrapHtml).show();
            $("#info-iframe").contents().find('.characters-block .clicker').one('click', function(){
                $("#info-iframe").contents().find('#characterList').html(temphtml).show();
                $("#info-iframe").contents().find('.characters-block .remove').remove();
                fixIframeLink();
            });
        }catch(e) {console.log('[iframeOverview] Error:',e);}

        try{
          var continueHtml = '';
          continueHtml +='<div class="mdl-card__actions mdl-card--border" style="padding-left: 0;">'
          continueHtml += '<div class="data title progress" style="display: inline-block; position: relative; top: 2px; margin-left: -2px;"><div class="link" style="display: none;">'+$("#info-iframe").contents().find('#myinfo_watchedeps').val()+'</div></div>';
          continueHtml +='</div>';
          getanime(url, function(actual){
            try{
              if(actual['.add_'+localListType+'[tags]'].indexOf("last::") > -1 ){
                  var url = atobURL( actual['.add_'+localListType+'[tags]'].split("last::")[1].split("::")[0] );
                  $("#info-iframe").contents().find('.malDescription').first().append(continueHtml);
                  setStreamLinks(url, $("#info-iframe").contents().find('.malDescription').first());

                  $("#info-iframe").contents().find('.malDescription .stream, .malDescription .nextStream').addClass('mdl-button mdl-button--colored mdl-js-button mdl-button--raised').css('color', 'white').find('img').css('padding-bottom', '3px').css('padding-right', '6px').css('margin-left', '-3px');
                  if(localListType == 'anime'){
                    $("#info-iframe").contents().find('.malDescription .nextStream').append('Next Episode');
                    $("#info-iframe").contents().find('.malDescription .stream').append('Continue Watching');
                  }else{
                    $("#info-iframe").contents().find('.malDescription .nextStream').append('Continue Reading');
                    $("#info-iframe").contents().find('.malDescription .stream').append('Overview');
                  }
              }
            }catch(e) {console.log('[iframeOverview] Error:',e);}
          }, url, url.split('/')[3]);
        }catch(e) {console.log('[iframeOverview] Error:',e);}

        try{
            $("#info-iframe").contents().find('.stream-block-inner').html('');
            setKissToMal(url);
        }catch(e) {console.log('[iframeOverview] Error:',e);}
    }

    function iframeReview(url, data){
        $("#info-iframe").contents().find('#loadReviews').hide();
        try{
            var reviews = data.split('Reviews</h2>')[1].split('<h2>')[0];
            var html = $.parseHTML( reviews );
            var reviewsHtml = '<div class="mdl-grid">';
            $.each($(html).filter('.borderDark'), function( index, value ) {
                reviewsHtml += '<div class="mdl-cell mdl-cell--12-col mdl-shadow--4dp">';
                    reviewsHtml += '<div class="mdl-card__supporting-text mdl-card--border" style="color: black;">';
                        $(this).find('.spaceit > div').css('max-width','60%');
                        reviewsHtml += $(this).find('.spaceit').first().html();
                    reviewsHtml += '</div>';

                    reviewsHtml += '<div class="mdl-card__supporting-text" style="color: black;">';
                        $(this).find('.textReadability, .textReadability > span').contents().filter(function(){
                            return this.nodeType == 3 && $.trim(this.nodeValue).length;
                        }).wrap('<p style="margin:0;padding=0;"/>');
                        $(this).find('br').css('line-height','10px');
                        reviewsHtml += $(this).find('.textReadability').html();
                    reviewsHtml += '</div>';
                reviewsHtml += '</div>';
            });
            reviewsHtml += '</div>';
            if(reviewsHtml == '<div class="mdl-grid"></div>'){
                reviewsHtml = '<span class="mdl-chip" style="margin: auto; margin-top: 16px; display: table;"><span class="mdl-chip__text">Nothing Found</span></span>';
            }
            $("#info-iframe").contents().find('#malReviews').html(reviewsHtml).show();
            $("#info-iframe").contents().find('.js-toggle-review-button').addClass('nojs').click(function(){
                var revID = $(this).attr('data-id');
                $("#info-iframe").contents().find('#review'+revID).css('display','initial');
                $("#info-iframe").contents().find('#revhelp_output_'+revID).remove();
                $(this).remove();
            });
            $("#info-iframe").contents().find('.mb8 a').addClass('nojs').click(function(){
                var revID = $(this).attr('onclick').split("$('")[1].split("'")[0];
                $("#info-iframe").contents().find(revID).toggle();
            });
        }catch(e) {console.log('[iframeReview] Error:',e);}
    }

    function iframeEpisode(url, data){
        getAjaxData(url+'/episode', function(data){
            try{
                $("#info-iframe").contents().find('#loadEpisode').hide();
                var episodesBlock = data.split('mt8 episode_list js-watch-episode-list ascend">')[1].split('</table>')[0];
                var episodesHtml = '<div class="mdl-grid">\
                        <div class="mdl-cell mdl-cell--12-col mdl-shadow--4dp">\
                            <table class="mdl-data-table mdl-js-data-table mdl-data-table--selectable mdl-shadow--2dp">'+episodesBlock+'</table>\
                        </div>\
                    </div>';
                $("#info-iframe").contents().find('#malEpisodes').html(episodesHtml).show();
                $("#info-iframe").contents().find('#malEpisodes .episode-video, #malEpisodes .episode-forum').remove();
            }catch(e) {console.log('[iframeEpisode] Error:',e);}
        });

    }

    function iframeRecommendations(url, data){
        getAjaxData(url+'/userrecs', function(data){
            try{
                $("#info-iframe").contents().find('#loadRecommendations').hide();
                var recommendationsBlock = data.split('Make a recommendation</a>')[1].split('</h2>')[1].split('<div class="mauto')[0];
                var html = $.parseHTML( recommendationsBlock );
                var recommendationsHtml = '<div class="mdl-grid">';
                $.each($(html).filter('.borderClass'), function( index, value ) {
                    recommendationsHtml += '<div class="mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet mdl-shadow--4dp mdl-grid">';
                        recommendationsHtml += '<div class="mdl-card__media" style="background-color: transparent; margin: 8px;">';
                            recommendationsHtml += $(this).find('.picSurround').html();
                        recommendationsHtml += '</div>';
                        recommendationsHtml += '<div class="mdl-cell" style="flex-grow: 100;">';
                            recommendationsHtml += '<div class="">';
                                $(this).find('.button_edit, .button_add, td:eq(1) > div:eq(1) span').remove();
                                recommendationsHtml += $(this).find('td:eq(1) > div:eq(1)').html();
                            recommendationsHtml += '</div>';
                            recommendationsHtml += '<div class="">';
                                $(this).find('a[href^="/dbchanges.php?go=report"]').remove();
                                recommendationsHtml += $(this).find('.borderClass').html();
                            recommendationsHtml += '</div>';
                            recommendationsHtml += '<div class="">';
                                recommendationsHtml += (typeof $(this).find('.spaceit').html() != 'undefined') ? $(this).find('.spaceit').html() : '';
                                recommendationsHtml += '<div class="more" style="display: none;">';
                                    recommendationsHtml += $(this).find('td:eq(1) > div').last().html();
                                recommendationsHtml += '</div>';
                            recommendationsHtml += '</div>';
                        recommendationsHtml += '</div>';
                        /*recommendationsHtml += '<div class="mdl-card__supporting-text mdl-card--border" style="color: black;">';
                            $(this).find('.spaceit > div').css('max-width','60%');
                            recommendationsHtml += $(this).find('.spaceit').first().html();
                        recommendationsHtml += '</div>';
                        recommendationsHtml += '<div class="mdl-card__supporting-text" style="color: black;">';
                            $(this).find('.textReadability, .textReadability > span').contents().filter(function(){
                                return this.nodeType == 3 && $.trim(this.nodeValue).length;
                            }).wrap('<p style="margin:0;padding=0;"/>');
                            $(this).find('br').css('line-height','10px');
                            recommendationsHtml += $(this).find('.textReadability').html();
                        recommendationsHtml += '</div>';*/
                        //recommendationsHtml += $(this).html();
                    recommendationsHtml += '</div>';
                });
                recommendationsHtml += '</div>';

                if(recommendationsHtml == '<div class="mdl-grid"></div>'){
                    recommendationsHtml = '<span class="mdl-chip" style="margin: auto; margin-top: 16px; display: table;"><span class="mdl-chip__text">Nothing Found</span></span>';
                }
                $("#info-iframe").contents().find('#malRecommendations').html(recommendationsHtml).show();
                $("#info-iframe").contents().find('.js-similar-recommendations-button').addClass('nojs').click(function(){$(this).parent().find('.more').toggle();});
                $("#info-iframe").contents().find('.js-toggle-recommendation-button').addClass('nojs').click(function(){
                    var revID = $(this).attr('data-id');
                    $("#info-iframe").contents().find('#recommend'+revID).css('display','initial');
                    $(this).remove();
                });
                fixIframeLink();
                $("#info-iframe").contents().find('#malRecommendations a[href^="https://myanimelist.net/anime/"],#malRecommendations a[href^="https://myanimelist.net/manga/"]').each(function() {
                    $(this).click(function(e) {
                        $("#info-iframe").contents().find('.malClear').hide();
                        $("#info-iframe").contents().find('.mdl-progress__indeterminate').show();
                        $("#info-iframe").contents().find("#backbutton").show();
                        $("#info-iframe").contents().find('#SearchButton').css('margin-left', '-17px');
                        $("#info-iframe").contents().find('#book').css('left', '40px');
                        $("#info-iframe").contents().find('.mdl-layout__tab:eq(0) span').trigger( "click" );
                        fillIframe($(this).attr('href'));
                    }).attr('onclick','return false;');
                });
                $("#info-iframe").contents().find('#malRecommendations .more .borderClass').addClass('mdl-shadow--2dp').css('padding','10px');
                $("#info-iframe").contents().find('.lazyload').each(function() { $(this).attr('src', $(this).attr('data-src'));});//TODO: use lazyloading
            }catch(e) {console.log('[iframeRecommendations] Error:',e);}
        });

    }

    function executejs(string){
        var rawframe = document.getElementById('info-iframe');
        var framedoc = rawframe.contentDocument;
        if (!framedoc && rawframe.contentWindow) {
            framedoc = rawframe.contentWindow.document;
        }
        var script = document.createElement('script');
        script.type = "text/javascript";
        //script.src = "https://code.getmdl.io/1.3.0/material.min.js";
        script.text  = string;
        framedoc.body.appendChild(script);
    }

    function materialCheckbox(option, string, text, header = false){
        var check = '';
        var sty = '';
        if(option == 1) check = 'checked';
        if(header) sty = 'font-size: 24px; font-weight: 300; line-height: normal;';
        var item =  '<li class="mdl-list__item">\
                        <span class="mdl-list__item-primary-content" style="'+sty+'">\
                            '+text+'\
                        </span>\
                        <span class="mdl-list__item-secondary-action">\
                            <label class="mdl-switch mdl-js-switch mdl-js-ripple-effect" for="'+string+'">\
                                <input type="checkbox" id="'+string+'" class="mdl-switch__input" '+check+' />\
                            </label>\
                        </span>\
                    </li>';
        return item;
    }

    function getAjaxData(url, callback){
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            synchronous: false,
            onload: function(response) {
                if(response.status == 200){
                  callback(response.responseText);
                }else{
                  callback('404');
                }
            }
        });
    }

    function fixIframeLink(){
        $("#info-iframe").contents().find('#material a').not('[href^="http"],[href^="https"],[href^="mailto:"],[href^="#"],[href^="javascript"]').each(function() {
            try{
                $(this).attr('href', function(index, value) {
                    if (value.substr(0,1) !== "/") {
                        value = window.location.pathname + value;
                    }
                    return "https://myanimelist.net" + value;
                });
            }catch(e){}
        });
        $("#info-iframe").contents().find('a').not(".nojs").attr('target','_blank');
    }

    function searchMal(keyword, type = 'all', selector, callback){
        $("#info-iframe").contents().find(selector).html('');
        GM_xmlhttpRequest({
            method: "GET",
            url: 'https://myanimelist.net/search/prefix.json?type='+type+'&keyword='+keyword+'&v=1',
            synchronous: false,
            onload: function(response) {
                var searchResults = $.parseJSON(response.response);
                $("#info-iframe").contents().find(selector).append('<div class="mdl-grid">\
                        <select name="myinfo_score" id="searchListType" class="inputtext mdl-textfield__input mdl-cell mdl-cell--12-col" style="outline: none; background-color: white; border: none;">\
                            <option value="anime">Anime</option>\
                            <option value="manga">Manga</option>\
                        </select>\
                    </div>');
                $("#info-iframe").contents().find('#searchListType').val(type);
                $("#info-iframe").contents().find('#searchListType').change(function(event) {
                  searchMal(keyword, $("#info-iframe").contents().find('#searchListType').val(), selector, callback)
                });
                $.each(searchResults, function() {
                    $.each(this, function() {
                        $.each(this, function() {
                            $.each(this, function() {
                                if(typeof this['name'] != 'undefined'){
                                    $("#info-iframe").contents().find(selector+' > div').append('<div class="mdl-cell mdl-cell--6-col mdl-cell--8-col-tablet mdl-shadow--2dp mdl-grid searchItem" malhref="'+this['url']+'" style="cursor: pointer;">\
                                        <img src="'+this['image_url']+'" style="margin: -8px 0px -8px -8px; height: 100px; width: 64px; background-color: grey;"></img>\
                                        <div style="flex-grow: 100; cursor: pointer; margin-top: 0; margin-bottom: 0;" class="mdl-cell">\
                                          <span style="font-size: 20px; font-weight: 400; line-height: 1;">'+this['name']+'</span>\
                                          <p style="margin-bottom: 0; line-height: 20px; padding-top: 3px;">Type: '+this['payload']['media_type']+'</p>\
                                          <p style="margin-bottom: 0; line-height: 20px;">Score: '+this['payload']['score']+'</p>\
                                          <p style="margin-bottom: 0; line-height: 20px;">Year: '+this['payload']['start_year']+'</p>\
                                        </div>\
                                      </div>');
                                }
                            });
                        });
                    });
                });
                callback();
            }
        });
    }

    function iframeBookmarks(element, state = 1, localListType = K.listType){
        element.html('<div id="loadRecommendations" class="mdl-progress mdl-js-progress mdl-progress__indeterminate" style="width: 100%; position: absolute;"></div>');
        executejs('componentHandler.upgradeDom();');

        var my_watched_episodes = 'num_watched_episodes';
        var series_episodes = 'anime_num_episodes';
        var localPlanTo = 'Plan to Watch';
        var localWatching = 'Watching'
        if(localListType != 'anime'){
            my_watched_episodes = 'num_read_chapters';
            series_episodes = 'manga_num_chapters';
            localPlanTo = 'Plan to Read';
            localWatching = 'Reading'
        }
        var firstEl = 1;

        getUserList(state, localListType, function(el, index, total){
          if(firstEl){
            firstEl = 0;
            var bookmarkHtml = '<div class="mdl-grid" id="malList" style="justify-content: space-around;">';
            bookmarkHtml +='<select name="myinfo_score" id="userListType" class="inputtext mdl-textfield__input mdl-cell mdl-cell--12-col" style="outline: none; background-color: white; border: none;">\
                              <option value="anime">Anime</option>\
                              <option value="manga">Manga</option>\
                            </select>';
            bookmarkHtml +='<select name="myinfo_score" id="userListState" class="inputtext mdl-textfield__input mdl-cell mdl-cell--12-col" style="outline: none; background-color: white; border: none;">\
                              <option value="7">All</option>\
                              <option value="1" selected>'+localWatching+'</option>\
                              <option value="2">Completed</option>\
                              <option value="3">On-Hold</option>\
                              <option value="4">Dropped</option>\
                              <option value="6">'+localPlanTo+'</option>\
                            </select>';
            //flexbox placeholder
            for(var i=0; i < 10; i++){
                bookmarkHtml +='<div class="listPlaceholder mdl-cell mdl-cell--2-col mdl-cell--4-col-tablet mdl-cell--6-col-phone mdl-shadow--2dp mdl-grid "  style="cursor: pointer; height: 250px; padding: 0; width: 210px; height: 0px; margin-top:0; margin-bottom:0; visibility: hidden;"></div>';
            }
            bookmarkHtml += '</div>'
            element.html( bookmarkHtml );

            $("#info-iframe").contents().find('#malSearchPop #userListType').val(localListType);
            $("#info-iframe").contents().find('#malSearchPop #userListType').change(function(event) {
              iframeBookmarks(element, state, $("#info-iframe").contents().find('#malSearchPop #userListType').val() );
            });

            $("#info-iframe").contents().find('#malSearchPop #userListState').val(state);
            $("#info-iframe").contents().find('#malSearchPop #userListState').change(function(event) {
              iframeBookmarks(element, $("#info-iframe").contents().find('#malSearchPop #userListState').val(), localListType);
            });
          }

          if(!el){
            element.find('#malList .listPlaceholder').first().before( '<span class="mdl-chip" style="margin: auto; margin-top: 16px; display: table;"><span class="mdl-chip__text">No Entries</span></span>');
            element.find('#malList .listPlaceholder').remove();
            return;
          }

          var bookmarkElement = '';
          var uid = el[localListType+'_id']
          var malUrl = 'https://myanimelist.net'+el[localListType+'_url'];
          var imageHi = el[localListType+'_image_path'];
          var regexDimensions = /\/r\/\d*x\d*/g;
          if ( regexDimensions.test(imageHi) ) {
            imageHi = imageHi.replace(/v.jpg$/g, '.jpg').replace(regexDimensions, '');
          }
          var progressProcent = ( el[my_watched_episodes] / el[series_episodes] ) * 100;
          bookmarkElement +='<div class="mdl-cell mdl-cell--2-col mdl-cell--4-col-tablet mdl-cell--6-col-phone mdl-shadow--2dp mdl-grid bookEntry e'+uid+'" malhref="'+malUrl+'" maltitle="'+el[localListType+'_title']+'" malimage="'+el[localListType+'_image_path']+'" style="position: relative; cursor: pointer; height: 250px; padding: 0; width: 210px; height: 293px;">';
            bookmarkElement +='<div class="data title" style="background-image: url('+imageHi+'); background-size: cover; background-position: center center; background-repeat: no-repeat; width: 100%; position: relative; padding-top: 5px;">';
              bookmarkElement +='<span class="mdl-shadow--2dp" style="position: absolute; bottom: 0; display: block; background-color: rgba(255, 255, 255, 0.9); padding-top: 5px; display: inline-flex; align-items: center; justify-content: space-between; left: 0; right: 0; padding-right: 8px; padding-left: 8px; padding-bottom: 8px;">'+el[localListType+'_title'];
                bookmarkElement +='<div id="p1" class="mdl-progress" series_episodes="'+el[series_episodes]+'" style="position: absolute; top: -4px; left: 0;"><div class="progressbar bar bar1" style="width: '+progressProcent+'%;"></div><div class="bufferbar bar bar2" style="width: 100%;"></div><div class="auxbar bar bar3" style="width: 0%;"></div></div>';
                bookmarkElement +='<div class="data progress mdl-chip mdl-chip--contact mdl-color--indigo-100" style="float: right; line-height: 20px; height: 20px; padding-right: 4px; margin-left: 5px;">';
                  bookmarkElement +='<div class="link mdl-chip__contact mdl-color--primary mdl-color-text--white" style="line-height: 20px; height: 20px; margin-right: 0;">'+el[my_watched_episodes]+'</div>';
                bookmarkElement +='</div>';
              bookmarkElement +='</span>';
              bookmarkElement +='<div class="tags" style="display: none;">'+el['tags']+'</div>';
            bookmarkElement +='</div>';
          bookmarkElement +='</div>';
          element.find('#malList .listPlaceholder').first().before( bookmarkElement );

          var domE = element.find('#malList .e'+uid).first();

          domE.click(function(event) {
            $("#info-iframe").contents().find('#book').click();
            $("#info-iframe").contents().find('.malClear').hide();
            $("#info-iframe").contents().find('.mdl-progress__indeterminate').show();
            $("#info-iframe").contents().find("#backbutton").show();
            $("#info-iframe").contents().find('#SearchButton').css('margin-left', '-17px');
            $("#info-iframe").contents().find('#book').css('left', '40px');
            $("#info-iframe").contents().find('.mdl-layout__tab:eq(0) span').trigger( "click" );
            fillIframe($(this).attr('malhref'));
          });

          if(domE.find('.tags').text().indexOf("last::") > -1 ){
            var url = atobURL( domE.find('.tags').text().split("last::")[1].split("::")[0] );
            setStreamLinks(url, domE);
            if( parseInt(el['status']) === 1 ){
              checkForNewEpisodes(url, domE, domE.attr('maltitle'), domE.attr('malimage'));
            }
          }

          epPrediction(domE.attr('malhref').split('/')[4], function(timestamp, airing, diffWeeks, diffDays, diffHours, diffMinutes, episode){
            if(airing){
                if(episode){
                    var titleMsg = 'Next episode estimated in '+diffDays+'d '+diffHours+'h '+diffMinutes+'m';
                    var progressBar = domE.find('.mdl-progress');
                    var predictionProgress = ( episode / progressBar.attr('series_episodes') ) * 100;
                    progressBar.prepend('<div class="predictionbar bar kal-ep-pre" ep="'+(diffWeeks+1)+'" style="width: '+predictionProgress+'%; background-color: red; z-index: 1; left: 0;"></div>');
                    domE.attr('title', titleMsg);
                }
            }
          });

        }
        ,function(){
          startCheckForNewEpisodes(localListType);
        },
        null,
        function(continueCall){
          if(state == 1){
            continueCall();
            return;
          }
          var scrollable = $("#info-iframe").contents().find('#malSearchPop .simplebar-scroll-content');
          var scrollDone = 0;
          scrollable.scroll(function() {
            if(scrollDone) return;
            if(scrollable.scrollTop() + scrollable.height() > scrollable.find('.simplebar-content').height() - 100) {
              scrollDone = 1;
              con.log('[Bookmarks]','Loading next part');
              continueCall();
            }
          });
        });
    }

    var outOfTheWayLoad = 0;
    function outOfTheWay(){
      if(outWay != 1) return;
      $(document).ready(function(){
        try{
          var minimalSelector = '#modal-content';

          reposition();
          if(outOfTheWayLoad == 0){
            outOfTheWayLoad = 1;
            $( window ).resize(function(){reposition();});
            var lastScrollLeft = 0;
            $(window).scroll(function() {
                var documentScrollLeft = $(document).scrollLeft();
                if (lastScrollLeft != documentScrollLeft) {
                    lastScrollLeft = documentScrollLeft;
                    reposition();
                }
            });
            $(document).on('mozfullscreenchange webkitfullscreenchange fullscreenchange',function(){
              reposition();
            });
          }

          function reposition(){
              $(K.videoSelector).css('transform', '');

              if(!$(minimalSelector).is(":visible")){
                  return;
              }

              var videoLeft = $(K.videoSelector).offset().left;
              var videoWidth = $(K.videoSelector).width();
              var videoRight = videoLeft + videoWidth;
            var minimalLeft = $(minimalSelector).offset().left;
            var minimalRight = minimalLeft + $(minimalSelector).width();
            var viewportWidth = $(window).width() - $(minimalSelector).width();

            if( minimalLeft == $(window).scrollLeft()){
                if( minimalRight > videoLeft){
                    var tempVideoLeft = minimalRight;
                    if(videoWidth > viewportWidth){
                          setVideo(tempVideoLeft, viewportWidth);
                    }else{
                          setVideo(tempVideoLeft, videoWidth);
                      }
                }
            }else{
                if(minimalLeft < videoRight){

                      if(videoWidth > viewportWidth){
                          var tempVideoLeft = minimalLeft - viewportWidth;
                          setVideo(tempVideoLeft, viewportWidth);
                      }else{
                          var tempVideoLeft = minimalLeft - videoWidth;
                          setVideo(tempVideoLeft, videoWidth);
                      }
                }
            }

            function setVideo(Left, Width){
                var scale = Width / videoWidth;
                Left = Left - videoLeft;
                Left = Left / scale;
                $(K.videoSelector).css('transform', 'scale('+scale+') translateX('+Left+'px)');
                $(K.videoSelector).css('transform-origin', '0% 50%');
                $(K.videoSelector).css('transition', '0s');
            }
          }
        }catch(e){}
      });
    }
	var newEPTime = 0;
	var newEpUpdate = 0;
	var checkFail = [];
	var NexEpProcessed = 0;
	var NexEpFinished = 0;
	var newEpRetries = 0;

	var checkArray = [];
	function checkForNewEpisodes(url, entrySelector, title = '', img = ''){
		checkArray.push(function(totalEntries){checkForNewEpisode(url, entrySelector, totalEntries, title, img);});
	}

	function startCheckForNewEpisodes(localListType = K.listType){
		newEpRetries++;
		if(newEpInterval == 'null'){
			return;
		}
		if($('.username').first().attr('href')){
			return;
		}
		if(!checkArray.length){
			return;
		}
		if( $.now() - GM_getValue('newEp_last_update_'+localListType, 0) > newEpInterval){
			$('body').before('<div style="z-index: 20000000000; height: 5px; position: fixed; top: 0; left: 0; right: 0;background-color: rgba(255,225,255,0.5);"><div id="checkProgress" style="width: 0%;background-color: #3f51b5; height: 100%; transition: width 1s;"></div></div>');
			newEpUpdate = 1;
		}
		var tempArray = checkArray;
		checkArray = [];
		newEPTime = 0;
		for(var i=0 ; i < tempArray.length ; i++){
			tempArray[i](tempArray.length);
		}
	}

	function checkForNewEpisode(url, entrySelector, totalEntries, title = '', img = ''){
		var selector = '';
		var hasStyle = 0;
		var localListType = 'anime';
		var checkAiringState = function(parsed, html){};
		if($(entrySelector).attr('style')) hasStyle = 1;

		if( url.indexOf("kissanime.ru") > -1 ){
			selector = ".listing a";
			checkAiringState = function(parsed, html){
				try{
					if(html.split('Status:</span>')[1].split('<')[0].indexOf("Completed") > -1){
						return true;
					}
				}catch(e){
					con.log('[ERROR]',e);
				}
				return false;
			}
		}else if( url.indexOf("kissmanga.com") > -1 ){
			localListType = 'manga';
			selector = ".listing a";
			checkAiringState = function(parsed, html){
				try{
					if(html.split('Status:</span>')[1].split('<')[0].indexOf("Completed") > -1){
						return true;
					}
				}catch(e){
					con.log('[ERROR]',e);
				}
				return false;
			}
		}else if( url.indexOf("masterani.me") > -1 ){
			var masterid = url.split('/')[5].split('-')[0];
			url = 'https://www.masterani.me/api/anime/'+masterid+'/detailed';
			selector = ".thumbnail a.title";
			checkAiringState = function(parsed, html){
				try{
					if(parsed["info"]["status"] == 0){
						return true;
					}
				}catch(e){
					con.log('[ERROR]',e);
				}
				return false;
			}
		}else if( url.indexOf("9anime.") > -1 ){
			selector = ".server:first-child .episodes a";
			checkAiringState = function(parsed, html){
				try{
					if(html.split('<dt>Status:</dt>')[1].split('</dl>')[0].indexOf("Completed") > -1){
						return true;
					}
				}catch(e){
					con.log('[ERROR]',e);
				}
				return false;
			}
		}else if( url.indexOf("crunchyroll.com") > -1 ){
			selector = "#showview_content_videos .list-of-seasons .group-item a";
			checkAiringState = function(parsed, html){
				try{
					if(!(html.indexOf("Simulcast on") > -1)){
						return true;
					}
				}catch(e){
					con.log('[ERROR]',e);
				}
				return false;
			}
		}else if( url.indexOf("gogoanime.") > -1 ){
			selector = "#episode_page a:last";
			checkAiringState = function(parsed, html){
				try{
					if(html.split('Status: </span>')[1].split('<')[0].indexOf("Completed") > -1){
						return true;
					}
				}catch(e){
					con.log('[ERROR]',e);
				}
				return false;
			}
		}else{
			checkForNewEpisodesDone(totalEntries, true);
			return;
		}

		if( GM_getValue('newEp_'+url+'_finished', false) == true){
			con.log('[EpCheck] [Finished]', title);
			if(debug && !hasStyle){ $(entrySelector).attr('style', 'border-left: 4px solid green !important');}
			checkForNewEpisodesDone(totalEntries, true);
			return true;
		}

		setBorder(GM_getValue('newEp_'+url+'_cache', null));
		if(newEpUpdate){
			setTimeout( function(){
				con.log('[EpCheck]', title, url );
				GM_xmlhttpRequest({
					method: "GET",
					url: url,
					synchronous: false,
					onerror: function(response) {
						con.log('[ERROR]',url+' could not be loaded');
						checkForNewEpisodesDone(totalEntries, true);
					},
					onload: function(response) {
						if(newEpCR){
							if(response.response.indexOf('Your detected location is United States of America') == -1 && url.indexOf("crunchyroll.com") > -1){
								response.status = 502;
							}
						}
						if(response.status != 200){//TODO: Cloudflare handling
							con.log('[EpCheck] [ERROR]', response);
							var checkFailMessage = 'Coud Not Check';
							if(newEpRetries < 3 && openInBg){
								checkFailMessage = 'Please wait';
							}
							var message = '<div>'+checkFailMessage+'</div><div class="errorpage"></div>'//;<button class="okChangelog" style="background-color: transparent; border: none; color: rgb(255,64,129);margin-top: 10px;cursor: pointer;">Ok</button></div>';
							if( !$('.errorpage').length ){
								flashm(message,false,false,true);
							}
							var erClass = url.split('/')[2].replace(".", "").replace(".", "");
							if(!($('.'+erClass).length)){
								$('.errorpage').prepend('<a target="_blank" class="'+erClass+'" href="'+url+'">'+url.split('/')[2]+'</a><br class="'+erClass+'" />');
								$('.'+erClass).click(function(){
									$(this).remove();
									if($('.errorpage').text() == ''){
										$('.flashPerm').remove();
									}
								});

								checkFail.push(url);
							}

							checkForNewEpisodes(url, entrySelector, title, img);

						}else{
							if( url.indexOf("masterani.me") > -1 ){
								var parsed  = $.parseJSON(response.response);
								var EpNumber = parsed['episodes'].length;
								var complete = checkAiringState(parsed, response.response);
							}else if( url.indexOf("gogoanime.") > -1 ){
								var parsed  = $.parseHTML(response.response);
								var EpNumber = $(parsed).find( selector ).text();
								EpNumber = parseInt(EpNumber.split('-')[1]);
								var complete = checkAiringState(parsed, response.response);
							}else{
								var parsed  = $.parseHTML(response.response);
								var EpNumber = $(parsed).find( selector ).length;
								var complete = checkAiringState(parsed, response.response);
							}

							if(complete){
								con.log('[EpCheck] [SetFinished]', title);
								GM_setValue('newEp_'+url+'_finished', true);
							}else{
								setBorder(EpNumber);
							}

						}
						checkForNewEpisodesDone(totalEntries);
					}
				});

			}, newEPTime);
			newEPTime += 1000;
		}

		function setBorder(EpNumber){
			if(EpNumber === null){
				return;
			}
			var currentEpisode = $(entrySelector).find('.data.progress .link, .data.chapter .link').text().trim().replace(/\/.*/,'');
			con.log('[EpCheck]', GM_getValue('newEp_'+url+'_number',null), EpNumber);
			if( GM_getValue('newEp_'+url+'_number', EpNumber) < EpNumber
				&& currentEpisode != $(entrySelector).find('.kal-ep-pre').attr('ep')){
				con.log('[NewEP]', url);

				if(GM_getValue('newEp_'+url+'_cache', null) != EpNumber){
					var newMessage = 'New episode got released!';
					if(localListType != 'anime'){
						newMessage = 'New chapter got released!';
					}
					if(newEpNotification){
						try{
							GM_notification({text: newMessage, title: title, image: img, timeout: 0/*, onclick: function(){
								try{
									//GM_setValue('newEp_'+url+'_number', EpNumber);
								}catch(e){}
								location.href = url;
							} */});
						}catch(e){
							console.log('[ERROR] Could not execute GM_notification');
							alert('New episode for '+title+' released');
						}
					}
				}

				GM_setValue('newEp_'+url+'_cache', EpNumber);
				if(!hasStyle) $(entrySelector).attr('style', 'border: 3px solid #'+newEpBorder+' !important');
				if(GM_getValue('newEp_'+url+'_last', null) != currentEpisode
					&& GM_getValue('newEp_'+url+'_last', null) != null){
					GM_setValue('newEp_'+url+'_number', EpNumber);
					if(!hasStyle) $(entrySelector).attr('style', '');
					$(entrySelector).find('.newEp').remove();
					GM_setValue('newEp_'+url+'_last', currentEpisode);
					return true;
				};
				GM_setValue('newEp_'+url+'_last', currentEpisode);
				if(!$(entrySelector).find('.newEp').length) $(entrySelector).append('<div class="newEp"></div>');
			}else{
				if(GM_getValue('newEp_'+url+'_number', null) == null){
					GM_setValue('newEp_'+url+'_number', EpNumber);
				}
				if(debug && !hasStyle){ $(entrySelector).attr('style', 'border-left: 4px solid yellow !important');}
			}
		}

		function checkForNewEpisodesDone(totalEntries, finishedCache = false){
			NexEpProcessed++;
			if(finishedCache) NexEpFinished++;
			con.log('[EpCheck]','('+ NexEpProcessed+'/'+totalEntries+')');
			$('#checkProgress').css('width', ((NexEpProcessed - NexEpFinished)/( totalEntries - NexEpFinished)*100) + '%');

			if(NexEpProcessed === totalEntries){
				NexEpProcessed = 0;
				NexEpFinished = 0;

				$('#checkProgress').parent().fadeOut({
					duration: 2500,
					queue: false,
					complete: function() { $(this).remove(); }});

				function checkFailBackground(){
					if(!openInBg) return;
					if(checkFail.length){
						var rNumber = Math.floor((Math.random() * 1000) + 1);
						var url = checkFail[0];
						var erClass = url.split('/')[2].replace(".", "").replace(".", "");
						$('.'+erClass).click();
						GM_setValue( 'checkFail', rNumber );
						var tab = GM_openInTab(url+'?id='+rNumber);
						checkFail.shift();
						console.log(tab);
						var timeou = setTimeout(function(){
						    tab.close();
						    checkFailBackground();
						}, 60000);
						var index = 0;
						var inter = setInterval(function(){
							index++;
							if(index > 59){
								clearInterval(inter);
							}
							if(GM_getValue( 'checkFail', 0 ) == 0){
								clearInterval(inter);
								clearTimeout(timeou);
								tab.close();
								checkFailBackground();
							}
						}, 1000);

					}else{
						newEPTime = 0;
						newEpUpdate = 0;
						startCheckForNewEpisodes();
					}
				}
				if(checkFail.length && newEpRetries < 3){
					checkFailBackground();
				}else{
					newEpRetries = 0;
					GM_setValue('newEp_last_update_'+localListType, $.now());
				}
			}
		}
	};

	//EP_Prediction
	function epPrediction( malId , callback){
		if(!epPredictions) return;
	    timestampUpdate();
	    var timestamp = GM_getValue('mal/'+malId+'/release', false);
	    if(timestamp){
	        var airing = 1;
	        var episode = 0;
	        if(Date.now() < timestamp) airing = 0;

	        if(airing){
	            var delta = Math.abs(Date.now() - timestamp) / 1000;
	        }else{
	            var delta = Math.abs(timestamp - Date.now()) / 1000;
	        }


	        var diffWeeks = Math.floor(delta / (86400 * 7));
	        delta -= diffWeeks * (86400 * 7);

	        if(airing){
	            //We need the time until the week is complete
	            delta = (86400 * 7) - delta;
	        }

	        var diffDays = Math.floor(delta / 86400);
	        delta -= diffDays * 86400;

	        var diffHours = Math.floor(delta / 3600) % 24;
	        delta -= diffHours * 3600;

	        var diffMinutes = Math.floor(delta / 60) % 60;
	        delta -= diffMinutes * 60;

	        if(airing){
	        	episode = diffWeeks - (new Date().getFullYear() - new Date(timestamp).getFullYear()); //Remove 1 week between years
	    		episode++;
	    		if( episode > 50 ){
	    			episode = 0;
	    		}
	    	}
	    	if(episode < GM_getValue('mal/'+malId+'/eps', 100000)){
	        	callback(timestamp, airing, diffWeeks, diffDays, diffHours, diffMinutes, episode);
	    	}
	    }
	}

	function timestampUpdate(){
	    function toTimestamp(year,month,day,hour,minute,second){
	        var datum = new Date(Date.UTC(year,month-1,day,hour,minute,second));
	        return (datum.getTime())-32400000;//for GMT
	    }

	    if( $.now() - GM_getValue('timestampUpdate/release', 0) < 345600000){
	        return 0;
	    }

	    var url = 'https://myanimelist.net/anime/season/schedule';
	    GM_xmlhttpRequest({
	        method: "GET",
	        url: url,
	        synchronous: false,
	        onload: function(response) {
	        	var found = 0;
	            var parsed = $.parseHTML(response.response);
	            var se = '.js-seasonal-anime-list-key-';
	            se = se+'monday, '+se+'tuesday ,'+se+'wednesday ,'+se+'thursday ,'+se+'friday ,'+se+'saturday ,'+se+'sunday';
	            $(parsed).find(se).find('.seasonal-anime').each(function(){
	            	found = 1;
	                if($(this).find('.info .remain-time').text().match(/\w+\ \d+.\ \d+,\ \d+:\d+\ \(JST\)/i)){
	                    var malId = $(this).find('a.link-title').attr('href').split('/')[4];
	                    var jpdate = $(this).find('.info .remain-time').text().trim();
	                    //day
	                    var day = jpdate.split(' ')[1].replace(',','').trim();
	                    //month
	                    var month = jpdate.split(' ')[0].trim();
	                    month = ("JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(month) / 3 + 1);
	                    //year
	                    var year = jpdate.split(' ')[2].replace(',','').trim();
	                    //time
	                    var time = jpdate.split(' ')[3].trim();
	                    var minute = time.split(':')[1];
	                    var hour = time.split(':')[0];
	                    //timezone
	                    var timestamp = toTimestamp(year,month,day,hour,minute,0);
	                    GM_setValue('mal/'+malId+'/release', timestamp);
	                    var episode = $(this).find('.eps a span').last().text();
	                    if(episode.match(/^\d+/)){
	                    	GM_setValue('mal/'+malId+'/eps', parseInt( episode.match(/^\d+/)[0]) );
	                    }
	                }
	            });
	            if(found){
	            	GM_setValue('timestampUpdate/release', $.now());
	        	}

	        }
	    });
	    return 1;
	}

    if(window.location.href.indexOf("/BookmarkList") > -1 ){
        K.docReady(function() {
            var optionsTarget = $("#divEmailNotify");
            if(malBookmarks == 1){
                var check = 'checked';
            }else{
                var check = '';
            }
            if(BookmarksStyle == 1 && malBookmarks == 1){
                var checkfix = 'checked';
                $('.bigBarContainer').before('<div id="rightside" style="margin-right: 100px;"><div class="rightBox"> <div class="barTitle">Options</div> <div class="barContent"> <div class="arrow-general"> &nbsp;</div> <div id="optionsTarget"> </div> </div> </div></div>');
                optionsTarget = $("#optionsTarget");
                $('.bigBarContainer>.barContent>div>div:not([class])').first().remove();
            }else{
                var checkfix = '';
            }
            if(classicBookmarks == 1 && malBookmarks == 1){
                var checkClassic = 'checked';
            }else{
                var checkClassic = '';
            }
            K.bookmarkButton(optionsTarget, check);//optionsTarget.before('<div><input type="checkbox" id="malBookmarks" '+check+' > MyAnimeList Bookmarks</div><div class="clear2">&nbsp;</div>');
            $('#malBookmarks').change(function(){
                if($('#malBookmarks').is(":checked")){
                    malBookmarks = 1;
                    GM_setValue('malBookmarks', 1);
                    location.reload();
                }else{
                    malBookmarks = 0;
                    GM_setValue('malBookmarks', 0);
                    location.reload();
                }
            });
            if(malBookmarks == 1){
                K.classicBookmarkButton(optionsTarget, checkClassic);//optionsTarget.before('<div><input type="checkbox" id="BookmarksStyle" '+checkfix+' > Fix Bookmark styling</div><div class="clear2">&nbsp;</div>');
                $('#classicBookmarks').change(function(){
                    if($('#classicBookmarks').is(":checked")){
                        classicBookmarks = 1;
                        GM_setValue('classicBookmarks', 1);
                        location.reload();
                    }else{
                        classicBookmarks = 0;
                        GM_setValue('classicBookmarks', 0);
                        location.reload();
                    }
                });
            }
        });
        if(malBookmarks == 1){
            try{
                GM_addStyle(K.bookmarkCss);
                if(BookmarksStyle == 1){
                    GM_addStyle(K.bookmarkFixCss);
                }
                if(classicBookmarks == 1){
                    GM_addStyle('.listing tr:not(.head) br{display: none;} .listing tr:not(.head) .title{width: 30%; float: left;padding-bottom: 0 !important;}.kissData { width: 35% !important;} .MalData {width: 35% !important;}td.Timage {height: 0 !important;} #cssTableSet{min-width: 0 !important} #endSpacer{width: 0 !important;}');
                    GM_addStyle('select.malStatus { width: 33% !important; float: left; margin-right: 9%;}select.malUserRating {width: 33% !important; float: left;}.malEpisode {width: 25%; float: left;}');
                }
            }catch(e){}

            getMalXml();
        }
    }else if(window.location.href.indexOf("myanimelist.net") > -1 ){
        malThumbnails();
        if(window.location.href.indexOf("myanimelist.net/anime.php") > -1){
            window.history.replaceState(null, null, '/anime/'+$.urlParam('id') );
        }
        if(window.location.href.indexOf("myanimelist.net/manga.php") > -1){
            window.history.replaceState(null, null, '/manga/'+$.urlParam('id') );
        }
        if(window.location.href.indexOf("myanimelist.net/animelist") > -1 || window.location.href.indexOf("myanimelist.net/mangalist") > -1 ){
            K.listType = K.listType.substring(0,5);
            tagToContinue();
        }else{
            setKissToMal(window.location.href);
            if(miniMALonMal){
                $( document).ready(function(){
                    setTimeout(function(){
                        createIframe();
                        miniMalButton(window.location.href.split('/').slice(0,6).join('/').split("?")[0]);
                    }, 4000);
                });
            }

            $( document).ready(function(){

                epPrediction(window.location.href.split('/')[4], function(timestamp, airing, diffWeeks, diffDays, diffHours, diffMinutes, episode){
                    if(airing){
                        var titleMsg = 'Next episode estimated in '+diffDays+'d '+diffHours+'h '+diffMinutes+'m' ;
                        if(episode){
                            $('[id="curEps"]').before('<span title="'+titleMsg+'">['+episode+']</span> ');
                        }
                        $('#addtolist').prev().before('<span>'+titleMsg+'</span>');
                    }else{
                        $('#addtolist').prev().before('<span>Airing in '+((diffWeeks*7)+diffDays)+'d '+diffHours+'h '+diffMinutes+'m </span>');
                    }
                });

                getanime(window.location.href, function(actual){
                    if(actual['.add_'+K.listType+'[tags]'].indexOf("last::") > -1 ){
                        var url = atobURL( actual['.add_'+K.listType+'[tags]'].split("last::")[1].split("::")[0] );
                        $('.h1 span').first().after('<div class="data title progress" style="display: inline-block; position: relative; top: 2px;"><div class="link" style="display: none;">'+$('#myinfo_watchedeps').first().val()+'</div></div>');
                        setStreamLinks(url, $('.h1').first().parent());
                    }
                }, window.location.href, window.location.href.split('/')[3]);
            });
        }
    }else{
        $("head").click(function() {
            checkdata();
        });

        K.init();

        try{
            window.onpopstate = function (event) {
                checkdata();
            };
        }catch(e){}
    }

    $(document).ready(function(){
        changelog();
    });
})();

/**
 * External Script
 * author Remy Sharp
 * url http://remysharp.com/2009/01/26/element-in-view-event-plugin/
 */
(function ($) {
    function getViewportHeight() {
        var height = window.innerHeight; // Safari, Opera
        var mode = document.compatMode;

        if ( (mode || !$.support.boxModel) ) { // IE, Gecko
            height = (mode == 'CSS1Compat') ?
            document.documentElement.clientHeight : // Standards
            document.body.clientHeight; // Quirks
        }

        return height;
    }

    $(window).scroll(function () {
        var vpH = getViewportHeight() + 500,
            scrolltop = (document.documentElement.scrollTop ?
                document.documentElement.scrollTop :
                document.body.scrollTop),
            elems = [];
        
        $.each($.cache, function () {
            if (this.events && this.events.inview) {
                elems.push(this.handle.elem);
            }
        });

        if (elems.length) {
            $(elems).each(function () {
                if ($(this).css("display") != "none") {
                    var $el = $(this),
                        top = $el.offset().top,
                        height = $el.height(),
                        inview = $el.data('inview') || false;

                    if (scrolltop > (top + height) || scrolltop + vpH < top) {
                        if (inview) {
                            $el.data('inview', false);
                            $el.trigger('inview', [ false ]);                        
                        }
                    } else if (scrolltop < (top + height)) {
                        if (!inview) {
                            $el.data('inview', true);
                            $el.trigger('inview', [ true ]);
                        }
                    }
                }
            });
        }
    });
    
    $(function () {
        $(window).scroll();
    });
})(jQuery);
