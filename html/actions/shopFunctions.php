<?php
// The shop's catalogue: what is for sale, what it costs, where it can be
// sent. Shared by the public shop pages, the checkout and the shop admin.
// (Orders and payments are in shopOrderFunctions.php.)
//
// How it fits together:
//   shopProducts       something for sale (a painting, a print, a zine...)
//   shopVariants       what can be put in the basket: each product has at
//                      least one (a print's sizes; an original has just one)
//   shopProductImages  its pictures: file names in baseImages/, exactly like
//                      the works', so thumbnails, web copies and zoom all work
//   shopShippingZones  delivery prices by destination
//   shopPromoCodes     codes for money off (the sums are in shopOrderFunctions.php)
//   shopSettings       currency, the shop's intro text, "shop paused"...
// The tables are created by database/shop.sql. Until that has been run,
// shopReady() is false and every page says so gently instead of failing.

include_once __DIR__ . '/publicWorksFunctions.php';
include_once __DIR__ . '/shopEmailFunctions.php'; // the emails' wording lives in shopSettings too
include_once __DIR__ . '/stripeFunctions.php';    // stripeIsLive(), for shopTestMode()

define('SHOP_MAX_QUANTITY', 10);   // the most of one thing in a basket
define('SHOP_MAX_LINES', 30);      // the most different things in a basket

function shopNow()
{
    return gmdate('Y-m-d H:i:s');
}

