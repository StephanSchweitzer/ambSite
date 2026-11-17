<?php
// Draws the shop's pages. Unlike the rest of the public site, the shop's
// markup exists only here: index.php writes it into the page for a first
// visit, and js/shop.js asks actions/shopAPI.php for the same HTML when a
// visitor moves between shop pages. So there is one place to change it, and
// the script only adds behaviour (the basket, choosing a size, the viewer).
//
//   /shop                 everything for sale            view 'shop'
//   /shop/<id>/<name>     the same, with that item open  view 'shop-item'
//                         in the side panel
//   /shop/basket          the basket (drawn by shop.js)  view 'shop-basket'
//   /shop/thank-you       after paying (drawn by shop.js) view 'shop-thanks'

include_once __DIR__ . '/publicPageFunctions.php';
include_once __DIR__ . '/shopFunctions.php';

define('SHOP_GRID_SIZES', '(max-width: 992px) 45vw, 30vw');
define('SHOP_ITEM_SIZES', '(max-width: 767px) 92vw, 500px'); // the side panel's picture

// Everything about the shop page at $path: which view it is, its title and
// description, its HTML (null when the script draws it), and for an item the
// product itself. 'status' is 404 for an address with nothing behind it.
function shopPage($conn, $path)
{
    $page = array(
        'view' => 'shop', 'status' => 200, 'title' => 'Shop - Ambar Velasco', 'description' => null,
        'html' => null, 'product' => null, 'noindex' => shopTestMode(), 'path' => $path,
    ); // a test shop's made-up prices stay out of search results
    $ready = shopReady($conn);

    if ($path === '/shop/basket') {
        return array('view' => 'shop-basket', 'title' => 'Basket - Ambar Velasco', 'noindex' => true) + $page;
    }
    if ($path === '/shop/thank-you') {
        return array('view' => 'shop-thanks', 'title' => 'Thank you - Ambar Velasco', 'noindex' => true) + $page;
    }

    if ($path === '/shop') {
        if (!$ready) {
            $page['html'] = shopRenderIndex(array(), shopSettingDefaults(), array());
            $page['noindex'] = true;
            return $page;
        }
        $settings = shopSettings($conn);
        $products = shopGetProducts($conn);
        $page['html'] = shopRenderIndex($products, $settings, shopGetZones($conn));
        $names = array_map(function ($product) { return $product['name']; }, array_slice($products, 0, 6));
        $page['description'] = trim($settings['intro']) !== '' ? ambExcerpt($settings['intro'])
            : 'Original works and prints by Ambar Velasco' . ($names ? ': ' . implode(', ', $names) . '.' : '.');
        $page['products'] = $products;
        return $page;
    }

    if (preg_match('#^/shop/(\d+)(?:/[^/]*)?$#', $path, $match)) {
        $product = $ready ? shopGetLiveProduct($conn, $match[1]) : null;
        if (!$product) {
            return array('view' => 'notfound', 'status' => 404) + $page;
        }
        $settings = shopSettings($conn);
        $zones = shopGetZones($conn);
        $page['view'] = 'shop-item';
        $page['product'] = $product;
        $page['path'] = $product['path']; // its proper address (the name part may be old)
        $page['title'] = $product['name'] . ' - Shop - Ambar Velasco';
        $about = trim($product['description']) !== '' ? $product['description'] : $product['details'];
        $page['description'] = trim(($product['typeLabel'] !== '' ? $product['typeLabel'] . ' by Ambar Velasco. ' : '') . ambExcerpt($about, 130));
        // An item opens over the shop, in the side panel: 'panel' is the item
        // alone (to open it over the shop already on screen), 'html' the shop
        // with it open
        $page['panel'] = shopRenderProduct($product, $settings, $zones);
        $page['html'] = shopRenderIndex(shopGetProducts($conn), $settings, $zones, $page['panel']);
        return $page;
    }

    return array('view' => 'notfound', 'status' => 404) + $page;
}

function shopText($text)
{
    return nl2br(ambHtml(trim((string) $text)), false);
}

// The page header shared by the shop's pages: the title with its strip of
// tape, like a project's on the Works page
function shopRenderHeader($title, $intro = '')
{
    return '<header class="project-header shop-header"><h2 class="project-title">' . ambHtml($title) . '</h2>'
        . (trim((string) $intro) !== '' ? '<p class="project-description">' . shopText($intro) . '</p>' : '')
        . '</header>';
}

