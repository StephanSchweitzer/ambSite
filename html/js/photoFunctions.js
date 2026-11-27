// ==========================================================================
// Public site: pages, galleries and the artwork viewer
// ==========================================================================
//
// The whole public site is one page (index.php); everything visible is drawn
// here. The address bar is kept in step with what's on screen, so the
// browser's Back/Forward buttons, bookmarks and shared links all work:
//
//   /                  home slideshow (phones and tablets go to the works)
//   /select-works      the works, grouped by project
//   /work/<id>/<name>  the works, scrolled to that painting, open in the viewer
//   /about  /current-project
//   /shop  /shop/<id>/<name>  /shop/basket  /shop/thank-you   (drawn by shop.js)
//   anything else      "page not found" (index.php also sends a real 404)

var BREAKPOINT = 992;
var GALLERY_SIZES = '(max-width: 992px) 92vw, 62vw';
var WEB_VARIANT_WIDTHS = [800, 1200]; // same as AMB_WEB_VARIANT_WIDTHS in imageManipulationFunctions.php
var PAGE_TITLES = {
    'home': 'Ambar Velasco Portfolio',
    'works': 'Select Works - Ambar Velasco',
    'about': 'About - Ambar Velasco',
    'shop': 'Shop - Ambar Velasco',
    'shop-item': 'Shop - Ambar Velasco',
    'shop-basket': 'Basket - Ambar Velasco',
    'shop-thanks': 'Thank you - Ambar Velasco',
    'current-project': 'Current Project - Ambar Velasco',
    'notfound': 'Page not found - Ambar Velasco'
};

var isMobile = false;
var currentView = null;      // which page is drawn: 'home', 'works', 'about', ...
var viewReady = false;       // true once that page's content has arrived
var shownPath = null;        // the shop's pages share a few views: the address of the one drawn
var pageTitle = document.title; // the page's own title (the viewer borrows the title bar while open)
var galleryItems = [];       // the works on the current page, in order
var cachedRequests = {};     // API responses, fetched once per visit
var aboutLayout = null;
var zIndexCounter = 22;

// index.php sends each page already drawn, along with the data it drew it
// from (AMB_PAGE_DATA), so the first page of a visit needs no requests
var pageData = window.AMB_PAGE_DATA || {};
var pageIsServerDrawn = false; // the page being shown is the one index.php drew

// The artwork viewer (the full-screen modal)
var viewer = {
    items: [],
    index: 0,
    open: false,
    basePath: '/select-works',  // the page underneath, restored on close
    closingFromHistory: false,
    loadToken: 0,
    opening: false,          // the open / close animations are running
    closing: false,
    waitingForImage: false,  // opened with nothing to show yet: appears once loaded
    afterOpening: null,      // swap in the sharper copy once the opening has finished
    source: null,            // { index, img }: the picture on the page it grew out of
    hiddenInPage: [],        // pictures on the page hidden while their twin is in the viewer
    tapeUp: [],              // cards whose tape is folded back while their painting is out (liftTape)
    tapeWait: null,          // an opening waiting for the tape to finish folding (waitForTape)
    hidingNow: false,        // closeViewer's own final, instant hide
    room: 0,                 // height left for the painting (fitViewerToScreen)
    loading: null            // { work, src }: the copy being shown / loaded
};
var scrollPosition = 0;
var startX, startY;
var isPinching = false;

// We put the scroll position back ourselves (see rememberScroll)
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// --------------------------------------------------------------------------
// TEMPORARY test switch, for the white flash iPhones show when a painting
// opens. ?vt=<number> in the address picks one test and ?vt=menu lists them;
// without it none of this does anything. Each test changes one thing about
// opening a painting, or (the probes) does one thing on its own instead of
// opening it. Remove once the flash is fixed.
// --------------------------------------------------------------------------
var VIEWER_TESTS = [
    { id: '0', name: 'Normal',
      about: 'Nothing changed: the site exactly as it is.' },
    { id: '1', name: 'Probe: the page is redrawn', probe: 'redraw',
      about: 'A tap does not open the painting. The whole page is drawn again (the margins turn pink). Do the paintings blink?' },
    { id: '2', name: 'Probe: one tiny new layer', probe: 'layer',
      about: 'A tap does not open the painting. A small pink dot appears at the left edge. Do the paintings blink?' },
    { id: '3', name: 'Probe: the dark background alone', probe: 'backdrop',
      about: 'A tap does not open the painting. Only the viewer\'s dark background comes in. Do the paintings blink before it darkens?' },
    { id: '4', name: 'Pictures decoded at once', syncDecode: true,
      about: 'The page\'s pictures use decoding="sync" instead of "async".' },
    { id: '5', name: 'Pictures on screen decoded first', predecode: true,
      about: 'The pictures on screen are decoded before the viewer opens.' },
    { id: '9', name: 'Address and title unchanged', noHistory: true,
      about: 'Opening changes neither the address (no pushState) nor the page title.' },
    { id: '10', name: 'No blur, no newsletter bubble', noBlur: true,
      about: 'No blurred header or menu, and no floating newsletter bubble.' },
    { id: '11', name: 'No animation', noAnim: true,
      about: 'The painting and the dark background appear at once, with no growing or fading.' },
    { id: '12', name: 'No will-change, focus or bar colour', noWillChange: true, noFocus: true, noThemeColor: true,
      about: 'No will-change hints, the viewer is not focused, and the browser bar keeps its colour.' }
];