// True once the shop's tables exist. Also makes database errors throw, so a
// failed query can never be mistaken for an empty answer (older PHP stays
// silent by default).
function shopReady($conn)
{
    static $ready = null;
    if ($ready !== null) {
        return $ready;
    }
    if (!$conn) {
        return false;
    }
    try {
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $conn->query('SELECT 1 FROM shopProducts LIMIT 1');
        $conn->query('SELECT 1 FROM shopOrders LIMIT 1');
        $conn->query('SELECT 1 FROM shopPromoCodes LIMIT 1');
        $ready = true;
    } catch (Throwable $e) {
        $ready = false;
    }
    return $ready;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function shopSettingDefaults()
{
    return array_merge(array(
        'currency' => 'eur',
        'intro' => '',          // a line or two under the shop's title
        'deliveryNote' => '',   // shown on every item ("Sent rolled in a tube...")
        'paused' => '0',        // '1': everything stays on show, nothing can be bought
        'inMenu' => '1',        // '1': "Shop" is in the site's menu (ambGetNavLinks)
    ), shopEmailDefaults());    // the emails' wording (shopEmailFunctions.php)
}

// True until the shop has real-money Stripe keys. While it is, every shop page
// says plainly that it's a test (shopRenderTestBanner) and search engines are
// asked to leave it alone, so made-up prices never turn up in search results.
// Putting sk_live_ keys in the server's .env is all it takes to end it.
function shopTestMode()
{
    return !stripeIsLive();
}

function shopSettings($conn, $refresh = false)
{
    static $settings = null;
    if ($settings === null || $refresh) {
        $settings = shopSettingDefaults();
        foreach ($conn->query('SELECT name, value FROM shopSettings')->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if (array_key_exists($row['name'], $settings)) {
                $settings[$row['name']] = (string) $row['value'];
            }
        }
        if (!isset(shopCurrencies()[$settings['currency']])) {
            $settings['currency'] = 'eur';
        }
    }
    return $settings;
}

function shopSaveSetting($conn, $name, $value)
{
    $conn->prepare('INSERT INTO shopSettings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)')
         ->execute(array($name, $value));
}

// ---------------------------------------------------------------------------
// Money. Prices are whole numbers of cents everywhere; these turn them into
// text. Same as formatMoney() in js/shop.js and js/shopAdminFunctions.js.
// ---------------------------------------------------------------------------

function shopCurrencies()
{
    return array(
        'eur' => array('symbol' => '€', 'name' => 'Euro (€)'),
        'usd' => array('symbol' => '$', 'name' => 'US dollar ($)'),
        'gbp' => array('symbol' => '£', 'name' => 'British pound (£)'),
        'cad' => array('symbol' => 'CA$', 'name' => 'Canadian dollar (CA$)'),
        'aud' => array('symbol' => 'A$', 'name' => 'Australian dollar (A$)'),
        'chf' => array('symbol' => 'CHF ', 'name' => 'Swiss franc (CHF)'),
        'mxn' => array('symbol' => 'MX$', 'name' => 'Mexican peso (MX$)'),
    );
}

// 45000 -> "€450", 3550 -> "€35.50"
function shopMoney($cents, $currency)
{
    $currencies = shopCurrencies();
    $symbol = isset($currencies[$currency]) ? $currencies[$currency]['symbol'] : strtoupper($currency) . ' ';
    $cents = (int) $cents;
    return $symbol . number_format($cents / 100, $cents % 100 === 0 ? 0 : 2, '.', ',');
}

// ---------------------------------------------------------------------------
// Countries the shop can send to. Stripe collects the address and only takes
// the countries on its own list, so this is that list (the usual two-letter
// codes), minus the handful Stripe doesn't accept.
// ---------------------------------------------------------------------------

function shopCountries()
{
    static $countries = null;
    if ($countries === null) {
        $countries = array(
            'AF' => 'Afghanistan', 'AX' => 'Åland Islands', 'AL' => 'Albania', 'DZ' => 'Algeria', 'AD' => 'Andorra',
            'AO' => 'Angola', 'AI' => 'Anguilla', 'AG' => 'Antigua and Barbuda', 'AR' => 'Argentina', 'AM' => 'Armenia',
            'AW' => 'Aruba', 'AU' => 'Australia', 'AT' => 'Austria', 'AZ' => 'Azerbaijan', 'BS' => 'Bahamas',
            'BH' => 'Bahrain', 'BD' => 'Bangladesh', 'BB' => 'Barbados', 'BY' => 'Belarus', 'BE' => 'Belgium',
            'BZ' => 'Belize', 'BJ' => 'Benin', 'BM' => 'Bermuda', 'BT' => 'Bhutan', 'BO' => 'Bolivia',
            'BA' => 'Bosnia and Herzegovina', 'BW' => 'Botswana', 'BR' => 'Brazil', 'VG' => 'British Virgin Islands',
            'BN' => 'Brunei', 'BG' => 'Bulgaria', 'BF' => 'Burkina Faso', 'BI' => 'Burundi', 'KH' => 'Cambodia',
            'CM' => 'Cameroon', 'CA' => 'Canada', 'CV' => 'Cape Verde', 'BQ' => 'Caribbean Netherlands',
            'KY' => 'Cayman Islands', 'CF' => 'Central African Republic', 'TD' => 'Chad', 'CL' => 'Chile', 'CN' => 'China',
            'CO' => 'Colombia', 'KM' => 'Comoros', 'CG' => 'Congo (Brazzaville)', 'CD' => 'Congo (Kinshasa)',
            'CK' => 'Cook Islands', 'CR' => 'Costa Rica', 'CI' => 'Côte d’Ivoire', 'HR' => 'Croatia', 'CW' => 'Curaçao',
            'CY' => 'Cyprus', 'CZ' => 'Czechia', 'DK' => 'Denmark', 'DJ' => 'Djibouti', 'DM' => 'Dominica',
            'DO' => 'Dominican Republic', 'EC' => 'Ecuador', 'EG' => 'Egypt', 'SV' => 'El Salvador',
            'GQ' => 'Equatorial Guinea', 'ER' => 'Eritrea', 'EE' => 'Estonia', 'SZ' => 'Eswatini', 'ET' => 'Ethiopia',
            'FK' => 'Falkland Islands', 'FO' => 'Faroe Islands', 'FJ' => 'Fiji', 'FI' => 'Finland', 'FR' => 'France',
            'GF' => 'French Guiana', 'PF' => 'French Polynesia', 'GA' => 'Gabon', 'GM' => 'Gambia', 'GE' => 'Georgia',
            'DE' => 'Germany', 'GH' => 'Ghana', 'GI' => 'Gibraltar', 'GR' => 'Greece', 'GL' => 'Greenland',
            'GD' => 'Grenada', 'GP' => 'Guadeloupe', 'GU' => 'Guam', 'GT' => 'Guatemala', 'GG' => 'Guernsey',
            'GN' => 'Guinea', 'GW' => 'Guinea-Bissau', 'GY' => 'Guyana', 'HT' => 'Haiti', 'HN' => 'Honduras',
            'HK' => 'Hong Kong', 'HU' => 'Hungary', 'IS' => 'Iceland', 'IN' => 'India', 'ID' => 'Indonesia',
            'IQ' => 'Iraq', 'IE' => 'Ireland', 'IM' => 'Isle of Man', 'IL' => 'Israel', 'IT' => 'Italy',
            'JM' => 'Jamaica', 'JP' => 'Japan', 'JE' => 'Jersey', 'JO' => 'Jordan', 'KZ' => 'Kazakhstan',
            'KE' => 'Kenya', 'KI' => 'Kiribati', 'XK' => 'Kosovo', 'KW' => 'Kuwait', 'KG' => 'Kyrgyzstan',
            'LA' => 'Laos', 'LV' => 'Latvia', 'LB' => 'Lebanon', 'LS' => 'Lesotho', 'LR' => 'Liberia',
            'LY' => 'Libya', 'LI' => 'Liechtenstein', 'LT' => 'Lithuania', 'LU' => 'Luxembourg', 'MO' => 'Macao',
            'MG' => 'Madagascar', 'MW' => 'Malawi', 'MY' => 'Malaysia', 'MV' => 'Maldives', 'ML' => 'Mali',
            'MT' => 'Malta', 'MQ' => 'Martinique', 'MR' => 'Mauritania', 'MU' => 'Mauritius', 'YT' => 'Mayotte',
            'MX' => 'Mexico', 'MD' => 'Moldova', 'MC' => 'Monaco', 'MN' => 'Mongolia', 'ME' => 'Montenegro',
            'MS' => 'Montserrat', 'MA' => 'Morocco', 'MZ' => 'Mozambique', 'MM' => 'Myanmar', 'NA' => 'Namibia',
            'NR' => 'Nauru', 'NP' => 'Nepal', 'NL' => 'Netherlands', 'NC' => 'New Caledonia', 'NZ' => 'New Zealand',
            'NI' => 'Nicaragua', 'NE' => 'Niger', 'NG' => 'Nigeria', 'NU' => 'Niue', 'MK' => 'North Macedonia',
            'NO' => 'Norway', 'OM' => 'Oman', 'PK' => 'Pakistan', 'PS' => 'Palestine', 'PA' => 'Panama',
            'PG' => 'Papua New Guinea', 'PY' => 'Paraguay', 'PE' => 'Peru', 'PH' => 'Philippines', 'PL' => 'Poland',
            'PT' => 'Portugal', 'PR' => 'Puerto Rico', 'QA' => 'Qatar', 'RE' => 'Réunion', 'RO' => 'Romania',
            'RU' => 'Russia', 'RW' => 'Rwanda', 'BL' => 'Saint Barthélemy', 'SH' => 'Saint Helena',
            'KN' => 'Saint Kitts and Nevis', 'LC' => 'Saint Lucia', 'MF' => 'Saint Martin',
            'PM' => 'Saint Pierre and Miquelon', 'VC' => 'Saint Vincent and the Grenadines', 'WS' => 'Samoa',
            'SM' => 'San Marino', 'ST' => 'São Tomé and Príncipe', 'SA' => 'Saudi Arabia', 'SN' => 'Senegal',
            'RS' => 'Serbia', 'SC' => 'Seychelles', 'SL' => 'Sierra Leone', 'SG' => 'Singapore', 'SX' => 'Sint Maarten',
            'SK' => 'Slovakia', 'SI' => 'Slovenia', 'SB' => 'Solomon Islands', 'SO' => 'Somalia', 'ZA' => 'South Africa',
            'KR' => 'South Korea', 'SS' => 'South Sudan', 'ES' => 'Spain', 'LK' => 'Sri Lanka', 'SR' => 'Suriname',
            'SE' => 'Sweden', 'CH' => 'Switzerland', 'TW' => 'Taiwan', 'TJ' => 'Tajikistan', 'TZ' => 'Tanzania',
            'TH' => 'Thailand', 'TL' => 'Timor-Leste', 'TG' => 'Togo', 'TO' => 'Tonga', 'TT' => 'Trinidad and Tobago',
            'TN' => 'Tunisia', 'TR' => 'Türkiye', 'TM' => 'Turkmenistan', 'TC' => 'Turks and Caicos Islands',
            'TV' => 'Tuvalu', 'UG' => 'Uganda', 'UA' => 'Ukraine', 'AE' => 'United Arab Emirates',
            'GB' => 'United Kingdom', 'US' => 'United States', 'UY' => 'Uruguay', 'UZ' => 'Uzbekistan',
            'VU' => 'Vanuatu', 'VA' => 'Vatican City', 'VE' => 'Venezuela', 'VN' => 'Vietnam',
            'WF' => 'Wallis and Futuna', 'YE' => 'Yemen', 'ZM' => 'Zambia', 'ZW' => 'Zimbabwe',
        );
    }
    return $countries;
}

// "be, NL ,xx" -> array('BE', 'NL'); "*" stays "*"
function shopParseCountries($text)
{
    $text = trim((string) $text);
    if ($text === '*') {
        return '*';
    }
    $known = shopCountries();
    $codes = array();
    foreach (explode(',', strtoupper($text)) as $code) {
        $code = trim($code);
        if (isset($known[$code])) {
            $codes[$code] = true;
        }
    }
    return array_keys($codes);
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

function shopGetZones($conn)
{
    $zones = array();
    foreach ($conn->query('SELECT * FROM shopShippingZones ORDER BY sortOrder ASC, id ASC')->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $zones[] = array(
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'countries' => shopParseCountries($row['countries']), // a list of codes, or '*'
            'priceStandardCents' => (int) $row['priceStandardCents'],
            'priceLargeCents' => (int) $row['priceLargeCents'],
        );
    }
    return $zones;
}

// The zone a country is in: the one that names it, else "everywhere else"
function shopZoneForCountry($zones, $code)
{
    $elsewhere = null;
    foreach ($zones as $zone) {
        if ($zone['countries'] === '*') {
            $elsewhere = $elsewhere ?: $zone;
        } elseif (in_array($code, $zone['countries'], true)) {
            return $zone;
        }
    }
    return isset(shopCountries()[$code]) ? $elsewhere : null;
}

// Every country something can be sent to, with what delivery costs there:
// array('BE' => array('name' => 'Belgium', 'standard' => 800, 'large' => 2500), ...)
function shopDeliveryCountries($zones)
{
    $list = array();
    foreach (shopCountries() as $code => $name) {
        $zone = shopZoneForCountry($zones, $code);
        if ($zone) {
            $list[$code] = array('name' => $name, 'standard' => $zone['priceStandardCents'], 'large' => $zone['priceLargeCents']);
        }
    }
    return $list;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function shopProductPath($id, $name)
{
    return '/shop/' . (int) $id . '/' . ambSlug($name);
}

// A picture, described the way the works are (publicWorksFunctions.php), so
// the same <img> builder and the same viewer can show it
function shopImage($location, $name)
{
    $location = (string) $location;
    $htmlDir = dirname(__DIR__);
    $width = null;
    $height = null;
    $size = @getimagesize($htmlDir . '/baseImages/' . $location);
    if (!$size) {
        $size = @getimagesize($htmlDir . '/thumbnails/' . $location);
    }
    if ($size) {
        list($width, $height) = webImageSize($size[0], $size[1]);
    }
    return array('location' => $location, 'name' => $name, 'width' => $width, 'height' => $height);
}

// Products with their pictures and variants.
// $options: 'status' => 'live' (the public shop; the default) or 'all' (the
// admin: drafts too, archived ones only with 'archived' => true);
// 'id' => just that one.
function shopGetProducts($conn, $options = array())
{
    $where = array();
    $params = array();
    if (!isset($options['status']) || $options['status'] === 'live') {
        $where[] = "p.status = 'live'";
    } elseif (empty($options['archived'])) {
        $where[] = "p.status <> 'archived'";
    } else {
        $where[] = "p.status = 'archived'";
    }
    if (isset($options['id'])) {
        $where[] = 'p.id = ?';
        $params[] = (int) $options['id'];
    }

    $stmt = $conn->prepare('SELECT p.* FROM shopProducts p WHERE ' . implode(' AND ', $where) . ' ORDER BY p.sortOrder ASC, p.id DESC');
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) {
        return array();
    }

    $settings = shopSettings($conn);
    $products = array();
    foreach ($rows as $row) {
        $id = (int) $row['id'];
        $name = trim((string) $row['name']);
        $products[$id] = array(
            'id' => $id,
            'name' => $name,
            'path' => shopProductPath($id, $name),
            'typeLabel' => trim((string) $row['typeLabel']),
            'isUnique' => (int) $row['isUnique'] === 1,
            'details' => trim((string) $row['details']),
            'description' => (string) $row['description'],
            'workId' => $row['workId'] === null ? null : (int) $row['workId'],
            'shippingClass' => $row['shippingClass'] === 'large' ? 'large' : 'standard',
            'status' => (string) $row['status'],
            'sortOrder' => (int) $row['sortOrder'],
            'images' => array(),
            'variants' => array(),
        );
    }

    $in = implode(',', array_fill(0, count($products), '?'));
    $ids = array_keys($products);

    $stmt = $conn->prepare("SELECT productId, fileLocation FROM shopProductImages WHERE productId IN ($in) ORDER BY sortOrder ASC, id ASC");
    $stmt->execute($ids);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $product = &$products[(int) $row['productId']];
        $product['images'][] = shopImage($row['fileLocation'], $product['name']);
        unset($product);
    }

    $stmt = $conn->prepare("SELECT * FROM shopVariants WHERE productId IN ($in) AND active = 1 ORDER BY sortOrder ASC, id ASC");
    $stmt->execute($ids);
    $variantRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $held = shopHeldStock($conn, array_map(function ($row) { return (int) $row['id']; }, $variantRows));
    foreach ($variantRows as $row) {
        $stock = $row['stock'] === null ? null : max(0, (int) $row['stock']);
        $products[(int) $row['productId']]['variants'][] = array(
            'id' => (int) $row['id'],
            'label' => trim((string) $row['label']),
            'priceCents' => (int) $row['priceCents'],
            'price' => shopMoney($row['priceCents'], $settings['currency']),
            'stock' => $stock,
            // how many one customer can put in their basket right now
            'available' => $stock === null ? SHOP_MAX_QUANTITY : min($stock, SHOP_MAX_QUANTITY),
            // how many are set aside for someone paying right now
            'held' => isset($held[(int) $row['id']]) ? $held[(int) $row['id']] : 0,
        );
    }

    foreach ($products as &$product) {
        $prices = array();
        $anyLeft = false;
        $anyHeld = false;
        foreach ($product['variants'] as $variant) {
            $prices[] = $variant['priceCents'];
            $anyLeft = $anyLeft || $variant['available'] > 0;
            $anyHeld = $anyHeld || $variant['held'] > 0;
        }
        $product['soldOut'] = !$anyLeft;
        // Nothing left to buy, but only because someone is paying for it
        // right now: shown as "Reserved", not "Sold", since it comes back on
        // sale by itself if they don't finish
        $product['reserved'] = !$anyLeft && $anyHeld;
        $product['fromCents'] = $prices ? min($prices) : null;
        // "€35", or "from €35" when the sizes cost different amounts
        $product['priceText'] = !$prices ? ''
            : ((min($prices) !== max($prices) ? 'from ' : '') . shopMoney(min($prices), $settings['currency']));
    }
    unset($product);

    return array_values($products);
}

// How many of each variant are set aside for checkouts still under way
// (an order whose stock is held: being paid for, or a bank payment on its
// way): array(variantId => quantity)
function shopHeldStock($conn, $variantIds)
{
    $held = array();
    if (!$variantIds) {
        return $held;
    }
    $in = implode(',', array_fill(0, count($variantIds), '?'));
    $stmt = $conn->prepare("SELECT i.variantId, SUM(i.quantity) AS quantity
                            FROM shopOrderItems i JOIN shopOrders o ON o.id = i.orderId
                            WHERE o.stockHeld = 1 AND i.variantId IN ($in)
                            GROUP BY i.variantId");
    $stmt->execute(array_values($variantIds));
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $held[(int) $row['variantId']] = (int) $row['quantity'];
    }
    return $held;
}

// One product on sale, or null
function shopGetLiveProduct($conn, $id)
{
    $found = shopGetProducts($conn, array('id' => $id));
    return $found ? $found[0] : null;
}

// Which works can be bought, for the "available in the shop" link in the
// artwork viewer: array(workId => '/shop/<id>/<name>')
function shopLinksForWorks($conn)
{
    $links = array();
    $rows = $conn->query("SELECT p.id, p.name, p.workId FROM shopProducts p
                          WHERE p.status = 'live' AND p.workId IS NOT NULL
                            AND EXISTS (SELECT 1 FROM shopVariants v WHERE v.productId = p.id AND v.active = 1 AND (v.stock IS NULL OR v.stock > 0))
                          ORDER BY p.sortOrder DESC, p.id ASC")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        $links[(int) $row['workId']] = shopProductPath($row['id'], trim((string) $row['name']));
    }
    return $links;
}
