// ==========================================================================
// The shop: its pages, the basket and paying
// ==========================================================================
//
// Works hand in hand with photoFunctions.js, which sends the shop's
// addresses here (renderShopPage) and whose viewer shows the items'
// pictures. This file is loaded first and only defines things; nothing in
// it runs until photoFunctions.js starts the page up and calls startShop(),
// by which time both files are there whichever arrived first.
//
//   /shop               everything for sale
//   /shop/<id>/<name>   the same, with one item open in the side panel
//   /shop/basket        the basket
//   /shop/thank-you     after paying
//
// The shop and its items are drawn by the server
// (actions/shopPageFunctions.php): index.php sends them with the page, and
// moving between them fetches the same HTML from actions/shopAPI.php. This
// file only adds what they do. The basket and thank-you pages belong to one
// visitor, so they are drawn here.
//
// The basket lives in the visitor's own browser (localStorage) as a list of
// { variant, quantity }. It holds no prices: those always come from the
// server, both to show the basket and again when paying.

var SHOP_API = '/actions/shopAPI.php';
var SHOP_ITEM_SIZES = '(max-width: 767px) 92vw, 500px'; // same as SHOP_ITEM_SIZES in shopPageFunctions.php
var BASKET_KEY = 'ambBasket';
var BASKET_CODE_KEY = 'ambBasketCode'; // the promo code the visitor has applied
var basketView = null; // what the basket page is showing: { lines, symbol, countries, ... }