// The test asked for (empty without ?vt=)
var VT = (function () {
    var asked = (/[?&]vt=([^&#]*)/.exec(location.search) || [])[1];
    var test = VIEWER_TESTS.filter(function (each) {
        return each.id === asked;
    })[0];
    return $.extend({ menu: asked === 'menu' }, test);
})();

// --------------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------------

function webImageUrl(location) {
    return '/baseImages/web/' + encodeURIComponent(location);
}

function thumbnailUrl(location) {
    return '/thumbnails/' + encodeURIComponent(location);
}

// A narrower copy of the web copy (made on first request by webImage.php)
function webVariantUrl(location, width) {
    return '/baseImages/web/' + width + '/' + encodeURIComponent(location);
}

// Every size of a work for srcset, so each screen downloads only what it
// needs. Same as ambWorkSrcset() in publicPageFunctions.php.
function workSrcset(work) {
    var sources = [thumbnailUrl(work.location) + ' 400w'];
    WEB_VARIANT_WIDTHS.forEach(function (width) {
        if (width < work.width) {
            sources.push(webVariantUrl(work.location, width) + ' ' + width + 'w');
        }
    });
    sources.push(webImageUrl(work.location) + ' ' + work.width + 'w');
    return sources.join(', ');
}

// How wide a painting is drawn in the viewer, in CSS pixels (the same sums
// as .popUpImage / .popUpImageMobile in ambar.css)
function viewerImageWidth(work) {
    var ratio = work.width / work.height;
    var mobile = window.innerWidth <= BREAKPOINT;
    var room = viewer.room || window.innerHeight * (mobile ? 0.9 : 0.82);
    var across = window.innerWidth - 2 * viewerArrowRoom();
    if (mobile) {
        return Math.min(across, room * ratio);
    }
    return Math.min(across, room * ratio, work.width);
}

// The space kept free at each side of the screen for the prev / next arrows
// (--arrow-room in ambar.css; on phones they go beneath the painting)
function viewerArrowRoom() {
    var w = window.innerWidth;
    if (w <= 576) return w * 0.05;
    if (w <= 768) return 54;
    return w <= BREAKPOINT ? 60 : 72;
}

// The viewer always fits on the screen, with nothing to scroll to: the
// buttons along the top, then the painting, then its title and
// description. This works out the height left for the painting once the
// others have their room (the caption is measured, so it's right for each
// painting) and gives it to ambar.css as --room. A description opened up
// with "more" can make the painting smaller, but never below 40% of the
// screen; past that the viewer scrolls (updateViewerScrolling).
var VIEWER_TOP_PX = 66;          // clear of the close / zoom / scale buttons
var VIEWER_TOP_PX_MOBILE = 58;
var VIEWER_BOTTOM_PX = 14;

function fitViewerToScreen() {
    var modal = document.getElementById('bigPicModal');
    var info = document.getElementById('imageInfo');
    var top = window.innerWidth <= BREAKPOINT ? VIEWER_TOP_PX_MOBILE : VIEWER_TOP_PX;
    var screenH = modal.clientHeight || window.innerHeight;
    var room = screenH - top - VIEWER_BOTTOM_PX - info.offsetHeight;
    viewer.room = Math.floor(Math.max(room, screenH * 0.4));
    modal.style.setProperty('--viewer-top', top + 'px');
    modal.style.setProperty('--viewer-bottom', VIEWER_BOTTOM_PX + 'px');
    modal.style.setProperty('--room', viewer.room + 'px');
    // The painting's width, so the arrows can sit just outside it
    var work = viewer.items && viewer.items[viewer.index];
    if (work && work.width && work.height) {
        modal.style.setProperty('--painting-w', Math.round(viewerImageWidth(work)) + 'px');
    } else {
        modal.style.removeProperty('--painting-w');
    }
}

// A long description shows its first lines, with "more" to open it up
function setUpDescription() {
    var desc = document.getElementById('imageDescription');
    $('#imageInfo').removeClass('is-expanded');
    $('#imageMore').text('more').prop('hidden', desc.scrollHeight <= desc.clientHeight + 1);
}

// The smallest copy that still fills the viewer sharply on this screen
function viewerImageUrl(work) {
    if (!work.width || !work.height) {
        return webImageUrl(work.location);
    }
    var needed = viewerImageWidth(work) * (window.devicePixelRatio || 1);
    for (var i = 0; i < WEB_VARIANT_WIDTHS.length; i++) {
        var width = WEB_VARIANT_WIDTHS[i];
        if (width < work.width && width >= needed) {
            return webVariantUrl(work.location, width);
        }
    }
    return webImageUrl(work.location);
}

function originalImageUrl(location) {
    return '/baseImages/' + encodeURIComponent(location);
}

// A phone or tablet (touch is how it's used), whatever its width
function isTouchScreen() {
    return !!window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

// The page has smooth scrolling for in-page jumps, but putting the page back
// where it was must be instant, or it visibly glides down from the top (and
// a new page, like the shop after the works, glides up from far down).
// behavior 'instant' is what overrides the stylesheet: switching the style
// off around the call isn't enough, Chrome still glides.
function instantScrollTo(y) {
    var top = Math.max(0, y);
    try {
        window.scrollTo({ top: top, left: 0, behavior: 'instant' });
    } catch (e) {
        // (older browsers that don't know 'instant')
        var html = document.documentElement;
        var previous = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        void getComputedStyle(html).scrollBehavior; // (makes the browser see it)
        window.scrollTo(0, top);
        html.style.scrollBehavior = previous;
    }
}

function currentScrollY() {
    return viewer.open ? scrollPosition : window.pageYOffset;
}

// Save how far down the current page is, so Back can return to the same spot
function rememberScroll() {
    history.replaceState($.extend({}, history.state, { scrollY: currentScrollY() }), '');
}

function projectSectionId(title) {
    var slug = String(title).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return 'section-' + (slug || 'project');
}

// The anchor one year group of a project sits at, so a menu link can jump
// straight to it. Mirrors ambGroupSectionId() in publicPageFunctions.php.
function groupSectionId(projectTitle, label) {
    var slug = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return projectSectionId(projectTitle) + (slug ? '-' + slug : '');
}

function multiline(text) {
    return text ? String(text).replace(/\n/g, '<br>') : '';
}

function loadingHtml(message) {
    return '<div class="loading-container"><div class="loading-spinner"></div><p>' + message + '</p></div>';
}

function errorHtml(message) {
    return '<div class="error-message"><p>' + message + '</p></div>';
}

// Runs draw(data) once the request has its data: straight away if it's
// already here (no spinner, no flicker), otherwise when it arrives
function whenLoaded(request, draw, failed) {
    var drawn = $.Deferred();
    request.done(function (data) {
        draw(data);
        drawn.resolve();
    }).fail(function () {
        failed();
        drawn.reject();
    });
    return drawn.promise();
}

function isLoaded(request) {
    return request.state() === 'resolved';
}

// One request per kind of data per visit; a failed request is retried next time
function fetchPublicWorks(view) {
    if (!cachedRequests[view] && pageData[view]) {
        cachedRequests[view] = $.Deferred().resolve(pageData[view]).promise();
    }
    if (!cachedRequests[view]) {
        cachedRequests[view] = $.ajax({
            url: '/actions/publicWorksAPI.php',
            data: { view: view },
            dataType: 'json'
        }).then(function (response) {
            return response.projects || response.works || [];
        });
        cachedRequests[view].fail(function () {
            delete cachedRequests[view];
        });
    }
    return cachedRequests[view];
}

// <img> for a work: a small or web-sized copy depending on the screen,
// loaded only as it scrolls near (lazy), with its space reserved up front so
// the page doesn't jump around while pictures arrive
function workImage(work, options) {
    var img = document.createElement('img');
    img.loading = options.lazy ? 'lazy' : 'eager';
    img.decoding = 'sync';  // not async: iPhones blank async pictures for a few frames when a painting opens
    // The page's first painting: fetch it ahead of everything else
    if (options.priority) {
        img.setAttribute('fetchpriority', 'high');
    }
    if (work.width && work.height) {
        img.width = work.width;
        img.height = work.height;
        if (options.sizes && work.width > 400) {
            img.sizes = options.sizes;
            img.srcset = workSrcset(work);
        }
    }
    img.src = webImageUrl(work.location);
    img.alt = work.name;
    img.setAttribute('data-original', originalImageUrl(work.location));
    if (options.className) {
        img.className = options.className;
    }
    return img;
}

// If a web-sized copy can't be loaded for any reason, show the original instead
document.addEventListener('error', function (event) {
    var img = event.target;
    if (!img || img.tagName !== 'IMG' || !img.getAttribute('data-original') || img.getAttribute('data-fell-back')) {
        return;
    }
    img.setAttribute('data-fell-back', '1');
    img.removeAttribute('srcset');
    img.src = img.getAttribute('data-original');
}, true);

// --------------------------------------------------------------------------
// Responsive layout (desktop / mobile class pairs, swapped at 992px)
// --------------------------------------------------------------------------

function setupResponsiveLayout() {
    var mobile = window.innerWidth <= BREAKPOINT;

    $('#popUpImage').toggleClass('popUpImageMobile', mobile).toggleClass('popUpImage', !mobile);
    $('#imagesAndContent').toggleClass('imagesAndContentMobile', mobile).toggleClass('imagesAndContent', !mobile);
    $('#blockForHeader').toggleClass('blockForHeaderMobile', mobile).toggleClass('blockForHeader', !mobile);
    $('#navLinksBox').toggleClass('navLinksBoxMobile', mobile).toggleClass('navLinksBox', !mobile);
    $('#homePageCarousel').toggleClass('homePageCarouselMobile', mobile).toggleClass('homePageCarousel', !mobile);
    $('#selectProjectCategories').toggleClass('hiddenLinkStuffMobile', mobile).toggleClass('hiddenLinkStuff', !mobile);
    $('#ambName').toggleClass('ambarNamePicMobile', mobile).toggleClass('ambarNamePic', !mobile);

    // Bigger tap targets for the menu links on phones (the projects and years
    // under Works get theirs from ambar.css)
    $('#navLinksBox a').not('#selectProjectCategories a').each(function () {
        this.style.padding = mobile ? '.05em' : '';
        this.style.margin = mobile ? '-.05em' : '';
    });
    if (mobile) {
        $('#navLinksBox a.mainLinkGenres').css({ padding: '.7em', margin: '-.7em' });
    }

    isMobile = mobile;

    // The About page has a stacked layout for narrower screens
    if (currentView === 'about' && viewReady && aboutLayout !== (window.innerWidth <= 1206 ? 'stacked' : 'side')) {
        renderAbout(true);
    }
}

$(window).on('resize', setupResponsiveLayout);

// --------------------------------------------------------------------------
// Moving between pages
// --------------------------------------------------------------------------

function parseRoute(pathname) {
    var path = '/' + String(pathname).replace(/^\/+|\/+$/g, '');
    var pages = {
        '/': 'home',
        '/index.php': 'home',
        '/select-works': 'works',
        '/about': 'about',
        '/shop': 'shop',
        '/current-project': 'current-project'
    };
    if (pages[path]) {
        return { view: pages[path], path: path === '/index.php' ? '/' : path };
    }
    var match = path.match(/^\/work\/(\d+)(?:\/[^\/]*)?$/);
    if (match) {
        return { view: 'works', path: path, workId: Number(match[1]) };
    }
    if (path === '/shop/basket') {
        return { view: 'shop-basket', path: path };
    }
    if (path === '/shop/thank-you') {
        return { view: 'shop-thanks', path: path };
    }
    if (/^\/shop\/\d+(?:\/[^\/]*)?$/.test(path)) {
        return { view: 'shop-item', path: path };
    }
    return { view: 'notfound', path: path };
}

function isShopView(view) {
    return String(view).indexOf('shop') === 0;
}

// True when that page is the one already on screen. Each shop item has its
// own address but the same view, so for the shop the address has to match too.
function isShowing(view, route) {
    return view === currentView && (!isShopView(view) || route.path === shownPath);
}

var shopDrawing = null; // the shop page being drawn: { path, promise }

// Draws a page (without touching the address bar). Returns a promise that
// resolves once the page's content is on screen.
// options.turn: the shop arrives with a turn of the page (turnPageOut), at
// options.scrollY (default the top)
function renderView(view, route, options) {
    if (isShowing(view, route) && viewReady) {
        return $.Deferred().resolve().promise();
    }
    if (isShopView(view)) {
        // (asked for again while it's still being drawn, e.g. Shop clicked
        // twice as the page turns: the drawing under way carries on)
        if (shopDrawing && shopDrawing.path === route.path && currentView === view && shopDrawing.promise.state() === 'pending') {
            return shopDrawing.promise;
        }
        shownPath = route.path;
        var drawing = renderShopPage(view, route.path, options || {}); // shop.js
        shopDrawing = { path: route.path, promise: drawing };
        return drawing;
    }
    switch (view) {
        case 'works': return renderWorks();
        case 'about': return renderAbout();
        case 'current-project': return renderCurrentProject();
        case 'notfound': return renderNotFound();
        default: return renderHome();
    }
}

// Go to another page of the site, adding it to the browser history.
// options.section: scroll to that project section once the works are shown.
// options.state: more to keep in the history entry
function goTo(path, options) {
    options = options || {};
    if (viewer.open) {
        closeViewer({ fromHistory: true, instantly: true });
    }

    var route = parseRoute(path);
    var view = route.view;
    // (opening or closing a shop item's panel keeps the shop where it is)
    var changingPage = !isShowing(view, route) && !shopPanelMove(view);
    // Into the shop from another page: the page turns (and goes to the top
    // itself, once the old page has faded)
    var turning = changingPage && !options.section && turnsToShop(view);

    if (path !== location.pathname) {
        rememberScroll();
        history.pushState($.extend({}, options.state, { path: path }), '', path);
    }

    var ready = renderView(view, route, { turn: turning });
    if (changingPage && !options.section && !turning) {
        instantScrollTo(0);
    }

    ready.then(function () {
        if (options.section) {
            scrollToSection(options.section, !changingPage);
        }
    });
    return ready;
}
window.goTo = goTo;

// Back / Forward
window.addEventListener('popstate', function (event) {
    var route = parseRoute(location.pathname);
    var view = route.view;
    var state = event.state || {};

    // Forward into a painting that's on the page already
    if (route.workId && currentView === 'works' && viewReady) {
        openSharedWork(route.workId, { fromHistory: true });
        return;
    }

    // Back from a painting to the page it was opened from: it shrinks back
    // into place. Anywhere else: close at once, the page is about to change.
    if (viewer.open) {
        closeViewer({ fromHistory: true, instantly: !isShowing(view, route) || !!route.workId });
    }

    // e.g. Back after closing the viewer: the right page is already showing
    if (isShowing(view, route) && !route.workId) {
        return;
    }

    // A shop item's panel opening or closing: the shop stays where it is
    if (shopPanelMove(view)) {
        renderView(view, route);
        return;
    }

    var turning = turnsToShop(view);
    renderView(view, route, { turn: turning, scrollY: state.scrollY }).then(function () {
        if (currentView !== view) {
            return; // (the visitor has moved on meanwhile)
        }
        if (route.workId) {
            openSharedWork(route.workId, {});
        } else {
            instantScrollTo(typeof state.scrollY === 'number' ? state.scrollY : 0);
        }
    });
    if (typeof state.scrollY !== 'number' && !turning) {
        instantScrollTo(0);
    }
});

// Going to the shop's front page from a page that isn't the shop
function turnsToShop(view) {
    return view === 'shop' && !isShopView(currentView);
}

function setView(view) {
    leaveCheckout(view); // shop.js: a payment left unfinished is given up
    leaveShopPanel(view); // shop.js: an item's panel closes when the shop does
    endPageTurn();
    var main = document.getElementById('imagesAndContent');
    pageIsServerDrawn = main.getAttribute('data-server-view') === view;
    main.removeAttribute('data-server-view');
    currentView = view;
    viewReady = false;
    pageTitle = PAGE_TITLES[view] || PAGE_TITLES.home;
    document.title = pageTitle;
    $('#imagesAndContent').attr('data-view', view);
    drawBasketPill(); // shop.js: the basket button isn't shown on the basket page itself
    showShopTestBar(view); // shop.js: "Test shop" bar, on shop pages while Stripe is in test mode
    // The menu's Shop link stops glowing once you are in the shop (ambar.css)
    document.documentElement.classList.toggle('on-shop', view.indexOf('shop') === 0);
}

// For a page whose title depends on what it shows (a shop item's name)
function setPageTitle(title) {
    pageTitle = title;
    if (!viewer.open) {
        document.title = title;
    }
}

// --------------------------------------------------------------------------
// Turning the page (going to the shop)
// --------------------------------------------------------------------------
//
// Going to the shop from another page: what's on the sheet fades away where
// it is (nothing scrolls), the shop is put in its place unseen, already at
// the top, with its first pictures ready, and then rises gently into view.
// Nothing jumps and nothing is seen half drawn. renderShopPage() (shop.js)
// drives it; ambar.css: "Turning the page".
var PAGE_OUT_MS = 200;            // the fade out in ambar.css (.page-out)
var PAGE_IN_MS = 560;             // the rise in ambar.css (.page-rising)
var PAGE_PICTURES_WAIT_MS = 450;  // the longest the new page waits for its first pictures
var pageTurnTimer = null;
var pageTurnToken = 0; // a rise only starts for the latest page put in place

function turnPageOut(content) {
    endPageTurn();
    content.addClass('page-out');
    var faded = $.Deferred();
    pageTurnTimer = setTimeout(faded.resolve, prefersReducedMotion() ? 0 : PAGE_OUT_MS);
    return faded.promise();
}

// The new page is in place (still faded out): put it at the top, wait for
// the pictures on screen, then let it rise. Resolves as it starts rising.
function turnPageIn(content, scrollY) {
    clearTimeout(pageTurnTimer);
    var token = ++pageTurnToken;
    content.removeClass('page-out page-rising').addClass('page-in');
    instantScrollTo(scrollY || 0);
    return picturesInSight(content[0], PAGE_PICTURES_WAIT_MS).then(function () {
        if (token !== pageTurnToken) {
            return; // (another page, or the shop after its spinner, came meanwhile)
        }
        void content[0].offsetWidth; // (starts from the faded, lowered place)
        content.removeClass('page-in').addClass('page-rising');
        pageTurnTimer = setTimeout(endPageTurn, PAGE_IN_MS + 50);
    });
}

// Every page drawn starts from here (setView), so a turn cut short by
// another click never leaves a page faded out
function endPageTurn() {
    clearTimeout(pageTurnTimer);
    pageTurnToken++;
    $('#imagesAndContent').removeClass('page-out page-in page-rising');
}

// Resolves once the pictures on screen are ready to draw, or after `wait`
function picturesInSight(root, wait) {
    var ready = $.Deferred();
    var pictures = $(root).find('img').filter(function () {
        var rect = this.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
    }).get();
    setTimeout(ready.resolve, wait);
    $.when.apply($, pictures.map(function (img) {
        var one = $.Deferred();
        if (img.decode) {
            img.decode().then(one.resolve, one.resolve);
        } else if (img.complete) {
            one.resolve();
        } else {
            $(img).one('load error', one.resolve);
        }
        return one.promise();
    })).then(ready.resolve);
    return ready.promise();
}

// --------------------------------------------------------------------------
// Works page
// --------------------------------------------------------------------------

// Year groups inside a project. The projects in YEAR_GROUPED_PROJECTS -
// today all four of them - are shown as 2025-2026, 2023-2024 and 2020-2022,
// newest group first, with a small heading over each group; nothing is stored for this, the groups come from
// the year each work already carries. Mirrors ambWorkGroups() in
// actions/publicPageFunctions.php - change both.
var YEAR_BANDS = [[2025, 2026], [2023, 2024], [2020, 2022]];
var YEAR_GROUPED_PROJECTS = ['painting', 'plantart', 'drawing', 'tapeworks'];

function groupsByYear(title) {
    return YEAR_GROUPED_PROJECTS.indexOf(String(title).replace(/\s+/g, '').toLowerCase()) !== -1;
}

function yearBandLabel(from, to) {
    return from === to ? String(from) : from + '\u2013' + to;
}

// The four-digit year a work carries, or null if it hasn't got a sensible one
function workYear(work) {
    var found = String(work.creationYear === null || work.creationYear === undefined ? '' : work.creationYear).match(/\d{4}/);
    if (!found) {
        return null;
    }
    var year = Number(found[0]);
    return (year < 1900 || year > 2100) ? null : year;
}

// A project's works as the page draws them: one group per year band that has
// works in it, newest first, then any undated works in a last group with no
// heading. A project that isn't grouped - or one whose works all fall in the
// same group - comes back as a single group with no heading, which draws
// exactly as it always has.
function workGroups(project) {
    var single = [{ label: '', works: project.works }];
    if (!groupsByYear(project.title)) {
        return single;
    }

    var groups = [];
    var byLabel = {};
    project.works.forEach(function (work) {
        var year = workYear(work);
        var label = '';
        var from = -1; // undated works sort to the end
        if (year !== null) {
            label = String(year);
            from = year;
            for (var i = 0; i < YEAR_BANDS.length; i++) {
                if (year >= YEAR_BANDS[i][0] && year <= YEAR_BANDS[i][1]) {
                    label = yearBandLabel(YEAR_BANDS[i][0], YEAR_BANDS[i][1]);
                    from = YEAR_BANDS[i][0];
                    break;
                }
            }
        }
        if (!byLabel.hasOwnProperty(label)) {
            byLabel[label] = { label: label, from: from, works: [] };
            groups.push(byLabel[label]);
        }
        byLabel[label].works.push(work);
    });

    if (groups.length < 2) {
        return single;
    }
    return groups.sort(function (a, b) { return b.from - a.from; });
}

// Every work on the page in the order it is drawn, which is what the number
// on each card counts through and what the viewer's arrows follow
function worksInDrawnOrder(projects) {
    var works = [];
    projects.forEach(function (project) {
        workGroups(project).forEach(function (group) {
            works = works.concat(group.works);
        });
    });
    return works;
}

function renderWorks() {
    setView('works');
    var content = $('#imagesAndContent').css('padding-top', '50px');
    var request = fetchPublicWorks('projects');
    var keepServerDrawn = pageIsServerDrawn;
    if (!isLoaded(request)) {
        content.html(loadingHtml('Loading works...'));
    }

    return whenLoaded(request, function (projects) {
        if (currentView !== 'works') {
            return;
        }
        if (keepServerDrawn) {
            galleryItems = worksInDrawnOrder(projects);
            prepareArrivals(content);
            viewReady = true;
            return;
        }
        content.empty();
        var items = [];

        projects.forEach(function (project, projectIndex) {
            var section = createProjectElement(project);
            var groups = workGroups(project);
            // Headed or not, every group of a grouped project gets the wrapper
            var grouped = groups.length > 1;
            groups.forEach(function (group) {
                var grid = $('<div>').addClass('projectWorks');
                if (grouped) {
                    var wrapper = $('<div>').addClass('project-group');
                    if (group.label) {
                        wrapper.attr('id', groupSectionId(project.title, group.label));
                        wrapper.append($('<h3>').addClass('project-year').text(group.label));
                    }
                    section.append(wrapper.append(grid));
                } else {
                    section.append(grid);
                }
                group.works.forEach(function (work) {
                    // The first couple of pictures load straight away; the rest
                    // load as the visitor scrolls towards them
                    grid.append(createWorkCard(work, items.length, items.length > 1));
                    items.push(work);
                });
            });
            if (projectIndex < projects.length - 1) {
                section.append('<div class="work-separator" aria-hidden="true"> ✧ ˚. ࣪ ˖ ·ﾟ ·ﾟ·:。·ﾟﾟ·✮ ⋆ ˚。☆ ⋆。°✩·ﾟ ·ﾟ·:。·ﾟﾟ·°˖✧</div>');
            }
            content.append(section);
        });

        galleryItems = items;
        prepareArrivals(content);
        viewReady = true;
    }, function () {
        if (currentView === 'works') {
            content.html(errorHtml('Sorry, there was a problem loading the works. Please try again later.'));
        }
    });
}

function createProjectElement(project) {
    var section = $('<section>').addClass('project').attr('id', projectSectionId(project.title));
    var header = $('<div>').addClass('project-header');
    header.append($('<h2>').addClass('project-title').text(project.title));
    if (project.description) {
        header.append($('<p>').addClass('project-description').html(multiline(project.description)));
    }
    section.append(header); // renderWorks adds a grid of works per year group
    return section;
}

// The paintings further down the Works, so a fast scroll rarely meets an
// empty space:
//  - each starts downloading well before it's reached (FETCH_AHEAD), not
//    only a screen or so ahead, as the browser would on its own;
//  - each is unpacked (decoded) a little before it reaches the screen
//    (DECODE_AHEAD), so drawing it then costs nothing;
//  - while one is still on its way, its space shows the painting's small
//    400px copy (it arrives almost at once), softened by being stretched,
//    and the painting settles in sharp on top of it.
// A painting that lands before anyone has looked at its space simply
// appears (a fade there reads as a flash); only one somebody has been
// waiting for fades in over its preview, quickly. The first couple load
// straight away and aren't touched. ambar.css: "A painting on its way".
var ARRIVAL_WAITED_MS = 150; // on screen this long before it landed: fade it in
var ARRIVAL_FADE_MS = 350;   // the fade in ambar.css (.is-landing)
var FETCH_AHEAD = '250% 0px';  // start downloading two and a half screens ahead
var DECODE_AHEAD = '120% 0px'; // unpack about a screen ahead

var arrivalWatchers = [];

function prepareArrivals(root) {
    // One set of watchers at a time: the cards of an earlier drawing are gone
    arrivalWatchers.forEach(function (watcher) {
        watcher.disconnect();
    });
    arrivalWatchers = [];
    var watching = 'IntersectionObserver' in window;
    var watch = function (margin, reached) {
        if (!watching) {
            return null;
        }
        var watcher = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                reached(entry.target, entry.isIntersecting, watcher);
            });
        }, { rootMargin: margin });
        arrivalWatchers.push(watcher);
        return watcher;
    };
    // When each waiting space came into sight (0: not in sight)
    var sight = watch('0px', function (card, inSight) {
        card.seenAt = inSight ? (card.seenAt || performance.now()) : 0;
    });
    var fetching = watch(FETCH_AHEAD, function (card, near, watcher) {
        if (near) {
            watcher.unobserve(card);
            showPreview(card);
            card.querySelector('img').loading = 'eager';
        }
    });
    var decoding = watch(DECODE_AHEAD, function (card, near, watcher) {
        var img = card.querySelector('img');
        if (near && img && img.decode) {
            watcher.unobserve(card);
            img.decode().catch(function () {}); // (a picture that never comes is handled below)
        }
    });

    $(root).find('.projectWorks .img-container img').each(function () {
        var img = this;
        if (img.loading !== 'lazy') {
            return;
        }
        var card = img.parentNode;
        if (decoding) {
            decoding.observe(card);
        }
        if (img.complete) {
            return; // (already here: only unpacking left; or already failed, and nothing is coming)
        }
        var errors = 0;
        function arrived() {
            if (!card.classList.contains('is-arriving')) {
                return;
            }
            if (sight) {
                sight.unobserve(card);
            }
            if (fetching) {
                fetching.unobserve(card);
            }
            var waited = card.seenAt && performance.now() - card.seenAt >= ARRIVAL_WAITED_MS;
            card.classList.remove('is-arriving');
            if (waited) {
                card.classList.add('is-landing');
                setTimeout(function () {
                    card.classList.remove('is-landing');
                    card.style.backgroundImage = '';
                }, ARRIVAL_FADE_MS + 50);
            } else {
                card.style.backgroundImage = '';
            }
        }
        card.seenAt = 0;
        card.classList.add('is-arriving');
        if (sight) {
            sight.observe(card);
            fetching.observe(card);
        }
        img.addEventListener('load', arrived);
        // The first error swaps in the original (the error handler above),
        // whose load arrives here too; only a second means nothing is coming
        img.addEventListener('error', function () {
            if (++errors > 1 || !img.getAttribute('data-original')) {
                arrived();
            }
        });
    });
}