// While the shop runs on Stripe's test keys (shopTestMode): a slim bar that
// floats at the top of the screen on every shop page, so the shop itself
// still looks as it will. index.php draws it once, hidden unless the page is
// a shop page; shop.js shows and hides it as visitors move around
// (showShopTestBar). "More" opens the details.
function shopRenderTestBar($shown)
{
    if (!shopTestMode()) {
        return '';
    }
    return '<aside id="shopTestBar" class="shop-test-bar" role="note" aria-label="This shop is a test"' . ($shown ? '' : ' hidden') . '>'
        . '<details><summary><span class="shop-test-tag">Test<span class="shop-test-wide"> shop</span></span>'
        . '<span class="shop-test-line shop-test-wide">Prices aren&rsquo;t real. Please don&rsquo;t use a real card.</span>'
        . '<span class="shop-test-line shop-test-narrow">Prices aren&rsquo;t real &middot; no real cards</span>'
        . '<span class="shop-test-more" aria-hidden="true"></span></summary>'
        . '<div class="shop-test-details"><p>We&rsquo;re still designing the shop: nothing here is for sale yet, no orders will be sent and no money can be taken.</p>'
        . '<p>To try buying something, use the test card <span class="shop-test-card">4242&nbsp;4242&nbsp;4242&nbsp;4242</span>'
        . ' with any future date and any three digits.</p></div></details></aside>';
}

// The short version, beside each "Add to basket" and "Pay" button
function shopRenderTestNote()
{
    return shopTestMode()
        ? '<p class="shop-test-note">Test shop: nothing will be charged. Please don&rsquo;t use a real card.</p>'
        : '';
}

// ---------------------------------------------------------------------------
// /shop
// ---------------------------------------------------------------------------

// $itemHtml: an item to show open in the side panel (its address was asked for)
function shopRenderIndex($products, $settings, $zones, $itemHtml = '')
{
    $html = '<div class="shop shop-index">' . shopRenderHeader('Shop', $settings['intro']);

    if ($settings['paused'] === '1' && $products) {
        $html .= '<p class="shop-status">The shop is temporarily closed.</p>';
    }
    if (!$products) {
        return $html . '<div class="shop-empty"><p>Nothing is for sale right now.</p>'
            . '<p><a href="/select-works" class="shop-text-link">See the works</a></p></div></div>';
    }

    $html .= '<div class="shop-grid">';
    foreach ($products as $index => $product) {
        $html .= shopRenderCard($product, $index);
    }
    return $html . '</div></div>' . shopRenderPanel($itemHtml);
}

// The panel an item opens in: from the right on computers, up from the
// bottom on phones, with the shop still there behind it. Drawn closed and
// empty with the shop, or open with an item in it. shop.js moves it to the
// end of the page and fills it as items are clicked.
function shopRenderPanel($itemHtml = '')
{
    $open = $itemHtml !== '';
    return '<div class="shop-panel-layer' . ($open ? ' is-open' : '') . '" data-shop-panel' . ($open ? '' : ' inert') . '>'
        . '<div class="shop-panel-backdrop" data-shop-panel-close></div>'
        . '<aside class="shop-panel" role="dialog" aria-modal="true" aria-labelledby="shopItemTitle" tabindex="-1">'
        . '<div class="shop-panel-bar"><span class="shop-panel-handle" aria-hidden="true"></span>'
        . '<a class="shop-panel-basket" href="/shop/basket" data-shop-nav hidden>Basket <b>0</b></a>'
        . '<button type="button" class="shop-panel-close" data-shop-panel-close aria-label="Close">'
        . '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
        . '</button></div>'
        . '<div class="shop-panel-body">' . $itemHtml . '</div></aside></div>';
}

// "Sold" (an original), "Sold out" (the rest), or "Reserved" while the last
// of it is set aside for someone paying right now
function shopSoldWord($product)
{
    if (!empty($product['reserved'])) {
        return 'Reserved';
    }
    return $product['isUnique'] ? 'Sold' : 'Sold out';
}