function shopEscape(text) {
    return String(text === null || text === undefined ? '' : text)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 3550 -> "€35.50", 45000 -> "€450". Same as shopMoney() in shopFunctions.php.
function formatMoney(cents, symbol) {
    var amount = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
    return symbol + amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function shopPost(data) {
    return $.ajax({ url: SHOP_API, type: 'POST', contentType: 'application/json', data: JSON.stringify(data), dataType: 'json' });
}

function shopHeader(title) {
    return '<header class="project-header shop-header"><h2 class="project-title">' + shopEscape(title) + '</h2></header>' +
        shopTemplate('shopTestBanner');
}

// The "this shop is a test" wording, written once by the server
// (shopRenderTestBanner / shopRenderTestNote in shopPageFunctions.php) and
// left in the page only while the shop is in test mode; '' otherwise
function shopTemplate(id) {
    var template = document.getElementById(id);
    return template ? template.innerHTML : '';
}

// --------------------------------------------------------------------------
// The basket, as kept in the browser
// --------------------------------------------------------------------------

function readBasket() {
    try {
        var items = JSON.parse(localStorage.getItem(BASKET_KEY) || '[]');
        return Array.isArray(items) ? items.filter(function (item) {
            return item && item.variant > 0 && item.quantity > 0;
        }) : [];
    } catch (e) {
        return [];
    }
}

function writeBasket(items) {
    try {
        localStorage.setItem(BASKET_KEY, JSON.stringify(items));
    } catch (e) { /* storage blocked: the basket lasts only for this page */ }
    drawBasketPill();
}

function basketQuantity(variant) {
    var found = readBasket().filter(function (item) { return item.variant === variant; })[0];
    return found ? found.quantity : 0;
}

// Sets how many of one thing are in the basket (0 takes it out)
function setBasketQuantity(variant, quantity) {
    var items = readBasket().filter(function (item) { return item.variant !== variant; });
    if (quantity > 0) {
        items.push({ variant: variant, quantity: quantity });
    }
    writeBasket(items);
}

// The small "Basket" button that follows the visitor round the site while
// there is something in it
function drawBasketPill() {
    var count = readBasket().reduce(function (sum, item) { return sum + item.quantity; }, 0);
    // (the item panel covers it, so the panel has its own)
    $('.shop-panel-basket').prop('hidden', !count)
        .attr('aria-label', 'Basket: ' + count + (count === 1 ? ' item' : ' items')).find('b').text(count);
    var pill = $('#basketPill');
    var hide = !count || currentView === 'shop-basket' || currentView === 'shop-thanks';
    if (hide) {
        pill.remove();
        return;
    }
    if (!pill.length) {
        pill = $('<a id="basketPill" class="basket-pill" href="/shop/basket" data-shop-nav>' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2L5 8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>' +
            '<span>Basket</span><b></b></a>').appendTo('body');
    }
    pill.attr('aria-label', 'Basket: ' + count + (count === 1 ? ' item' : ' items')).find('b').text(count);
}

// --------------------------------------------------------------------------
// Drawing the shop's pages
// --------------------------------------------------------------------------

// Called by renderView() in photoFunctions.js. Returns a promise that
// resolves once the page is on screen.
function renderShopPage(view, path) {
    var onlyThePanel = shopPanelMove(view);
    setView(view);
    var content = $('#imagesAndContent').css('padding-top', '50px');
    drawBasketPill();

    if (view === 'shop-basket') {
        return drawBasketPage(content);
    }
    if (view === 'shop-thanks') {
        return drawThanksPage(content);
    }

    // The shop is on screen already: an item opens over it, or closes
    if (onlyThePanel) {
        if (view === 'shop-item') {
            return openPanel(path);
        }
        closePanel();
        viewReady = true;
        return $.Deferred().resolve().promise();
    }

    // The page index.php sent is already there (unless a payment left behind
    // is being given up: it was drawn with that payment's items as sold)
    if (pageIsServerDrawn && givingUp.state() !== 'pending') {
        adoptPanel(content);
        var name = panelLayer().find('.shop-item').attr('data-name');
        if (name && view === 'shop-item') {
            setPageTitle(name + ' - Shop - Ambar Velasco');
        }
        // (its button, brought in line with what's already in the basket)
        panelLayer().find('[data-shop-buy]').each(function () {
            updateBuyForm($(this));
        });
        viewReady = true;
        return $.Deferred().resolve().promise();
    }

    var spinner = pageIsServerDrawn ? null : setTimeout(function () {
        content.html(loadingHtml(''));
    }, 200); // (a page index.php drew stays up until it's redrawn)
    var drawn = $.Deferred();
    var show = function (page) {
        clearTimeout(spinner);
        if (currentView !== view || shownPath !== path) {
            drawn.resolve(); // the visitor has already moved on
            return;
        }
        content.html(page.html);
        adoptPanel(content);
        setPageTitle(page.title);
        panelLayer().find('[data-shop-buy]').each(function () {
            updateBuyForm($(this));
        });
        // An old link's name part is brought up to date
        if (page.view === 'shop-item' && page.path && page.path !== location.pathname) {
            history.replaceState($.extend({}, history.state, { path: page.path }), '', page.path);
            shownPath = page.path;
        }
        viewReady = true;
        drawn.resolve();
    };
    givingUp.then(function () {
        return $.ajax({ url: SHOP_API, data: { view: 'page', path: path }, dataType: 'json' });
    }).then(show, function (xhr) {
        if (xhr.status === 404 && xhr.responseJSON && xhr.responseJSON.html) {
            show(xhr.responseJSON); // sold and taken down since the link was made
            return;
        }
        clearTimeout(spinner);
        if (currentView === view && shownPath === path) {
            content.html(errorHtml("Sorry, the shop couldn't be loaded. Please try again."));
        }
        drawn.reject();
    });
    return drawn.promise();
}

// Links between the shop's pages stay inside the page (no reload)
$(document).on('click', 'a[data-shop-nav]', function (event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
    }
    event.preventDefault();
    var href = this.getAttribute('href');
    // An item clicked in the shop opens over it (Back closes it again)
    if (this.hasAttribute('data-shop-item') && shopIndexShowing()) {
        panelOpener = this;
        goTo(href, { state: { shopPanel: true } });
        return;
    }
    goTo(href);
});

// --------------------------------------------------------------------------
// The item panel
// --------------------------------------------------------------------------
//
// An item clicked in the shop opens in a panel over it (from the right on
// computers, up from the bottom on phones) rather than on a page of its own,
// so the shop stays where it was underneath. The item still has its own
// address, so it can be shared and found by search engines, and Back closes
// it. Arriving at that address from anywhere else (a shared link, the
// basket, "Available in the shop" in the viewer), the shop is drawn with the
// panel already open.
//
// The panel is drawn by the server with the shop (closed and empty, or open
// with an item), then moved out to the end of the page, where nothing around
// it can clip or blur it (the open menu blurs the page).

var SHOP_PANEL_MS = 420; // the panel's slide in ambar.css
var SHOP_ITEM_KEEP_MS = 60000; // how long a fetched item is good for
var shopItemCache = {}; // item address -> { at, request }
var panelToken = 0; // only the latest item asked for is put in the panel
var panelOpener = null; // the card clicked: it gets the focus back on closing
var panelTidyTimer = null;

function panelLayer() {
    return $('body > .shop-panel-layer');
}

function panelIsOpen() {
    return panelLayer().hasClass('is-open');
}

// The list of everything for sale is on screen
function shopIndexShowing() {
    return (currentView === 'shop' || currentView === 'shop-item') && $('#imagesAndContent > .shop-index').length > 0;
}

// Called by goTo() and Back / Forward in photoFunctions.js: going to `view`
// only opens or closes an item's panel, so the shop shouldn't scroll
function shopPanelMove(view) {
    return (view === 'shop' || view === 'shop-item') && shopIndexShowing();
}

// Called by setView() for every page drawn: leaving the shop shuts the panel
function leaveShopPanel(view) {
    if (view !== 'shop' && view !== 'shop-item') {
        closePanel(true);
    }
}

// The panel that came with a newly drawn shop takes the place of the old one
function adoptPanel(content) {
    var layer = content.find('.shop-panel-layer');
    if (!layer.length) {
        return;
    }
    closePanel(true);
    panelLayer().remove();
    layer.appendTo('body');
    listenToPanelTouches(layer[0]);
    drawBasketPill();
    if (layer.hasClass('is-open')) {
        holdPage(true);
        layer.find('.shop-panel')[0].focus({ preventScroll: true });
    }
}

// Computers: the shop behind can't scroll while the panel is open, and the
// scrollbar's room is kept empty so nothing widens (as for the viewer).
// Phones and tablets: the page is left alone (switching its scrolling off
// makes Safari repaint it white, see the viewer); listenToPanelTouches stops
// it scrolling instead.
function holdPage(hold) {
    var html = $('html');
    if (hold && !isTouchScreen() && !html.hasClass('shop-panel-open')) {
        var scrollbar = window.innerWidth - document.documentElement.clientWidth;
        html.addClass('shop-panel-open');
        $('body').css('padding-right', scrollbar > 0 ? scrollbar + 'px' : '');
    } else if (!hold && html.hasClass('shop-panel-open')) {
        html.removeClass('shop-panel-open');
        $('body').css('padding-right', '');
    }
}

// An item, fetched once and kept for a minute: the cards fetch theirs as the
// pointer reaches them, so the panel usually fills the moment it opens
function shopItemRequest(path) {
    var kept = shopItemCache[path];
    if (kept && Date.now() - kept.at < SHOP_ITEM_KEEP_MS && kept.request.state() !== 'rejected') {
        return kept.request;
    }
    // (after any payment left behind is given up, or its items look sold)
    var request = givingUp.then(function () {
        return $.ajax({ url: SHOP_API, data: { view: 'page', path: path }, dataType: 'json' });
    });
    shopItemCache[path] = { at: Date.now(), request: request };
    return request;
}

$(document).on('pointerover focusin', 'a[data-shop-item]', function () {
    if (shopIndexShowing()) {
        shopItemRequest(this.getAttribute('href'));
    }
});

function openPanel(path) {
    var layer = panelLayer();
    var token = ++panelToken;
    var drawn = $.Deferred();
    var request = shopItemRequest(path);
    var wasOpen = layer.hasClass('is-open');

    if (!wasOpen) {
        layer.find('.shop-panel-body').scrollTop(0);
    }
    // (.done, not .then: an item already fetched goes in straight away,
    // before the panel shows, so the last item is never seen in it)
    request.done(function (page) {
        if (token === panelToken) {
            fillPanel(layer, page);
        }
        viewReady = true;
        drawn.resolve();
    }).fail(function (xhr) {
        delete shopItemCache[path];
        if (token === panelToken) {
            layer.find('.shop-panel-body').html(xhr && xhr.status === 404
                ? '<div class="shop-empty"><p>This is no longer available.</p></div>'
                : errorHtml("Sorry, this couldn't be loaded. Please try again."));
        }
        viewReady = true;
        drawn.resolve();
    });
    if (request.state() === 'pending') {
        drawStandIn(layer, path);
    }
    if (!wasOpen) {
        showPanel(layer);
    }
    return drawn.promise();
}

// While the item is on its way: its picture and name from the card clicked
function drawStandIn(layer, path) {
    var body = layer.find('.shop-panel-body');
    var card = $('a[data-shop-item]').filter(function () {
        return this.getAttribute('href') === path;
    }).first();
    var img = card.find('img')[0];
    if (!card.length) {
        body.html(loadingHtml(''));
        return;
    }
    var picture = '';
    if (img && img.complete && img.naturalWidth) {
        picture = '<div class="shop-item-pictures"><div class="shop-item-picture" style="--w: ' + img.naturalWidth + '; --h: ' + img.naturalHeight + ';">' +
            '<div class="img-container"><img src="' + shopEscape(img.currentSrc || img.src) + '" alt="" decoding="sync"></div></div></div>';
    }
    body.html('<article class="shop shop-item is-standin">' + picture +
        '<div class="shop-item-info"><h2 class="shop-item-title" id="shopItemTitle">' + shopEscape(card.find('.shop-card-name').text()) + '</h2>' +
        '<div class="loading-spinner"></div></div></article>');
}

function fillPanel(layer, page) {
    var body = layer.find('.shop-panel-body');
    var standIn = body.find('.is-standin img')[0];
    var shown = standIn ? standIn.currentSrc || standIn.src : null;
    body.html(page.panel);
    // The card's picture, already on screen, shows until the panel's sharper
    // copy has arrived (same painting, same shape)
    var img = body.find('.shop-item-picture img')[0];
    if (shown && img && !img.complete) {
        img.style.backgroundImage = 'url("' + shown + '")';
        img.addEventListener('load', function () {
            img.style.backgroundImage = '';
        });
    }
    body.find('[data-shop-buy]').each(function () {
        updateBuyForm($(this));
    });
    setPageTitle(page.title);
    // An old link's name part is brought up to date
    if (page.path && page.path !== location.pathname && currentView === 'shop-item') {
        history.replaceState($.extend({}, history.state, { path: page.path }), '', page.path);
        shownPath = page.path;
    }
}

function showPanel(layer) {
    clearTimeout(panelTidyTimer);
    layer.removeClass('is-instant');
    layer[0].inert = false;
    layer.addClass('is-open');
    holdPage(true);
    layer.find('.shop-panel')[0].focus({ preventScroll: true });
    drawBasketPill();
}

// instantly: no slide (another page is about to be drawn)
function closePanel(instantly) {
    var layer = panelLayer();
    panelToken++;
    if (!layer.hasClass('is-open')) {
        return;
    }
    var panel = layer.find('.shop-panel')[0];
    panel.style.transform = '';
    panel.style.transition = '';
    layer.toggleClass('is-instant', !!instantly || prefersReducedMotion());
    layer.removeClass('is-open');
    layer[0].inert = true;
    holdPage(false);
    if (layer[0].contains(document.activeElement)) {
        document.activeElement.blur();
    }
    if (!instantly && panelOpener && document.body.contains(panelOpener)) {
        panelOpener.focus({ preventScroll: true });
    }
    panelOpener = null;
    clearTimeout(panelTidyTimer);
    panelTidyTimer = setTimeout(function () {
        layer.removeClass('is-instant');
    }, SHOP_PANEL_MS + 40);
}

// The visitor closes it (the cross, the shop around it, Escape, "Keep
// browsing", a swipe down): back to the shop's address, by the history
function askToClosePanel() {
    if (!panelIsOpen() || viewer.open) {
        return;
    }
    if (history.state && history.state.shopPanel && currentView === 'shop-item') {
        history.back(); // so Back afterwards doesn't open it again
        return;
    }
    // (arrived straight at the item: the shop takes its place in the history)
    history.replaceState({ path: '/shop' }, '', '/shop');
    renderView('shop', parseRoute('/shop'));
}

$(document).on('click', '[data-shop-panel-close]', askToClosePanel);

document.addEventListener('keydown', function (event) {
    // (with the viewer open on top, Escape is the viewer's)
    if (event.key === 'Escape' && !viewer.open && panelIsOpen()) {
        askToClosePanel();
    }
});

// Keyboard focus stays in the open panel
document.addEventListener('focusin', function (event) {
    var layer = panelLayer();
    if (layer.hasClass('is-open') && !viewer.open && !layer[0].contains(event.target)) {
        layer.find('.shop-panel')[0].focus({ preventScroll: true });
    }
});

// Touch: a finger on the panel scrolls the panel, never the shop behind it.
// On phones the panel is a sheet from the bottom, and pulling it down from
// the top lets it go.
function listenToPanelTouches(layerEl) {
    var panel = layerEl.querySelector('.shop-panel');
    var body = layerEl.querySelector('.shop-panel-body');
    var startY = 0;
    var lastY = 0;
    var lastTime = 0;
    var speed = 0;
    var canPull = false;
    var pulling = false;
    var isSheet = function () {
        return window.matchMedia('(max-width: 767px)').matches;
    };

    layerEl.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) {
            return;
        }
        startY = lastY = e.touches[0].clientY;
        lastTime = e.timeStamp;
        speed = 0;
        pulling = false;
        canPull = isSheet() && panel.contains(e.target) && body.scrollTop <= 0;
    }, { passive: true });

    layerEl.addEventListener('touchmove', function (e) {
        if (e.touches.length !== 1 || !e.cancelable) {
            return;
        }
        var y = e.touches[0].clientY;
        var down = y > lastY;
        speed = (y - lastY) / Math.max(1, e.timeStamp - lastTime);
        lastY = y;
        lastTime = e.timeStamp;
        if (!panel.contains(e.target)) {
            e.preventDefault(); // the shaded shop behind
            return;
        }
        if (pulling || (canPull && y > startY && body.scrollTop <= 0)) {
            pulling = true;
            e.preventDefault();
            panel.style.transition = 'none';
            panel.style.transform = 'translateY(' + Math.max(0, y - startY) + 'px)';
            return;
        }
        var atTop = body.scrollTop <= 0;
        var atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 1;
        if (!body.contains(e.target) || (down && atTop) || (!down && atBottom)) {
            e.preventDefault();
        }
    }, { passive: false });

    var letGo = function () {
        if (!pulling) {
            return;
        }
        pulling = false;
        var pulled = lastY - startY;
        // (back to the panel's own slide, from where the finger left it)
        panel.style.transition = '';
        panel.style.transform = '';
        if (pulled > 110 || (pulled > 30 && speed > 0.5)) {
            askToClosePanel();
        }
    };
    layerEl.addEventListener('touchend', letGo);
    layerEl.addEventListener('touchcancel', letGo);
}

