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
//   /about  /shop  /current-project
//   anything else      "page not found" (index.php also sends a real 404)

var BREAKPOINT = 992;
var GALLERY_SIZES = '(max-width: 992px) 92vw, 62vw';
var WEB_VARIANT_WIDTHS = [800, 1200]; // same as AMB_WEB_VARIANT_WIDTHS in imageManipulationFunctions.php
var PAGE_TITLES = {
    'home': 'Ambar Velasco Portfolio',
    'works': 'Select Works - Ambar Velasco',
    'about': 'About - Ambar Velasco',
    'shop': 'Shop - Ambar Velasco',
    'current-project': 'Current Project - Ambar Velasco',
    'notfound': 'Page not found - Ambar Velasco'
};

var isMobile = false;
var currentView = null;      // which page is drawn: 'home', 'works', 'about', ...
var viewReady = false;       // true once that page's content has arrived
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
    hidingNow: false         // closeViewer's own final, instant hide
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
    if (window.innerWidth <= BREAKPOINT) {
        return Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9 * ratio);
    }
    return Math.min(window.innerWidth * 0.9, window.innerHeight * 0.82 * ratio, work.width);
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

function isTouchDevice() {
    return window.innerWidth <= BREAKPOINT && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

// The page has smooth scrolling for in-page jumps, but putting the page back
// where it was must be instant, or it visibly glides down from the top
function instantScrollTo(y) {
    var html = document.documentElement;
    var previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.max(0, y));
    html.style.scrollBehavior = previous;
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

    // Bigger tap targets for the menu links on phones
    $('#navLinksBox a').each(function () {
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
    return { view: 'notfound', path: path };
}

// Phones and tablets skip the home slideshow and land on the works
function resolveView(route) {
    return route.view === 'home' && isTouchDevice() ? 'works' : route.view;
}

// Draws a page (without touching the address bar). Returns a promise that
// resolves once the page's content is on screen.
function renderView(view) {
    if (view === currentView && viewReady) {
        return $.Deferred().resolve().promise();
    }
    switch (view) {
        case 'works': return renderWorks();
        case 'about': return renderAbout();
        case 'shop': return renderShop();
        case 'current-project': return renderCurrentProject();
        case 'notfound': return renderNotFound();
        default: return renderHome();
    }
}

// Go to another page of the site, adding it to the browser history.
// options.section: scroll to that project section once the works are shown.
function goTo(path, options) {
    options = options || {};
    if (viewer.open) {
        closeViewer({ fromHistory: true, instantly: true });
    }

    var route = parseRoute(path);
    var view = resolveView(route);
    var changingPage = view !== currentView;

    if (path !== location.pathname) {
        rememberScroll();
        var newPath = view === 'works' && route.view === 'home' ? '/select-works' : path;
        history.pushState({ path: newPath }, '', newPath);
    }

    var ready = renderView(view);
    if (changingPage && !options.section) {
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
    var view = resolveView(route);
    var state = event.state || {};

    // Forward into a painting that's on the page already
    if (route.workId && currentView === 'works' && viewReady) {
        openSharedWork(route.workId, { fromHistory: true });
        return;
    }

    // Back from a painting to the page it was opened from: it shrinks back
    // into place. Anywhere else: close at once, the page is about to change.
    if (viewer.open) {
        closeViewer({ fromHistory: true, instantly: view !== currentView || !!route.workId });
    }

    // e.g. Back after closing the viewer: the right page is already showing
    if (view === currentView && !route.workId) {
        return;
    }

    renderView(view).then(function () {
        if (route.workId) {
            openSharedWork(route.workId, {});
        } else {
            instantScrollTo(typeof state.scrollY === 'number' ? state.scrollY : 0);
        }
    });
    if (typeof state.scrollY !== 'number') {
        instantScrollTo(0);
    }
});

function setView(view) {
    var main = document.getElementById('imagesAndContent');
    pageIsServerDrawn = main.getAttribute('data-server-view') === view;
    main.removeAttribute('data-server-view');
    currentView = view;
    viewReady = false;
    document.title = PAGE_TITLES[view] || PAGE_TITLES.home;
    $('#imagesAndContent').attr('data-view', view);
}

// --------------------------------------------------------------------------
// Works page
// --------------------------------------------------------------------------

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
            galleryItems = [].concat.apply([], projects.map(function (project) { return project.works; }));
            viewReady = true;
            return;
        }
        content.empty();
        var items = [];

        projects.forEach(function (project, projectIndex) {
            var section = createProjectElement(project);
            var grid = section.find('.projectWorks');
            project.works.forEach(function (work) {
                // The first couple of pictures load straight away; the rest
                // load as the visitor scrolls towards them
                grid.append(createWorkCard(work, items.length, items.length > 1));
                items.push(work);
            });
            if (projectIndex < projects.length - 1) {
                section.append('<div class="work-separator" aria-hidden="true"> ✧ ˚. ࣪ ˖ ·ﾟ ·ﾟ·:。·ﾟﾟ·✮ ⋆ ˚。☆ ⋆。°✩·ﾟ ·ﾟ·:。·ﾟﾟ·°˖✧</div>');
            }
            content.append(section);
        });

        galleryItems = items;
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
    section.append(header, $('<div>').addClass('projectWorks'));
    return section;
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
    viewer.index = (viewer.index + step + viewer.items.length) % viewer.items.length;
    var work = viewer.items[viewer.index];
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
            closeViewer();
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
    setThemeColor(PAGE_THEME_COLOR);
    showInPage();
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
        if (isTouchScreen()) {
            return;
        }
        var scrollbar = window.innerWidth - document.documentElement.clientWidth;
        $('html').addClass('no-scroll');
        $('body').css('padding-right', scrollbar > 0 ? scrollbar + 'px' : '');
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
        $('body').css('padding-right', '');
        if (Math.abs(window.pageYOffset - scrollPosition) > 1) {
            instantScrollTo(scrollPosition);
        }
        document.title = PAGE_TITLES[currentView] || PAGE_TITLES.home;
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
        if (!$(event.target).closest('#popUpImage, .nav-arrow').length) {
            closeViewer();
        }
    });

    document.getElementById('popUpImage').addEventListener('click', function (event) {
        if (isPinching) {
            return;
        }
        changeImage(event.offsetX < this.clientWidth / 2 ? -1 : 1);
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
    // the painting is still flying in or out)
    var image = document.getElementById('popUpImage');
    var tracking = false;
    function onImageTouchStart(e) {
        isPinching = e.touches.length > 1;
        tracking = e.touches.length === 1 && !viewer.opening && !viewer.closing;
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
        image[method]('touchstart', onImageTouchStart, false);
        image[method]('touchmove', onImageTouchMove, false);
        image[method]('touchend', onImageTouchEnd, false);
    };
    setupViewerLayer();
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
        viewReady = true;
    }, function () {
        if (currentView === 'home') {
            content.html(errorHtml('Sorry, there was a problem loading the page. Please try again later.'));
        }
    });
}