// The painting's small copy as the background of its waiting space. Only
// for paintings bigger than it (a small one is its own preview), and only
// once it's near: the copy is fetched as soon as it's set.
function showPreview(card) {
    var img = card.querySelector('img');
    var original = img && img.getAttribute('data-original');
    if (!card.classList.contains('is-arriving') || !original || !img.srcset) {
        return;
    }
    var preview = original.replace(/^\/baseImages\//, '/thumbnails/');
    card.style.backgroundImage = 'url("' + preview.replace(/"/g, '%22') + '")';
}

// Each work is a real link to its own address, so it can be opened in a new
// tab, copied and shared; a normal click opens the viewer instead
function createWorkCard(work, index, lazy) {
    var container = $('<div>').addClass('img-container');
    container.append(workImage(work, { sizes: GALLERY_SIZES, lazy: lazy, priority: index === 0 }));
    container.append(
        $('<div>').addClass('img-overlay').attr('aria-hidden', 'true')
            .append($('<h3>').addClass('overlay-title').text(work.name))
    );
    return $('<a>').addClass('card work-card').attr({
        href: work.path,
        'data-index': index,
        'aria-label': work.name
    }).append(container);
}

$(document).on('click', '.work-card', function (event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return; // let "open in new tab" and friends work as normal
    }
    event.preventDefault();
    if (VT.id && testInsteadOfOpening(this)) {
        return;
    }
    openViewer(galleryItems, Number(this.getAttribute('data-index')), { from: this });
});

// Scroll so a painting sits in the middle of the screen (or near the top if
// it's taller than the screen)
function scrollWorkIntoView(index) {
    var card = document.querySelector('.work-card[data-index="' + index + '"]');
    if (!card) {
        return;
    }
    var rect = card.getBoundingClientRect();
    var room = window.innerHeight - rect.height;
    instantScrollTo(window.pageYOffset + rect.top - (room > 120 ? room / 2 : 90));
}

function scrollToSection(sectionId, smooth) {
    var section = document.getElementById(sectionId);
    if (!section) {
        return;
    }
    var top = section.getBoundingClientRect().top + window.pageYOffset - 100;
    if (smooth) {
        window.scrollTo({ top: top, behavior: 'smooth' });
    } else {
        instantScrollTo(top);
    }
}

// Opening a shared /work/<id> link: scroll the works to that painting, then
// open it. A work that isn't on the Works page (e.g. only in the slideshow)
// is shown on its own.
function openSharedWork(workId, options) {
    var index = -1;
    for (var i = 0; i < galleryItems.length; i++) {
        if (galleryItems[i].id === workId) {
            index = i;
            break;
        }
    }

    if (index >= 0) {
        if (!options.fromHistory) {
            scrollWorkIntoView(index);
        }
        openViewer(galleryItems, index, {
            addressIsSet: true,
            from: document.querySelector('.work-card[data-index="' + index + '"]')
        });
        return;
    }

    if (pageData.work && pageData.work.id === workId) {
        openViewer([pageData.work], 0, { addressIsSet: true });
        return;
    }

    $.ajax({
        url: '/actions/publicWorksAPI.php',
        data: { view: 'work', id: workId },
        dataType: 'json'
    }).then(function (response) {
        openViewer([response.work], 0, { addressIsSet: true });
    }, function () {
        // Hidden or deleted since the link was shared: just show the works
        history.replaceState({ path: '/select-works' }, '', '/select-works');
    });
}

// --------------------------------------------------------------------------
// The artwork viewer
// --------------------------------------------------------------------------

// Opening: the painting grows out of the picture that was clicked while the
// room dims around it; closing, it shrinks back into its place. Without a
// picture to start from (a shared link, Back / Forward) it fades up gently.
var VIEWER_OPEN_MS = 420;
var VIEWER_CLOSE_MS = 320;
var VIEWER_OPEN_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';   // quick to start, long soft landing
var VIEWER_CLOSE_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
// The browser's bar colour (phones): the page's, and the viewer's dark
// background as it looks over the page
var PAGE_THEME_COLOR = '#ffffff';
var VIEWER_THEME_COLOR = '#222220';
// Never animate opacity up from exactly 0: browsers don't draw an element
// at 0, then need frames to catch up (PhotoSwipe's MIN_OPACITY)
var VIEWER_MIN_OPACITY = 0.003;

// options.addressIsSet: the address bar already shows this work (a shared
// link, or Back/Forward), so don't add a history entry
// options.from: the picture (or card) on the page that was clicked
function openViewer(items, index, options) {
    if (!items.length) {
        return;
    }
    // A taped-up painting waits for its tape to fold back off it
    if (!viewer.open && waitForTape(items, index, options)) {
        return;
    }
    if (viewer.closing) {
        finishClosing();
    }
    var wasOpen = viewer.open;
    var modal = document.getElementById('bigPicModal');
    // A shared painting link arrives with the viewer already drawn open
    var preopened = modal.hasAttribute('data-preopened');
    var source = null;
    viewer.items = items;
    viewer.index = index;

    if (!wasOpen) {
        // Start clean rather than flashing the last painting viewed
        if (!preopened) {
            document.getElementById('popUpImage').removeAttribute('src');
            source = pageImageToGrowFrom(options.from);
        }
        var here = parseRoute(location.pathname);
        viewer.basePath = here.workId ? '/select-works' : here.path;
    }

    var work = items[index];
    if (!options.addressIsSet && location.pathname !== work.path && !VT.noHistory) {
        rememberScroll();
        history.pushState({ path: work.path, viewer: true }, '', work.path);
    }

    if (wasOpen) {
        showViewerImage();
        return;
    }

    viewer.open = true;
    viewer.source = source ? { index: index, img: source } : null;
    // The picture on the page is already loaded: it stands in until the
    // sharper copy is ready, so the painting is there from the first frame
    showViewerImage(0, preopened ? null : {
        placeholder: source ? (source.currentSrc || source.src) : null,
        placeholderWidth: source ? source.naturalWidth : 0
    });
    // (shown at once: the animation below is the only motion)
    viewerModal('show');
    // A plain focus() can nudge the page's scroll on iPhones, which makes
    // Safari redraw it. Focus without scrolling, so Escape still closes.
    if (!VT.noFocus) {
        modal.focus({ preventScroll: true });
    }
    pauseSlideshow(true);

    if (preopened) {
        setThemeColor(VIEWER_THEME_COLOR);
        // Take over the open viewer, and swap the page's own dark
        // background for the viewer's identical one
        modal.removeAttribute('data-preopened');
        $('#preopenedBackdrop').remove();
        updateViewerScrolling();
    } else {
        animateOpening(source);
    }
}

// The picture to grow the painting out of, if it's loaded and on screen
function pageImageToGrowFrom(el) {
    if (!el || prefersReducedMotion()) {
        return null;
    }
    var img = el.tagName === 'IMG' ? el : el.querySelector('img');
    return isUsablePageImage(img) ? img : null;
}

// ...and the one to shrink it back into: where it came from, or the current
// painting's picture if it's on screen
function pageImageToShrinkInto() {
    if (prefersReducedMotion()) {
        return null;
    }
    var candidates = [];
    if (viewer.source && viewer.source.index === viewer.index) {
        candidates.push(viewer.source.img);
    }
    if (viewer.items === galleryItems) {
        candidates.push(document.querySelector('.work-card[data-index="' + viewer.index + '"] img'));
        candidates.push(document.querySelector('.carousel-link[data-index="' + viewer.index + '"] img'));
    }
    for (var i = 0; i < candidates.length; i++) {
        if (isUsablePageImage(candidates[i])) {
            return candidates[i];
        }
    }
    return null;
}

function isUsablePageImage(img) {
    if (!img || !img.complete || !img.naturalWidth || !document.body.contains(img)) {
        return false;
    }
    var rect = img.getBoundingClientRect();
    return rect.width > 4 && rect.height > 4 &&
        rect.bottom > 0 && rect.top < window.innerHeight &&
        rect.right > 0 && rect.left < window.innerWidth;
}

// The transform that draws the viewer's picture (laid out at `at`) exactly
// over `target` (the viewer image's transform-origin is its top-left corner)
function transformOnto(at, target) {
    return 'translate(' + (target.left - at.left) + 'px, ' + (target.top - at.top) + 'px) ' +
        'scale(' + (target.width / at.width) + ', ' + (target.height / at.height) + ')';
}

// A slight shrink about the middle (for the fade in / out)
function shrunkAboutMiddle(at, scale) {
    return 'translate(' + (at.width * (1 - scale) / 2) + 'px, ' + (at.height * (1 - scale) / 2) + 'px) scale(' + scale + ')';
}

// While the painting is in the viewer, its picture on the page is hidden,
// so there's only ever one of it on screen. Not on phones and tablets:
// Safari there can take a few frames to draw the viewer, and a hidden
// picture would leave a white gap meanwhile. The dark background covers
// it instead (PhotoSwipe leaves the picture on the page alone too).
function hideInPage(img) {
    if (isTouchScreen()) {
        return;
    }
    var el = $(img).closest('.img-container')[0] || img;
    el.style.visibility = 'hidden';
    viewer.hiddenInPage.push(el);
}

function showInPage() {
    viewer.hiddenInPage.forEach(function (el) {
        el.style.visibility = '';
    });
    viewer.hiddenInPage = [];
}

// ---------- The tape lets go of the painting ----------
// The viewer's copy of a painting is drawn over the whole page, tape
// included, so if it grew out of a taped-up painting it would pass straight
// through the tape. Instead the tape folds back off the painting first, onto
// the paper round it, and the painting lifts off only once it's clear. When
// the painting is put back the tape folds over it again and is pressed down.
// The motion itself is CSS (.work-card.tape-up in ambar.css); only the Works
// galleries have tape.
var TAPE_FOLD_MS = 160; // = the .tape-up transition in ambar.css

// Folds a card's tape back. Returns the card (also when it's already folded),
// or null where there's no tape to fold.
function liftTape(el) {
    if (!el || prefersReducedMotion() || VT.noAnim) {
        return null;
    }
    var card = $(el).closest('.projectWorks .work-card')[0];
    if (!card) {
        return null;
    }
    if (viewer.tapeUp.indexOf(card) === -1) {
        clearTimeout(card.tapeRestTimer);
        // The tape is flat (2D) at rest; give it the fold's own steps at
        // nothing first, so the fold turns about its edge rather than
        // being guessed between two unlike transforms
        card.classList.add('tape-ready');
        void getComputedStyle(card, '::before').transform;
        card.classList.add('tape-up');
        card.tapeFoldedAt = performance.now();
        viewer.tapeUp.push(card);
    }
    return card;
}

// Lays the tape back down: all of it, or all but `keep`
function pressTapeDown(keep) {
    var cards = viewer.tapeUp.filter(function (card) {
        return card !== keep;
    });
    viewer.tapeUp = keep && viewer.tapeUp.indexOf(keep) !== -1 ? [keep] : [];
    // A moment after the painting has landed, not in the same instant
    setTimeout(function () {
        cards.forEach(function (card) {
            if (viewer.tapeUp.indexOf(card) !== -1) {
                return; // (it's out again)
            }
            card.classList.remove('tape-up');
            // ...and back to flat once it has settled
            card.tapeRestTimer = setTimeout(function () {
                card.classList.remove('tape-ready');
            }, 800);
        });
    }, 40);
}

// Before a painting opens: true when the opening has to wait for its tape
// to finish folding back (openViewer is called again when it has)
function waitForTape(items, index, options) {
    var waiting = viewer.tapeWait;
    clearTimeout(waiting);
    viewer.tapeWait = null;
    var card = liftTape(options.from);
    if (waiting) {
        pressTapeDown(card); // a painting clicked while another was waiting
    }
    if (!card) {
        return false;
    }
    var left = TAPE_FOLD_MS - (performance.now() - card.tapeFoldedAt);
    if (left < 16) {
        return false;
    }
    viewer.tapeWait = setTimeout(function () {
        viewer.tapeWait = null;
        openViewer(items, index, options);
    }, left);
    return true;
}

// With a mouse, the tape starts folding as the button goes down, so most of
// the fold is over by the time the click arrives. If it turns out not to be
// a click (the mouse is dragged off), the tape goes back down.
$(document).on('pointerdown', '.projectWorks .work-card', function (event) {
    if (event.pointerType !== 'mouse' || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || viewer.open) {
        return;
    }
    var card = liftTape(this);
    if (!card) {
        return;
    }
    $(document).one('pointerup pointercancel', function () {
        // (the click, if there is one, comes straight after the pointerup)
        setTimeout(function () {
            if (!viewer.open && !viewer.tapeWait) {
                pressTapeDown();
            }
        }, 0);
    });
});

// delay: change it part-way through the fade, when the screen is about as
// dark (or light) as the colour, rather than with a jump at the start
function setThemeColor(color, delay) {
    clearTimeout(viewer.themeTimer);
    if (VT.noThemeColor) {
        return;
    }
    if (delay) {
        viewer.themeTimer = setTimeout(function () {
            setThemeColor(color);
        }, delay);
        return;
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', color);
    }
}

// The home slideshow holds still while a painting is open
function pauseSlideshow(pause) {
    var slideshow = $('#homePageCarousel');
    if (slideshow.data('bs.carousel')) {
        slideshow.carousel(pause ? 'pause' : 'cycle');
    }
}

function animateOpening(source) {
    if (VT.noAnim) {
        // Test switch: everything is simply there, the dark background too
        setThemeColor(VIEWER_THEME_COLOR);
        updateViewerScrolling();
        return;
    }
    var modal = document.getElementById('bigPicModal');
    var img = document.getElementById('popUpImage');
    var backdrop = document.querySelector('.modal-backdrop');
    var ms = prefersReducedMotion() ? 0 : VIEWER_OPEN_MS;
    var at = img.getBoundingClientRect();
    if (!(at.width > 0 && at.height > 0)) {
        source = null; // nothing to measure the painting by: just fade it up
    }

    // Where it starts: the room still light, the painting sitting exactly
    // over the picture that was clicked. The picture on the page stays
    // visible underneath until the viewer's copy is ready to be drawn, so
    // there's never a frame with neither (phones can take a frame to draw it).
    // The dark background starts all but invisible rather than at 0, which
    // browsers skip drawing and then have to catch up on (as PhotoSwipe
    // does), and the painting is readied for moving before it moves.
    viewer.opening = true;
    $(modal).addClass('is-opening');
    if (backdrop) {
        backdrop.style.transition = 'none';
        backdrop.style.opacity = String(VIEWER_MIN_OPACITY);
    }
    if (source) {
        if (!VT.noWillChange) {
            img.style.willChange = 'transform';
        }
        img.style.transition = 'none';
        img.style.transform = transformOnto(at, source.getBoundingClientRect());
    }

    var started = false;
    var start = function () {
        if (started || !viewer.opening || !viewer.open) {
            return;
        }
        started = true;
        clearTimeout(viewer.openTimer);
        if (source) {
            hideInPage(source);
        }
        void modal.offsetWidth; // let the browser take in the starting point

        // ...and off it goes
        if (backdrop) {
            backdrop.style.transition = 'opacity ' + Math.round(ms * 0.8) + 'ms ease-out';
            backdrop.style.opacity = '';
        }
        setThemeColor(VIEWER_THEME_COLOR, ms * 0.35);
        $(modal).removeClass('is-opening').addClass('is-arriving');
        if (source) {
            img.style.transition = 'transform ' + ms + 'ms ' + VIEWER_OPEN_EASE;
            img.style.transform = '';
            viewer.openTimer = setTimeout(finishOpening, ms + 40);
        } else if (img.getAttribute('src')) {
            fadeUpViewerImage();
        } else {
            // Nothing to show yet: the room dims now, the painting fades up
            // as soon as it has loaded (showViewerImage)
            viewer.openTimer = setTimeout(finishOpening, ms + 40);
        }
    };
    // Start once the copy is decoded (it's normally ready at once: it's the
    // same file the page is already showing) and the starting point has had
    // at least 50ms on screen, but never wait more than 250ms: PhotoSwipe's
    // timings
    viewer.openTimer = setTimeout(start, 250);
    var decoded = false;
    var waited = false;
    var go = function () {
        if (decoded && waited) {
            requestAnimationFrame(start);
            setTimeout(start, 40); // (in case frames aren't being drawn)
        }
    };
    setTimeout(function () {
        waited = true;
        go();
    }, 50);
    var whenDecoded = function () {
        decoded = true;
        go();
    };
    if (img.getAttribute('src') && img.decode) {
        img.decode().then(whenDecoded, whenDecoded);
    } else {
        whenDecoded();
    }
}