// --------------------------------------------------------------------------
// An item, in the panel
// --------------------------------------------------------------------------

function shopItemImages(el) {
    try {
        return JSON.parse($(el).closest('.shop-item').attr('data-images') || '[]');
    } catch (e) {
        return [];
    }
}

// The main picture opens in the same viewer as the works: zoom, "See to
// scale" and stepping between the item's pictures all come with it
$(document).on('click', '.shop-item-picture', function (event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
    }
    event.preventDefault();
    var images = shopItemImages(this).map(function (image) {
        // (the viewer keeps the address as it is: these all live at this page)
        return $.extend({}, image, { path: location.pathname });
    });
    if (images.length) {
        openViewer(images, Number(this.getAttribute('data-index')) || 0, { from: this });
    }
});

// The small pictures swap the main one
$(document).on('click', '.shop-thumb', function () {
    var index = Number(this.getAttribute('data-index'));
    var image = shopItemImages(this)[index];
    if (!image) {
        return;
    }
    var item = $(this).closest('.shop-item');
    item.find('.shop-thumb').removeClass('is-current');
    $(this).addClass('is-current');
    var picture = item.find('.shop-item-picture').attr({ 'data-index': index, href: webImageUrl(image.location) });
    if (image.width && image.height) {
        picture[0].style.setProperty('--w', image.width);
        picture[0].style.setProperty('--h', image.height);
    }
    picture.find('.img-container').empty().append(workImage(image, { sizes: SHOP_ITEM_SIZES, lazy: false }));
});

function chosenVariant(form) {
    var input = form.find('input[name=variant]:checked');
    return input.length ? input : form.find('input[name=variant][type=hidden]');
}

// How many more of the chosen size this visitor can still add
function roomLeft(form) {
    var input = chosenVariant(form);
    return Math.max(0, Number(input.attr('data-max')) - basketQuantity(Number(input.val())));
}