function createCarousel(works) {
    var content = $('#imagesAndContent').empty();
    var carousel = $('<div>').attr('id', 'homePageCarousel').addClass('carousel slide')
        .addClass(isMobile ? 'homePageCarouselMobile' : 'homePageCarousel');
    var inner = $('<div>').addClass('carousel-inner');

    works.forEach(function (work, index) {
        var link = $('<a>').addClass('carousel-link').attr({ href: work.path, 'data-index': index, 'aria-label': work.name })
            .append(workImage(work, { sizes: GALLERY_SIZES, lazy: index > 0, priority: index === 0, className: 'd-block carousel-pic' }));
        inner.append($('<div>').addClass('carousel-item' + (index === 0 ? ' active' : '')).append(link));
    });
    carousel.append(inner);

    // Arrows only make sense with more than one picture
    if (works.length > 1) {
        carousel.append(
            '<a class="carousel-control-prev" href="#homePageCarousel" role="button" data-slide="prev">' +
            '<span class="carousel-control-prev-icon" aria-hidden="true"></span><span class="sr-only">Previous</span></a>' +
            '<a class="carousel-control-next" href="#homePageCarousel" role="button" data-slide="next">' +
            '<span class="carousel-control-next-icon" aria-hidden="true"></span><span class="sr-only">Next</span></a>'
        );
    }

    content.append(carousel);
    galleryItems = works;

    if (works.length > 1) {
        carousel.carousel({ interval: 3000, ride: 'carousel' });
    }
}