// The viewer only becomes a scrolling layer when the painting and its
// caption don't fit on the screen (a very tall painting). On iPhones a
// scrolling layer can skip drawing its contents for a few frames when it
// appears, so it isn't one while opening or closing, or when it needn't be.
function updateViewerScrolling() {
    var modal = document.getElementById('bigPicModal');
    $(modal).toggleClass('can-scroll', modal.scrollHeight > modal.clientHeight + 1);
}

// The painting appears where it is, rising gently into place
function fadeUpViewerImage() {
    var img = document.getElementById('popUpImage');
    var ms = prefersReducedMotion() ? 0 : VIEWER_OPEN_MS;
    var at = img.getBoundingClientRect();
    viewer.opening = true;
    img.style.transition = 'none';
    img.style.opacity = '0';
    img.style.transform = at.width ? shrunkAboutMiddle(at, 0.96) : '';
    void img.offsetWidth;
    img.style.transition = 'transform ' + ms + 'ms ' + VIEWER_OPEN_EASE + ', opacity ' + Math.round(ms * 0.7) + 'ms ease';
    img.style.opacity = '';
    img.style.transform = '';
    clearTimeout(viewer.openTimer);
    viewer.openTimer = setTimeout(finishOpening, ms + 40);
}

function finishOpening() {
    clearTimeout(viewer.openTimer);
    if (!viewer.opening) {
        return;
    }
    viewer.opening = false;
    $('#bigPicModal').removeClass('is-opening is-arriving');
    setThemeColor(VIEWER_THEME_COLOR);
    var img = document.getElementById('popUpImage');
    img.style.transition = '';
    img.style.transform = '';
    img.style.willChange = '';
    if (!viewer.waitingForImage) {
        img.style.opacity = '';
    }
    updateViewerScrolling();
    if (viewer.afterOpening) {
        var then = viewer.afterOpening;
        viewer.afterOpening = null;
        then();
    }
}

// Stepping to another painting (or a swipe) part-way through the opening:
// that movement takes over from wherever the opening had got to
function stopOpening() {
    clearTimeout(viewer.openTimer);
    viewer.opening = false;
    viewer.afterOpening = null;
    $('#bigPicModal').removeClass('is-opening is-arriving');
    document.getElementById('popUpImage').style.willChange = '';
    var backdrop = document.querySelector('.modal-backdrop');
    if (backdrop && backdrop.style.opacity) {
        backdrop.style.transition = 'opacity 250ms ease-out';
        backdrop.style.opacity = '';
    }
    setThemeColor(VIEWER_THEME_COLOR);
}

// Stepping between paintings: the current one drifts away and fades, the
// next drifts in from the other side
var VIEWER_SLIDE_PX = 60;
var VIEWER_LEAVE_MS = 180;
var VIEWER_ARRIVE_MS = 320;

function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// direction: -1 / 1 when stepping to the previous / next painting; leave it
// out when opening the viewer.
// opening: { placeholder }: the viewer is opening; placeholder is an
// already-loaded picture of the same painting to show until the right-sized
// copy is ready (without one, the painting fades up once it has loaded)
function showViewerImage(direction, opening) {
    var work = viewer.items[viewer.index];
    var img = document.getElementById('popUpImage');
    var src = viewerImageUrl(work);
    // A shared painting link arrives with the full web copy already showing:
    // keep it rather than download a second, smaller copy
    if (img.getAttribute('src') === webImageUrl(work.location)) {
        src = webImageUrl(work.location);
    }
    var token = ++viewer.loadToken;
    var animate = !!direction && !prefersReducedMotion();
    var placeholder = opening && opening.placeholder;
    // The page's copy is often already sharp enough for the viewer (always,
    // on phones, where the works are drawn wider than the viewer): keep it,
    // so there's no swap at all
    if (placeholder && work.width && work.height &&
        opening.placeholderWidth >= Math.min(work.width, viewerImageWidth(work) * (window.devicePixelRatio || 1)) - 1) {
        src = placeholder;
    }
    var leftAt = Date.now();

    $('.modal-nav-arrows').toggle(viewer.items.length > 1);
    if (!VT.noHistory) {
        document.title = work.name + ' - Ambar Velasco';
    }

    function showDetails() {
        $('#imageTitle').text(work.name);
        $('#imageDescription').html(multiline(work.firstDescription));
        $('#imageCounter').text(viewer.items.length > 1 ? (viewer.index + 1) + ' / ' + viewer.items.length : '');
        img.alt = work.name;
        img.setAttribute('data-original', originalImageUrl(work.location));
        img.removeAttribute('data-fell-back');
        // Its proportions, so it's drawn at the right size before it loads
        if (work.width && work.height) {
            img.style.setProperty('--w', work.width);
            img.style.setProperty('--h', work.height);
        } else {
            img.style.removeProperty('--w');
            img.style.removeProperty('--h');
        }
        // A work that can be bought links to its page in the shop
        var shopPath = pageData.shopLinks && work.id ? pageData.shopLinks[work.id] : null;
        $('#imageShop').prop('hidden', !shopPath).attr('href', shopPath || '#');
        setUpDescription();
        fitViewerToScreen();
        updateViewerTools(work);
    }

    viewer.waitingForImage = false;
    if (animate) {
        // Send the current painting and its caption away; the details change
        // once the next painting is ready to come in
        img.style.transition = 'transform ' + VIEWER_LEAVE_MS + 'ms ease-in, opacity ' + VIEWER_LEAVE_MS + 'ms ease-in';
        // (after a swipe, keep going from wherever the finger left it)
        var dragged = Math.abs(parseFloat((img.style.transform.match(/translateX\((-?[\d.]+)px\)/) || [])[1]) || 0);
        img.style.transform = 'translateX(' + (-direction * Math.max(VIEWER_SLIDE_PX, dragged + 40)) + 'px)';
        img.style.opacity = '0';
        $('#imageInfo').addClass('is-changing');
    } else {
        img.style.transition = '';
        img.style.transform = '';
        img.style.opacity = '';
        $('#imageInfo').removeClass('is-changing');
        showDetails();
        if (placeholder) {
            img.src = placeholder;
        } else if (opening) {
            viewer.waitingForImage = true;
            img.style.opacity = '0';
        }
    }

    // Keep the previous picture up until the next one is ready (no blank
    // flash), and only show a spinner if it takes a moment
    var spinnerTimer = placeholder ? null : setTimeout(function () {
        if (token === viewer.loadToken) {
            $('#spinner').show();
            $(img).addClass('is-loading');
        }
    }, animate ? VIEWER_LEAVE_MS + 150 : 150);

    function arrive(finalSrc) {
        showDetails();
        // Start just off to the side, invisible, then glide into place
        img.style.transition = 'none';
        img.style.transform = 'translateX(' + (direction * VIEWER_SLIDE_PX) + 'px)';
        img.style.opacity = '0';
        img.src = finalSrc;
        var reveal = function () {
            if (token !== viewer.loadToken) {
                return;
            }
            void img.offsetWidth; // let the browser take in the starting position
            img.style.transition = 'transform ' + VIEWER_ARRIVE_MS + 'ms var(--ease-out-soft), opacity ' + VIEWER_ARRIVE_MS + 'ms ease';
            img.style.transform = '';
            img.style.opacity = '';
            $('#imageInfo').removeClass('is-changing');
            updateViewerScrolling();
        };
        if (img.decode) {
            img.decode().then(reveal, reveal);
        } else {
            reveal();
        }
    }

    // Swap the stand-in for the sharper copy (same size, so nothing moves),
    // once that copy is decoded and the opening has finished
    function sharpen(finalSrc) {
        var swap = function () {
            if (token === viewer.loadToken && img.src !== finalSrc) {
                img.src = finalSrc;
            }
        };
        var whenDecoded = function () {
            if (token !== viewer.loadToken) {
                return;
            }
            if (viewer.opening) {
                viewer.afterOpening = swap;
            } else {
                swap();
            }
        };
        if (loader.decode) {
            loader.decode().then(whenDecoded, whenDecoded);
        } else {
            whenDecoded();
        }
    }

    // Opened with nothing to show: fade the painting up once it's decoded
    function appear(finalSrc) {
        var show = function () {
            if (token !== viewer.loadToken) {
                return;
            }
            viewer.waitingForImage = false;
            img.src = finalSrc;
            fadeUpViewerImage();
        };
        if (loader.decode) {
            loader.decode().then(show, show);
        } else {
            show();
        }
    }

    var loader = new Image();
    loader.onload = loader.onerror = function (event) {
        if (token !== viewer.loadToken) {
            return;
        }
        clearTimeout(spinnerTimer);
        $('#spinner').hide();
        $(img).removeClass('is-loading');
        var finalSrc = event.type === 'error' ? originalImageUrl(work.location) : src;
        if (placeholder) {
            sharpen(event.type === 'error' ? finalSrc : loader.src);
            return;
        }
        if (opening) {
            appear(finalSrc);
            return;
        }
        if (!animate) {
            img.src = finalSrc;
            return;
        }
        // Let the old painting finish leaving before the new one arrives
        setTimeout(function () {
            if (token === viewer.loadToken) {
                arrive(finalSrc);
            }
        }, Math.max(0, VIEWER_LEAVE_MS - (Date.now() - leftAt)));
    };
    loader.src = src;
    // (the scale scene shows this same file, already downloaded)
    viewer.loading = { work: work, src: src };

    // Get the neighbours ready so the arrows feel instant
    [-1, 1].forEach(function (step) {
        var neighbour = viewer.items[(viewer.index + step + viewer.items.length) % viewer.items.length];
        if (neighbour && neighbour !== work) {
            new Image().src = viewerImageUrl(neighbour);
        }
    });
}

function changeImage(step) {
    if (!viewer.open || viewer.closing || viewer.items.length < 2) {
        return;
    }
    if (viewer.opening) {
        stopOpening();
    }
    showInPage();
    exitZoom(false);
    viewer.index = (viewer.index + step + viewer.items.length) % viewer.items.length;
    var work = viewer.items[viewer.index];
    if (viewerTools.scale) {
        leaveScaleScene(step);
    }
    // Stepping through paintings updates the address without piling up history
    history.replaceState($.extend({}, history.state, { path: work.path }), '', work.path);
    showViewerImage(step);
}

// options.fromHistory: the address bar has already moved (Back button), so
// only the modal needs closing
// options.instantly: no animation (another page is about to be drawn)
function closeViewer(options) {
    if (!viewer.open) {
        return;
    }
    options = options || {};
    viewer.closingFromHistory = !!options.fromHistory;
    if (options.instantly) {
        finishClosing();
        return;
    }
    // Asks first (hide.bs.modal), which starts animateClosing()
    viewerModal('hide');
}

// The viewer and its dark background are built once, when the page loads,
// and stay on the page invisibly (.is-idle); opening only makes them
// visible. Nothing new is put on the page when a painting opens, so phones
// start the motion sooner and draw it more smoothly. This used to be
// Bootstrap's modal; it still sends the same show / hide / hidden events
// (named *.bs.modal) that setupViewer listens to.
var viewerBackdrop = null;

function setupViewerLayer() {
    var modal = document.getElementById('bigPicModal');
    var preopened = modal.hasAttribute('data-preopened');
    viewerBackdrop = $('<div class="modal-backdrop viewer-backdrop" aria-hidden="true">')
        .toggleClass('show', preopened).appendTo('body')[0];
    $(modal).toggleClass('is-idle', !preopened);
    modal.inert = !preopened; // nothing in it can be tabbed to while idle
    viewer.listenToTouches(preopened);
    document.addEventListener('keydown', function (event) {
        if (viewer.open && event.key === 'Escape') {
            if (zoom.active) {
                exitZoom(true);
            } else if (viewerTools.scale) {
                setScale(false);
            } else {
                closeViewer();
            }
        }
    });
}

function viewerModal(command) {
    var modal = $('#bigPicModal');
    var asking = $.Event(command + '.bs.modal');
    modal.trigger(asking);
    if (asking.isDefaultPrevented()) {
        return;
    }
    if (command === 'show') {
        modal.attr({ 'aria-modal': 'true', role: 'dialog' }).removeAttr('aria-hidden');
        modal[0].inert = false;
        modal.removeClass('is-idle').addClass('show');
        $(viewerBackdrop).addClass('show');
        viewer.listenToTouches(true);
        modal.trigger('shown.bs.modal');
        return;
    }
    modal.removeClass('show').attr('aria-hidden', 'true').removeAttr('aria-modal');
    // (still on the page, so let go of the focus it was given)
    if (modal[0].contains(document.activeElement)) {
        document.activeElement.blur();
    }
    modal.addClass('is-idle');
    modal[0].inert = true;
    $(viewerBackdrop).removeClass('show').css({ transition: 'none', opacity: '' });
    viewer.listenToTouches(false);
    modal.trigger('hidden.bs.modal');
}

function animateClosing() {
    var modal = document.getElementById('bigPicModal');
    var img = document.getElementById('popUpImage');
    var backdrop = document.querySelector('.modal-backdrop');
    var ms = prefersReducedMotion() || VT.noAnim ? 0 : VIEWER_CLOSE_MS;

    resetViewerTools(); // the painting itself must be showing to shrink back
    viewer.closing = true;
    viewer.loadToken++; // nothing still loading may change the picture now
    clearTimeout(viewer.openTimer);
    viewer.opening = false;
    viewer.afterOpening = null;
    $('#spinner').hide();
    $(img).removeClass('is-loading');
    setThemeColor(PAGE_THEME_COLOR, ms * 0.5);
    if (!ms) {
        finishClosing();
        return;
    }

    // Carry on from exactly how things look now (even part-way through
    // opening, or stepping to the next painting)
    var shown = getComputedStyle(img);
    var transform = shown.transform;
    var opacity = shown.opacity;
    var backdropOpacity = backdrop ? getComputedStyle(backdrop).opacity : null;
    $(modal).removeClass('is-opening is-arriving').addClass('is-closing');
    img.style.transition = 'none';
    img.style.transform = 'none';
    var at = img.getBoundingClientRect();
    img.style.transform = transform === 'none' ? '' : transform;
    img.style.opacity = opacity;
    if (backdrop) {
        backdrop.style.transition = 'none';
        backdrop.style.opacity = backdropOpacity;
    }
    var target = (at.width > 0 && at.height > 0 && img.getAttribute('src')) ? pageImageToShrinkInto() : null;
    void modal.offsetWidth;

    if (backdrop) {
        backdrop.style.transition = 'opacity ' + ms + 'ms ease';
        backdrop.style.opacity = '0';
    }
    if (target) {
        img.style.transition = 'transform ' + ms + 'ms ' + VIEWER_CLOSE_EASE + ', opacity ' + Math.round(ms * 0.5) + 'ms ease';
        img.style.transform = transformOnto(at, target.getBoundingClientRect());
        img.style.opacity = '1';
        hideInPage(target);
        liftTape(target); // (already up, unless it's a different painting from the one opened)
    } else {
        img.style.transition = 'transform ' + ms + 'ms ' + VIEWER_CLOSE_EASE + ', opacity ' + Math.round(ms * 0.8) + 'ms ease';
        img.style.transform = at.width ? shrunkAboutMiddle(at, 0.96) : '';
        img.style.opacity = '0';
    }
    viewer.closeTimer = setTimeout(finishClosing, ms + 30);
}

// Put the picture back on the page and take the viewer away, in the same
// moment, so the hand-over can't be seen
function finishClosing() {
    clearTimeout(viewer.closeTimer);
    clearTimeout(viewer.openTimer);
    if (!viewer.open) {
        return;
    }
    viewer.closing = false;
    viewer.opening = false;
    viewer.afterOpening = null;
    viewer.waitingForImage = false;
    resetViewerTools();
    setThemeColor(PAGE_THEME_COLOR);
    showInPage();
    pressTapeDown();
    viewer.hidingNow = true;
    viewerModal('hide'); // instant; hidden.bs.modal tidies up
    viewer.hidingNow = false;
    $('#bigPicModal').removeClass('is-opening is-arriving is-closing');
    var img = document.getElementById('popUpImage');
    img.style.transition = 'none';
    img.style.transform = '';
    img.style.opacity = '';
}