function updateBuyForm(form) {
    var input = chosenVariant(form);
    var max = Number(input.attr('data-max')) || 0;
    var left = input.attr('data-left');
    var room = roomLeft(form);
    form.find('.shop-option').each(function () {
        $(this).toggleClass('is-chosen', $(this).find('input').prop('checked'));
    });
    form.closest('.shop-item-info').find('[data-shop-price]').text(input.attr('data-price'));
    form.find('.shop-quantity').prop('hidden', max < 2);
    var value = form.find('.shop-quantity-value');
    value.text(Math.max(1, Math.min(Number(value.text()) || 1, Math.max(room, 1))));
    form.find('[data-shop-left]').prop('hidden', !left).text(left ? 'Only ' + left + ' left' : '');
    form.find('button[type=submit]').prop('disabled', room < 1).text(room < 1 ? 'In your basket' : 'Add to basket');
}

$(document).on('change', '[data-shop-buy] input[name=variant]', function () {
    var form = $(this).closest('form');
    form.find('.shop-quantity-value').text('1');
    form.find('.shop-added').prop('hidden', true);
    updateBuyForm(form);
});

$(document).on('click', '[data-shop-buy] .shop-step', function () {
    var form = $(this).closest('form');
    var value = form.find('.shop-quantity-value');
    var next = (Number(value.text()) || 1) + Number(this.getAttribute('data-step'));
    value.text(Math.max(1, Math.min(next, Math.max(roomLeft(form), 1))));
});