function shopRenderCard($product, $index)
{
    $picture = $product['images']
        ? ambWorkImage($product['images'][0], $index > 3, SHOP_GRID_SIZES, null, $index === 0)
        : '<div class="shop-no-picture" aria-hidden="true"></div>';

    if ($product['soldOut']) {
        $price = '<span class="shop-sold' . (!empty($product['reserved']) ? ' is-reserved' : '') . '">' . shopSoldWord($product) . '</span>';
    } else {
        $price = '<span class="shop-card-price">' . ambHtml($product['priceText']) . '</span>';
    }

    return '<a class="shop-card' . ($product['soldOut'] ? ' is-sold' : '') . '" href="' . ambHtml($product['path']) . '" data-shop-nav data-shop-item>'
        . '<div class="shop-card-picture"><div class="img-container">' . $picture . '</div></div>'
        . '<div class="shop-card-text"><h3 class="shop-card-name">' . ambHtml($product['name']) . '</h3>'
        . '<p class="shop-card-meta">'
        . ($product['typeLabel'] !== '' ? '<span class="shop-card-type">' . ambHtml($product['typeLabel']) . '</span>' : '')
        . $price . '</p></div></a>';
}

// ---------------------------------------------------------------------------
// /shop/<id>/<name>: one item, as it shows in the side panel
// ---------------------------------------------------------------------------

// The picture's proportions, so CSS can keep a tall painting short enough
// that the price and button are in sight beneath it
function shopPictureShape($image)
{
    return $image['width'] && $image['height']
        ? ' style="--w: ' . (int) $image['width'] . '; --h: ' . (int) $image['height'] . ';"' : '';
}

