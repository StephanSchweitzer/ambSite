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
//   /shop/<id>/<name>   one item
//   /shop/basket        the basket
//   /shop/thank-you     after paying
//
// The shop and item pages are drawn by the server
// (actions/shopPageFunctions.php): index.php sends them with the page, and
// moving between them fetches the same HTML from actions/shopAPI.php. This
// file only adds what they do. The basket and thank-you pages belong to one
// visitor, so they are drawn here.
//
// The basket lives in the visitor's own browser (localStorage) as a list of
// { variant, quantity }. It holds no prices: those always come from the
// server, both to show the basket and again when paying.

var SHOP_API = '/actions/shopAPI.php';
var SHOP_ITEM_SIZES = '(max-width: 992px) 92vw, 36vw'; // same as SHOP_ITEM_SIZES in shopPageFunctions.php
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
    return '<header class="project-header shop-header"><h2 class="project-title">' + shopEscape(title) + '</h2></header>';
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
    setView(view);
    var content = $('#imagesAndContent').css('padding-top', '50px');
    drawBasketPill();

    if (view === 'shop-basket') {
        return drawBasketPage(content);
    }
    if (view === 'shop-thanks') {
        return drawThanksPage(content);
    }

    // The page index.php sent is already there
    if (pageIsServerDrawn) {
        var name = content.find('.shop-item').attr('data-name');
        if (name) {
            setPageTitle(name + ' - Shop - Ambar Velasco');
        }
        // (its button, brought in line with what's already in the basket)
        content.find('[data-shop-buy]').each(function () {
            updateBuyForm($(this));
        });
        viewReady = true;
        return $.Deferred().resolve().promise();
    }

    var spinner = setTimeout(function () {
        content.html(loadingHtml(''));
    }, 200);
    var drawn = $.Deferred();
    var show = function (page) {
        clearTimeout(spinner);
        if (currentView !== view || shownPath !== path) {
            drawn.resolve(); // the visitor has already moved on
            return;
        }
        content.html(page.html);
        setPageTitle(page.title);
        content.find('[data-shop-buy]').each(function () {
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
    $.ajax({ url: SHOP_API, data: { view: 'page', path: path }, dataType: 'json' }).then(show, function (xhr) {
        if (xhr.status === 404 && xhr.responseJSON && xhr.responseJSON.html) {
            show(xhr.responseJSON); // sold and taken down since the link was made
            return;
        }
        clearTimeout(spinner);
        if (currentView === view && shownPath === path) {
            content.html(errorHtml("Sorry, the shop couldn't be loaded. Please try again in a moment."));
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
    goTo(this.getAttribute('href'));
});

// --------------------------------------------------------------------------
// An item's page
// --------------------------------------------------------------------------

function shopItemImages() {
    try {
        return JSON.parse($('.shop-item').attr('data-images') || '[]');
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
    var images = shopItemImages().map(function (image) {
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
    var image = shopItemImages()[index];
    if (!image) {
        return;
    }
    $('.shop-thumb').removeClass('is-current');
    $(this).addClass('is-current');
    var picture = $('.shop-item-picture').attr({ 'data-index': index, href: webImageUrl(image.location) });
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
    form.find('.shop-button').prop('disabled', room < 1).text(room < 1 ? 'In your basket' : 'Add to basket');
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
    form.find('.shop-added').prop('hidden', false);
    updateBuyForm(form);
    $('#basketPill').addClass('is-bumped');
    setTimeout(function () { $('#basketPill').removeClass('is-bumped'); }, 500);
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

    var items = readBasket();
    if (!items.length) {
        basketView = null;
        content.html('<div class="shop shop-basket">' + shopHeader('Basket') +
            '<div class="shop-empty"><p>Your basket is empty.</p>' +
            '<p><a href="/shop" class="shop-text-link" data-shop-nav>Have a look at the shop</a></p></div></div>');
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
                notes.push((called || 'Something in your basket') + ' is no longer available, so it has been taken out.');
                setBasketQuantity(line.variant, 0);
            } else if (line.problem === 'stock') {
                notes.push('Only ' + line.available + ' of ' + called + ' ' + (line.available === 1 ? 'is' : 'are') + ' left, so the number has been changed.');
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
                errorHtml("Sorry, your basket couldn't be loaded. Please try again in a moment.") + '</div>');
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
            '<p><a href="/shop" class="shop-text-link" data-shop-nav>Have a look at the shop</a></p></div></div>');
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
        pay = '<p class="shop-status">The shop is taking a short break, so orders can\'t be placed just now. Your basket will keep.</p>';
    } else if (!data.canPay || !codes.length) {
        pay = '<p class="shop-status">The shop isn\'t taking orders just yet. Your basket will keep, so please come back soon.</p>';
    } else {
        pay = '<button type="button" class="shop-button basket-pay">Pay securely</button>' +
            '<p class="basket-note">You\'ll finish on Stripe\'s secure payment page, where you give your address and pay by card.</p>';
    }

    content.html('<div class="shop shop-basket">' + shopHeader('Basket') +
        data.notes.map(function (note) { return '<p class="shop-status">' + shopEscape(note) + '</p>'; }).join('') +
        '<div class="basket-layout"><ul class="basket-lines">' + lines + '</ul>' +
        '<div class="basket-summary">' +
        (codes.length ? '<label for="basketCountry">Where should it be sent?</label><select id="basketCountry">' + options + '</select>' : '') +
        '<div class="basket-code">' + promoBlock + '</div>' +
        '<dl class="basket-totals"><dt>Items</dt><dd id="basketItems"></dd>' +
        (data.promo ? '<dt>Promo code</dt><dd id="basketDiscount"></dd>' : '') +
        '<dt>Delivery</dt><dd id="basketDelivery"></dd>' +
        '<dt class="is-total">Total</dt><dd class="is-total" id="basketTotal"></dd></dl>' +
        '<p class="shop-status basket-problem" role="alert" hidden></p>' + pay +
        '<p class="basket-more"><a href="/shop" class="shop-text-link" data-shop-nav>Keep looking</a></p>' +
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
        problem.text('Please choose the country your order should be sent to.').prop('hidden', false);
        $('#basketCountry').focus();
        return;
    }
    button.prop('disabled', true).text('Opening the payment page…');
    var code = basketView.promo ? basketView.promo.code : '';
    shopPost({ action: 'checkout', items: readBasket(), country: country, code: code }).then(function (answer) {
        location.href = answer.url; // Stripe's page
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
                $('.basket-problem').text(answer.message + ' The total above no longer includes it.').prop('hidden', false);
            });
            return;
        }
        button.prop('disabled', false).text('Pay securely');
        problem.text(answer.message || 'Sorry, the payment page couldn\'t be opened. Nothing has been charged. Please try again.').prop('hidden', false);
    });
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
            $('#thanksBody').html('<p>We couldn\'t find that order.</p>' +
                '<p>If you have just paid, your receipt is on its way by email and there\'s nothing more to do.</p>');
        });
    };
    check();
    return done;
}