$(document).on('submit', '[data-shop-buy]', function (event) {
    event.preventDefault();
    var form = $(this);
    var variant = Number(chosenVariant(form).val());
    var wanted = Number(form.find('.shop-quantity-value').text()) || 1;
    var adding = Math.min(wanted, roomLeft(form));
    if (!variant || adding < 1) {
        return;
    }
    setBasketQuantity(variant, basketQuantity(variant) + adding);
    form.find('.shop-quantity-value').text('1');
    var added = form.find('.shop-added').prop('hidden', false)[0];
    updateBuyForm(form);
    // (brought into sight in the panel, where it can open below the fold)
    var scroller = $(added).closest('.shop-panel-body')[0];
    if (scroller) {
        var below = added.getBoundingClientRect().bottom + 24 - scroller.getBoundingClientRect().bottom;
        if (below > 0) {
            scroller.scrollTo({ top: scroller.scrollTop + below, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
    }
    $('#basketPill, .shop-panel-basket').addClass('is-bumped');
    setTimeout(function () { $('#basketPill, .shop-panel-basket').removeClass('is-bumped'); }, 500);
});

// A work that's for sale: the link under it in the viewer goes to the shop
$(document).on('click', '#imageShop', function (event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
    }
    event.preventDefault();
    goTo(this.getAttribute('href'));
});

// --------------------------------------------------------------------------
// The basket page
// --------------------------------------------------------------------------

function readBasketCode() {
    try {
        return localStorage.getItem(BASKET_CODE_KEY) || '';
    } catch (e) {
        return '';
    }
}

function writeBasketCode(code) {
    try {
        if (code) {
            localStorage.setItem(BASKET_CODE_KEY, code);
        } else {
            localStorage.removeItem(BASKET_CODE_KEY);
        }
    } catch (e) { /* storage blocked: the code lasts only for this page */ }
}

// What a promo code takes off items costing `items` cents: never more than
// they cost, and never anything off delivery. Same sum as shopPromoDiscount()
// in shopOrderFunctions.php, which is the one that counts.
function promoDiscount(promo, items) {
    if (!promo) {
        return 0;
    }
    var off = promo.kind === 'percent' ? Math.floor(items * Math.min(100, promo.value) / 100) : promo.value;
    return Math.max(0, Math.min(off, items));
}

function drawBasketPage(content) {
    // Back from Stripe's page without paying: let go of what was set aside
    // for that payment, straight away
    var cancelled = /[?&]cancelled=([a-f0-9]{32})/.exec(location.search);
    if (cancelled) {
        shopPost({ action: 'abandon', token: cancelled[1] });
        history.replaceState($.extend({}, history.state, { path: '/shop/basket' }), '', '/shop/basket');
    }

    // A payment started on this page and left unfinished is given up first,
    // so what it set aside shows as available again (a one-of-a-kind original
    // would otherwise look sold to the very person buying it)
    var unfinished = checkoutState && checkoutState.paying ? null : readCheckoutToken();
    endCheckout();
    if (unfinished) {
        if (!content.find('.shop-basket').length || content.find('.checkout-form').length) {
            content.html('<div class="shop shop-basket">' + shopHeader('Basket') + loadingHtml('') + '</div>');
        }
        var after = $.Deferred();
        shopPost({ action: 'abandon', token: unfinished }).always(function () {
            writeCheckoutToken('');
            if (currentView !== 'shop-basket') {
                after.resolve();
                return;
            }
            drawBasketPage(content).then(after.resolve, after.reject);
        });
        return after.promise();
    }

    var items = readBasket();
    if (!items.length) {
        basketView = null;
        content.html('<div class="shop shop-basket">' + shopHeader('Basket') +
            '<div class="shop-empty"><p>Your basket is empty.</p>' +
            '<p><a href="/shop" class="shop-text-link" data-shop-nav>Continue shopping</a></p></div></div>');
        viewReady = true;
        return $.Deferred().resolve().promise();
    }

    if (!content.find('.shop-basket').length) {
        content.html('<div class="shop shop-basket">' + shopHeader('Basket') + loadingHtml('') + '</div>');
    }
    var drawn = $.Deferred();
    var code = readBasketCode();
    shopPost({ action: 'basket', items: items, code: code }).then(function (data) {
        if (currentView !== 'shop-basket') {
            drawn.resolve();
            return;
        }
        // Bring the stored basket in line with what can really be bought:
        // things that have gone are taken out, numbers come down to what's left
        var notes = [];
        data.lines.forEach(function (line) {
            // (with its size, when it has one: another size may still be there)
            var called = line.name ? '“' + line.name + '”' + (line.label ? ' (' + line.label + ')' : '') : '';
            if (line.problem === 'gone') {
                notes.push((called || 'Something in your basket') + ' is no longer available and has been removed from your basket.');
                setBasketQuantity(line.variant, 0);
            } else if (line.problem === 'stock') {
                notes.push('Only ' + line.available + ' of ' + called + ' ' + (line.available === 1 ? 'is' : 'are') + ' left. The quantity has been updated.');
                line.quantity = line.available;
                setBasketQuantity(line.variant, line.available);
            }
        });
        data.lines = data.lines.filter(function (line) { return line.problem !== 'gone'; });
        data.notes = notes;
        // A code that doesn't work is forgotten, but stays in its box with
        // the reason, ready to be corrected
        if (data.promoProblem) {
            data.typedCode = code;
            writeBasketCode('');
        }
        basketView = data;
        paintBasket(content);
        viewReady = true;
        drawn.resolve();
    }, function () {
        if (currentView === 'shop-basket') {
            content.html('<div class="shop shop-basket">' + shopHeader('Basket') +
                errorHtml("Sorry, your basket couldn't be loaded. Please try again.") + '</div>');
        }
        drawn.reject();
    });
    return drawn.promise();
}

// The country to start with: the one chosen last time, else a guess from
// the browser's language ("fr-BE" -> Belgium)
function startingCountry(countries) {
    var saved = null;
    try {
        saved = localStorage.getItem('ambBasketCountry');
    } catch (e) { /* storage blocked */ }
    if (saved && countries[saved]) {
        return saved;
    }
    var region = (/-([A-Za-z]{2})\b/.exec(navigator.language || '') || [])[1];
    region = region ? region.toUpperCase() : '';
    return countries[region] ? region : '';
}

function paintBasket(content) {
    var data = basketView;
    if (!data.lines.length) {
        content.html('<div class="shop shop-basket">' + shopHeader('Basket') +
            data.notes.map(function (note) { return '<p class="shop-status">' + shopEscape(note) + '</p>'; }).join('') +
            '<div class="shop-empty"><p>Your basket is empty.</p>' +
            '<p><a href="/shop" class="shop-text-link" data-shop-nav>Continue shopping</a></p></div></div>');
        return;
    }

    var lines = data.lines.map(function (line) {
        var stepper = line.available > 1
            ? '<span class="shop-stepper"><button type="button" class="shop-step" data-step="-1" aria-label="One fewer">&minus;</button>' +
              '<output class="shop-quantity-value">' + line.quantity + '</output>' +
              '<button type="button" class="shop-step" data-step="1" aria-label="One more"' + (line.quantity >= line.available ? ' disabled' : '') + '>+</button></span>'
            : '';
        return '<li class="basket-line" data-variant="' + line.variant + '">' +
            '<a class="basket-line-picture" href="' + shopEscape(line.path) + '" data-shop-nav tabindex="-1" aria-hidden="true">' +
            (line.image ? '<img src="' + shopEscape(thumbnailUrl(line.image)) + '" alt="" decoding="sync">' : '') + '</a>' +
            '<div class="basket-line-text"><a class="basket-line-name" href="' + shopEscape(line.path) + '" data-shop-nav>' + shopEscape(line.name) + '</a>' +
            (line.label ? '<span class="basket-line-option">' + shopEscape(line.label) + '</span>' : '') +
            '<div class="basket-line-controls">' + stepper + '<button type="button" class="basket-remove">Remove</button></div></div>' +
            '<div class="basket-line-price">' + shopEscape(formatMoney(line.priceCents * line.quantity, data.symbol)) + '</div></li>';
    }).join('');

    var codes = Object.keys(data.countries).sort(function (a, b) {
        return data.countries[a].name.localeCompare(data.countries[b].name);
    });
    var chosen = startingCountry(data.countries);
    var options = '<option value="">Choose a country</option>' + codes.map(function (code) {
        return '<option value="' + code + '"' + (code === chosen ? ' selected' : '') + '>' + shopEscape(data.countries[code].name) + '</option>';
    }).join('');

    var promoBlock;
    if (data.promo) {
        promoBlock = '<p class="basket-code-on"><span>Code <b>' + shopEscape(data.promo.code) + '</b> &middot; ' + shopEscape(data.promo.label) + '</span>' +
            '<button type="button" class="basket-code-remove">Remove</button></p>';
    } else {
        var open = !!data.promoProblem;
        promoBlock = '<button type="button" class="basket-code-toggle" aria-expanded="' + open + '"' + (open ? ' hidden' : '') + '>Have a promo code?</button>' +
            '<form class="basket-code-form"' + (open ? '' : ' hidden') + '>' +
            '<input type="text" id="basketCode" aria-label="Promo code" placeholder="Promo code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" value="' + shopEscape(data.typedCode || '') + '">' +
            '<button type="submit">Apply</button></form>' +
            '<p class="basket-code-problem" role="alert"' + (open ? '' : ' hidden') + '>' + shopEscape(data.promoProblem || '') + '</p>';
    }

    var pay;
    if (data.paused) {
        pay = '<p class="shop-status">The shop is temporarily closed. Your basket has been saved.</p>';
    } else if (!data.canPay || !codes.length) {
        pay = '<p class="shop-status">Checkout is not available yet. Your basket has been saved.</p>';
    } else if (data.payOnPage) {
        pay = '<button type="button" class="shop-button basket-pay">Checkout</button>';
        loadStripeJs().then(null, function () { /* tried again when paying */ });
    } else {
        pay = '<button type="button" class="shop-button basket-pay">Checkout</button>';
    }

    content.html('<div class="shop shop-basket">' + shopHeader('Basket') +
        data.notes.map(function (note) { return '<p class="shop-status">' + shopEscape(note) + '</p>'; }).join('') +
        '<div class="basket-layout"><ul class="basket-lines">' + lines + '</ul>' +
        '<div class="basket-summary">' +
        (codes.length ? '<label for="basketCountry">Delivery country</label><select id="basketCountry">' + options + '</select>' : '') +
        '<div class="basket-code">' + promoBlock + '</div>' +
        '<dl class="basket-totals"><dt>Items</dt><dd id="basketItems"></dd>' +
        (data.promo ? '<dt>Promo code</dt><dd id="basketDiscount"></dd>' : '') +
        '<dt>Delivery</dt><dd id="basketDelivery"></dd>' +
        '<dt class="is-total">Total</dt><dd class="is-total" id="basketTotal"></dd></dl>' +
        '<p class="shop-status basket-problem" role="alert" hidden></p>' + pay +
        '<p class="basket-more"><a href="/shop" class="shop-text-link" data-shop-nav>Continue shopping</a></p>' +
        '</div></div></div>');
    updateBasketTotals();
}

function updateBasketTotals() {
    var data = basketView;
    var items = 0;
    var large = false;
    data.lines.forEach(function (line) {
        items += line.priceCents * line.quantity;
        large = large || line.shippingClass === 'large';
    });
    var country = data.countries[$('#basketCountry').val()];
    var delivery = country ? (large ? country.large : country.standard) : null;
    var discount = promoDiscount(data.promo, items);
    $('#basketItems').text(formatMoney(items, data.symbol));
    $('#basketDiscount').text('\u2212' + formatMoney(discount, data.symbol));
    $('#basketDelivery').text(delivery === null ? 'Choose a country' : (delivery === 0 ? 'Free' : formatMoney(delivery, data.symbol)));
    $('#basketTotal').text(formatMoney(items - discount + (delivery || 0), data.symbol));
}

// Promo code: the small link opens a box to type it in; applying it asks
// the server (the basket is simply fetched again with the code)
$(document).on('click', '.basket-code-toggle', function () {
    $(this).prop('hidden', true);
    $('.basket-code-form').prop('hidden', false);
    $('#basketCode').focus();
});

$(document).on('submit', '.basket-code-form', function (event) {
    event.preventDefault();
    var code = $.trim($('#basketCode').val());
    if (!code) {
        $('#basketCode').focus();
        return;
    }
    $(this).find('button').prop('disabled', true).text('Checking…');
    writeBasketCode(code);
    drawBasketPage($('#imagesAndContent'));
});

$(document).on('click', '.basket-code-remove', function () {
    writeBasketCode('');
    basketView.promo = null;
    basketView.promoProblem = null;
    basketView.typedCode = '';
    paintBasket($('#imagesAndContent'));
});

function basketLine(el) {
    var variant = Number($(el).closest('.basket-line').attr('data-variant'));
    return basketView.lines.filter(function (line) { return line.variant === variant; })[0];
}

$(document).on('click', '.basket-line .shop-step', function () {
    var line = basketLine(this);
    if (!line) {
        return;
    }
    line.quantity = Math.max(1, Math.min(line.available, line.quantity + Number(this.getAttribute('data-step'))));
    setBasketQuantity(line.variant, line.quantity);
    paintBasket($('#imagesAndContent'));
});

$(document).on('click', '.basket-remove', function () {
    var line = basketLine(this);
    if (!line) {
        return;
    }
    setBasketQuantity(line.variant, 0);
    basketView.lines = basketView.lines.filter(function (each) { return each !== line; });
    basketView.notes = [];
    paintBasket($('#imagesAndContent'));
});

$(document).on('change', '#basketCountry', function () {
    try {
        localStorage.setItem('ambBasketCountry', this.value);
    } catch (e) { /* storage blocked */ }
    $('.basket-problem').prop('hidden', true);
    updateBasketTotals();
});

$(document).on('click', '.basket-pay', function () {
    var button = $(this);
    var problem = $('.basket-problem').prop('hidden', true);
    var country = $('#basketCountry').val();
    if (!country) {
        problem.text('Please choose a delivery country.').prop('hidden', false);
        $('#basketCountry').focus();
        return;
    }
    var onPage = basketView.payOnPage;
    var label = button.text();
    button.prop('disabled', true).text(onPage ? 'Loading…' : 'Redirecting…');
    var code = basketView.promo ? basketView.promo.code : '';
    var replaces = readCheckoutToken();
    // (Stripe.js is fetched alongside, when paying here)
    var stripeReady = onPage ? loadStripeJs() : $.Deferred().resolve().promise();
    stripeReady.then(null, function () { /* told below, once the payment exists */ });
    shopPost({ action: 'checkout', items: readBasket(), country: country, code: code, replaces: replaces }).then(function (answer) {
        if (answer.url) {
            writeCheckoutToken(''); // (any earlier one was given up)
            location.href = answer.url; // Stripe's page
            return;
        }
        writeCheckoutToken(answer.token);
        stripeReady.then(function () {
            startCheckout(answer, country);
        }, function () {
            startCheckout(answer, country, true);
        });
    }, function (xhr) {
        var answer = xhr.responseJSON || {};
        if (answer.lines && Object.keys(answer.lines).length) {
            // Something sold while it sat in the basket: show the basket as it now is
            drawBasketPage($('#imagesAndContent'));
            return;
        }
        if (answer.promo) {
            // The code stopped working since it was applied (it ended, or its
            // last use went): show the basket without it, and say why
            writeBasketCode('');
            drawBasketPage($('#imagesAndContent')).then(function () {
                $('.basket-problem').text(answer.message + ' It has been removed.').prop('hidden', false);
            });
            return;
        }
        if (replaces) {
            writeCheckoutToken(''); // (the server gave that one up before saying no)
        }
        button.prop('disabled', false).text(label);
        problem.text(answer.message || 'Sorry, checkout couldn\'t be started. You have not been charged. Please try again.').prop('hidden', false);
    });
});

// --------------------------------------------------------------------------
// Paying on the basket page
// --------------------------------------------------------------------------
//
// When the site has Stripe's public key, the basket turns into the checkout:
// the order on one side; email, phone, delivery address and the card box on
// the other. The address and card boxes are Stripe's own (Stripe.js puts
// them in the page, styled to match), so card numbers go straight to Stripe
// and never reach this site. Paying sends the customer on to the thank-you
// page, which asks the server (and so Stripe) whether it went through.
//
// The payment set up for this checkout holds the stock for half an hour. Its
// token is kept for the tab (sessionStorage): going back to the basket,
// starting again, or leaving for any other page (leaveCheckout) gives it up
// first so the stock is free again.

var STRIPE_JS = 'https://js.stripe.com/endive/stripe.js'; // same name as STRIPE_API_VERSION in stripeFunctions.php
var CHECKOUT_KEY = 'ambCheckout';
var checkoutState = null; // { token, checkout, actions, session, paying }
var stripeJsLoading = null;
var stripeClients = {};

// Stripe's look, brought close to the site's (ambar.css)
var STRIPE_APPEARANCE = {
    theme: 'stripe',
    labels: 'above',
    variables: {
        colorPrimary: '#1d1d1b',
        colorText: '#2a2a28',
        colorBackground: '#ffffff',
        colorDanger: '#b3261e',
        fontFamily: 'Lato, "Helvetica Neue", Arial, sans-serif',
        fontSizeBase: '15px',
        fontWeightNormal: '400',
        spacingUnit: '4px',
        borderRadius: '4px'
    },
    rules: {
        '.Input': { border: '1px solid #d5d3cd', boxShadow: 'none' },
        '.Input:focus': { border: '1px solid #1d1d1b', boxShadow: 'none' },
        '.Label': { color: '#75756f', fontSize: '13px' },
        '.Tab': { border: '1px solid #d5d3cd', boxShadow: 'none' }
    }
};
var STRIPE_FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap' }];

function readCheckoutToken() {
    try {
        var token = sessionStorage.getItem(CHECKOUT_KEY) || '';
        return /^[a-f0-9]{32}$/.test(token) ? token : '';
    } catch (e) {
        return checkoutState ? checkoutState.token : '';
    }
}

function writeCheckoutToken(token) {
    try {
        if (token) {
            sessionStorage.setItem(CHECKOUT_KEY, token);
        } else {
            sessionStorage.removeItem(CHECKOUT_KEY);
        }
    } catch (e) { /* storage blocked: it lasts only for this page */ }
}

// Stripe.js, fetched the first time the basket can be paid from. Stripe asks
// that it always comes from their own address, never a copy.
function loadStripeJs() {
    if (window.Stripe) {
        return $.Deferred().resolve().promise();
    }
    if (stripeJsLoading) {
        return stripeJsLoading;
    }
    var loading = $.Deferred();
    var script = document.createElement('script');
    script.src = STRIPE_JS;
    script.async = true;
    var timer = setTimeout(function () { failed(); }, 20000);
    function failed() {
        clearTimeout(timer);
        script.remove();
        stripeJsLoading = null; // so the next try fetches it afresh
        loading.reject();
    }
    script.onload = function () {
        clearTimeout(timer);
        if (window.Stripe) {
            loading.resolve();
        } else {
            failed();
        }
    };
    script.onerror = failed;
    document.head.appendChild(script);
    stripeJsLoading = loading.promise();
    return stripeJsLoading;
}

function stripeClient(publishableKey) {
    if (!stripeClients[publishableKey]) {
        // (in English like the rest of the site, not the browser's language)
        stripeClients[publishableKey] = window.Stripe(publishableKey, { locale: 'en' });
    }
    return stripeClients[publishableKey];
}

// Lets go of the checkout on screen (not of the payment itself: that's the
// token's job, above)
function endCheckout() {
    if (checkoutState) {
        checkoutState.ended = true;
        checkoutState = null;
    }
}

// Resolves once a payment left behind (below) has been given up, so the shop
// page drawn next shows what it set aside as on sale again
var givingUp = $.Deferred().resolve().promise();

// Called by setView() in photoFunctions.js for every page drawn, including
// the first. A payment left unfinished when the visitor goes anywhere but the
// basket (Back, the menu, a link, or opening the site again in this tab) is
// given up straight away, as the basket does, so a one-of-a-kind original
// doesn't look sold to the person who was buying it. Never while paying:
// Stripe is about to send them to the thank-you page.
function leaveCheckout(nextView) {
    if (nextView === 'shop-basket' || nextView === 'shop-thanks') {
        return; // the basket gives it up itself; the thank-you page is where paying ends
    }
    if (checkoutState && checkoutState.paying) {
        return;
    }
    endCheckout();
    var token = readCheckoutToken();
    if (!token || givingUp.state() === 'pending') {
        return;
    }
    var done = $.Deferred();
    givingUp = done.promise();
    shopPost({ action: 'abandon', token: token }).always(function () {
        if (readCheckoutToken() === token) {
            writeCheckoutToken('');
        }
        done.resolve();
    });
}

function checkoutLines(data) {
    return data.lines.map(function (line) {
        return '<li class="basket-line">' +
            '<span class="basket-line-picture">' +
            (line.image ? '<img src="' + shopEscape(thumbnailUrl(line.image)) + '" alt="" decoding="sync">' : '') + '</span>' +
            '<div class="basket-line-text"><span class="basket-line-name">' + shopEscape(line.name) + '</span>' +
            (line.label ? '<span class="basket-line-option">' + shopEscape(line.label) + '</span>' : '') +
            (line.quantity > 1 ? '<span class="basket-line-option">Qty ' + line.quantity + '</span>' : '') + '</div>' +
            '<div class="basket-line-price">' + shopEscape(formatMoney(line.priceCents * line.quantity, data.symbol)) + '</div></li>';
    }).join('');
}

// Draws the checkout for a payment the server has just set up
function startCheckout(answer, country, noStripeJs) {
    if (currentView !== 'shop-basket') {
        return; // moved on meanwhile: the payment is given up next time the basket opens
    }
    endCheckout();
    var state = checkoutState = { token: answer.token, paying: false };
    var data = basketView;
    var content = $('#imagesAndContent');
    var items = 0;
    var large = false;
    data.lines.forEach(function (line) {
        items += line.priceCents * line.quantity;
        large = large || line.shippingClass === 'large';
    });
    var place = data.countries[country];
    var delivery = place ? (large ? place.large : place.standard) : 0;
    var discount = promoDiscount(data.promo, items);

    content.html('<div class="shop shop-basket">' + shopHeader('Checkout') +
        '<div class="basket-layout is-checkout">' +
        '<div class="checkout-order"><ul class="basket-lines">' + checkoutLines(data) + '</ul>' +
        '<dl class="basket-totals"><dt>Items</dt><dd>' + shopEscape(formatMoney(items, data.symbol)) + '</dd>' +
        (discount ? '<dt>Promo code ' + shopEscape(data.promo.code) + '</dt><dd>−' + shopEscape(formatMoney(discount, data.symbol)) + '</dd>' : '') +
        '<dt>Delivery to ' + shopEscape(place ? place.name : country) + '</dt><dd>' + (delivery === 0 ? 'Free' : shopEscape(formatMoney(delivery, data.symbol))) + '</dd>' +
        '<dt class="is-total">Total</dt><dd class="is-total">' + shopEscape(formatMoney(items - discount + delivery, data.symbol)) + '</dd></dl>' +
        '<p class="basket-more"><button type="button" class="checkout-back">Edit basket</button></p></div>' +
        '<form class="basket-summary checkout-form" novalidate>' +
        '<h3 class="checkout-heading">Your details</h3>' +
        '<div class="checkout-field"><label for="checkoutEmail">Email</label>' +
        '<input type="email" id="checkoutEmail" autocomplete="email" inputmode="email" spellcheck="false" maxlength="200" required></div>' +
        '<div class="checkout-field"><label for="checkoutPhone">Phone</label>' +
        '<input type="tel" id="checkoutPhone" autocomplete="tel" maxlength="40" required></div>' +
        '<h3 class="checkout-heading">Delivery address</h3><div id="checkoutAddress" class="checkout-stripe"></div>' +
        '<h3 class="checkout-heading">Payment</h3><div id="checkoutPayment" class="checkout-stripe"><div class="loading-spinner"></div></div>' +
        '<p class="shop-status basket-problem" role="alert" hidden></p>' +
        '<button type="submit" class="shop-button checkout-pay" disabled>Pay</button>' +
        shopTemplate('shopTestNote') +
        '<p class="basket-note">Payments are processed securely by Stripe.</p>' +
        '</form></div></div>');
    window.scrollTo(0, 0);

    var fail = function (message) {
        if (!state.ended) {
            stopCheckout(state, message || 'Sorry, the payment form couldn\'t be loaded. You have not been charged. Please try again.');
        }
    };
    if (noStripeJs || !window.Stripe) {
        fail();
        return;
    }

    var checkout;
    try {
        checkout = stripeClient(answer.publishableKey).initCheckoutElementsSdk({
            clientSecret: answer.clientSecret,
            elementsOptions: { appearance: STRIPE_APPEARANCE, fonts: STRIPE_FONTS }
        });
        state.checkout = checkout;
        checkout.on('change', function (session) {
            if (!state.ended) {
                checkoutChanged(state, session);
            }
        });
        $('#checkoutPayment').empty();
        checkout.createShippingAddressElement().mount('#checkoutAddress');
        checkout.createPaymentElement().mount('#checkoutPayment');
    } catch (e) {
        fail();
        return;
    }
    Promise.resolve(checkout.loadActions()).then(function (result) {
        if (state.ended) {
            return;
        }
        if (!result || !result.actions) {
            fail(result && result.error && result.error.message);
            return;
        }
        state.actions = result.actions;
        if (!state.session && typeof state.actions.getSession === 'function') {
            checkoutChanged(state, state.actions.getSession());
        }
        $('.checkout-pay').prop('disabled', false);
    }, function () {
        fail();
    });
}

// Stripe's view of the payment changed (address typed, delivery chosen...)
function checkoutChanged(state, session) {
    if (!session) {
        return;
    }
    state.session = session;
    // (Stripe's own total, the one that will be charged; written the site's
    // way, "€47", rather than Stripe's "€47.00")
    var total = session.total && session.total.total ? session.total.total.amount : '';
    var cents = total ? session.total.total.minorUnitsAmount : null;
    if (typeof cents === 'number' && basketView && session.minorUnitsAmountDivisor === 100) {
        total = formatMoney(cents, basketView.symbol);
    }
    if (!state.paying) {
        $('.checkout-pay').text(total ? 'Pay ' + total : 'Pay');
    }
    // There's only ever one way of sending (the delivery price for the
    // chosen country): make sure it's the one chosen
    if (state.actions && session.shipping && !session.shipping.shippingOption &&
        session.shippingOptions && session.shippingOptions.length && !state.choosingShipping) {
        state.choosingShipping = true;
        Promise.resolve(state.actions.updateShippingOption(session.shippingOptions[0].id)).then(null, function () {}).then(function () {
            state.choosingShipping = false;
        });
    }
    if (session.status && session.status.type === 'expired') {
        stopCheckout(state, 'Your checkout session has expired. You have not been charged.');
    }
}

// The checkout can't go on: the form gives way to why, and the way back
function stopCheckout(state, message) {
    state.ended = true;
    $('.checkout-form').children().not('.basket-problem').remove();
    $('.checkout-form .basket-problem').text(message).prop('hidden', false);
    $('.checkout-form').append('<button type="button" class="shop-button checkout-back">Back to the basket</button>');
}

// Stripe answers {type: 'error', error} when something is wrong
function stripeStep(promise) {
    return Promise.resolve(promise).then(function (result) {
        if (result && result.type === 'error') {
            throw result.error || {};
        }
        return result;
    });
}

$(document).on('submit', '.checkout-form', function (event) {
    event.preventDefault();
    var state = checkoutState;
    if (!state || !state.actions || state.paying || state.ended) {
        return;
    }
    var problem = $('.checkout-form .basket-problem').prop('hidden', true);
    var say = function (text, field) {
        problem.text(text).prop('hidden', false);
        if (field) {
            $(field).focus();
        }
    };
    var email = $.trim($('#checkoutEmail').val());
    var phone = $.trim($('#checkoutPhone').val());
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        say('Please enter your email address.', '#checkoutEmail');
        return;
    }
    if (phone.replace(/\D/g, '').length < 6) {
        say('Please enter your phone number.', '#checkoutPhone');
        return;
    }

    var button = $('.checkout-pay');
    var label = button.text();
    state.paying = true;
    button.prop('disabled', true).text('Paying…');
    $('.checkout-back').prop('disabled', true);
    var actions = state.actions;
    stripeStep(actions.updateEmail(email)).then(function () {
        return stripeStep(actions.updatePhoneNumber(phone));
    }).then(function () {
        // (Stripe sends them on to the thank-you page once it's paid)
        return stripeStep(actions.confirm());
    }).then(null, function (error) {
        if (state.ended) {
            return;
        }
        state.paying = false;
        button.prop('disabled', false).text(label);
        $('.checkout-back').prop('disabled', false);
        say((error && error.message) || 'Sorry, the payment didn\'t go through. You have not been charged. Please check your details and try again.');
    });
});

// Back to the basket: the payment is given up there (drawBasketPage)
$(document).on('click', '.checkout-back', function () {
    if (checkoutState && checkoutState.paying) {
        return;
    }
    drawBasketPage($('#imagesAndContent'));
});

// --------------------------------------------------------------------------
// The thank-you page (Stripe sends the customer back here after paying)
// --------------------------------------------------------------------------

function drawThanksPage(content) {
    var token = (/[?&]order=([a-f0-9]{32})/.exec(location.search) || [])[1];
    var done = $.Deferred().resolve().promise();
    viewReady = true;
    if (!token) {
        content.html('<div class="shop shop-thanks">' + shopHeader('Thank you') +
            '<div class="shop-empty"><p><a href="/shop" class="shop-text-link" data-shop-nav>Back to the shop</a></p></div></div>');
        return done;
    }
    content.html('<div class="shop shop-thanks">' + shopHeader('Thank you') +
        '<div class="shop-empty" id="thanksBody"><div class="loading-spinner"></div><p>Confirming your payment&hellip;</p></div></div>');

    var tries = 0;
    var check = function () {
        if (currentView !== 'shop-thanks') {
            return;
        }
        $.ajax({ url: SHOP_API, data: { view: 'order', token: token }, dataType: 'json' }).then(function (answer) {
            var order = answer.order;
            if (order.status === 'pending' && ++tries < 12) {
                setTimeout(check, 2500); // Stripe's confirmation can take a few seconds
                return;
            }
            paintThanks(order, token);
        }, function (xhr) {
            if (xhr.status !== 404 && ++tries < 5) {
                setTimeout(check, 3000);
                return;
            }
            $('#thanksBody').html('<p>Order not found.</p>');
        });
    };
    check();
    return done;
}

function paintThanks(order, token) {
    var body = $('#thanksBody');
    if (order.status === 'cancelled') {
        body.html('<p>Payment unsuccessful. You have not been charged.</p>' +
            '<p><a href="/shop/basket" class="shop-text-link" data-shop-nav>Return to basket</a></p>');
        return;
    }
    if (order.status === 'pending') {
        body.html('<p>Your payment is being confirmed. You will receive a confirmation email shortly.</p>' +
            '<p><a href="/shop/basket" class="shop-text-link" data-shop-nav>Return to basket</a></p>');
        return;
    }

    // Paid: the basket has done its job. Only once, in case this page is
    // opened again later when there's a new basket.
    if (readCheckoutToken() === token) {
        writeCheckoutToken('');
    }
    try {
        if (!sessionStorage.getItem('ambOrderDone:' + token)) {
            sessionStorage.setItem('ambOrderDone:' + token, '1');
            writeBasket([]);
            writeBasketCode('');
        }
    } catch (e) {
        writeBasket([]);
    }

    var lines = order.lines.map(function (line) {
        return '<li class="basket-line"><span class="basket-line-picture">' +
            (line.image ? '<img src="' + shopEscape(thumbnailUrl(line.image)) + '" alt="" decoding="sync">' : '') + '</span>' +
            '<div class="basket-line-text"><span class="basket-line-name">' + shopEscape(line.name) + '</span>' +
            (line.label ? '<span class="basket-line-option">' + shopEscape(line.label) + '</span>' : '') +
            (line.quantity > 1 ? '<span class="basket-line-option">Qty ' + line.quantity + '</span>' : '') + '</div>' +
            '<div class="basket-line-price">' + shopEscape(line.total) + '</div></li>';
    }).join('');

    $('#thanksBody').removeClass('shop-empty').addClass('thanks-body').html(
        '<p class="thanks-lead">' + (order.status === 'processing'
            ? 'Thank you for your order. It will be dispatched once your payment clears.'
            : 'Thank you for your order.') + '</p>' +
        '<p class="thanks-number">Order ' + shopEscape(order.number) + '</p>' +
        '<ul class="basket-lines">' + lines + '</ul>' +
        '<dl class="basket-totals"><dt>Items</dt><dd>' + shopEscape(order.subtotal) + '</dd>' +
        (order.discount ? '<dt>Promo code ' + shopEscape(order.promoCode) + '</dt><dd>\u2212' + shopEscape(order.discount) + '</dd>' : '') +
        '<dt>Delivery</dt><dd>' + shopEscape(order.shipping) + '</dd>' +
        '<dt class="is-total">Total</dt><dd class="is-total">' + shopEscape(order.total) + '</dd></dl>' +
        (order.sendTo.length ? '<p class="thanks-address"><span>Shipping to</span>' + order.sendTo.map(shopEscape).join('<br>') + '</p>' : '') +
        (order.email ? '<p class="basket-note">A confirmation has been sent to ' + shopEscape(order.email) + '.</p>' : '') +
        '<p class="basket-more"><a href="/shop" class="not-found-link" data-shop-nav>Continue shopping</a></p>');
}

// --------------------------------------------------------------------------
// Start-up
// --------------------------------------------------------------------------

// Called once by photoFunctions.js when the page starts up
function startShop() {
    drawBasketPill();
    // A basket changed in another tab shows up here too
    window.addEventListener('storage', function (event) {
        if (event.key === BASKET_KEY) {
            drawBasketPill();
        }
    });
}