// Kept for anything that still calls it by its old name
function makeBigPic(imageUrl) {
    for (var i = 0; i < galleryItems.length; i++) {
        if (webImageUrl(galleryItems[i].location) === imageUrl || originalImageUrl(galleryItems[i].location) === imageUrl) {
            openViewer(galleryItems, i, {});
            return;
        }
    }
}

function setupViewer() {
    var modal = $('#bigPicModal');

    var modalEl = modal[0];

    // Keep keyboard focus inside the open viewer (Bootstrap's version of this
    // would scroll the page; see openViewer)
    document.addEventListener('focusin', function (event) {
        if (viewer.open && !modalEl.contains(event.target)) {
            modalEl.focus({ preventScroll: true });
        }
    });

    // Hold the page behind the viewer exactly where it is.
    // Computers: switch its scrolling off. That takes away the scrollbar (on
    // computers that show one), which would let the works widen a little;
    // keeping that much space empty holds them still.
    // Phones and tablets: leave the page completely alone (switching its
    // scrolling off makes Safari repaint it, blinking white); the touch
    // handlers below stop it scrolling instead.
    modal.on('show.bs.modal', function () {
        scrollPosition = window.pageYOffset;
        // (a shop item's panel, open under the viewer, already holds it)
        if (isTouchScreen() || $('html').hasClass('shop-panel-open')) {
            return;
        }
        var scrollbar = window.innerWidth - document.documentElement.clientWidth;
        $('html').addClass('no-scroll');
        $('body').css({ 'padding-right': scrollbar > 0 ? scrollbar + 'px' : '', '--held-gap': scrollbar > 0 ? scrollbar + 'px' : '' });
    });

    // A finger dragging on the viewer scrolls the viewer (a very tall
    // painting) but never the page behind it, or the browser's bars
    var lastTouchY = 0;
    function onViewerTouchStart(e) {
        if (e.touches.length === 1) {
            lastTouchY = e.touches[0].clientY;
        }
    }
    function onViewerTouchMove(e) {
        if (e.touches.length !== 1 || !e.cancelable) {
            return; // two fingers: let pinch-zoom work
        }
        var y = e.touches[0].clientY;
        var down = y > lastTouchY;
        lastTouchY = y;
        var atTop = modalEl.scrollTop <= 0;
        var atBottom = modalEl.scrollTop + modalEl.clientHeight >= modalEl.scrollHeight - 1;
        if ((down && atTop) || (!down && atBottom)) {
            e.preventDefault();
        }
    }

    // Every way of closing (the close button, the dark background, Escape,
    // swipe down, Back) comes through here: animate first, then hide
    modal.on('hide.bs.modal', function (event) {
        if (viewer.hidingNow) {
            return;
        }
        event.preventDefault();
        if (!viewer.closing) {
            animateClosing();
        }
    });

    modal.on('hidden.bs.modal', function () {
        viewer.open = false;
        viewer.source = null;
        viewer.loadToken++;
        $('#spinner').hide();
        $('html').removeClass('no-scroll');
        if (!$('html').hasClass('shop-panel-open')) {
            $('body').css({ 'padding-right': '', '--held-gap': '' }); // (a shop item's panel still needs it)
        }
        if (Math.abs(window.pageYOffset - scrollPosition) > 1) {
            instantScrollTo(scrollPosition);
        }
        document.title = pageTitle;
        pauseSlideshow(false);

        if (viewer.closingFromHistory) {
            viewer.closingFromHistory = false;
            return;
        }
        // Closed by the visitor: take the address back to the page underneath.
        // If opening added a history entry, step back over it so Back doesn't
        // reopen the painting; for a shared link there's nothing to step back to.
        if (history.state && history.state.viewer) {
            history.back();
        } else if (parseRoute(location.pathname).workId) {
            history.replaceState({ path: viewer.basePath }, '', viewer.basePath);
        }
    });

    // Click on the dark background closes; click on the picture steps through
    modal.on('click', function (event) {
        if (!$(event.target).closest('#popUpImage, .nav-arrow, .viewer-toolbar, .image-more, .image-shop, .scale-scene, .zoom-layer').length) {
            closeViewer();
        }
    });

    document.getElementById('popUpImage').addEventListener('click', function (event) {
        if (isPinching || zoom.active) {
            return;
        }
        var step = event.offsetX < this.clientWidth / 2 ? -1 : 1;
        if (!isTouchScreen()) {
            changeImage(step);
            return;
        }
        // Phones and tablets: a second tap straight after zooms in there, so
        // a single tap waits a moment before stepping to the next painting
        if (zoom.tapTimer) {
            clearTimeout(zoom.tapTimer);
            zoom.tapTimer = null;
            zoomInAt(event.clientX, event.clientY);
            return;
        }
        zoom.tapTimer = setTimeout(function () {
            zoom.tapTimer = null;
            changeImage(step);
        }, ZOOM_TAP_MS);
    });

    document.addEventListener('keydown', function (event) {
        if (!viewer.open) {
            return;
        }
        if (event.key === 'ArrowLeft') {
            changeImage(-1);
        } else if (event.key === 'ArrowRight') {
            changeImage(1);
        }
    });

    $('#prevImage').on('click', function () { changeImage(-1); });
    $('#nextImage').on('click', function () { changeImage(1); });

    // Touch: swipe sideways to step through, swipe down to close (not while
    // the painting is still flying in or out). The same on the See to scale
    // scene, which takes the painting's place while it's showing.
    var image = document.getElementById('popUpImage');
    var scene = document.getElementById('scaleScene');
    var tracking = false;
    function onImageTouchStart(e) {
        isPinching = e.touches.length > 1;
        tracking = e.touches.length === 1 && !viewer.opening && !viewer.closing && !zoom.active;
        if (tracking) {
            this.style.transition = 'none';
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
    }

    function onImageTouchMove(e) {
        if (e.touches.length > 1) {
            isPinching = true;
        } else if (tracking && e.touches.length === 1 && !isPinching) {
            var deltaX = Math.round((e.touches[0].clientX - startX) * 0.3);
            var deltaY = e.touches[0].clientY - startY;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                e.preventDefault();
                this.style.transform = 'translateX(' + deltaX + 'px)';
            }
        }
    }

    function onImageTouchEnd(e) {
        if (!tracking) {
            return;
        }
        tracking = false;
        this.style.transition = 'transform 0.3s ease';
        if (isPinching || e.changedTouches.length !== 1) {
            return;
        }
        var deltaX = e.changedTouches[0].clientX - startX;
        var deltaY = e.changedTouches[0].clientY - startY;

        if (Math.abs(deltaY) > window.innerHeight * 0.1 && deltaY > 0 && Math.abs(deltaX) < Math.abs(deltaY) / 2) {
            closeViewer();
        } else if (Math.abs(deltaX) > window.innerWidth * 0.1) {
            changeImage(deltaX > 0 ? -1 : 1);
        } else {
            this.style.transform = '';
        }
    }

    // (listens only while open: the viewer stays on the page when closed)
    viewer.listenToTouches = function (on) {
        var method = on ? 'addEventListener' : 'removeEventListener';
        modalEl[method]('touchstart', onViewerTouchStart, { passive: true });
        modalEl[method]('touchmove', onViewerTouchMove, { passive: false });
        [image, scene].forEach(function (el) {
            el[method]('touchstart', onImageTouchStart, false);
            el[method]('touchmove', onImageTouchMove, false);
            el[method]('touchend', onImageTouchEnd, false);
        });
    };
    setupViewerTools();
    setupViewerLayer();
}

// --------------------------------------------------------------------------
// Viewer tools: zooming in (pinch, double-tap, scroll wheel or the Zoom in
// button) and "See to scale" (the painting beside something everyone knows
// the size of, from the dimensions in its description)
// --------------------------------------------------------------------------

var SCALE_PERSON_CM = 165;
var SCALE_PERSON_WIDTH_CM = 50;
var SCALE_HANG_CENTRE_CM = 150; // galleries hang a painting's middle at about eye level
var SCALE_SMALL_CM = 45;        // up to this (longest side): shown on a table beside a mug
var SCALE_MUG_CM = 9.5;         // the mug's height
var SCALE_MUG_WIDTH_CM = 11.5;  // with its handle

var viewerTools = {
    scale: false
};

// Its size in cm from its description ("50 x 64 cm", "18 x 24\"", "A4"...),
// as { w, h } matched to the picture's orientation, or null if there isn't one
var PAPER_SIZES_CM = { 2: [42, 59.4], 3: [29.7, 42], 4: [21, 29.7], 5: [14.8, 21], 6: [10.5, 14.8] };