// The slideshow doesn't move on underneath an open painting (so closing
// can shrink it back into its slide)
$(document).on('slide.bs.carousel', '#homePageCarousel', function (event) {
    if (viewer.open) {
        event.preventDefault();
    }
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
// Shop
// --------------------------------------------------------------------------

function renderShop() {
    setView('shop');
    var content = $('#imagesAndContent').css('padding-top', '50px');
    content.html(loadingHtml('Loading shop...'));

    return $.ajax({
        url: '/actions/shopAPI.php',
        data: { activity: 'active' },
        dataType: 'json'
    }).then(function (items) {
        if (currentView !== 'shop') {
            return;
        }
        content.empty().append($('<div>', { 'class': 'shop-top-space' }));
        // Each item is a Shopify buy-button embed that draws its own product card
        items.forEach(function (item) {
            content.append($('<div>').addClass('shopItem').append($('<div>').addClass('buy-button-embed').html(item.buttonCode)));
        });
        viewReady = true;
    }, function () {
        if (currentView === 'shop') {
            content.html(errorHtml("Sorry, we couldn't load the shop items. Please try again later."));
        }
    });
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
// Floating newsletter nudge. Drifts gently around the page, pauses on hover,
// opens the newsletter sign-up when clicked, and stays on every page until
// the visitor dismisses it with its x (for the rest of their visit).
// --------------------------------------------------------------------------

function spawnNewsletterFloat() {
    if (VT.noBlur) {
        return; // test switch
    }
    try {
        if (sessionStorage.getItem('newsletterFloatDismissed')) {
            return;
        }
    } catch (e) { /* storage blocked: just show it */ }
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

    float.find('.newsletter-float-close').on('click', function (e) {
        e.stopPropagation();
        try {
            sessionStorage.setItem('newsletterFloatDismissed', '1');
        } catch (err) { /* storage blocked: hide for this page only */ }
        float.fadeOut(250, function () { float.remove(); });
    });

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

function getProjectsAndWorks() {
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

    // On phones, menu links close the drawer — except the ones that open a
    // sub-menu (Works) or the newsletter form inside it
    $(document).on('click', '#navLinksBox a', function (e) {
        if (window.innerWidth > BREAKPOINT) {
            return;
        }
        var text = $(this).text();
        if (text === 'Works' || text === 'Newsletter') {
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
    var view = document.body.getAttribute('data-status') === '404' ? 'notfound' : resolveView(route);
    var section = location.hash && location.hash.indexOf('#section-') === 0 ? location.hash.slice(1) : null;

    if (view === 'works' && route.view === 'home') {
        // (keeping the test switch's ?vt= if there is one)
        history.replaceState({ path: '/select-works' }, '', '/select-works' + (VT.id || VT.menu ? location.search : ''));
    } else {
        history.replaceState($.extend({}, history.state, { path: location.pathname }), '');
    }

    renderView(view).then(function () {
        if (VT.menu) {
            drawTestMenu();
        } else if (view === 'works' && route.workId) {
            openSharedWork(route.workId, {});
        } else if (section) {
            scrollToSection(section, false);
        }
    });

    spawnNewsletterFloat();
});