function shopRenderProduct($product, $settings, $zones)
{
    $name = $product['name'];
    $images = $product['images'];

    // What the viewer needs to show each picture (shop.js hands these to the
    // same viewer the works use, so zoom and "See to scale" work here too)
    $forViewer = array();
    foreach ($images as $image) {
        $forViewer[] = array(
            'location' => $image['location'], 'width' => $image['width'], 'height' => $image['height'],
            'name' => $name, 'path' => $product['path'], 'firstDescription' => $product['details'],
        );
    }

    $html = '<article class="shop shop-item" data-product="' . $product['id'] . '" data-name="' . ambHtml($name) . '"'
        . ' data-images="' . ambHtml(json_encode($forViewer, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) . '">';

    // --- pictures ---
    $html .= '<div class="shop-item-pictures">';
    if ($images) {
        $html .= '<a class="shop-item-picture" href="' . ambHtml(ambWebImageUrl($images[0]['location'])) . '" data-index="0"'
            . shopPictureShape($images[0]) . ' aria-label="Look closer at ' . ambHtml($name) . '">'
            . '<div class="img-container">' . ambWorkImage($images[0], false, SHOP_ITEM_SIZES, null, true) . '</div></a>';
        if (count($images) > 1) {
            $html .= '<div class="shop-thumbs">';
            foreach ($images as $index => $image) {
                $html .= '<button type="button" class="shop-thumb' . ($index === 0 ? ' is-current' : '') . '" data-index="' . $index . '"'
                    . ' aria-label="Picture ' . ($index + 1) . ' of ' . count($images) . '">'
                    . '<img src="/thumbnails/' . ambHtml(rawurlencode($image['location'])) . '" alt="" loading="lazy" decoding="sync"'
                    . ($image['width'] && $image['height'] ? ' width="' . (int) $image['width'] . '" height="' . (int) $image['height'] . '"' : '')
                    . '></button>';
            }
            $html .= '</div>';
        }
    } else {
        $html .= '<div class="shop-no-picture" aria-hidden="true"></div>';
    }
    $html .= '</div>';

    // --- words ---
    $html .= '<div class="shop-item-info">'
        . ($product['typeLabel'] !== '' ? '<p class="shop-kicker">' . ambHtml($product['typeLabel']) . '</p>' : '')
        . '<h2 class="shop-item-title" id="shopItemTitle">' . ambHtml($name) . '</h2>'
        . ($product['details'] !== '' ? '<p class="shop-item-details">' . shopText($product['details']) . '</p>' : '');

    $html .= shopRenderBuying($product, $settings);

    if (trim($product['description']) !== '') {
        $html .= '<div class="shop-item-description"><p>' . shopText($product['description']) . '</p></div>';
    }

    $notes = array();
    if ($product['isUnique']) {
        $notes[] = 'Original, one of a kind';
    }
    if (trim($settings['deliveryNote']) !== '') {
        $notes[] = shopText($settings['deliveryNote']);
    }
    if ($zones) {
        $key = $product['shippingClass'] === 'large' ? 'priceLargeCents' : 'priceStandardCents';
        $cheapest = min(array_map(function ($zone) use ($key) { return $zone[$key]; }, $zones));
        $notes[] = ($cheapest > 0 ? 'Delivery from ' . ambHtml(shopMoney($cheapest, $settings['currency'])) : 'Delivery')
            . ', calculated at checkout';
        $notes[] = 'Secure payment by Stripe';
    }
    if ($notes) {
        $html .= '<ul class="shop-item-notes"><li>' . implode('</li><li>', $notes) . '</li></ul>';
    }

    return $html . '</div></article>';
}

// The price and the way to buy: sizes to choose from, how many, the button
function shopRenderBuying($product, $settings)
{
    $variants = $product['variants'];

    if (!$variants) {
        return '';
    }

    // The first size that can still be bought is the one chosen to begin with
    $chosen = $variants[0];
    foreach ($variants as $variant) {
        if ($variant['available'] > 0) {
            $chosen = $variant;
            break;
        }
    }

    $html = '<p class="shop-item-price" data-shop-price>' . ambHtml(count($variants) > 1 && $product['soldOut'] ? $product['priceText'] : $chosen['price']) . '</p>';

    if ($product['soldOut']) {
        if (!empty($product['reserved'])) {
            return $html . '<p class="shop-sold shop-sold-large is-reserved">Reserved</p>'
                . '<p class="shop-reserved-note">Someone is buying this right now. If they don&rsquo;t finish, it will be back within half an hour.</p>';
        }
        return $html . '<p class="shop-sold shop-sold-large">' . shopSoldWord($product) . '</p>';
    }
    if ($settings['paused'] === '1') {
        return $html . '<p class="shop-status">The shop is temporarily closed.</p>';
    }

    $html .= '<form class="shop-buy" data-shop-buy>';
    // data-left: how few are left, when that's worth saying ("Only 2 left")
    $variantData = function ($variant) use ($product) {
        $few = !$product['isUnique'] && $variant['stock'] !== null && $variant['stock'] > 0 && $variant['stock'] <= 3;
        return ' value="' . $variant['id'] . '" data-price="' . ambHtml($variant['price']) . '" data-max="' . $variant['available'] . '"'
            . ' data-left="' . ($few ? $variant['stock'] : '') . '"';
    };
    if (count($variants) > 1) {
        $html .= '<fieldset class="shop-options"><legend>Choose one</legend>';
        foreach ($variants as $variant) {
            $out = $variant['available'] < 1;
            $html .= '<label class="shop-option' . ($out ? ' is-out' : '') . ($variant['id'] === $chosen['id'] ? ' is-chosen' : '') . '">'
                . '<input type="radio" name="variant"' . $variantData($variant)
                . ($variant['id'] === $chosen['id'] ? ' checked' : '') . ($out ? ' disabled' : '') . '>'
                . '<span class="shop-option-name">' . ambHtml($variant['label'] !== '' ? $variant['label'] : $product['name']) . '</span>'
                . '<span class="shop-option-price">' . ($out ? 'Sold out' : ambHtml($variant['price'])) . '</span></label>';
        }
        $html .= '</fieldset>';
    } else {
        $html .= '<input type="hidden" name="variant"' . $variantData($chosen) . '>';
        if ($chosen['label'] !== '') {
            $html .= '<p class="shop-one-option">' . ambHtml($chosen['label']) . '</p>';
        }
    }

    $most = max(array_map(function ($variant) { return $variant['available']; }, $variants));
    if ($most > 1) {
        $html .= '<div class="shop-quantity"' . ($chosen['available'] > 1 ? '' : ' hidden') . '><span class="shop-quantity-label">Quantity</span>'
            . '<span class="shop-stepper"><button type="button" class="shop-step" data-step="-1" aria-label="One fewer">&minus;</button>'
            . '<output class="shop-quantity-value" aria-live="polite">1</output>'
            . '<button type="button" class="shop-step" data-step="1" aria-label="One more">+</button></span></div>';
    }

    $left = !$product['isUnique'] && $chosen['stock'] !== null && $chosen['stock'] <= 3 ? $chosen['stock'] : null;
    $html .= '<p class="shop-left" data-shop-left' . ($left === null ? ' hidden' : '') . '>' . ($left === null ? '' : 'Only ' . $left . ' left') . '</p>'
        . '<button type="submit" class="shop-button">Add to basket</button>'
        . shopRenderTestNote()
        . '<div class="shop-added" role="status" hidden><p>Added to your basket.</p>'
        . '<a href="/shop/basket" class="shop-button shop-button-quiet" data-shop-nav>View basket</a>'
        . '<button type="button" class="shop-keep-browsing" data-shop-panel-close>Keep browsing</button></div>'
        . '</form>';
    return $html;
}
