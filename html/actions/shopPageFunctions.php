<?php
// Draws the shop's pages. Unlike the rest of the public site, the shop's
// markup exists only here: index.php writes it into the page for a first
// visit, and js/shop.js asks actions/shopAPI.php for the same HTML when a
// visitor moves between shop pages. So there is one place to change it, and
// the script only adds behaviour (the basket, choosing a size, the viewer).
//
//   /shop                 everything for sale            view 'shop'
//   /shop/<id>/<name>     one item                       view 'shop-item'
//   /shop/basket          the basket (drawn by shop.js)  view 'shop-basket'
//   /shop/thank-you       after paying (drawn by shop.js) view 'shop-thanks'

include_once __DIR__ . '/publicPageFunctions.php';
include_once __DIR__ . '/shopFunctions.php';

define('SHOP_GRID_SIZES', '(max-width: 992px) 45vw, 30vw');
define('SHOP_ITEM_SIZES', '(max-width: 992px) 92vw, 36vw');

// Everything about the shop page at $path: which view it is, its title and
// description, its HTML (null when the script draws it), and for an item the
// product itself. 'status' is 404 for an address with nothing behind it.
function shopPage($conn, $path)
{
    $page = array(
        'view' => 'shop', 'status' => 200, 'title' => 'Shop - Ambar Velasco', 'description' => null,
        'html' => null, 'product' => null, 'noindex' => false, 'path' => $path,
    );
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
        $page['view'] = 'shop-item';
        $page['product'] = $product;
        $page['path'] = $product['path']; // its proper address (the name part may be old)
        $page['title'] = $product['name'] . ' - Shop - Ambar Velasco';
        $about = trim($product['description']) !== '' ? $product['description'] : $product['details'];
        $page['description'] = trim(($product['typeLabel'] !== '' ? $product['typeLabel'] . ' by Ambar Velasco. ' : '') . ambExcerpt($about, 130));
        $page['html'] = shopRenderProduct($product, $settings, shopGetZones($conn));
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

// ---------------------------------------------------------------------------
// /shop
// ---------------------------------------------------------------------------

function shopRenderIndex($products, $settings, $zones)
{
    $html = '<div class="shop">' . shopRenderHeader('Shop', $settings['intro']);

    if ($settings['paused'] === '1' && $products) {
        $html .= '<p class="shop-status">The shop is taking a short break. Everything is still here to look at, and will be back on sale soon.</p>';
    }
    if (!$products) {
        return $html . '<div class="shop-empty"><p>Nothing is for sale just now.</p>'
            . '<p>New pieces are on their way. In the meantime, <a href="/select-works" class="shop-text-link">have a look at the works</a>.</p></div></div>';
    }

    $html .= '<div class="shop-grid">';
    foreach ($products as $index => $product) {
        $html .= shopRenderCard($product, $index);
    }
    return $html . '</div></div>';
}

function shopRenderCard($product, $index)
{
    $picture = $product['images']
        ? ambWorkImage($product['images'][0], $index > 3, SHOP_GRID_SIZES, null, $index === 0)
        : '<div class="shop-no-picture" aria-hidden="true"></div>';

    if ($product['soldOut']) {
        $price = '<span class="shop-sold">' . ($product['isUnique'] ? 'Sold' : 'Sold out') . '</span>';
    } else {
        $price = '<span class="shop-card-price">' . ambHtml($product['priceText']) . '</span>';
    }

    return '<a class="shop-card' . ($product['soldOut'] ? ' is-sold' : '') . '" href="' . ambHtml($product['path']) . '" data-shop-nav>'
        . '<div class="shop-card-picture"><div class="img-container">' . $picture . '</div></div>'
        . '<div class="shop-card-text"><h3 class="shop-card-name">' . ambHtml($product['name']) . '</h3>'
        . '<p class="shop-card-meta">'
        . ($product['typeLabel'] !== '' ? '<span class="shop-card-type">' . ambHtml($product['typeLabel']) . '</span>' : '')
        . $price . '</p></div></a>';
}

// ---------------------------------------------------------------------------
// /shop/<id>/<name>
// ---------------------------------------------------------------------------

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
        . ' data-images="' . ambHtml(json_encode($forViewer, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) . '">'
        . '<p class="shop-crumb"><a href="/shop" data-shop-nav><span aria-hidden="true">&larr;</span> Shop</a></p>'
        . '<div class="shop-item-layout">';

    // --- pictures ---
    $html .= '<div class="shop-item-pictures">';
    if ($images) {
        $html .= '<a class="shop-item-picture" href="' . ambHtml(ambWebImageUrl($images[0]['location'])) . '" data-index="0"'
            . ' aria-label="Look closer at ' . ambHtml($name) . '">'
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
        $html .= '<p class="shop-zoom-hint">Open the picture to look closer and zoom in.</p>';
    } else {
        $html .= '<div class="shop-no-picture" aria-hidden="true"></div>';
    }
    $html .= '</div>';

    // --- words ---
    $html .= '<div class="shop-item-info">'
        . ($product['typeLabel'] !== '' ? '<p class="shop-kicker">' . ambHtml($product['typeLabel']) . '</p>' : '')
        . '<h2 class="shop-item-title">' . ambHtml($name) . '</h2>'
        . ($product['details'] !== '' ? '<p class="shop-item-details">' . shopText($product['details']) . '</p>' : '');

    $html .= shopRenderBuying($product, $settings);

    if (trim($product['description']) !== '') {
        $html .= '<div class="shop-item-description"><p>' . shopText($product['description']) . '</p></div>';
    }

    $notes = array();
    if ($product['isUnique']) {
        $notes[] = 'One of a kind: there is only this one.';
    }
    if (trim($settings['deliveryNote']) !== '') {
        $notes[] = shopText($settings['deliveryNote']);
    }
    if ($zones) {
        $key = $product['shippingClass'] === 'large' ? 'priceLargeCents' : 'priceStandardCents';
        $cheapest = min(array_map(function ($zone) use ($key) { return $zone[$key]; }, $zones));
        $notes[] = ($cheapest > 0 ? 'Delivery from ' . ambHtml(shopMoney($cheapest, $settings['currency'])) : 'Delivery')
            . ', worked out in the basket for where you are.';
        $notes[] = 'Paid securely by card, through Stripe.';
    }
    if ($notes) {
        $html .= '<ul class="shop-item-notes"><li>' . implode('</li><li>', $notes) . '</li></ul>';
    }

    return $html . '</div></div></article>';
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
        return $html . '<p class="shop-sold shop-sold-large">' . ($product['isUnique'] ? 'Sold' : 'Sold out') . '</p>';
    }
    if ($settings['paused'] === '1') {
        return $html . '<p class="shop-status">The shop is taking a short break, so this can\'t be bought just now. Please come back soon.</p>';
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
        $html .= '<div class="shop-quantity"' . ($chosen['available'] > 1 ? '' : ' hidden') . '><span class="shop-quantity-label">How many</span>'
            . '<span class="shop-stepper"><button type="button" class="shop-step" data-step="-1" aria-label="One fewer">&minus;</button>'
            . '<output class="shop-quantity-value" aria-live="polite">1</output>'
            . '<button type="button" class="shop-step" data-step="1" aria-label="One more">+</button></span></div>';
    }

    $left = !$product['isUnique'] && $chosen['stock'] !== null && $chosen['stock'] <= 3 ? $chosen['stock'] : null;
    $html .= '<p class="shop-left" data-shop-left' . ($left === null ? ' hidden' : '') . '>' . ($left === null ? '' : 'Only ' . $left . ' left') . '</p>'
        . '<button type="submit" class="shop-button">Add to basket</button>'
        . '<p class="shop-added" role="status" hidden>It\'s in your basket. <a href="/shop/basket" class="shop-text-link" data-shop-nav>See your basket</a></p>'
        . '</form>';
    return $html;
}
