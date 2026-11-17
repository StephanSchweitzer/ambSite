// The shop admin page (admin/shopAdmin.php): orders to send, the items for
// sale, delivery prices, promo codes and settings. Everything is read from and saved
// through actions/shopAdminAPI.php.
(function () {
    var API = '../actions/shopAdminAPI.php';
    var EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
        'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    var EUROPE = EU.concat(['GB', 'CH', 'NO', 'IS', 'LI', 'MC', 'AD', 'SM', 'VA', 'AL', 'BA', 'ME', 'MK', 'RS', 'XK',
        'MD', 'UA', 'GI', 'GG', 'JE', 'IM', 'FO', 'AX']);

    var state = null;          // everything from ?what=state
    var tab = 'orders';
    var orderFilter = 'tosend';
    var itemFilter = 'all';    // which items the list shows: all, live, sold, hidden, away
    var editing = null;        // the item open in the editor
    var works = null;          // the portfolio's works, fetched once
    var zonesDraft = [];       // the delivery destinations as they are on screen
    var promosDraft = [];      // the promo codes as they are on screen
    var nextKey = 1;

    // ----------------------------------------------------------------------
    // Small helpers
    // ----------------------------------------------------------------------

    function esc(text) {
        return String(text === null || text === undefined ? '' : text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function symbol() {
        return state.currencies[state.settings.currency].symbol;
    }

    // 3550 -> "35.50", 45000 -> "450": how a price is shown in a box to type in
    function priceText(cents) {
        if (cents === null || cents === undefined || cents === '') {
            return '';
        }
        return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
    }

    function thumb(location) {
        return '/thumbnails/' + encodeURIComponent(location);
    }

    function when(iso) {
        if (!iso) {
            return '';
        }
        return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function toast(message, isError) {
        var el = $('<div class="sa-toast">').toggleClass('is-error', !!isError).text(message).appendTo('#toasts');
        setTimeout(function () {
            el.fadeOut(300, function () { el.remove(); });
        }, isError ? 7000 : 3000);
    }

    function failed(xhr) {
        if (xhr.status === 401) {
            return; // adminSession.js shows the "signed out" banner
        }
        toast((xhr.responseJSON && xhr.responseJSON.message) || 'Sorry, that didn\'t work. Please try again.', true);
    }

    function post(data) {
        return $.ajax({ url: API, type: 'POST', contentType: 'application/json', data: JSON.stringify(data), dataType: 'json' }).fail(failed);
    }

    function moneyField(name, value, extra) {
        return '<span class="sa-money' + (symbol().length > 1 ? ' is-wide' : '') + '"><span>' + esc(symbol()) + '</span>' +
            '<input type="text" inputmode="decimal" ' + (extra || '') + ' data-field="' + name + '" value="' + esc(value) + '"></span>';
    }

    // ----------------------------------------------------------------------
    // Loading, and what is still to set up
    // ----------------------------------------------------------------------

    function loadState(then) {
        return $.getJSON(API, { what: 'state' }).done(function (data) {
            state = data;
            drawSetup();
            if (!state.ready) {
                $('#tabs').prop('hidden', true);
                $('#panel').empty();
                return;
            }
            $('#tabs').prop('hidden', false);
            $('#toSendCount').text(state.toSend).prop('hidden', !state.toSend);
            if (then) {
                then();
            }
        }).fail(function (xhr) {
            failed(xhr);
            $('#panel').html('<p class="sa-empty">The shop could not be loaded. Please reload the page.</p>');
        });
    }

    function drawSetup() {
        var box = $('#setup').removeClass('is-info');
        if (!state.ready) {
            box.prop('hidden', false).html(
                '<h3>The shop isn\'t switched on yet</h3>' +
                '<p>One technical step is still to do on the server before the shop can be used: creating its ' +
                'database tables (<code>database/shop.sql</code>). This is a job for whoever looks after the server, ' +
                'and it only needs doing once. Nothing is wrong with your site in the meantime.</p>');
            return;
        }
        var todo = [];
        if (!state.setup.stripe) {
            todo.push('<strong>Payments aren\'t connected yet.</strong> The shop needs its Stripe key ' +
                '(<code>STRIPE_SECRET_KEY</code> in the server\'s settings file). Until then people can look but not buy.');
        }
        if (state.setup.stripe && !state.setup.webhook) {
            todo.push('<strong>Stripe can\'t report back yet.</strong> The webhook secret (<code>STRIPE_WEBHOOK_SECRET</code>) ' +
                'is missing, so a payment is only noticed when the customer returns to the site.');
        }
        if (!state.setup.zones) {
            todo.push('<strong>No delivery prices yet.</strong> Add at least one destination under <em>Delivery</em>, ' +
                'or nobody can check out.');
        }
        if (state.settings.paused === '1') {
            todo.push('<strong>The shop is paused.</strong> Everything is on show but nothing can be bought. ' +
                'Switch it back on under <em>Settings</em>.');
        }
        if (todo.length) {
            box.prop('hidden', false).html('<h3>Before the shop can take orders</h3><ul><li>' + todo.join('</li><li>') + '</li></ul>');
        } else if (!state.setup.live) {
            box.prop('hidden', false).addClass('is-info').html(
                '<h3>Practice mode</h3><p>Stripe is in test mode: no real money moves. To try a purchase, pay with the card ' +
                'number <code>4242 4242 4242 4242</code>, any future date and any three digits.</p>' +
                '<p>Visitors see a notice on every shop page saying the shop is a test and not to use a real card. ' +
                'It goes away by itself once the shop is switched to real payments.</p>');
        } else {
            box.prop('hidden', true);
        }
    }

    function showTab(name) {
        tab = name;
        editing = null;
        $('#tabs button').each(function () {
            $(this).toggleClass('is-current', this.getAttribute('data-tab') === name);
        });
        ({ orders: drawOrders, items: drawItems, delivery: drawDelivery, promos: drawPromos, emails: drawEmails, settings: drawSettings })[name]();
    }

    // ----------------------------------------------------------------------
    // Orders
    // ----------------------------------------------------------------------

    var STATUS_NAMES = { paid: 'To send', processing: 'Payment on its way', shipped: 'Sent', refunded: 'Refunded' };

    function drawOrders() {
        var chips = [['tosend', 'To send'], ['sent', 'Sent'], ['all', 'All orders']].map(function (chip) {
            return '<button type="button" class="sa-chip js-order-filter' + (chip[0] === orderFilter ? ' is-current' : '') +
                '" data-filter="' + chip[0] + '">' + chip[1] + '</button>';
        }).join('');
        $('#panel').html('<div class="sa-bar"><div class="sa-chips">' + chips + '</div></div><div id="orders"><p class="sa-muted">Loading&hellip;</p></div>');

        $.getJSON(API, { what: 'orders', show: orderFilter }).done(function (data) {
            if (tab !== 'orders') {
                return;
            }
            if (!data.orders.length) {
                $('#orders').html('<p class="sa-empty">' + ({
                    tosend: 'Nothing to send right now. New orders will appear here.',
                    sent: 'Nothing has been marked as sent yet.',
                    all: 'No orders yet.'
                })[orderFilter] + '</p>');
                return;
            }
            $('#orders').html(data.orders.map(orderHtml).join(''));
        }).fail(failed);
    }

    function orderHtml(order) {
        var lines = order.lines.map(function (line) {
            return '<li>' + (line.image ? '<img src="' + esc(thumb(line.image)) + '" alt="">' : '') +
                '<span>' + line.quantity + ' &times; ' + esc(line.name) + (line.label ? ' <span class="sa-muted">(' + esc(line.label) + ')</span>' : '') + '</span>' +
                '<span class="sa-line-price">' + esc(line.total) + '</span></li>';
        }).join('');

        var mail = order.email ? 'mailto:' + order.email +
            '?subject=' + encodeURIComponent('Your order ' + order.number) +
            (order.status === 'shipped' ? '&body=' + encodeURIComponent('Hello ' + (order.name || '') + ',\n\nYour order is on its way!' +
                (order.tracking ? '\n\nTracking: ' + order.tracking : '') + '\n\nAmbar') : '') : '';

        // The site's own emails can be sent again (if one went astray)
        var canResend = order.email && state.setup.email;
        var actions = '';
        if (order.status === 'paid') {
            actions = '<input type="text" class="js-tracking" placeholder="Tracking number or link (optional)" value="' + esc(order.tracking) + '">' +
                '<button type="button" class="sa-button js-sent">Mark as sent</button>' +
                (canResend ? '<button type="button" class="sa-button sa-quiet sa-small js-resend" data-kind="confirm">Send the order confirmation again</button>' : '');
        } else if (order.status === 'shipped') {
            actions = '<span class="sa-muted">Sent ' + esc(when(order.shippedAt)) + (order.tracking ? ' &middot; ' + esc(order.tracking) : '') + '</span>' +
                (mail ? '<a class="sa-button sa-quiet sa-small" href="' + esc(mail) + '">Email the customer</a>' : '') +
                (canResend ? '<button type="button" class="sa-button sa-quiet sa-small js-resend" data-kind="shipped">Send &ldquo;on its way&rdquo; again</button>' : '') +
                '<button type="button" class="sa-button sa-quiet sa-small js-unsent">Not sent after all</button>';
        } else if (order.status === 'processing') {
            actions = '<span class="sa-muted">Paid by bank transfer: wait until this says &ldquo;To send&rdquo; before posting it.</span>';
        }
        if (order.stripeUrl) {
            actions += '<a class="sa-button sa-quiet sa-small" href="' + esc(order.stripeUrl) + '" target="_blank" rel="noopener">See the payment in Stripe</a>';
        }

        return '<article class="sa-order" data-id="' + order.id + '">' +
            '<div class="sa-order-head"><strong>' + esc(order.number) + '</strong>' +
            '<span class="sa-pill is-' + esc(order.status) + '">' + esc(STATUS_NAMES[order.status] || order.status) + '</span>' +
            (order.test ? '<span class="sa-pill is-test">Test order</span>' : '') +
            '<span class="sa-muted sa-small">' + esc(when(order.paidAt || order.createdAt)) + '</span>' +
            '<span class="sa-order-total">' + esc(order.total) + '</span></div>' +
            '<div class="sa-order-body"><div><ul class="sa-lines">' + lines + '</ul>' +
            '<p class="sa-muted sa-small">Items ' + esc(order.subtotal) +
            (order.discount ? ' &minus; ' + esc(order.discount) + ' with the code ' + esc(order.promoCode) : '') +
            ' + delivery ' + esc(order.shipping) +
            (order.zone ? ' (' + esc(order.zone) + ')' : '') + '</p></div>' +
            '<div><h4>Send to</h4><address class="js-address">' + esc(order.address.join('\n')) + '</address>' +
            '<p><button type="button" class="sa-button sa-quiet sa-small js-copy">Copy the address</button></p>' +
            '<h4>Customer</h4><p>' + esc(order.name) +
            (order.email ? '<br><a href="' + esc(mail) + '">' + esc(order.email) + '</a>' : '') +
            (order.phone ? '<br>' + esc(order.phone) : '') + '</p></div></div>' +
            (actions ? '<div class="sa-order-foot">' + actions + '</div>' : '') +
            '<div class="sa-note"><label class="sa-hint" for="note' + order.id + '">A note to yourself (the customer never sees it)</label>' +
            '<textarea id="note' + order.id + '" class="js-note">' + esc(order.note) + '</textarea></div>' +
            '</article>';
    }

    function orderId(el) {
        return Number($(el).closest('.sa-order').attr('data-id'));
    }

    $(document).on('click', '.js-order-filter', function () {
        orderFilter = this.getAttribute('data-filter');
        drawOrders();
    });

    $(document).on('click', '.js-sent, .js-unsent', function () {
        var sent = $(this).hasClass('js-sent');
        var data = { action: 'updateOrder', id: orderId(this), sent: sent };
        if (sent) {
            data.tracking = $(this).closest('.sa-order').find('.js-tracking').val();
        }
        $(this).prop('disabled', true);
        post(data).done(function (answer) {
            toast(!sent ? 'Moved back to "To send"'
                : answer.emailed ? 'Marked as sent, and the customer has been emailed' : 'Marked as sent');
            loadState(drawOrders);
        }).fail(drawOrders);
    });

    $(document).on('click', '.js-resend', function () {
        var button = $(this).prop('disabled', true);
        post({ action: 'resendEmail', id: orderId(this), kind: this.getAttribute('data-kind') }).done(function (answer) {
            toast('Sent to ' + answer.to);
        }).always(function () {
            button.prop('disabled', false);
        });
    });

    $(document).on('change', '.js-note', function () {
        post({ action: 'updateOrder', id: orderId(this), note: this.value }).done(function () {
            toast('Note saved');
        });
    });

    $(document).on('click', '.js-copy', function () {
        var text = $(this).closest('.sa-order').find('.js-address').text();
        var done = function () { toast('Address copied'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function () { toast('Could not copy. Please select the address and copy it.', true); });
        } else {
            var area = $('<textarea>').val(text).appendTo('body').select();
            document.execCommand('copy');
            area.remove();
            done();
        }
    });

    // ----------------------------------------------------------------------
    // Items for sale: the list
    // ----------------------------------------------------------------------

    function itemStatus(product) {
        if (product.status === 'archived') {
            return '<span class="sa-pill">Put away</span>';
        }
        if (product.status !== 'live') {
            return '<span class="sa-pill">Hidden</span>';
        }
        if (product.soldOut) {
            return '<span class="sa-pill is-sold">' + (product.isUnique ? 'Sold' : 'Sold out') + '</span>';
        }
        return '<span class="sa-pill is-live">In the shop</span>';
    }

    // Which of the list's filters an item belongs under
    function itemGroup(product) {
        if (product.status === 'archived') {
            return 'away';
        }
        if (product.status !== 'live') {
            return 'hidden';
        }
        return product.soldOut ? 'sold' : 'live';
    }

    // canMove: the up / down arrows (only when the whole shop is listed, in
    // the order it appears there)
    function itemRow(product, index, count, canMove) {
        var facts = [];
        if (product.typeLabel) {
            facts.push(esc(product.typeLabel));
        }
        facts.push(esc(product.priceText) || 'No price yet');
        if (!product.isUnique && product.variants.length) {
            var limited = product.variants.filter(function (v) { return v.stock !== null; });
            facts.push(limited.length === product.variants.length
                ? limited.reduce(function (sum, v) { return sum + v.stock; }, 0) + ' left'
                : 'no limit');
        }
        var archived = product.status === 'archived';
        return '<div class="sa-item" data-id="' + product.id + '">' +
            '<div class="sa-item-picture"' + (product.images.length ? ' style="background-image:url(\'' + esc(thumb(product.images[0].location)) + '\')"' : '') + '></div>' +
            '<div class="sa-item-main"><div class="sa-item-name">' + esc(product.name) + '</div>' +
            '<div class="sa-muted sa-small">' + facts.join(' &middot; ') + '</div></div>' +
            itemStatus(product) +
            '<div class="sa-item-actions">' +
            (archived ? '<button type="button" class="sa-button sa-quiet sa-small js-restore">Bring back</button>'
                : (canMove
                    ? '<button type="button" class="sa-move js-move" data-step="-1" aria-label="Move up"' + (index === 0 ? ' disabled' : '') + '>&uarr;</button>' +
                      '<button type="button" class="sa-move js-move" data-step="1" aria-label="Move down"' + (index === count - 1 ? ' disabled' : '') + '>&darr;</button>'
                    : '') +
                  '<button type="button" class="sa-button sa-quiet sa-small js-edit">Edit</button>') +
            '</div></div>';
    }

    function drawItems() {
        var everything = state.products.concat(state.archived);
        var counts = { all: state.products.length, live: 0, sold: 0, hidden: 0, away: 0 };
        everything.forEach(function (product) {
            counts[itemGroup(product)]++;
        });
        if (!counts[itemFilter]) {
            itemFilter = 'all'; // (the last one under that filter has just moved elsewhere)
        }

        // "Put away" only appears once something has been put away
        var chips = [['all', 'All'], ['live', 'In the shop'], ['sold', 'Sold'], ['hidden', 'Hidden'], ['away', 'Put away']]
            .filter(function (chip) { return chip[0] !== 'away' || counts.away; })
            .map(function (chip) {
                return '<button type="button" class="sa-chip js-item-filter' + (chip[0] === itemFilter ? ' is-current' : '') + '"' +
                    ' data-filter="' + chip[0] + '" aria-pressed="' + (chip[0] === itemFilter) + '"' + (counts[chip[0]] ? '' : ' disabled') + '>' +
                    chip[1] + ' <span class="sa-chip-count">' + counts[chip[0]] + '</span></button>';
            }).join('');

        var html = '<div class="sa-bar"><div class="sa-chips" role="group" aria-label="Show">' + chips + '</div>' +
            '<button type="button" class="sa-button js-new">Add an item</button></div>';

        if (!everything.length) {
            html += '<p class="sa-empty">Nothing in the shop yet. Choose &ldquo;Add an item&rdquo; to put up your first piece.</p>';
        } else if (itemFilter === 'all') {
            html += '<p class="sa-muted sa-small sa-list-note">This is the order things appear in the shop. Use the arrows to rearrange.</p>' +
                state.products.map(function (product, index) {
                    return itemRow(product, index, state.products.length, true);
                }).join('');
        } else {
            html += '<p class="sa-muted sa-small sa-list-note">' + ({
                live: 'On show and can be bought.',
                sold: 'Still on show, marked as sold. Put one away to take it out of the shop.',
                hidden: 'Not in the shop: only you can see these.',
                away: 'Taken out of the shop. Nothing here is deleted, and anything can be brought back.'
            })[itemFilter] + '</p>' +
                everything.filter(function (product) { return itemGroup(product) === itemFilter; })
                    .map(function (product) { return itemRow(product, 0, 1, false); }).join('');
        }
        $('#panel').html(html);
    }

    $(document).on('click', '.js-item-filter', function () {
        itemFilter = this.getAttribute('data-filter');
        drawItems();
    });

    function findProduct(id) {
        return state.products.concat(state.archived).filter(function (product) { return product.id === id; })[0];
    }

    $(document).on('click', '.js-move', function () {
        var id = Number($(this).closest('.sa-item').attr('data-id'));
        var step = Number(this.getAttribute('data-step'));
        var from = state.products.map(function (p) { return p.id; }).indexOf(id);
        var to = from + step;
        if (from < 0 || to < 0 || to >= state.products.length) {
            return;
        }
        state.products.splice(to, 0, state.products.splice(from, 1)[0]);
        drawItems();
        post({ action: 'orderProducts', ids: state.products.map(function (p) { return p.id; }) });
    });

    $(document).on('click', '.js-restore', function () {
        post({ action: 'restoreProduct', id: Number($(this).closest('.sa-item').attr('data-id')) }).done(function () {
            toast('Brought back. You\'ll find it under Hidden until you show it in the shop again.');
            loadState(drawItems);
        });
    });

    $(document).on('click', '.js-new', function () {
        drawEditor(null);
    });

    $(document).on('click', '.js-edit', function () {
        drawEditor(findProduct(Number($(this).closest('.sa-item').attr('data-id'))));
    });

    // ----------------------------------------------------------------------
    // Items for sale: adding and editing one
    // ----------------------------------------------------------------------

    function drawEditor(product) {
        editing = {
            id: product ? product.id : 0,
            workId: product ? product.workId : null,
            images: product ? product.images.map(function (image) { return image.location; }) : [],
            options: product && product.variants.length
                ? product.variants.map(function (v) {
                    return { key: nextKey++, id: v.id, label: v.label, price: priceText(v.priceCents), stock: v.stock === null ? '' : String(v.stock), stockWas: v.stock };
                })
                : [{ key: nextKey++, id: 0, label: '', price: '', stock: '', stockWas: null }]
        };
        var p = product || { name: '', typeLabel: '', isUnique: true, details: '', description: '', shippingClass: 'standard', status: 'draft' };
        var first = editing.options[0];

        $('#panel').html(
            '<form class="sa-editor" id="editor" novalidate>' +
            // Where you are, and the way back: a quiet link above the title, as
            // at the top of the page. (Leaving is also "Cancel" in the bar below.)
            '<a href="#" class="sa-back sa-crumb js-cancel"><span aria-hidden="true">&larr;</span> Items for sale</a>' +
            '<div class="sa-editor-head"><div><p class="sa-kicker">' + (product ? 'Editing' : 'Adding') + '</p>' +
            '<h2 id="editorTitle">' + esc(product ? product.name : 'New item') + '</h2></div>' +
            (product ? itemStatus(product) : '') + '</div>' +

            '<div class="sa-field"><span class="sa-label">Pictures</span>' +
            '<span class="sa-hint">The first one is the main picture. Visitors can open and zoom into any of them.</span>' +
            '<div class="sa-pictures" id="pictures"></div>' +
            '<button type="button" class="sa-button sa-quiet sa-small js-pick-work">Choose from my works</button> ' +
            '<button type="button" class="sa-button sa-quiet sa-small js-upload">Upload a photo</button>' +
            '<input type="file" id="pictureFile" accept="image/*,.heic,.heif" multiple hidden></div>' +

            '<div class="sa-field"><label for="fName">Name</label><input type="text" id="fName" value="' + esc(p.name) + '" maxlength="255"></div>' +

            '<div class="sa-field"><label for="fType">What is it?</label>' +
            '<span class="sa-hint">A word or two shown beside the price: Original, Print, Zine&hellip;</span>' +
            '<input type="text" id="fType" list="typeIdeas" value="' + esc(p.typeLabel) + '" maxlength="60">' +
            '<datalist id="typeIdeas"><option>Original</option><option>Print</option><option>Zine</option><option>Postcard</option><option>Sticker</option></datalist>' +
            '<label class="sa-check"><input type="checkbox" id="fUnique"' + (p.isUnique ? ' checked' : '') + '>' +
            '<span>It\'s one of a kind <span class="sa-muted">(an original: there is only one, and once it sells it shows as &ldquo;Sold&rdquo;)</span></span></label></div>' +

            '<div class="sa-field"><label for="fDetails">Materials, size, year</label>' +
            '<span class="sa-hint">For example: acrylic, tape on paper | 50 x 65 cm | 2024. With a size written like that, visitors can use &ldquo;See to scale&rdquo;.</span>' +
            '<input type="text" id="fDetails" value="' + esc(p.details) + '" maxlength="500"></div>' +

            '<div class="sa-field"><label for="fDescription">Description</label>' +
            '<span class="sa-hint">Anything a buyer would like to know. Leave empty if the picture says it all.</span>' +
            '<textarea id="fDescription">' + esc(p.description) + '</textarea></div>' +

            '<div class="sa-section">' +
            '<div class="sa-field" id="uniqueBlock"><div class="sa-row">' +
            '<div><label class="sa-label" for="fPrice">Price</label>' + moneyField('price', first.price, 'id="fPrice"') + '</div>' +
            '<div><label class="sa-label" for="fAvailable">Is it still for sale?</label>' +
            '<select id="fAvailable"><option value="1">Yes, it\'s available</option><option value="0"' + (first.stockWas === 0 ? ' selected' : '') + '>No, it has sold</option></select></div>' +
            '</div></div>' +

            '<div class="sa-field" id="optionsBlock"><span class="sa-label">Prices</span>' +
            '<span class="sa-hint">One row is enough. Add more if it comes in several sizes or kinds, each with its own price. ' +
            'Leave &ldquo;How many&rdquo; empty if you can always make more.</span>' +
            '<div id="options"></div>' +
            '<button type="button" class="sa-button sa-quiet sa-small js-add-option">Add another size or option</button></div>' +

            '<div class="sa-field"><span class="sa-label">Delivery size</span>' +
            '<span class="sa-hint">Which of your two delivery prices applies (you set them under Delivery).</span>' +
            '<label class="sa-check"><input type="radio" name="fShipping" value="standard"' + (p.shippingClass !== 'large' ? ' checked' : '') + '><span>Small: prints, zines, things that fit in a tube or envelope</span></label>' +
            '<label class="sa-check"><input type="radio" name="fShipping" value="large"' + (p.shippingClass === 'large' ? ' checked' : '') + '><span>Large or fragile: big originals, framed pieces</span></label></div>' +
            '</div>' +

            '<div class="sa-section"><label class="sa-check"><input type="checkbox" id="fLive"' + (p.status === 'live' ? ' checked' : '') + '>' +
            '<span><strong>Show it in the shop</strong><br><span class="sa-muted">Untick to keep it hidden while you work on it.</span></span></label></div>' +

            '<div class="sa-save-bar"><button type="submit" class="sa-button" id="saveItem">Save</button>' +
            '<button type="button" class="sa-button sa-quiet js-cancel">Cancel</button><span class="sa-spacer"></span>' +
            (product ? '<button type="button" class="sa-button sa-danger js-archive">Put away</button>' : '') + '</div>' +
            '</form>');

        drawPictures();
        drawOptions();
        updateEditorBlocks();
        window.scrollTo(0, 0);
    }

    function drawPictures() {
        $('#pictures').html(editing.images.map(function (location, index) {
            return '<div class="sa-picture" data-index="' + index + '"><img src="' + esc(thumb(location)) + '" alt="">' +
                '<div class="sa-picture-tools">' +
                (index > 0 ? '<button type="button" class="js-picture-first">Make first</button>' : '<span class="sa-muted">Main picture</span>') +
                '<button type="button" class="is-remove js-picture-remove">Remove</button></div></div>';
        }).join(''));
    }

    function drawOptions() {
        $('#options').html(editing.options.map(function (option) {
            return '<div class="sa-option" data-key="' + option.key + '">' +
                '<div><label>Size or option</label><input type="text" data-field="label" placeholder="e.g. A4" value="' + esc(option.label) + '" maxlength="120"></div>' +
                '<div><label>Price</label>' + moneyField('price', option.price) + '</div>' +
                '<div><label>How many</label><input type="text" inputmode="numeric" data-field="stock" placeholder="no limit" value="' + esc(option.stock) + '"></div>' +
                '<button type="button" class="sa-remove js-remove-option" aria-label="Remove this option"' + (editing.options.length < 2 ? ' disabled' : '') + '>&times;</button>' +
                '</div>';
        }).join(''));
    }

    // Shows the price boxes that fit: one price for an original, rows for
    // things there are several of
    function updateEditorBlocks() {
        var unique = $('#fUnique').prop('checked');
        $('#fPrice').val(editing.options[0].price);
        $('#uniqueBlock').prop('hidden', !unique);
        $('#optionsBlock').prop('hidden', unique);
    }

    $(document).on('change', '#fUnique', updateEditorBlocks);

    // The title follows the name as it's typed
    $(document).on('input', '#fName', function () {
        $('#editorTitle').text($.trim(this.value) || (editing.id ? 'Untitled item' : 'New item'));
    });

    // Anything changed in the editor is remembered, so leaving without
    // saving asks first
    $(document).on('input change', '#editor', function () {
        if (editing) {
            editing.dirty = true;
        }
    });

    function markChanged() {
        if (editing) {
            editing.dirty = true;
        }
    }

    function okToLeaveEditor() {
        return !editing || !editing.dirty || confirm('Leave without saving your changes to this item?');
    }

    $(document).on('input', '#options input', function () {
        var key = Number($(this).closest('.sa-option').attr('data-key'));
        var field = this.getAttribute('data-field');
        editing.options.forEach(function (option) {
            if (option.key === key) {
                option[field] = $.trim(this.value);
            }
        }, this);
    });

    // (the single price box and the first row are the same price)
    $(document).on('input', '#fPrice', function () {
        editing.options[0].price = $.trim(this.value);
        $('#options .sa-option').first().find('[data-field=price]').val(this.value);
    });

    $(document).on('click', '.js-add-option', function () {
        editing.options.push({ key: nextKey++, id: 0, label: '', price: '', stock: '', stockWas: null });
        markChanged();
        drawOptions();
        $('#options .sa-option').last().find('input').first().focus();
    });

    $(document).on('click', '.js-remove-option', function () {
        var key = Number($(this).closest('.sa-option').attr('data-key'));
        editing.options = editing.options.filter(function (option) { return option.key !== key; });
        markChanged();
        drawOptions();
        $('#fPrice').val(editing.options[0].price);
    });

    $(document).on('click', '.js-picture-remove', function () {
        editing.images.splice(Number($(this).closest('.sa-picture').attr('data-index')), 1);
        markChanged();
        drawPictures();
    });

    $(document).on('click', '.js-picture-first', function () {
        var index = Number($(this).closest('.sa-picture').attr('data-index'));
        editing.images.unshift(editing.images.splice(index, 1)[0]);
        markChanged();
        drawPictures();
    });

    $(document).on('click', '.js-cancel', function (event) {
        event.preventDefault();
        if (okToLeaveEditor()) {
            showTab('items');
        }
    });

    $(document).on('click', '.js-archive', function () {
        if (!confirm('Put this item away? It leaves the shop, but it isn\'t deleted: you can bring it back from "Put away" at the bottom of the list.')) {
            return;
        }
        post({ action: 'archiveProduct', id: editing.id }).done(function () {
            toast('Put away');
            loadState(function () { showTab('items'); });
        });
    });

    $(document).on('submit', '#editor', function (event) {
        event.preventDefault();
        var unique = $('#fUnique').prop('checked');
        var first = editing.options[0];
        var variants = unique
            ? [{ id: first.id, label: '', price: $.trim($('#fPrice').val()), stock: $('#fAvailable').val() === '1' ? '1' : '0', stockWas: first.stockWas }]
            : editing.options.map(function (option) {
                return { id: option.id, label: option.label, price: option.price, stock: option.stock, stockWas: option.stockWas };
            });
        var button = $('#saveItem').prop('disabled', true).text('Saving…');
        post({
            action: 'saveProduct',
            id: editing.id,
            name: $('#fName').val(),
            typeLabel: $('#fType').val(),
            isUnique: unique,
            details: $('#fDetails').val(),
            description: $('#fDescription').val(),
            workId: editing.workId,
            shippingClass: $('input[name=fShipping]:checked').val(),
            status: $('#fLive').prop('checked') ? 'live' : 'draft',
            images: editing.images,
            variants: variants
        }).done(function () {
            toast('Saved');
            loadState(function () { showTab('items'); });
        }).fail(function () {
            button.prop('disabled', false).text('Save');
        });
    });

    // --- pictures: uploading ---

    $(document).on('click', '.js-upload', function () {
        $('#pictureFile').val('').trigger('click');
    });

    $(document).on('change', '#pictureFile', function () {
        var files = Array.prototype.slice.call(this.files || []);
        var button = $('.js-upload').prop('disabled', true);
        var next = function () {
            var file = files.shift();
            if (!file || !editing) {
                button.prop('disabled', false).text('Upload a photo');
                return;
            }
            button.text('Uploading…');
            ImagePrep.prepare(file).then(function (ready) {
                var form = new FormData();
                form.append('action', 'uploadPicture');
                form.append('photo', ready);
                return $.ajax({ url: API, type: 'POST', data: form, processData: false, contentType: false, dataType: 'json' });
            }).then(function (answer) {
                if (editing) {
                    editing.images.push(answer.location);
                    markChanged();
                    drawPictures();
                }
                next();
            }, function (problem) {
                if (problem && problem.status !== undefined) {
                    failed(problem);
                } else {
                    toast((problem && problem.message) || 'That picture could not be uploaded.', true);
                }
                next();
            });
        };
        next();
    });

    // --- pictures: choosing one of the works ---

    $(document).on('click', '.js-pick-work', function () {
        openOverlay('Choose from your works', '<p class="sa-muted">Loading&hellip;</p>');
        var show = function () {
            $('#overlayBody').html('<input type="search" id="workSearch" placeholder="Search by name" autocomplete="off">' +
                '<div class="sa-work-grid" id="workGrid"></div>');
            drawWorks('');
            $('#workSearch').focus();
        };
        if (works) {
            show();
            return;
        }
        $.getJSON(API, { what: 'works' }).done(function (data) {
            works = data.works;
            show();
        }).fail(failed);
    });

    function drawWorks(search) {
        search = search.toLowerCase();
        var matches = works.filter(function (work) {
            return !search || work.name.toLowerCase().indexOf(search) !== -1;
        }).slice(0, 120);
        $('#workGrid').html(matches.length ? matches.map(function (work) {
            return '<button type="button" class="sa-work js-work" data-id="' + work.id + '">' +
                '<img src="' + esc(thumb(work.location)) + '" alt="" loading="lazy">' + esc(work.name) + '</button>';
        }).join('') : '<p class="sa-muted">No works with that name.</p>');
    }

    $(document).on('input', '#workSearch', function () {
        drawWorks(this.value);
    });

    $(document).on('click', '.js-work', function () {
        var id = Number(this.getAttribute('data-id'));
        var work = works.filter(function (each) { return each.id === id; })[0];
        if (!work || !editing) {
            return;
        }
        if (editing.images.indexOf(work.location) === -1) {
            editing.images.push(work.location);
        }
        markChanged();
        // The first work chosen fills in what's still empty, and is remembered
        // as the work this item is (so the two can link to each other)
        if (!editing.workId) {
            editing.workId = work.id;
        }
        if (!$.trim($('#fName').val())) {
            $('#fName').val(work.name);
        }
        if (!$.trim($('#fDetails').val())) {
            $('#fDetails').val(work.details);
        }
        drawPictures();
        closeOverlay();
    });

    // ----------------------------------------------------------------------
    // Delivery
    // ----------------------------------------------------------------------

    function drawDelivery() {
        zonesDraft = state.zones.map(function (zone) {
            return { key: nextKey++, name: zone.name, countries: zone.countries, standard: priceText(zone.priceStandardCents), large: priceText(zone.priceLargeCents) };
        });
        $('#panel').html(
            '<p>Say where you send things and what delivery costs there. A buyer picks their country in the basket and ' +
            'pays that destination\'s price once per order, however many things they buy.</p>' +
            '<p class="sa-muted">Each destination has two prices: one for small things (prints, zines) and one for large or ' +
            'fragile pieces. If an order has anything large in it, the large price is used. A country that is in none of ' +
            'your destinations can\'t order.</p>' +
            '<div id="zones"></div>' +
            '<div class="sa-save-bar"><button type="button" class="sa-button sa-quiet js-add-zone">Add a destination</button>' +
            '<span class="sa-spacer"></span><button type="button" class="sa-button js-save-zones">Save delivery prices</button></div>');
        drawZones();
    }

    function countriesSummary(zone) {
        if (zone.countries === '*') {
            return 'Everywhere else';
        }
        if (!zone.countries.length) {
            return 'No countries chosen yet';
        }
        var names = zone.countries.map(function (code) { return state.countries[code] || code; });
        return names.length <= 4 ? names.join(', ') : names.slice(0, 3).join(', ') + ' and ' + (names.length - 3) + ' more';
    }

    function drawZones() {
        if (!zonesDraft.length) {
            $('#zones').html('<p class="sa-empty">No destinations yet. A common start: one for your own country, one for ' +
                'Europe, and one for &ldquo;everywhere else&rdquo;.</p>');
            return;
        }
        $('#zones').html(zonesDraft.map(function (zone) {
            return '<div class="sa-zone" data-key="' + zone.key + '">' +
                '<div class="sa-zone-head"><input type="text" data-field="name" placeholder="Name, e.g. Europe" value="' + esc(zone.name) + '" maxlength="120">' +
                '<button type="button" class="sa-remove js-remove-zone" aria-label="Remove this destination">&times;</button></div>' +
                '<div class="sa-zone-countries"><span>' + esc(countriesSummary(zone)) + '</span>' +
                '<button type="button" class="sa-button sa-quiet sa-small js-zone-countries">Choose countries</button></div>' +
                '<div class="sa-row"><div><label class="sa-hint">Small things</label>' + moneyField('standard', zone.standard) + '</div>' +
                '<div><label class="sa-hint">Large or fragile pieces</label>' + moneyField('large', zone.large) + '</div></div>' +
                '</div>';
        }).join(''));
    }

    function zoneOf(el) {
        var key = Number($(el).closest('.sa-zone').attr('data-key'));
        return zonesDraft.filter(function (zone) { return zone.key === key; })[0];
    }

    $(document).on('input', '#zones input', function () {
        zoneOf(this)[this.getAttribute('data-field')] = $.trim(this.value);
    });

    $(document).on('click', '.js-add-zone', function () {
        zonesDraft.push({ key: nextKey++, name: '', countries: [], standard: '', large: '' });
        drawZones();
        $('#zones .sa-zone').last().find('input').first().focus();
    });

    $(document).on('click', '.js-remove-zone', function () {
        var zone = zoneOf(this);
        zonesDraft = zonesDraft.filter(function (each) { return each !== zone; });
        drawZones();
    });

    $(document).on('click', '.js-save-zones', function () {
        var button = $(this).prop('disabled', true);
        post({
            action: 'saveZones',
            zones: zonesDraft.map(function (zone) {
                return { name: zone.name, countries: zone.countries, standard: zone.standard, large: zone.large };
            })
        }).done(function () {
            toast('Delivery prices saved');
            loadState(drawDelivery);
        }).always(function () {
            button.prop('disabled', false);
        });
    });

    // --- choosing a destination's countries ---

    var pickingZone = null;

    $(document).on('click', '.js-zone-countries', function () {
        pickingZone = zoneOf(this);
        var takenBy = {};
        var elsewhereTaken = false;
        zonesDraft.forEach(function (zone) {
            if (zone === pickingZone) {
                return;
            }
            if (zone.countries === '*') {
                elsewhereTaken = true;
            } else {
                zone.countries.forEach(function (code) { takenBy[code] = zone.name || 'another destination'; });
            }
        });
        var everywhere = pickingZone.countries === '*';
        var chosen = everywhere ? [] : pickingZone.countries;

        var list = Object.keys(state.countries).sort(function (a, b) {
            return state.countries[a].localeCompare(state.countries[b]);
        }).map(function (code) {
            var taken = takenBy[code];
            return '<label' + (taken ? ' class="is-taken" title="Already in ' + esc(taken) + '"' : '') + ' data-name="' + esc(state.countries[code].toLowerCase()) + '">' +
                '<input type="checkbox" value="' + code + '"' + (chosen.indexOf(code) !== -1 ? ' checked' : '') + (taken ? ' disabled' : '') + '>' +
                esc(state.countries[code]) + '</label>';
        }).join('');

        openOverlay('Countries for ' + (pickingZone.name || 'this destination'),
            '<label class="sa-check"><input type="radio" name="zoneKind" value="list"' + (everywhere ? '' : ' checked') + '><span>The countries ticked below</span></label>' +
            '<label class="sa-check"><input type="radio" name="zoneKind" value="all"' + (everywhere ? ' checked' : '') + (elsewhereTaken ? ' disabled' : '') + '>' +
            '<span>Everywhere else <span class="sa-muted">(every country that isn\'t in one of your other destinations)</span></span></label>' +
            '<div id="countryPicker"' + (everywhere ? ' hidden' : '') + '>' +
            '<div class="sa-chips" style="margin:12px 0"><button type="button" class="sa-chip js-quick" data-set="eu">Tick the European Union</button>' +
            '<button type="button" class="sa-chip js-quick" data-set="europe">Tick all of Europe</button>' +
            '<button type="button" class="sa-chip js-quick" data-set="none">Untick all</button></div>' +
            '<input type="search" id="countrySearch" placeholder="Find a country" autocomplete="off">' +
            '<div class="sa-country-list" id="countryList">' + list + '</div></div>',
            '<span class="sa-muted sa-small">Greyed-out countries are already in another destination.</span>' +
            '<button type="button" class="sa-button js-countries-done">Done</button>');
    });

    $(document).on('change', 'input[name=zoneKind]', function () {
        $('#countryPicker').prop('hidden', this.value === 'all');
    });

    $(document).on('input', '#countrySearch', function () {
        var search = this.value.toLowerCase();
        $('#countryList label').each(function () {
            $(this).toggle(this.getAttribute('data-name').indexOf(search) !== -1);
        });
    });

    $(document).on('click', '.js-quick', function () {
        var set = this.getAttribute('data-set');
        var codes = set === 'eu' ? EU : (set === 'europe' ? EUROPE : []);
        $('#countryList input:not(:disabled)').each(function () {
            if (set === 'none') {
                this.checked = false;
            } else if (codes.indexOf(this.value) !== -1) {
                this.checked = true;
            }
        });
    });

    $(document).on('click', '.js-countries-done', function () {
        if (pickingZone) {
            pickingZone.countries = $('input[name=zoneKind]:checked').val() === 'all' ? '*'
                : $('#countryList input:checked').map(function () { return this.value; }).get();
            drawZones();
        }
        closeOverlay();
    });

    // ----------------------------------------------------------------------
    // Promo codes
    // ----------------------------------------------------------------------

    function drawPromos() {
        promosDraft = state.promos.map(function (promo) {
            return {
                key: nextKey++, id: promo.id, code: promo.code, kind: promo.kind,
                value: promo.kind === 'percent' ? String(promo.value) : priceText(promo.value),
                maxUses: promo.maxUses === null ? '' : String(promo.maxUses),
                endsAt: promo.endsAt || '', active: promo.active, usedCount: promo.usedCount
            };
        });
        $('#panel').html(
            '<p>A promo code is a word a buyer types in their basket to get money off. Make one for your newsletter, ' +
            'a fair, a friend: whoever you give it to can use it.</p>' +
            '<p class="sa-muted">The money comes off the things they buy, never off delivery. One code per order.</p>' +
            '<div id="promos"></div>' +
            '<div class="sa-save-bar"><button type="button" class="sa-button sa-quiet js-add-promo">Add a code</button>' +
            '<span class="sa-spacer"></span><button type="button" class="sa-button js-save-promos">Save promo codes</button></div>');
        drawPromoRows();
    }

    // Why a code that's switched on isn't working any more, if it isn't
    function promoState(promo) {
        if (!promo.id) {
            return 'Not saved yet';
        }
        var used = 'Used ' + promo.usedCount + (promo.usedCount === 1 ? ' time' : ' times') + ' so far';
        var today = new Date().toISOString().slice(0, 10);
        if (promo.endsAt && promo.endsAt < today) {
            return used + ' &middot; <strong>it has ended</strong>';
        }
        if (promo.maxUses !== '' && promo.usedCount >= Number(promo.maxUses)) {
            return used + ' &middot; <strong>all used up</strong>';
        }
        return used;
    }

    function drawPromoRows() {
        if (!promosDraft.length) {
            $('#promos').html('<p class="sa-empty">No promo codes yet. Choose &ldquo;Add a code&rdquo; to make one.</p>');
            return;
        }
        $('#promos').html(promosDraft.map(function (promo) {
            return '<div class="sa-zone sa-promo" data-key="' + promo.key + '">' +
                '<div class="sa-zone-head"><input type="text" class="sa-code" data-field="code" aria-label="The code" placeholder="The code, e.g. SPRING10" ' +
                'autocapitalize="characters" spellcheck="false" maxlength="40" value="' + esc(promo.code) + '">' +
                '<label class="sa-check sa-switch"><input type="checkbox" data-field="active"' + (promo.active ? ' checked' : '') + '><span>Switched on</span></label>' +
                '<button type="button" class="sa-remove js-remove-promo" aria-label="Remove this code">&times;</button></div>' +
                '<div class="sa-row">' +
                '<div><label class="sa-hint">It takes off</label><span class="sa-amount">' +
                '<input type="text" inputmode="decimal" data-field="value" aria-label="How much it takes off" value="' + esc(promo.value) + '">' +
                '<select data-field="kind" aria-label="Percent or money">' +
                '<option value="percent"' + (promo.kind === 'percent' ? ' selected' : '') + '>% of the items</option>' +
                '<option value="amount"' + (promo.kind === 'amount' ? ' selected' : '') + '>' + esc($.trim(symbol())) + ' off</option></select></span></div>' +
                '<div><label class="sa-hint">How many times it can be used</label>' +
                '<input type="text" inputmode="numeric" data-field="maxUses" placeholder="no limit" value="' + esc(promo.maxUses) + '"></div>' +
                '<div><label class="sa-hint">Last day it works</label>' +
                '<input type="date" data-field="endsAt" value="' + esc(promo.endsAt) + '"></div>' +
                '</div><p class="sa-muted sa-small sa-promo-state">' + promoState(promo) + '</p></div>';
        }).join(''));
    }

    function promoOf(el) {
        var key = Number($(el).closest('.sa-promo').attr('data-key'));
        return promosDraft.filter(function (promo) { return promo.key === key; })[0];
    }

    $(document).on('input change', '#promos input, #promos select', function () {
        var field = this.getAttribute('data-field');
        promoOf(this)[field] = this.type === 'checkbox' ? this.checked : $.trim(this.value);
    });

    $(document).on('click', '.js-add-promo', function () {
        promosDraft.push({ key: nextKey++, id: 0, code: '', kind: 'percent', value: '', maxUses: '', endsAt: '', active: true, usedCount: 0 });
        drawPromoRows();
        $('#promos .sa-promo').last().find('input').first().focus();
    });

    $(document).on('click', '.js-remove-promo', function () {
        var promo = promoOf(this);
        if (promo.id && !confirm('Remove the code ' + promo.code + '? It stops working once you save. (To pause it instead, untick "Switched on".)')) {
            return;
        }
        promosDraft = promosDraft.filter(function (each) { return each !== promo; });
        drawPromoRows();
    });

    $(document).on('click', '.js-save-promos', function () {
        var button = $(this).prop('disabled', true);
        post({
            action: 'savePromos',
            promos: promosDraft.map(function (promo) {
                return { id: promo.id, code: promo.code, kind: promo.kind, value: promo.value, maxUses: promo.maxUses, endsAt: promo.endsAt, active: promo.active };
            })
        }).done(function () {
            toast('Promo codes saved');
            loadState(drawPromos);
        }).always(function () {
            button.prop('disabled', false);
        });
    });

    // ----------------------------------------------------------------------
    // Emails: the wording of the shop's own emails (sent through Resend)
    // ----------------------------------------------------------------------

    var EMAIL_KINDS = {
        confirm: 'The order confirmation',
        shipped: 'Your order is on its way',
        alert: 'A new order (to you)'
    };

    function emailBlock(kind, on, subject, text, about) {
        var name = kind.charAt(0).toUpperCase() + kind.slice(1);
        return '<section class="sa-email">' +
            '<h3>' + EMAIL_KINDS[kind] + '</h3>' +
            '<p class="sa-hint">' + about + '</p>' +
            '<div class="sa-field"><label class="sa-check"><input type="checkbox" id="e' + name + 'On"' + (on === '1' ? ' checked' : '') + '>' +
            '<span>Send this email</span></label></div>' +
            (subject !== null ?
                '<div class="sa-field"><label for="e' + name + 'Subject">Subject line</label>' +
                '<input type="text" id="e' + name + 'Subject" maxlength="200" value="' + esc(subject) + '"></div>' +
                '<div class="sa-field"><label for="e' + name + 'Text">Your message</label>' +
                '<span class="sa-hint">Leave an empty line to start a new paragraph. <code>{name}</code> becomes the buyer&rsquo;s first name, ' +
                '<code>{order}</code> the order number.</span>' +
                '<textarea id="e' + name + 'Text" maxlength="5000">' + esc(text) + '</textarea></div>' : '') +
            '<p class="sa-email-tools">' +
            '<button type="button" class="sa-button sa-quiet sa-small js-email-preview" data-kind="' + kind + '">Preview</button>' +
            '<button type="button" class="sa-button sa-quiet sa-small js-email-test" data-kind="' + kind + '">Send me a test</button></p>' +
            '</section>';
    }

    function drawEmails() {
        var s = state.settings;
        var status = state.setup.email
            ? '<p class="sa-hint">Emails are sent from <strong>' + esc(state.setup.emailFrom) + '</strong>.</p>'
            : '<div class="sa-setup"><h3>Emails aren&rsquo;t connected yet</h3><p>You can write and preview them now. ' +
              'Before they can be sent, the email service (Resend) needs connecting on the server: a job for whoever looks after it ' +
              '(<code>RESEND_API_KEY</code> in the server&rsquo;s settings file). Until then, Stripe&rsquo;s own receipt is the only email buyers get.</p></div>';

        $('#panel').html(
            '<form class="sa-editor" id="emailsForm" novalidate>' + status +
            '<div class="sa-field"><label for="eOwner">Your email address</label>' +
            '<span class="sa-hint">New-order alerts and test emails come here, and when a buyer replies to one of their emails, the reply comes here too.</span>' +
            '<input type="email" id="eOwner" maxlength="255" value="' + esc(s.emailOwner) + '" placeholder="you@example.com"></div>' +

            emailBlock('confirm', s.emailConfirmOn, s.emailConfirmSubject, s.emailConfirmText,
                'Sent to the buyer as soon as they&rsquo;ve paid. Under your message comes what they bought, the prices, ' +
                'the delivery address and a link to their order.') +
            emailBlock('shipped', s.emailShippedOn, s.emailShippedSubject, s.emailShippedText,
                'Sent to the buyer when you press &ldquo;Mark as sent&rdquo;. If you typed a tracking number or link, it&rsquo;s included.') +
            emailBlock('alert', s.emailAlertOn, null, null,
                'Sent to your own address for every sale, with the buyer&rsquo;s details and address. Its wording is fixed.') +

            '<section class="sa-email"><h3>Your sign-off</h3>' +
            '<div class="sa-field"><label for="eSignature">Under the message in the buyer&rsquo;s emails</label>' +
            '<textarea id="eSignature" maxlength="1000" class="sa-short">' + esc(s.emailSignature) + '</textarea></div></section>' +

            '<div class="sa-save-bar"><button type="submit" class="sa-button">Save emails</button></div></form>');
    }

    // The wording as it is on screen, saved or not
    function emailDraft() {
        return {
            emailOwner: $('#eOwner').val(),
            emailConfirmOn: $('#eConfirmOn').prop('checked'),
            emailConfirmSubject: $('#eConfirmSubject').val(),
            emailConfirmText: $('#eConfirmText').val(),
            emailShippedOn: $('#eShippedOn').prop('checked'),
            emailShippedSubject: $('#eShippedSubject').val(),
            emailShippedText: $('#eShippedText').val(),
            emailAlertOn: $('#eAlertOn').prop('checked'),
            emailSignature: $('#eSignature').val()
        };
    }

    $(document).on('submit', '#emailsForm', function (event) {
        event.preventDefault();
        var button = $(this).find('button[type=submit]').prop('disabled', true);
        post({ action: 'saveEmails', emails: emailDraft() }).done(function () {
            toast('Emails saved');
            loadState(drawEmails);
        }).always(function () {
            button.prop('disabled', false);
        });
    });

    $(document).on('click', '.js-email-preview', function () {
        var kind = this.getAttribute('data-kind');
        post({ action: 'previewEmail', kind: kind, emails: emailDraft() }).done(function (answer) {
            openOverlay(EMAIL_KINDS[kind],
                '<p class="sa-hint">Subject: <strong class="js-preview-subject"></strong><br>' +
                'Shown with a made-up order. Unsaved changes are included.</p>' +
                '<iframe class="sa-email-preview" title="Email preview" sandbox="allow-same-origin"></iframe>');
            // (no scripts can run in it; same-origin only so its pictures load)
            $('.js-preview-subject').text(answer.subject);
            $('#overlayBody iframe').attr('srcdoc', answer.html);
        });
    });

    $(document).on('click', '.js-email-test', function () {
        var button = $(this).prop('disabled', true);
        post({ action: 'testEmail', kind: this.getAttribute('data-kind'), emails: emailDraft() }).done(function (answer) {
            toast('A test is on its way to ' + answer.to);
        }).always(function () {
            button.prop('disabled', false);
        });
    });

    // ----------------------------------------------------------------------
    // Settings
    // ----------------------------------------------------------------------

    function drawSettings() {
        var s = state.settings;
        var currencies = Object.keys(state.currencies).map(function (code) {
            return '<option value="' + code + '"' + (code === s.currency ? ' selected' : '') + '>' + esc(state.currencies[code].name) + '</option>';
        }).join('');
        $('#panel').html(
            '<form class="sa-editor" id="settingsForm" novalidate>' +
            '<div class="sa-field"><label class="sa-check"><input type="checkbox" id="sPaused"' + (s.paused === '1' ? ' checked' : '') + '>' +
            '<span><strong>Pause the shop</strong><br><span class="sa-muted">For holidays or busy weeks. Everything stays on show, but nothing can be bought until you untick this.</span></span></label></div>' +
            '<div class="sa-field"><label class="sa-check"><input type="checkbox" id="sInMenu"' + (s.inMenu === '1' ? ' checked' : '') + '>' +
            '<span><strong>Show &ldquo;Shop&rdquo; in the menu</strong><br><span class="sa-muted">Untick to take the shop out of your website\'s menu. Its pages still work for anyone who has the link.</span></span></label></div>' +

            '<div class="sa-field"><label for="sIntro">A few words at the top of the shop</label>' +
            '<span class="sa-hint">Optional. One or two lines under the &ldquo;Shop&rdquo; title.</span>' +
            '<textarea id="sIntro" maxlength="1000">' + esc(s.intro) + '</textarea></div>' +

            '<div class="sa-field"><label for="sDelivery">A note about delivery, shown on every item</label>' +
            '<span class="sa-hint">Optional. For example: &ldquo;Prints are sent rolled in a tube within a week.&rdquo;</span>' +
            '<textarea id="sDelivery" maxlength="1000">' + esc(s.deliveryNote) + '</textarea></div>' +

            '<div class="sa-field"><label for="sCurrency">Currency</label>' +
            '<span class="sa-hint">The money your prices are in. Changing it does not convert the prices you\'ve already typed.</span>' +
            '<select id="sCurrency">' + currencies + '</select></div>' +

            '<div class="sa-save-bar"><button type="submit" class="sa-button">Save settings</button></div></form>');
    }

    $(document).on('submit', '#settingsForm', function (event) {
        event.preventDefault();
        var button = $(this).find('button[type=submit]').prop('disabled', true);
        post({
            action: 'saveSettings',
            paused: $('#sPaused').prop('checked'),
            inMenu: $('#sInMenu').prop('checked'),
            intro: $('#sIntro').val(),
            deliveryNote: $('#sDelivery').val(),
            currency: $('#sCurrency').val()
        }).done(function () {
            toast('Settings saved');
            loadState(drawSettings);
        }).always(function () {
            button.prop('disabled', false);
        });
    });

    // ----------------------------------------------------------------------
    // The overlay (work picker, country picker)
    // ----------------------------------------------------------------------

    function openOverlay(title, body, foot) {
        $('#overlayTitle').text(title);
        $('#overlayBody').html(body);
        $('#overlayFoot').html(foot || '').prop('hidden', !foot);
        $('#overlay').prop('hidden', false);
    }

    function closeOverlay() {
        $('#overlay').prop('hidden', true);
        $('#overlayBody').empty();
        pickingZone = null;
    }

    $(document).on('click', '#overlayClose', closeOverlay);

    $(document).on('click', '#overlay', function (event) {
        if (event.target === this) {
            closeOverlay();
        }
    });

    $(document).on('keydown', function (event) {
        if (event.key === 'Escape' && !$('#overlay').prop('hidden')) {
            closeOverlay();
        }
    });

    // ----------------------------------------------------------------------
    // Start-up
    // ----------------------------------------------------------------------

    $(function () {
        $('#tabs').on('click', 'button', function () {
            if (okToLeaveEditor()) {
                showTab(this.getAttribute('data-tab'));
            }
        });
        loadState(function () {
            // Straight to the orders if any are waiting; otherwise the items
            showTab(state.toSend ? 'orders' : 'items');
        });
    });
})();