function paintThanks(order, token) {
    var body = $('#thanksBody');
    if (order.status === 'cancelled') {
        body.html('<p>This payment didn\'t go through, and nothing has been charged.</p>' +
            '<p><a href="/shop/basket" class="shop-text-link" data-shop-nav>Back to your basket</a></p>');
        return;
    }
    if (order.status === 'pending') {
        body.html('<p>Your payment hasn\'t been confirmed yet. That can take a minute or two.</p>' +
            '<p>If you paid, a receipt is on its way to you by email and there\'s nothing more to do.</p>');
        return;
    }

    // Paid: the basket has done its job. Only once, in case this page is
    // opened again later when there's a new basket.
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
            (line.quantity > 1 ? '<span class="basket-line-option">' + line.quantity + ' of them</span>' : '') + '</div>' +
            '<div class="basket-line-price">' + shopEscape(line.total) + '</div></li>';
    }).join('');

    $('#thanksBody').removeClass('shop-empty').addClass('thanks-body').html(
        '<p class="thanks-lead">' + (order.status === 'processing'
            ? 'Your order is in. Your bank is still sending the payment, which can take a few days; it will be on its way as soon as that arrives.'
            : 'Your order is confirmed, and I\'ll get it ready to send.') + '</p>' +
        '<p class="thanks-number">Order ' + shopEscape(order.number) + '</p>' +
        '<ul class="basket-lines">' + lines + '</ul>' +
        '<dl class="basket-totals"><dt>Items</dt><dd>' + shopEscape(order.subtotal) + '</dd>' +
        (order.discount ? '<dt>Promo code ' + shopEscape(order.promoCode) + '</dt><dd>\u2212' + shopEscape(order.discount) + '</dd>' : '') +
        '<dt>Delivery</dt><dd>' + shopEscape(order.shipping) + '</dd>' +
        '<dt class="is-total">Total</dt><dd class="is-total">' + shopEscape(order.total) + '</dd></dl>' +
        (order.sendTo.length ? '<p class="thanks-address"><span>Going to</span>' + order.sendTo.map(shopEscape).join('<br>') + '</p>' : '') +
        (order.email ? '<p class="basket-note">A receipt is on its way to ' + shopEscape(order.email) + '.</p>' : '') +
        '<p class="basket-more"><a href="/select-works" class="not-found-link">See the works</a></p>');
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
