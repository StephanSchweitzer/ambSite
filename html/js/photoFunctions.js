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
    loadToken: 0
};
var scrollPosition = 0;
var startX, startY;
var isPinching = false;

// We put the scroll position back ourselves (see rememberScroll)
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// --------------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------------

function webImageUrl(location) {
    return '/baseImages/web/' + encodeURIComponent(location);
}

function thumbnailUrl(location) {
    return '/thumbnails/' + encodeURIComponent(location);
}

function originalImageUrl(location) {
    return '/baseImages/' + encodeURIComponent(location);
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
    img.decoding = 'async';
    if (work.width && work.height) {
        img.width = work.width;
        img.height = work.height;
        if (options.sizes && work.width > 400) {
            img.sizes = options.sizes;
            img.srcset = thumbnailUrl(work.location) + ' 400w, ' + webImageUrl(work.location) + ' ' + work.width + 'w';
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
        closeViewer({ fromHistory: true });
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

    if (viewer.open) {
        closeViewer({ fromHistory: true });
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
    container.append(workImage(work, { sizes: GALLERY_SIZES, lazy: lazy }));
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
    openViewer(galleryItems, Number(this.getAttribute('data-index')), {});
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
        openViewer(galleryItems, index, { addressIsSet: true });
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

// options.addressIsSet: the address bar already shows this work (a shared
// link, or Back/Forward), so don't add a history entry
function openViewer(items, index, options) {
    if (!items.length) {
        return;
    }
    var wasOpen = viewer.open;
    viewer.items = items;
    viewer.index = index;

    if (!wasOpen) {
        // Start clean rather than flashing the last painting viewed
        document.getElementById('popUpImage').removeAttribute('src');
        var here = parseRoute(location.pathname);
        viewer.basePath = here.workId ? '/select-works' : here.path;
    }

    var work = items[index];
    if (!options.addressIsSet && location.pathname !== work.path) {
        rememberScroll();
        history.pushState({ path: work.path, viewer: true }, '', work.path);
    }

    showViewerImage();

    if (!wasOpen) {
        viewer.open = true;
        $('#bigPicModal').modal('show');
    }
}

function showViewerImage() {
    var work = viewer.items[viewer.index];
    var img = document.getElementById('popUpImage');
    var src = webImageUrl(work.location);
    var token = ++viewer.loadToken;

    $('#imageTitle').text(work.name);
    $('#imageDescription').html(multiline(work.firstDescription));
    $('#imageCounter').text(viewer.items.length > 1 ? (viewer.index + 1) + ' / ' + viewer.items.length : '');
    $('.modal-nav-arrows').toggle(viewer.items.length > 1);
    document.title = work.name + ' - Ambar Velasco';

    img.alt = work.name;
    img.style.transform = '';
    img.setAttribute('data-original', originalImageUrl(work.location));
    img.removeAttribute('data-fell-back');

    // Keep the previous picture up until the next one is ready (no blank
    // flash), and only show a spinner if it takes a moment
    var spinnerTimer = setTimeout(function () {
        if (token === viewer.loadToken) {
            $('#spinner').show();
            $(img).addClass('is-loading');
        }
    }, 150);

    var loader = new Image();
    loader.onload = loader.onerror = function (event) {
        if (token !== viewer.loadToken) {
            return;
        }
        clearTimeout(spinnerTimer);
        $('#spinner').hide();
        $(img).removeClass('is-loading');
        img.src = event.type === 'error' ? img.getAttribute('data-original') : src;
    };
    loader.src = src;

    // Get the neighbours ready so the arrows feel instant
    [-1, 1].forEach(function (step) {
        var neighbour = viewer.items[(viewer.index + step + viewer.items.length) % viewer.items.length];
        if (neighbour && neighbour !== work) {
            new Image().src = webImageUrl(neighbour.location);
        }
    });
}

function changeImage(step) {
    if (!viewer.open || viewer.items.length < 2) {
        return;
    }
    viewer.index = (viewer.index + step + viewer.items.length) % viewer.items.length;
    var work = viewer.items[viewer.index];
    // Stepping through paintings updates the address without piling up history
    history.replaceState($.extend({}, history.state, { path: work.path }), '', work.path);
    showViewerImage();
}

// options.fromHistory: the address bar has already moved (Back button), so
// only the modal needs closing
function closeViewer(options) {
    if (!viewer.open) {
        return;
    }
    viewer.closingFromHistory = !!(options && options.fromHistory);
    $('#bigPicModal').modal('hide');
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

    // Freeze the page behind the viewer exactly where it is
    modal.on('show.bs.modal', function () {
        scrollPosition = window.pageYOffset;
        $('body').addClass('no-scroll').css('top', -scrollPosition + 'px');
    });

    modal.on('hidden.bs.modal', function () {
        viewer.open = false;
        viewer.loadToken++;
        $('#spinner').hide();
        $('body').removeClass('no-scroll').css('top', '');
        instantScrollTo(scrollPosition);
        document.title = PAGE_TITLES[currentView] || PAGE_TITLES.home;

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

    // Touch: swipe sideways to step through, swipe down to close
    var image = document.getElementById('popUpImage');
    image.addEventListener('touchstart', function (e) {
        isPinching = e.touches.length > 1;
        if (e.touches.length === 1) {
            this.style.transition = 'none';
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
    }, false);

    image.addEventListener('touchmove', function (e) {
        if (e.touches.length > 1) {
            isPinching = true;
        } else if (e.touches.length === 1 && !isPinching) {
            var deltaX = Math.round((e.touches[0].clientX - startX) * 0.3);
            var deltaY = e.touches[0].clientY - startY;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                e.preventDefault();
                this.style.transform = 'translateX(' + deltaX + 'px)';
            }
        }
    }, false);

    image.addEventListener('touchend', function (e) {
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
    }, false);
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
            .append(workImage(work, { sizes: GALLERY_SIZES, lazy: index > 0, className: 'd-block carousel-pic' }));
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

$(document).on('click', '.carousel-link', function (event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
    }
    event.preventDefault();
    openViewer(galleryItems, Number(this.getAttribute('data-index')), {});
});

// --------------------------------------------------------------------------
// About
// --------------------------------------------------------------------------

function fetchAboutMe() {
    if (!cachedRequests.about && pageData.about) {
        cachedRequests.about = $.Deferred().resolve(pageData.about).promise();
    }
    if (!cachedRequests.about) {
        cachedRequests.about = $.ajax({ url: '/actions/aboutMeAPI.php', dataType: 'json' });
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
        var image = '<div class="ambPicDiv"><img id="ambarPersoPic" alt="Portrait of Ambar Velasco" decoding="async"></div>';
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
        openViewer(galleryItems, index, {});
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
// Start-up
// --------------------------------------------------------------------------

$(function () {
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
        history.replaceState({ path: '/select-works' }, '', '/select-works');
    } else {
        history.replaceState($.extend({}, history.state, { path: location.pathname }), '');
    }

    renderView(view).then(function () {
        if (view === 'works' && route.workId) {
            openSharedWork(route.workId, {});
        } else if (section) {
            scrollToSection(section, false);
        }
    });

    spawnNewsletterFloat();
});