function workSizeCm(work) {
    var text = [work.firstDescription, work.secondDescription].join(' ');
    var a, b;
    var m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|in(?:ches)?\b|["”″])?/i);
    if (m) {
        a = parseFloat(m[1].replace(',', '.'));
        b = parseFloat(m[2].replace(',', '.'));
        var unit = (m[3] || 'cm').toLowerCase();
        var toCm = unit === 'mm' ? 0.1 : unit === 'cm' ? 1 : 2.54;
        a *= toCm;
        b *= toCm;
    } else {
        var paper = text.match(/\bA([2-6])\b/);
        if (!paper) {
            return null;
        }
        a = PAPER_SIZES_CM[paper[1]][0];
        b = PAPER_SIZES_CM[paper[1]][1];
    }
    if (!(a >= 3 && b >= 3 && a <= 600 && b <= 600)) {
        return null;
    }
    var landscape = work.width && work.height ? work.width > work.height : false;
    var longSide = Math.max(a, b);
    var shortSide = Math.min(a, b);
    return landscape ? { w: longSide, h: shortSide } : { w: shortSide, h: longSide };
}

// The web copy was made smaller than the original, so there's a bigger
// zoom copy to load
function hasLargeOriginal(work) {
    return work.width >= 1590 || work.height >= 2390;
}

function formatCm(cm) {
    return (Math.round(cm * 10) / 10).toString();
}

function formatInches(cm) {
    return (Math.round(cm / 2.54 * 10) / 10).toString();
}

// Called whenever the viewer shows a painting: which tools it can have
function updateViewerTools(work) {
    var size = workSizeCm(work);
    $('#seeToScale').prop('hidden', !size);
    if (viewerTools.scale) {
        if (size) {
            drawScaleScene(work, size);
        } else {
            setScale(false);
        }
    }
}

// Everything back to plain viewing at once (closing the viewer)
function resetViewerTools() {
    exitZoom(false);
    setScale(false);
}

// ---- Zoom ----
//
// Zooming lifts a copy of the painting into a layer over the whole viewer,
// exactly where the painting is, and scales and moves that. The viewer
// underneath is left alone, so none of its opening, closing and stepping
// animations are affected. The copy starts as the picture already showing
// and swaps to the zoom copy (up to 4000px, baseImages/web/zoom/) once that
// has loaded — never the original upload.

var ZOOM_TAP_MS = 280;  // a second tap within this is a double-tap

var zoom = {
    active: false,
    s: 1, x: 0, y: 0,   // scale, and where the picture's top-left corner is on screen
    baseW: 0, baseH: 0, // its size at scale 1 (as the viewer shows it)
    maxS: 2,
    gesture: null,      // the drag or pinch in progress
    lastTap: null,      // { t, x, y }: for double-taps while zoomed
    tapTimer: null,     // a single tap on the painting, waiting to see if a second comes
    exitTimer: null
};

function zoomCopyUrl(location) {
    return '/baseImages/web/zoom/' + encodeURIComponent(location);
}

function zoomImage() {
    return document.querySelector('#zoomLayer img');
}

function viewportSize() {
    return { w: document.documentElement.clientWidth, h: window.innerHeight };
}

// Puts the zoom layer over the painting at scale 1. Returns false if there's
// nothing to zoom into yet.
function enterZoom() {
    if (zoom.active) {
        return true;
    }
    var work = viewer.items[viewer.index];
    if (!work || !viewer.open || viewer.opening || viewer.closing) {
        return false;
    }
    if (viewerTools.scale) {
        setScale(false);
    }
    var img = document.getElementById('popUpImage');
    var rect = img.getBoundingClientRect();
    if (!rect.width || !img.getAttribute('src')) {
        return false;
    }
    clearTimeout(zoom.exitTimer);
    zoom.active = true;
    zoom.gesture = null;
    zoom.lastTap = null;
    zoom.s = 1;
    zoom.x = rect.left;
    zoom.y = rect.top;
    zoom.baseW = rect.width;
    zoom.baseH = rect.height;
    // How far it can go: until each pixel of the biggest copy is about a
    // pixel on screen (guessed until that copy has arrived), and at least 2x
    var bigWidth = hasLargeOriginal(work) ? work.width * 2.5 : work.width;
    zoom.maxS = Math.max(2, bigWidth / rect.width);

    var layerImg = zoomImage();
    layerImg.style.width = rect.width + 'px';
    layerImg.style.height = rect.height + 'px';
    layerImg.src = img.currentSrc || img.src;
    renderZoom(false);
    $('#bigPicModal').removeClass('is-unzooming').addClass('is-zoomed');
    $('#zoomLayer').attr('aria-hidden', 'false');
    $('#zoomIn').attr({ 'aria-pressed': 'true', 'aria-label': 'Zoom out', title: 'Zoom out' });

    var bigSrc = hasLargeOriginal(work) ? zoomCopyUrl(work.location) : webImageUrl(work.location);
    if (layerImg.getAttribute('src') !== bigSrc) {
        var big = new Image();
        big.onload = function () {
            var swap = function () {
                if (zoom.active && viewer.items[viewer.index] === work) {
                    layerImg.src = big.src;
                    zoom.maxS = Math.max(2, big.naturalWidth / zoom.baseW);
                }
            };
            if (big.decode) {
                big.decode().then(swap, swap);
            } else {
                swap();
            }
        };
        big.src = bigSrc;
    }
    return true;
}

// Back to the painting: it shrinks back into its place in the viewer
function exitZoom(animate) {
    clearTimeout(zoom.tapTimer);
    zoom.tapTimer = null;
    if (!zoom.active) {
        return;
    }
    zoom.active = false;
    zoom.gesture = null;
    $('#zoomIn').attr({ 'aria-pressed': 'false', 'aria-label': 'Zoom in', title: 'Zoom in' });
    $('#zoomLayer').removeClass('is-dragging');
    var rect = document.getElementById('popUpImage').getBoundingClientRect();
    if (animate && rect.width && !prefersReducedMotion()) {
        zoom.s = rect.width / zoom.baseW;
        zoom.x = rect.left;
        zoom.y = rect.top;
        renderZoom(true);
        $('#bigPicModal').addClass('is-unzooming');
        zoom.exitTimer = setTimeout(hideZoomLayer, 300);
    } else {
        hideZoomLayer();
    }
}

function hideZoomLayer() {
    clearTimeout(zoom.exitTimer);
    $('#bigPicModal').removeClass('is-zoomed is-unzooming');
    $('#zoomLayer').attr('aria-hidden', 'true');
}

function renderZoom(animate) {
    var layerImg = zoomImage();
    layerImg.style.transition = animate ? 'transform 0.3s var(--ease-out-soft)' : 'none';
    layerImg.style.transform = 'translate(' + zoom.x + 'px, ' + zoom.y + 'px) scale(' + zoom.s + ')';
}

// Where the picture may sit: covering the screen where it's bigger than the
// screen, and wholly on it where it's smaller
function clampedZoomPosition(s, x, y) {
    var view = viewportSize();
    var w = zoom.baseW * s;
    var h = zoom.baseH * s;
    return {
        x: w > view.w ? Math.min(0, Math.max(view.w - w, x)) : Math.min(view.w - w, Math.max(0, x)),
        y: h > view.h ? Math.min(0, Math.max(view.h - h, y)) : Math.min(view.h - h, Math.max(0, y))
    };
}

// Zooms to scale s, keeping the point (cx, cy) on screen where it is
function zoomAt(s, cx, cy, animate) {
    s = Math.max(1, Math.min(zoom.maxS, s));
    var ratio = s / zoom.s;
    var at = clampedZoomPosition(s, cx - (cx - zoom.x) * ratio, cy - (cy - zoom.y) * ratio);
    zoom.s = s;
    zoom.x = at.x;
    zoom.y = at.y;
    renderZoom(animate);
}

// Double-tap, the button, or + on the keyboard
function zoomInAt(cx, cy) {
    if (enterZoom()) {
        zoomAt(Math.min(zoom.maxS, 2.5), cx, cy, true);
    }
}

function zoomInAtMiddle() {
    var rect = document.getElementById('popUpImage').getBoundingClientRect();
    zoomInAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

// After a gesture: back within the limits, gently
function settleZoom(cx, cy) {
    if (zoom.s < 1.05) {
        exitZoom(true);
        return;
    }
    var view = viewportSize();
    zoomAt(zoom.s, cx === undefined ? view.w / 2 : cx, cy === undefined ? view.h / 2 : cy, true);
}

// A drag past the edge moves only part of the way: it resists, then springs back
function resist(value, min, max) {
    if (value > max) {
        return max + (value - max) * 0.35;
    }
    if (value < min) {
        return min + (value - min) * 0.35;
    }
    return value;
}

// ---- Zoom: touch ----

function touchDistance(a, b) {
    return Math.sqrt(Math.pow(a.clientX - b.clientX, 2) + Math.pow(a.clientY - b.clientY, 2));
}

function startTouchGesture(touches) {
    if (touches.length >= 2) {
        var a = touches[0];
        var b = touches[1];
        zoom.gesture = {
            type: 'pinch',
            d0: Math.max(1, touchDistance(a, b)),
            s0: zoom.s,
            mx0: (a.clientX + b.clientX) / 2,
            my0: (a.clientY + b.clientY) / 2,
            x0: zoom.x,
            y0: zoom.y
        };
        zoom.gesture.mx = zoom.gesture.mx0;
        zoom.gesture.my = zoom.gesture.my0;
    } else if (touches.length === 1) {
        zoom.gesture = {
            type: 'pan',
            sx: touches[0].clientX,
            sy: touches[0].clientY,
            x0: zoom.x,
            y0: zoom.y,
            t0: Date.now(),
            moved: false
        };
    }
}

function moveTouchGesture(touches) {
    var g = zoom.gesture;
    if (g.type === 'pinch' && touches.length >= 2) {
        var a = touches[0];
        var b = touches[1];
        var s = g.s0 * touchDistance(a, b) / g.d0;
        // Past the limits it still gives a little
        if (s > zoom.maxS) {
            s = zoom.maxS * Math.pow(s / zoom.maxS, 0.3);
        } else if (s < 1) {
            s = Math.max(0.5, 1 - (1 - s) * 0.5);
        }
        g.mx = (a.clientX + b.clientX) / 2;
        g.my = (a.clientY + b.clientY) / 2;
        zoom.x = g.mx - (g.mx0 - g.x0) * s / g.s0;
        zoom.y = g.my - (g.my0 - g.y0) * s / g.s0;
        zoom.s = s;
        renderZoom(false);
    } else if (g.type === 'pan' && touches.length === 1) {
        var dx = touches[0].clientX - g.sx;
        var dy = touches[0].clientY - g.sy;
        if (Math.abs(dx) + Math.abs(dy) > 8) {
            g.moved = true;
        }
        var view = viewportSize();
        var w = zoom.baseW * zoom.s;
        var h = zoom.baseH * zoom.s;
        zoom.x = resist(g.x0 + dx, Math.min(0, view.w - w), Math.max(0, view.w - w));
        zoom.y = resist(g.y0 + dy, Math.min(0, view.h - h), Math.max(0, view.h - h));
        renderZoom(false);
    }
}

function endTouchGesture(remaining) {
    var g = zoom.gesture;
    zoom.gesture = null;
    if (!g || !zoom.active) {
        return;
    }
    // One finger lifted from a pinch: carry on with the other
    if (remaining.length) {
        startTouchGesture(remaining);
        return;
    }
    if (g.type === 'pan' && !g.moved && Date.now() - g.t0 < 300) {
        // A tap. Two in a row zooms back out.
        var last = zoom.lastTap;
        if (last && Date.now() - last.t < ZOOM_TAP_MS + 100 && Math.abs(last.x - g.sx) + Math.abs(last.y - g.sy) < 40) {
            zoom.lastTap = null;
            exitZoom(true);
            return;
        }
        zoom.lastTap = { t: Date.now(), x: g.sx, y: g.sy };
    }
    settleZoom(g.mx, g.my);
}

// ---- See to scale ----

function setScale(on) {
    on = !!on;
    var work = viewer.items[viewer.index];
    var size = on && work ? workSizeCm(work) : null;
    if (on && !size) {
        return;
    }
    if (on) {
        exitZoom(false);
    }
    viewerTools.scale = on;
    if (!on) {
        scaleSlideToken++;
        var scene = document.getElementById('scaleScene');
        scene.removeAttribute('data-arriving-from');
        scene.style.transition = '';
        scene.style.transform = '';
        scene.style.opacity = '';
    }
    $('#bigPicModal').toggleClass('is-scale', on);
    $('#scaleScene').attr('aria-hidden', String(!on));
    var label = on ? 'Back to the painting' : 'See to scale';
    $('#seeToScale').attr({ 'aria-pressed': String(on), 'aria-label': label, title: label });
    if (on) {
        drawScaleScene(work, size);
    }
    updateViewerScrolling();
}

// The painting at its real size beside something everyone knows: hung on a
// wall next to a 165 cm figure, or (a small work) standing on a table next
// to a mug, close up. Everything in the scene is drawn at the same scale.
function drawScaleScene(work, size) {
    var scene = document.getElementById('scaleScene');
    var sceneW = scene.clientWidth;
    var sceneH = scene.clientHeight;
    if (!sceneW || !sceneH) {
        return;
    }
    var small = Math.max(size.w, size.h) <= SCALE_SMALL_CM;
    // The picture keeps the photo's own proportions (so nothing is cropped),
    // with its longest side the length given in the description
    var box = { w: size.w, h: size.h };
    if (work.width && work.height) {
        var ratio = work.width / work.height;
        box = ratio >= 1 ? { w: Math.max(size.w, size.h), h: Math.max(size.w, size.h) / ratio }
                         : { w: Math.max(size.w, size.h) * ratio, h: Math.max(size.w, size.h) };
    }
    var floorPx = Math.round(sceneH * (small ? 0.2 : 0.1));
    var refW, refH, artBottomCm, viewCm, gapCm, marginCm;
    if (small) {
        // On the table, leaning on the wall; enough wall shown above it that
        // the work fills a good part of the view
        refW = SCALE_MUG_WIDTH_CM;
        refH = SCALE_MUG_CM;
        artBottomCm = 0;
        viewCm = Math.max(box.h * 1.45, 26);
        gapCm = Math.max(4, box.w * 0.18);
        marginCm = 6;
    } else {
        refW = SCALE_PERSON_WIDTH_CM;
        refH = SCALE_PERSON_CM;
        artBottomCm = Math.max(30, SCALE_HANG_CENTRE_CM - box.h / 2);
        viewCm = Math.max(205, artBottomCm + box.h + 25);
        gapCm = Math.max(35, Math.min(60, box.w * 0.4));
        marginCm = 25;
    }
    var rowCm = marginCm + refW + gapCm + box.w + marginCm;
    var cmPx = Math.min((sceneH - floorPx) / viewCm, sceneW / rowCm);
    var left = (sceneW - rowCm * cmPx) / 2 + marginCm * cmPx;

    $(scene).toggleClass('is-table', small);
    $(scene).find('.scale-floor').css('height', floorPx + 'px');
    $(scene).find(small ? '.scale-mug' : '.scale-person').css({
        left: left + 'px',
        bottom: floorPx + 'px',
        width: (refW * cmPx) + 'px',
        height: (refH * cmPx) + 'px'
    });

    var artW = box.w * cmPx;
    var artH = box.h * cmPx;
    var art = $(scene).find('.scale-art').css({
        left: (left + (refW + gapCm) * cmPx) + 'px',
        bottom: (floorPx + artBottomCm * cmPx) + 'px',
        width: artW + 'px',
        height: artH + 'px',
        '--tape-w': Math.max(18, Math.min(48, artW * 0.32)) + 'px'
    });
    // The same copy the viewer has just loaded for this painting, so it's
    // already downloaded and the scene can show it at once
    var img = art.find('img')[0];
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    var src = viewer.loading && viewer.loading.work === work ? viewer.loading.src : webImageUrl(work.location);
    if (img.getAttribute('src') !== src) {
        img.src = src;
    }

    $(scene).find('.scale-label').text(
        formatCm(size.w) + ' × ' + formatCm(size.h) + ' cm  ·  ' +
        formatInches(size.w) + ' × ' + formatInches(size.h) + ' in   —   ' +
        (small ? 'beside a coffee mug 9.5 cm (3¾″) tall' : 'beside a figure 165 cm (5′5″) tall')
    );
    arriveScaleScene();
}

// Stepping to another painting while the scale scene is showing: the scene
// carries on in the direction of the swipe and fades, then the next one
// slides in from the other side, as the paintings themselves do. It only
// comes in once its picture is ready to draw, so the old painting never
// shows in the new scene.
var SCALE_SLIDE_PX = 40;
var SCALE_LEAVE_MS = 170;
var SCALE_ARRIVE_MS = 300;
var scaleSlideToken = 0;

function leaveScaleScene(step) {
    var scene = document.getElementById('scaleScene');
    scaleSlideToken++;
    scene.setAttribute('data-arriving-from', String(step));
    if (prefersReducedMotion()) {
        scene.style.transition = 'none';
        scene.style.opacity = '0';
        return;
    }
    // (after a swipe, keep going from wherever the finger left it)
    var dragged = Math.abs(parseFloat((scene.style.transform.match(/translateX\((-?[\d.]+)px\)/) || [])[1]) || 0);
    scene.style.transition = 'transform ' + SCALE_LEAVE_MS + 'ms ease-in, opacity ' + SCALE_LEAVE_MS + 'ms ease-in';
    scene.style.transform = 'translateX(' + (-step * Math.max(SCALE_SLIDE_PX, dragged + SCALE_SLIDE_PX)) + 'px)';
    scene.style.opacity = '0';
}

function arriveScaleScene() {
    var scene = document.getElementById('scaleScene');
    var from = scene.getAttribute('data-arriving-from');
    if (!from) {
        return;
    }
    scene.removeAttribute('data-arriving-from');
    var token = ++scaleSlideToken;
    var img = scene.querySelector('.scale-art img');
    var started = false;

    // Waiting just off to the side, invisible
    scene.style.transition = 'none';
    scene.style.transform = prefersReducedMotion() ? '' : 'translateX(' + (Number(from) * SCALE_SLIDE_PX) + 'px)';
    scene.style.opacity = '0';

    var slideIn = function () {
        if (started || token !== scaleSlideToken || !viewerTools.scale) {
            return;
        }
        started = true;
        // Still downloading (a slow connection): the scene comes in, and its
        // picture fades up once it's here, rather than show the last one
        if (!img.complete || !img.naturalWidth) {
            img.style.opacity = '0';
            img.addEventListener('load', function () {
                img.style.transition = 'opacity 0.25s ease';
                img.style.opacity = '';
            }, { once: true });
        }
        void scene.offsetWidth; // let the browser take in the starting point
        scene.style.transition = 'transform ' + SCALE_ARRIVE_MS + 'ms var(--ease-out-soft), opacity ' + SCALE_ARRIVE_MS + 'ms ease';
        scene.style.transform = '';
        scene.style.opacity = '';
    };
    // Normally ready at once; never wait more than half a second
    setTimeout(slideIn, 500);
    if (img.complete && img.naturalWidth && !img.decode) {
        slideIn();
    } else if (img.decode) {
        img.decode().then(function () {
            requestAnimationFrame(slideIn);
        }, slideIn);
    } else {
        img.onload = img.onerror = slideIn;
    }
}

function setupViewerTools() {
    var image = document.getElementById('popUpImage');
    var layer = document.getElementById('zoomLayer');

    $('#zoomIn').on('click', function () {
        if (zoom.active) {
            exitZoom(true);
        } else {
            zoomInAtMiddle();
        }
    });
    $('#zoomOut').on('click', function () {
        exitZoom(true);
    });
    $('#seeToScale').on('click', function () {
        setScale(!viewerTools.scale);
    });
    $('.scale-back').on('click', function () {
        setScale(false);
    });
    $('#imageMore').on('click', function () {
        var open = !$('#imageInfo').hasClass('is-expanded');
        $('#imageInfo').toggleClass('is-expanded', open);
        $(this).text(open ? 'less' : 'more');
        fitViewerToScreen();
        if (viewerTools.scale) {
            var shown = viewer.items[viewer.index];
            drawScaleScene(shown, workSizeCm(shown));
        }
        updateViewerScrolling();
    });

    // The zoom layer's own hints, for a mouse or a finger
    $('#zoomHint').text(isTouchScreen()
        ? 'Pinch to zoom · double-tap to go back'
        : 'Drag to look around · scroll to zoom · click to go back');

    // Scroll wheel / trackpad: zooms toward the pointer. Over the painting
    // it only starts zooming on a scroll up from the top: scrolling down
    // still scrolls a tall painting's caption into view, and back up to
    // the top, and only then zooms (a trackpad pinch always zooms).
    function onWheel(event) {
        if (!zoom.active) {
            if (event.deltaY >= 0 || (!event.ctrlKey && document.getElementById('bigPicModal').scrollTop > 0)) {
                return;
            }
            if (!enterZoom()) {
                return;
            }
        }
        event.preventDefault();
        var delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
        zoomAt(zoom.s * Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.002)), event.clientX, event.clientY, false);
        if (zoom.s <= 1.001) {
            exitZoom(false);
        }
    }
    image.addEventListener('wheel', onWheel, { passive: false });
    layer.addEventListener('wheel', onWheel, { passive: false });

    // Mouse: drag to look around; a click without dragging zooms back out
    layer.addEventListener('mousedown', function (event) {
        if (event.button !== 0 || $(event.target).closest('.zoom-bar').length) {
            return;
        }
        event.preventDefault();
        zoom.gesture = { type: 'drag', sx: event.clientX, sy: event.clientY, x0: zoom.x, y0: zoom.y, moved: false };
        $(layer).addClass('is-dragging');
    });
    window.addEventListener('mousemove', function (event) {
        var g = zoom.gesture;
        if (!g || g.type !== 'drag') {
            return;
        }
        var dx = event.clientX - g.sx;
        var dy = event.clientY - g.sy;
        if (Math.abs(dx) + Math.abs(dy) > 4) {
            g.moved = true;
        }
        var at = clampedZoomPosition(zoom.s, g.x0 + dx, g.y0 + dy);
        zoom.x = at.x;
        zoom.y = at.y;
        renderZoom(false);
    });
    window.addEventListener('mouseup', function () {
        var g = zoom.gesture;
        if (!g || g.type !== 'drag') {
            return;
        }
        zoom.gesture = null;
        $(layer).removeClass('is-dragging');
        if (!g.moved) {
            exitZoom(true);
        }
    });

    // Touch: two fingers on the painting start zooming (instead of zooming
    // the whole page); once zoomed, one finger drags and two pinch
    image.addEventListener('touchstart', function (event) {
        if (!zoom.active && event.touches.length === 2 && event.cancelable && enterZoom()) {
            event.preventDefault();
            startTouchGesture(event.touches);
        }
    }, { passive: false });
    layer.addEventListener('touchstart', function (event) {
        if ($(event.target).closest('.zoom-bar').length) {
            return;
        }
        if (event.cancelable) {
            event.preventDefault();
        }
        startTouchGesture(event.touches);
    }, { passive: false });
    document.addEventListener('touchmove', function (event) {
        if (zoom.active && zoom.gesture) {
            if (event.cancelable) {
                event.preventDefault();
            }
            moveTouchGesture(event.touches);
        }
    }, { passive: false });
    function onTouchEnd(event) {
        if (zoom.active && zoom.gesture) {
            endTouchGesture(event.touches);
        }
    }
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    // Safari's own pinch-to-zoom of the page, while a painting is open
    document.addEventListener('gesturestart', function (event) {
        if (viewer.open) {
            event.preventDefault();
        }
    });

    // Keyboard: + and - zoom
    document.addEventListener('keydown', function (event) {
        if (!viewer.open) {
            return;
        }
        if (event.key === '+' || event.key === '=') {
            if (zoom.active) {
                var view = viewportSize();
                zoomAt(zoom.s * 1.5, view.w / 2, view.h / 2, true);
            } else {
                zoomInAtMiddle();
            }
        } else if (event.key === '-' && zoom.active) {
            if (zoom.s / 1.5 <= 1.05) {
                exitZoom(true);
            } else {
                var middle = viewportSize();
                zoomAt(zoom.s / 1.5, middle.w / 2, middle.h / 2, true);
            }
        }
    });

    $(window).on('resize', function () {
        exitZoom(false);
        if (viewer.open) {
            fitViewerToScreen();
            updateViewerScrolling();
        }
        // Redraw the scale scene for the new screen size
        if (viewerTools.scale && viewer.open) {
            var work = viewer.items[viewer.index];
            drawScaleScene(work, workSizeCm(work));
        }
    });
}

// --------------------------------------------------------------------------
// Home slideshow
// --------------------------------------------------------------------------

function renderHome() {
    setView('home');
    var content = $('#imagesAndContent').css('padding-top', '');
    var request = fetchPublicWorks('carousel');
    var keepServerDrawn = pageIsServerDrawn;
    if (!isLoaded(request)) {
        content.html('<div class="initial-loading"><div class="loading-spinner"></div></div>');
    }

    return whenLoaded(request, function (works) {
        if (currentView !== 'home') {
            return;
        }
        if (keepServerDrawn) {
            galleryItems = works;
            if (works.length > 1) {
                $('#homePageCarousel').carousel({ interval: 3000, ride: 'carousel' });
            }
        } else {
            createCarousel(works);
        }
        warmSlideshow(works);
        startHomeReveal();
        viewReady = true;
    }, function () {
        if (currentView === 'home') {
            content.html(errorHtml('Sorry, there was a problem loading the page. Please try again later.'));
        }
    });
}

// --------------------------------------------------------------------------
// The clouds over the first painting
// --------------------------------------------------------------------------

// A veil and three banks of soft white puffs, laid over the slideshow. All
// of the movement is in ambar.css ("Clouds over the first painting"), on the
// elements themselves, so the cloud is opaque from the first frame it is
// painted and a rebuilt slideshow parts it again simply by being new.
// Mirrors AMB_HOME_CLOUDS in actions/publicPageFunctions.php - change both.
var HOME_CLOUDS_HTML = '<div class="home-clouds" aria-hidden="true">' +
    '<div class="home-clouds-veil"></div>' +
    '<div class="home-clouds-bank is-left"></div>' +
    '<div class="home-clouds-bank is-right"></div>' +
    '<div class="home-clouds-bank is-high"></div>' +
    '</div>';

// How long the weather takes to leave. Mirrors the animation durations in
// ambar.css - change both.
var HOME_CLOUDS_MS = 2400;

var homeRevealTimer = null;

// The two things about the arrival that CSS can't do for itself: the
// slideshow holds still until the cloud has gone, so the first painting
// gets a whole turn of being looked at rather than sliding away a moment
// after it appears; and the painting settles the last of its size into
// place while the weather leaves. Both are put back afterwards, and
// neither matters if it never runs.
function startHomeReveal() {
    var carousel = document.getElementById('homePageCarousel');
    if (!carousel) {
        return;
    }
    clearTimeout(homeRevealTimer);
    var first = carousel.querySelector('.carousel-item.active');
    if (prefersReducedMotion()) {
        return; // the cloud is already gone; nothing to wait for
    }
    if (first) {
        first.classList.add('is-settling');
    }
    pauseSlideshow(true);
    homeRevealTimer = setTimeout(function () {
        if (first) {
            first.classList.remove('is-settling');
        }
        // (not while a painting is open: closing it starts the slideshow again)
        if (currentView === 'home' && !viewer.open) {
            pauseSlideshow(false);
        }
    }, HOME_CLOUDS_MS);
}

function createCarousel(works) {
    var content = $('#imagesAndContent').empty();
    var carousel = $('<div>').attr('id', 'homePageCarousel').addClass('carousel slide')
        .addClass(isMobile ? 'homePageCarouselMobile' : 'homePageCarousel');
    var inner = $('<div>').addClass('carousel-inner');

    works.forEach(function (work, index) {
        var link = $('<a>').addClass('carousel-link').attr({ href: work.path, 'data-index': index, 'aria-label': work.name })
            .append(workImage(work, { sizes: carouselSizes(work), lazy: index > 0, priority: index === 0, className: 'd-block carousel-pic' }));
        inner.append($('<div>').addClass('carousel-item' + (index === 0 ? ' active' : '')).append(link));
    });
    carousel.append(inner);
    if (works.length) {
        carousel.append(HOME_CLOUDS_HTML); // the weather over the first painting
    }

    // Arrows only make sense with more than one picture
    if (works.length > 1) {
        carousel.append(
            '<a class="carousel-control-prev" href="#homePageCarousel" role="button" data-slide="prev">' +
            '<span class="carousel-control-prev-icon" aria-hidden="true"></span><span class="sr-only">Previous</span></a>' +
            '<a class="carousel-control-next" href="#homePageCarousel" role="button" data-slide="next">' +
            '<span class="carousel-control-next-icon" aria-hidden="true"></span><span class="sr-only">Next</span></a>'
        );
    }

    content.append(carousel, homeLinks());
    galleryItems = works;

    if (works.length > 1) {
        carousel.carousel({ interval: 3000, ride: 'carousel' });
    }
}

// Under the slideshow, shown on phones only (ambar.css, "The way in"): the
// menu's pages written out as words, so nobody has to find the menu button
// to get past the first page. Taken from the menu itself; if it isn't drawn
// yet, Works alone.
// Mirrors ambRenderHomeLinks() in publicPageFunctions.php - change both.
function homeLinks() {
    var nav = $('<nav class="home-links" aria-label="Pages">');
    function add(href, text) {
        nav.append($('<a>').attr('href', href).text(text).addClass('mainLinkGenres home-link'));
    }
    $('#navLinksBox a.mainLinkGenres').each(function () {
        var href = this.getAttribute('href') || '';
        if (href.charAt(0) === '/' && href !== '/' && this.target !== '_blank') {
            add(href, $(this).text());
        }
    });
    if (!nav.children().length) {
        add('/select-works', 'Works');
    }
    return nav;
}

$(document).on('click', '.home-link', function (event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
    }
    event.preventDefault();
    goTo(this.getAttribute('href'));
});

// The slideshow's paintings are only as tall as 72vh lets them be
// (.carousel-pic), so a portrait one is drawn far narrower than the 62vw the
// gallery's sizes assume. Saying so lets the browser pick a lighter copy.
// Same as ambCarouselSizes() in publicPageFunctions.php.
function carouselSizes(work) {
    if (!work.width || !work.height) {
        return GALLERY_SIZES;
    }
    var ratio = Math.round(work.width / work.height * 1000) / 1000;
    return '(max-width: 992px) 92vw, min(62vw, 72vh * ' + ratio + ')';
}

// Every slide after the first is a lazy picture, and a lazy picture in a
// hidden slide (display: none until Bootstrap moves it in) is never
// fetched, so each painting only started downloading as it slid in. Once
// the first painting has arrived, the slides either side of the one
// showing are fetched ahead (SLIDES_AHEAD forward, one back), and the
// window moves along with the slideshow. Until its own copy is in, each
// slide shows its 400px thumbnail, fetched for every slide at the start
// (they're small), so nothing ever slides in blank.
var SLIDES_AHEAD = 2;
var slideshowPics = [];

function warmSlideshow(works) {
    var carousel = document.getElementById('homePageCarousel');
    slideshowPics = carousel ? [].slice.call(carousel.querySelectorAll('.carousel-pic')) : [];
    if (slideshowPics.length < 2) {
        return;
    }
    var pics = slideshowPics;
    var first = pics[0];
    var started = false;
    function start() {
        if (started || pics !== slideshowPics) {
            return; // already going, or the slideshow has been rebuilt since
        }
        started = true;
        pics.forEach(function (pic, index) {
            if (index > 0 && works[index]) {
                showThumbnailFirst(pic, thumbnailUrl(works[index].location));
            }
        });
        warmSlidesAround(0);
    }
    if (first.complete) {
        start();
    } else {
        first.addEventListener('load', start, { once: true });
        first.addEventListener('error', start, { once: true });
        setTimeout(start, 4000); // a slow first painting doesn't hold the rest up forever
    }
}

function warmSlidesAround(index) {
    var count = slideshowPics.length;
    for (var step = -1; step <= SLIDES_AHEAD; step++) {
        var pic = slideshowPics[(index + step + count) % count];
        if (pic && pic.loading === 'lazy') {
            pic.loading = 'eager'; // starts the download, hidden or not
        }
    }
}

// The thumbnail is the picture's background until the picture itself has
// loaded and covers it (paintings are opaque JPEGs), then it's taken away
function showThumbnailFirst(pic, url) {
    if (pic.complete && pic.naturalWidth) {
        return;
    }
    var thumbnail = new Image();
    thumbnail.onload = function () {
        if (!(pic.complete && pic.naturalWidth)) {
            pic.style.backgroundImage = 'url("' + url + '")';
        }
    };
    thumbnail.src = url;
    pic.addEventListener('load', function () {
        pic.style.backgroundImage = '';
        // Decode it now rather than in the middle of its slide moving in
        if (pic.decode) {
            pic.decode().catch(function () {});
        }
    }, { once: true });
}

// The slideshow doesn't move on underneath an open painting (so closing
// can shrink it back into its slide)
$(document).on('slide.bs.carousel', '#homePageCarousel', function (event) {
    if (viewer.open) {
        event.preventDefault();
        return;
    }
    warmSlidesAround(event.to);
});

$(document).on('click', '.carousel-link', function (event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
    }
    event.preventDefault();
    openViewer(galleryItems, Number(this.getAttribute('data-index')), { from: this });
});

// --------------------------------------------------------------------------
// About
// --------------------------------------------------------------------------

function fetchAboutMe() {
    if (!cachedRequests.about && pageData.about) {
        cachedRequests.about = $.Deferred().resolve(pageData.about).promise();
    }
    if (!cachedRequests.about) {
        // Asked for by its version, so the browser can keep the reply until
        // the text or photo changes (see aboutMeCache.php)
        var version = pageData.aboutVersion ? '?v=' + encodeURIComponent(pageData.aboutVersion) : '';
        cachedRequests.about = $.ajax({ url: '/actions/aboutMeAPI.php' + version, dataType: 'json' });
        cachedRequests.about.fail(function () {
            delete cachedRequests.about;
        });
    }
    return cachedRequests.about;
}

// Turn plain email addresses in the About text into clickable links
function linkEmailAddresses(root) {
    var pattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var textNodes = [];
    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    textNodes.forEach(function (node) {
        var text = node.nodeValue;
        pattern.lastIndex = 0;
        if (!pattern.test(text) || $(node.parentNode).closest('a').length) {
            return;
        }
        pattern.lastIndex = 0;
        var fragment = document.createDocumentFragment();
        var last = 0;
        var match;
        while ((match = pattern.exec(text))) {
            fragment.appendChild(document.createTextNode(text.slice(last, match.index)));
            var link = document.createElement('a');
            link.href = 'mailto:' + match[0];
            link.className = 'email-link';
            link.textContent = match[0];
            fragment.appendChild(link);
            last = match.index + match[0].length;
        }
        fragment.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(fragment, node);
    });
}

function renderAbout(keepScroll) {
    var request = fetchAboutMe();
    var keepServerDrawn = false;
    if (!keepScroll) {
        setView('about');
        // index.php draws the side-by-side layout
        keepServerDrawn = pageIsServerDrawn && window.innerWidth > 1206;
        var content = $('#imagesAndContent').css('padding-top', '50px');
        if (!isLoaded(request)) {
            content.html(loadingHtml(''));
        }
    }

    return whenLoaded(request, function (aboutMe) {
        if (currentView !== 'about') {
            return;
        }
        if (keepServerDrawn) {
            aboutLayout = 'side';
            viewReady = true;
            return;
        }
        var description = multiline(aboutMe.description);
        var picture = aboutMe.pictureLocation || 'baseImages/bubbers.jpg';
        if (!/^(https?:)?\//.test(picture)) {
            picture = '/' + picture;
        }

        aboutLayout = window.innerWidth <= 1206 ? 'stacked' : 'side';
        var content = document.getElementById('imagesAndContent');
        var image = '<div class="ambPicDiv"><img id="ambarPersoPic" alt="Portrait of Ambar Velasco" decoding="sync"></div>';
        content.innerHTML = aboutLayout === 'stacked'
            ? '<div class="infoflexMobile">' + image + '<p>' + description + '</p></div>'
            : '<div class="infoflex"><div class="size1" id="aboutMeInfo"><p>' + description + '</p></div><div class="size2">' + image + '</div></div>';
        document.getElementById('ambarPersoPic').src = picture;

        linkEmailAddresses(content);
        viewReady = true;
    }, function () {
        if (currentView === 'about') {
            $('#imagesAndContent').html(errorHtml("Sorry, we couldn't load the About Me information. Please try again later."));
        }
    });
}

// --------------------------------------------------------------------------
// Current project (image / description flip cards)
// --------------------------------------------------------------------------

function renderCurrentProject() {
    setView('current-project');
    var content = $('#imagesAndContent').css('padding-top', '50px');
    var request = fetchPublicWorks('currentProject');
    if (!isLoaded(request)) {
        content.html(loadingHtml('Loading...'));
    }

    // Always drawn here (even when index.php drew it) so the flip cards work
    return whenLoaded(request, function (projects) {
        if (currentView !== 'current-project') {
            return;
        }
        content.empty();
        var items = [];

        projects.forEach(function (project) {
            var section = $('<div>').addClass('project').attr('id', projectSectionId(project.title)).css('text-align', 'center');
            section.append(
                $('<div>').append(
                    $('<h2>').text(project.title).css('margin-bottom', '30px'),
                    $('<p>').html(multiline(project.description)).css({ color: '#71797E', 'margin-bottom': '60px' })
                )
            );
            var grid = $('<div>').addClass('projectWorks');
            project.works.forEach(function (work) {
                grid.append(createCurrentProjectCard(work, items.length));
                items.push(work);
            });
            section.append(grid);
            content.append(section);
        });

        galleryItems = items;
        viewReady = true;
    }, function () {
        if (currentView === 'current-project') {
            content.html(errorHtml("Sorry, we couldn't load the current project. Please try again later."));
        }
    });
}

function createCurrentProjectCard(work, index) {
    var buttons = $('<div>').addClass('buttonContainer').append($('<span>').text('Image'), $('<span>').text('Description'));
    if (isMobile) {
        buttons.css('paddingBottom', '15px');
    }

    var image = workImage(work, { lazy: index > 0, className: 'currentProjectImage' });
    image.removeAttribute('width');
    image.removeAttribute('height');
    var imageContainer = $('<div>').addClass('img-container').append(image);

    var description = $('<div>').addClass('description_text').html(multiline(work.long_description)).css({
        position: 'relative',
        maxWidth: '80%',
        margin: 'auto',
        cursor: 'default',
        overflowY: 'auto',
        zIndex: zIndexCounter++,
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingTop: isMobile ? '5px' : '20px'
    }).hide();

    // Match the description panel to the picture's size once it has loaded
    $(image).on('load', function () {
        var height = imageContainer.height() + (isMobile ? 0 : 20);
        description.css({ 'max-height': height + 'px', 'min-height': height + 'px', width: imageContainer.width() + 'px' });
    });

    imageContainer.on('click', function () {
        openViewer(galleryItems, index, { from: image });
    });

    buttons.on('click', function () {
        if (description.is(':hidden')) {
            imageContainer.fadeToggle().promise().done(function () { description.fadeToggle(); });
        } else {
            description.fadeToggle().promise().done(function () { imageContainer.fadeToggle(); });
        }
    });

    var holder = $('<div>').addClass('projectImgTxtContainer')
        .css({ display: 'flex', flexDirection: 'column', overflow: 'hidden' })
        .append(imageContainer, description);

    return $('<div>').addClass('card').css({ border: '0px', 'text-align': 'center', 'margin-bottom': '60px' })
        .append(buttons, holder);
}

// --------------------------------------------------------------------------
// Page not found
// --------------------------------------------------------------------------

function renderNotFound() {
    setView('notfound');
    $('#imagesAndContent').css('padding-top', '50px').html(
        '<div class="not-found">' +
        '<h2>Page not found</h2>' +
        '<p>Sorry, there\'s nothing at this address.</p>' +
        '<p><a href="/select-works" class="not-found-link">See the works</a></p>' +
        '</div>'
    );
    viewReady = true;
    return $.Deferred().resolve().promise();
}

$(document).on('click', '.not-found-link', function (event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
    }
    event.preventDefault();
    goTo('/select-works');
});

// --------------------------------------------------------------------------
// Floating newsletter nudge. Wanders slowly round the screen, bouncing off
// its edges and steering away from the middle (where the paintings are), so
// it mostly keeps to the edges and corners. Pauses on hover and while a
// painting is open, opens the newsletter sign-up when clicked. Closing it
// with its x, or signing up, keeps it away for NEWSLETTER_FLOAT_QUIET_DAYS.
// --------------------------------------------------------------------------

var NEWSLETTER_FLOAT_KEY = 'ambNewsletterFloatQuietUntil';
var NEWSLETTER_FLOAT_QUIET_DAYS = 90;
var FLOAT_SPEED = 28;          // px a second (computers)
var FLOAT_SPEED_PHONE = 20;    // px a second (phones)
var FLOAT_EDGE = 14;           // px kept clear of the screen's edges (as the CSS's resting place)
var FLOAT_MIDDLE = 0.72;       // how far out the middle reaches (1 = an edge)
var FLOAT_STEER = 1.6;         // how hard it turns away from the middle
var FLOAT_WANDER = 0.9;        // how much it meanders on its own
var FLOAT_BOUNCE_SPREAD = 0.6; // radians of randomness added to each bounce

function newsletterFloatQuiet() {
    try {
        return Number(localStorage.getItem(NEWSLETTER_FLOAT_KEY) || 0) > Date.now();
    } catch (e) {
        return false; // storage blocked: just show it
    }
}

// Closed with its x, or signed up: away for a few months
function quietNewsletterFloat() {
    try {
        localStorage.setItem(NEWSLETTER_FLOAT_KEY, String(Date.now() + NEWSLETTER_FLOAT_QUIET_DAYS * 864e5));
    } catch (e) { /* storage blocked: hide for this page only */ }
    var float = $('#newsletterFloat');
    float.fadeOut(250, function () {
        float.remove();
        $(window).off('resize.newsletterFloat');
    });
}
window.quietNewsletterFloat = quietNewsletterFloat;

// A heading reflected off a wall whose inward direction is (nx, ny), with a
// little randomness, and always pointing away from the wall afterwards
function bounceOff(heading, nx, ny) {
    var vx = Math.cos(heading), vy = Math.sin(heading);
    var dot = vx * nx + vy * ny;
    if (dot < 0) {
        vx -= 2 * dot * nx;
        vy -= 2 * dot * ny;
    }
    var reflected = Math.atan2(vy, vx);
    var spread = reflected + (Math.random() - 0.5) * FLOAT_BOUNCE_SPREAD;
    return Math.cos(spread) * nx + Math.sin(spread) * ny > 0.2 ? spread : reflected;
}

// The wandering. x, y is the bubble's top-left corner on the screen, heading
// its direction in radians. It keeps to the open area: below the phone's top
// bar, and to the right of the menu column on computers (so it never covers
// the menu), and the middle it steers round is that area's middle.
function wanderNewsletterFloat(el) {
    var w = 0, h = 0, left = 0, top = 0, right = 0, bottom = 0;
    var x, y, heading, turn = 0, last = 0, measured = 0;
    var hovering = false, keyFocus = false;
    var viewer = document.getElementById('bigPicModal');
    var bar = document.getElementById('modifyZIndex');
    var menu = document.getElementById('navLinksBox');

    function measure() {
        w = el.offsetWidth;
        h = el.offsetHeight;
        var W = document.documentElement.clientWidth;
        left = FLOAT_EDGE;
        top = FLOAT_EDGE + (bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0);
        if (window.innerWidth > BREAKPOINT && menu) { // (as setupResponsiveLayout decides)
            left += Math.max(0, menu.getBoundingClientRect().right);
        }
        // (the furthest its top-left corner can go)
        right = Math.max(left, W - w - FLOAT_EDGE);
        bottom = Math.max(top, window.innerHeight - h - FLOAT_EDGE);
    }

    function keepInside() {
        x = Math.min(Math.max(x, left), right);
        y = Math.min(Math.max(y, top), bottom);
    }

    function place() {
        el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
    }

    if (prefersReducedMotion()) {
        return; // stays still in the bottom-left corner (the CSS's place)
    }
    // Sets off from that corner, heading up and to the right
    heading = -Math.PI / 4 + (Math.random() - 0.5) * 0.8;

    // (not while it's hidden, on the basket page: it has no size there)
    function start() {
        var rect = el.getBoundingClientRect();
        x = rect.left;
        y = rect.top;
        el.classList.add('is-wandering');
        measure();
        keepInside();
        place();
    }

    $(window).on('resize.newsletterFloat', function () {
        if (x === undefined || !el.isConnected) {
            return;
        }
        measure();
        keepInside();
        place();
    });
    // Holds still while someone is pointing at it with a mouse, or has
    // reached it with the keyboard. Not after a tap: on a phone that would
    // leave it stopped until the next tap somewhere else.
    var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    $(el).on('mouseenter', function () { hovering = canHover; })
         .on('mouseleave', function () { hovering = false; })
         .on('focusin', function () { keyFocus = el.matches(':focus-visible'); })
         .on('focusout', function () { keyFocus = false; });

    function step(now) {
        if (!el.isConnected) {
            $(window).off('resize.newsletterFloat');
            return; // closed
        }
        var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
        last = now;
        // (hidden on the basket page; no height while a page is still opening)
        var hidden = !el.getClientRects().length || !window.innerHeight;
        var viewing = viewer && !viewer.classList.contains('is-idle'); // a painting is open
        if (!hidden && x === undefined) {
            start();
        } else if (!hidden && now - measured > 1000) {
            measure(); // (its size changes once the leaf has loaded)
            measured = now;
        }
        if (dt && !hovering && !keyFocus && !hidden && !viewing && w) {
            var speed = window.innerWidth <= 576 ? FLOAT_SPEED_PHONE : FLOAT_SPEED;

            // Meander: the turning drifts at random and settles back
            turn += (Math.random() - 0.5) * FLOAT_WANDER * 6 * dt;
            turn *= 1 - Math.min(1, 1.5 * dt);
            heading += turn * dt;

            // The middle: how far in it is, with 0 the centre and 1 an
            // edge (in proportion to the area, so it works on any shape).
            // Inside FLOAT_MIDDLE it turns outwards, harder the deeper it is.
            var halfW = Math.max(1, (right - left) / 2), halfH = Math.max(1, (bottom - top) / 2);
            var dx = (x - left - halfW) / halfW;
            var dy = (y - top - halfH) / halfH;
            var depth = Math.sqrt(dx * dx + dy * dy);
            if (depth < FLOAT_MIDDLE) {
                var out = Math.atan2(dy * halfH, dx * halfW);
                var off = Math.atan2(Math.sin(out - heading), Math.cos(out - heading));
                heading += off * FLOAT_STEER * (1 - depth / FLOAT_MIDDLE) * dt;
            }

            x += Math.cos(heading) * speed * dt;
            y += Math.sin(heading) * speed * dt;

            // The edges: bounce off, a little differently each time
            if (x < left) { heading = bounceOff(heading, 1, 0); turn = 0; }
            if (x > right) { heading = bounceOff(heading, -1, 0); turn = 0; }
            if (y < top) { heading = bounceOff(heading, 0, 1); turn = 0; }
            if (y > bottom) { heading = bounceOff(heading, 0, -1); turn = 0; }
            keepInside();
            place();
        }
        if (hidden) {
            // (on the basket page: only look now and then whether it's back)
            last = 0;
            setTimeout(function () { requestAnimationFrame(step); }, 500);
        } else {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

function spawnNewsletterFloat() {
    if (VT.noBlur) {
        return; // test switch
    }
    if (newsletterFloatQuiet()) {
        return;
    }
    if (document.getElementById('newsletterFloat')) {
        return;
    }

    var float = $(
        '<div id="newsletterFloat" class="newsletter-float" role="button" tabindex="0" aria-label="Sign up for the newsletter">' +
        '  <div class="newsletter-float-inner">' +
        '    <img src="/miscIcons/newsletterLeaf.png" alt="" class="newsletter-float-leaf" width="30" height="26">' +
        '    <span class="newsletter-float-text">Newsletter</span>' +
        '    <button type="button" class="newsletter-float-close" aria-label="Dismiss newsletter reminder">&times;</button>' +
        '  </div>' +
        '</div>'
    );
    $('body').append(float);

    float.find('.newsletter-float-close').on('click keydown', function (e) {
        e.stopPropagation(); // (Enter/Space on the x close it, not open the form)
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') {
            return;
        }
        e.preventDefault();
        quietNewsletterFloat();
    });
    wanderNewsletterFloat(float[0]);

    float.on('click keydown', function (e) {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') {
            return;
        }
        e.preventDefault();
        if (window.innerWidth <= BREAKPOINT && !$('#navLinksBox').hasClass('active')) {
            $('#hamburgerMenu').trigger('click'); // open the drawer so the form is visible
        }
        if (typeof ensureNewsletterOpen === 'function') {
            ensureNewsletterOpen();
        }
    });
}

// --------------------------------------------------------------------------
// Names the menu links (stored in the database) call
// --------------------------------------------------------------------------

// Works, from the menu. On a phone, already on the works, it goes back to
// the top of them, so the tap always does something you can see (on a
// computer it opens and closes the list of projects instead).
function getProjectsAndWorks() {
    if (window.innerWidth <= BREAKPOINT && currentView === 'works' && viewReady && location.pathname === '/select-works') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return $.Deferred().resolve().promise();
    }
    return goTo('/select-works');
}

function openInfo() {
    return goTo('/about');
}

function openCurrentProject() {
    return goTo('/current-project');
}

function loadShop() {
    return goTo('/shop');
}

// Menu link to one project: show the works and scroll to that project
function loadProjectSection(sectionId) {
    ensureDropdownOpen('selectProjectCategories');
    if (currentView === 'works' && viewReady) {
        if (location.pathname !== '/select-works') {
            history.replaceState({ path: '/select-works' }, '', '/select-works');
        }
        scrollToSection(sectionId, true);
        return;
    }
    goTo('/select-works', { section: sectionId });
}

window.getProjectsAndWorks = getProjectsAndWorks;
window.openInfo = openInfo;
window.openCurrentProject = openCurrentProject;
window.loadShop = loadShop;
window.loadProjectSection = loadProjectSection;
window.makeBigPic = makeBigPic;
window.fetchPublicWorks = fetchPublicWorks;
window.projectSectionId = projectSectionId;
window.groupSectionId = groupSectionId;
window.workGroups = workGroups;
window.ensureDropdownOpen = function (sublinksId) {
    var sublinks = $('#' + sublinksId);
    if (!sublinks.is(':visible')) {
        sublinks.show();
    }
};

// --------------------------------------------------------------------------
// TEMPORARY test switch (see VIEWER_TESTS at the top): the pieces that run
// only when ?vt= is in the address
// --------------------------------------------------------------------------

// Shows which test is on, and sets up the ones that change the whole page
function setupViewerTests() {
    if (!VT.id && !VT.menu) {
        return;
    }
    $('<div class="vt-label" aria-hidden="true">').text(VT.menu ? 'TESTS' : 'TEST ' + VT.id).appendTo('#modifyZIndex');
    $('html').toggleClass('vt-no-blur', !!VT.noBlur).toggleClass('vt-no-will-change', !!VT.noWillChange);
    if (VT.syncDecode) {
        $('img[decoding="async"]').attr('decoding', 'sync');
    }
}

// ?vt=menu: the list of tests, each a link that loads the works page fresh
function drawTestMenu() {
    var list = $('<ol>');
    VIEWER_TESTS.forEach(function (test) {
        list.append($('<li>').append(
            $('<a>').attr('href', '/select-works?vt=' + test.id).append(
                $('<b>').text(test.id),
                $('<span>').text(test.name),
                $('<small>').text(test.about)
            )
        ));
    });
    $('#imagesAndContent').empty().append($('<div class="vt-menu">').append(
        $('<h2>').text('iPhone flash tests'),
        $('<p>').text('For each test: open it, scroll well down (ten paintings or more), tap a painting and watch ' +
            'the first moment. Try three spots, each further down the page. Then press Back to return here.'),
        list
    ));
}

// A tap on a painting: true when the test takes over from opening it
function testInsteadOfOpening(card) {
    if (VT.probe) {
        runFlashProbe(VT.probe);
        return true;
    }
    if (VT.predecode) {
        decodePicturesOnScreen().then(function () {
            openViewer(galleryItems, Number(card.getAttribute('data-index')), { from: card });
        });
        return true;
    }
    return false;
}

// Decodes the pictures on (and just around) the screen. Resolves once they
// are, or after half a second at most.
function decodePicturesOnScreen() {
    var waits = [];
    var height = window.innerHeight;
    $('#imagesAndContent img').each(function () {
        var rect = this.getBoundingClientRect();
        if (this.decode && this.complete && this.naturalWidth && rect.bottom > -height / 2 && rect.top < height * 1.5) {
            waits.push(this.decode().catch(function () {}));
        }
    });
    return Promise.race([
        Promise.all(waits),
        new Promise(function (resolve) {
            setTimeout(resolve, 500);
        })
    ]);
}

// The probes: one change on its own, then put back
var probeRunning = false;

function runFlashProbe(kind) {
    if (probeRunning) {
        return;
    }
    probeRunning = true;
    var finished = function () {
        probeRunning = false;
    };

    if (kind === 'redraw') {
        // The page's own background changes colour, so all of it is drawn
        // again, with no new layers
        document.body.style.backgroundColor = '#f6d9e6';
        setTimeout(function () {
            document.body.style.backgroundColor = '';
            finished();
        }, 1200);
    } else if (kind === 'layer') {
        // A new layer of its own, over the margin, away from the paintings
        var dot = $('<div class="vt-dot" aria-hidden="true">').appendTo('body');
        setTimeout(function () {
            dot.remove();
            finished();
        }, 1200);
    } else if (kind === 'backdrop') {
        // The viewer's dark background, exactly as opening starts it
        var dim = $('<div class="modal-backdrop vt-dim" aria-hidden="true">')
            .css('opacity', String(VIEWER_MIN_OPACITY)).appendTo('body');
        setTimeout(function () {
            requestAnimationFrame(function () {
                dim.css({ transition: 'opacity 336ms ease-out', opacity: '0.6' });
            });
        }, 60);
        setTimeout(function () {
            dim.css({ transition: 'opacity 250ms ease', opacity: '0' });
            setTimeout(function () {
                dim.remove();
                finished();
            }, 260);
        }, 1300);
    }
}


// --------------------------------------------------------------------------
// Start-up
// --------------------------------------------------------------------------

$(function () {
    setupViewerTests();
    setupResponsiveLayout();
    setupViewer();

    // Mobile menu
    function setMenuOpen(open) {
        $('#hamburgerMenu').toggleClass('active', open).attr({
            'aria-expanded': open ? 'true' : 'false',
            'aria-label': open ? 'Close menu' : 'Open menu'
        });
        $('#navLinksBox').toggleClass('active', open);
        $('.nav-overlay').toggleClass('active', open);
        $('#sideBySide').toggleClass('menu-open', open);
    }

    $('#hamburgerMenu').on('click', function (e) {
        e.stopPropagation();
        setMenuOpen(!$(this).hasClass('active'));
    });

    $('.nav-overlay').on('click', function () {
        setMenuOpen(false);
    });

    // On phones, menu links close the drawer — except the one that opens the
    // newsletter form inside it
    $(document).on('click', '#navLinksBox a', function (e) {
        if (window.innerWidth > BREAKPOINT) {
            return;
        }
        if ($(this).text() === 'Newsletter') {
            e.stopPropagation();
        } else if (!$(this).closest('#selectProjectCategories, #newsletterSignUp').length) {
            setMenuOpen(false);
        }
    });

    $(document).on('click', '#newsletterSignUp, #newsletterEmail, #newsletterSubmit', function (e) {
        if (window.innerWidth <= BREAKPOINT) {
            e.stopPropagation();
        }
    });

    // The logo goes home without reloading the page
    $('#blockForHeader').on('click', 'a[href="/"]', function (event) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }
        event.preventDefault();
        if (window.innerWidth <= BREAKPOINT) {
            setMenuOpen(false);
        }
        goTo('/');
    });

    // First page of the visit
    var route = parseRoute(location.pathname);
    var view = document.body.getAttribute('data-status') === '404' ? 'notfound' : route.view;
    var section = location.hash && location.hash.indexOf('#section-') === 0 ? location.hash.slice(1) : null;

    history.replaceState($.extend({}, history.state, { path: location.pathname }), '');

    renderView(view, route).then(function () {
        if (VT.menu) {
            drawTestMenu();
        } else if (view === 'works' && route.workId) {
            openSharedWork(route.workId, {});
        } else if (section) {
            scrollToSection(section, false);
        }
    });

    spawnNewsletterFloat();
    startShop(); // shop.js: the basket button
});
