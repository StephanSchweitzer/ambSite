<?php
// Orders and payments.
//
// What happens when someone buys:
//   1. shopStartCheckout() checks the basket against the database (prices,
//      stock and any promo code come from here, never from the browser),
//      sets the stock aside, records a 'pending' order and asks Stripe to
//      open a payment for it (a Checkout Session).
//   2. The customer pays: on the basket page itself, in Stripe's card box
//      (js/shop.js), or on Stripe's own page when the site has no public
//      key. Stripe then calls actions/stripeWebhook.php, and sends the
//      customer on to /shop/thank-you. Either of those runs shopSyncOrder(),
//      which asks Stripe what happened and marks the order paid.
//   3. If they never pay, Stripe closes the payment after half an hour;
//      the order becomes 'cancelled' and the stock goes back.
//
// Two rules keep this safe:
//   - An order is only ever marked paid because Stripe, asked directly, says
//     so. What a browser or an incoming message claims is never taken on trust.
//   - An order is only ever cancelled once Stripe confirms its payment page
//     is closed, so nobody can pay for something that has gone back on sale.

include_once __DIR__ . '/shopFunctions.php';
include_once __DIR__ . '/stripeFunctions.php';

define('SHOP_HOLD_MINUTES', 31);          // Stripe's shortest is 30
define('SHOP_CHECKOUTS_PER_HOUR', 12);    // per visitor: stops one person tying up the stock

// Something the customer can be told as it is ("Sorry, that print has sold out")
class ShopProblem extends Exception
{
    public $lines = array(); // array(variantId => array('reason' => 'gone'|'stock', 'available' => n))
    public $promo = false;   // true when the trouble is the promo code

    public function __construct($message, $lines = array())
    {
        parent::__construct($message);
        $this->lines = $lines;
    }
}

function shopOrderNumber($id)
{
    return 'AV-' . (1000 + (int) $id);
}

// The address of this site as the visitor sees it (Stripe sends them back to it)
function shopSiteUrl()
{
    if (env('APP_ENV', 'production') === 'production') {
        return AMB_SITE_URL;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $host = preg_replace('/[^A-Za-z0-9.:\-\[\]]/', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    return ($https ? 'https' : 'http') . '://' . $host;
}

// [{variant, quantity}, ...] from the browser -> array(variantId => quantity)
function shopCleanBasket($items)
{
    $basket = array();
    if (!is_array($items)) {
        return $basket;
    }
    foreach ($items as $item) {
        if (!is_array($item) || !isset($item['variant'])) {
            continue;
        }
        $id = (int) $item['variant'];
        $quantity = isset($item['quantity']) ? (int) $item['quantity'] : 1;
        if ($id < 1 || $quantity < 1) {
            continue;
        }
        $basket[$id] = min(SHOP_MAX_QUANTITY, (isset($basket[$id]) ? $basket[$id] : 0) + $quantity);
        if (count($basket) >= SHOP_MAX_LINES) {
            break;
        }
    }
    return $basket;
}

// The basket as it really is right now: each line with today's name, price
// and stock. Lines that can no longer be bought come back flagged, not dropped,
// so the basket page can say what happened to them.
function shopPriceBasket($conn, $basket)
{
    $settings = shopSettings($conn);
    $lines = array();
    if (!$basket) {
        return $lines;
    }
    $in = implode(',', array_fill(0, count($basket), '?'));
    $stmt = $conn->prepare("SELECT v.id AS variantId, v.label, v.priceCents, v.stock, v.active,
                                   p.id AS productId, p.name, p.status, p.shippingClass,
                                   (SELECT i.fileLocation FROM shopProductImages i WHERE i.productId = p.id
                                    ORDER BY i.sortOrder ASC, i.id ASC LIMIT 1) AS image
                            FROM shopVariants v JOIN shopProducts p ON p.id = v.productId
                            WHERE v.id IN ($in)");
    $stmt->execute(array_keys($basket));
    $found = array();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $found[(int) $row['variantId']] = $row;
    }

    foreach ($basket as $variantId => $quantity) {
        $row = isset($found[$variantId]) ? $found[$variantId] : null;
        $buyable = $row && (int) $row['active'] === 1 && $row['status'] === 'live';
        if (!$buyable) {
            $lines[] = array('variant' => $variantId, 'quantity' => $quantity, 'problem' => 'gone',
                'name' => $row ? trim((string) $row['name']) : '', 'label' => $row ? trim((string) $row['label']) : '', 'available' => 0);
            continue;
        }
        $available = $row['stock'] === null ? SHOP_MAX_QUANTITY : min(max(0, (int) $row['stock']), SHOP_MAX_QUANTITY);
        $name = trim((string) $row['name']);
        $lines[] = array(
            'variant' => $variantId,
            'product' => (int) $row['productId'],
            'name' => $name,
            'label' => trim((string) $row['label']),
            'path' => shopProductPath($row['productId'], $name),
            'image' => (string) $row['image'],
            'priceCents' => (int) $row['priceCents'],
            'price' => shopMoney($row['priceCents'], $settings['currency']),
            'quantity' => $quantity,
            'available' => $available,
            'limited' => $row['stock'] !== null,
            'shippingClass' => $row['shippingClass'] === 'large' ? 'large' : 'standard',
            'problem' => $available < 1 ? 'gone' : ($available < $quantity ? 'stock' : null),
        );
    }
    return $lines;
}

// ---------------------------------------------------------------------------
// Promo codes
// ---------------------------------------------------------------------------

// A code as it is stored: capitals, digits, - and _ ("spring 10" -> "SPRING10")
function shopCleanCode($code)
{
    return substr((string) preg_replace('/[^A-Z0-9_-]/', '', strtoupper((string) (is_scalar($code) ? $code : ''))), 0, 40);
}

// What a code takes off items costing $subtotal. Same sum as promoDiscount()
// in js/shop.js. Never more than the items cost; delivery is never discounted.
function shopPromoDiscount($kind, $value, $subtotal)
{
    $off = $kind === 'percent' ? (int) floor($subtotal * min(100, (int) $value) / 100) : (int) $value;
    return max(0, min($off, (int) $subtotal));
}

// Looks a typed code up. Returns null if nothing was typed, otherwise either
//   array('id', 'code', 'kind', 'value', 'label' => "10% off", 'discountCents')
// or array('problem' => a sentence for the buyer).
function shopCheckPromo($conn, $code, $subtotal)
{
    $code = shopCleanCode($code);
    if ($code === '') {
        return null;
    }
    $stmt = $conn->prepare('SELECT * FROM shopPromoCodes WHERE code = ?');
    $stmt->execute(array($code));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || (int) $row['active'] !== 1) {
        return array('problem' => "Sorry, that code isn't one we know.");
    }
    if ($row['endsAt'] !== null && gmdate('Y-m-d') > $row['endsAt']) {
        return array('problem' => 'Sorry, that code has ended.');
    }
    if ($row['maxUses'] !== null && (int) $row['usedCount'] >= (int) $row['maxUses']) {
        return array('problem' => 'Sorry, that code has been used up.');
    }
    $settings = shopSettings($conn);
    return array(
        'id' => (int) $row['id'],
        'code' => $row['code'],
        'kind' => $row['kind'] === 'amount' ? 'amount' : 'percent',
        'value' => (int) $row['value'],
        'label' => $row['kind'] === 'amount' ? shopMoney($row['value'], $settings['currency']) . ' off' : (int) $row['value'] . '% off',
        'discountCents' => shopPromoDiscount($row['kind'], $row['value'], $subtotal),
    );
}

function shopClientIpHash()
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    return substr(hash('sha256', $ip . '|' . env('DB_PASSWORD', '')), 0, 32);
}

// ---------------------------------------------------------------------------
// Starting a payment
// ---------------------------------------------------------------------------

// Returns array('token' => the order's, and either 'clientSecret' (paying
// on the basket page: Stripe.js needs it) or 'url' (Stripe's own page)).
// Throws ShopProblem with a message for the customer if it can't go ahead.
function shopStartCheckout($conn, $items, $countryCode, $promoCode = '')
{
    $settings = shopSettings($conn);
    if ($settings['paused'] === '1') {
        throw new ShopProblem('The shop is taking a short break. Please come back soon.');
    }
    if (!stripeIsConfigured()) {
        throw new ShopProblem("The shop isn't taking payments just yet. Please come back soon.");
    }

    $basket = shopCleanBasket($items);
    if (!$basket) {
        throw new ShopProblem('Your basket is empty.');
    }

    $countryCode = strtoupper(trim((string) $countryCode));
    $zone = shopZoneForCountry(shopGetZones($conn), $countryCode);
    if (!$zone) {
        throw new ShopProblem('Please choose where your order should be sent.');
    }

    $ipHash = shopClientIpHash();
    $recent = $conn->prepare('SELECT COUNT(*) FROM shopOrders WHERE ipHash = ? AND createdAt > ?');
    $recent->execute(array($ipHash, gmdate('Y-m-d H:i:s', time() - 3600)));
    if ((int) $recent->fetchColumn() >= SHOP_CHECKOUTS_PER_HOUR) {
        throw new ShopProblem('Too many tries in a short time. Please wait a little and try again.');
    }

    // Anything left set aside by a payment page that has since closed goes
    // back on sale first
    shopReleaseStaleOrders($conn);

    $lines = shopPriceBasket($conn, $basket);
    $problems = array();
    foreach ($lines as $line) {
        if ($line['problem']) {
            $problems[$line['variant']] = array('reason' => $line['problem'], 'available' => $line['available']);
        }
    }
    if ($problems) {
        throw new ShopProblem('Something in your basket is no longer available. Please check it and try again.', $problems);
    }

    $subtotal = 0;
    $large = false;
    foreach ($lines as $line) {
        $subtotal += $line['priceCents'] * $line['quantity'];
        $large = $large || $line['shippingClass'] === 'large';
    }
    $shipping = $large ? $zone['priceLargeCents'] : $zone['priceStandardCents'];
    $currency = $settings['currency'];
    $token = bin2hex(random_bytes(16));

    $promo = shopCheckPromo($conn, $promoCode, $subtotal);
    if ($promo && isset($promo['problem'])) {
        $problem = new ShopProblem($promo['problem']);
        $problem->promo = true;
        throw $problem;
    }
    $discount = $promo ? $promo['discountCents'] : 0;
    // (Stripe can't charge less than 50 cents; an order that comes to nothing
    // at all is fine)
    $total = $subtotal - $discount + $shipping;
    if ($total > 0 && $total < 50) {
        $discount -= 50 - $total;
        $total = 50;
    }
    $expiresAt = time() + SHOP_HOLD_MINUTES * 60;

    // Set the stock aside and record the order together: either all of it
    // happens or none of it. The stock check is part of the update itself,
    // so two people can't both get the last one.
    $conn->beginTransaction();
    try {
        $hold = $conn->prepare('UPDATE shopVariants SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL AND stock >= ?');
        foreach ($lines as $line) {
            if (!$line['limited']) {
                continue;
            }
            $hold->execute(array($line['quantity'], $line['variant'], $line['quantity']));
            if ($hold->rowCount() !== 1) {
                $problems[$line['variant']] = array('reason' => 'stock', 'available' => 0);
            }
        }
        if ($problems) {
            throw new ShopProblem('Someone else has just bought something in your basket. Please check it and try again.', $problems);
        }

        // One use of the promo code is set aside the same way, so a code
        // with three uses left can't be spent by four people at once
        if ($promo) {
            $use = $conn->prepare('UPDATE shopPromoCodes SET usedCount = usedCount + 1
                                   WHERE id = ? AND active = 1 AND (maxUses IS NULL OR usedCount < maxUses)');
            $use->execute(array($promo['id']));
            if ($use->rowCount() !== 1) {
                $problem = new ShopProblem('Sorry, that code has just been used up.');
                $problem->promo = true;
                throw $problem;
            }
        }

        $conn->prepare('INSERT INTO shopOrders (token, status, stockHeld, currency, subtotalCents, discountCents, shippingCents,
                            totalCents, promoId, promoCode, zoneName, country, liveMode, ipHash, createdAt, expiresAt)
                        VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
             ->execute(array($token, 'pending', $currency, $subtotal, $discount, $shipping, $total,
                 $promo ? $promo['id'] : null, $promo ? $promo['code'] : '',
                 $zone['name'], $countryCode, stripeIsLive() ? 1 : 0, $ipHash, shopNow(), gmdate('Y-m-d H:i:s', $expiresAt)));
        $orderId = (int) $conn->lastInsertId();

        $add = $conn->prepare('INSERT INTO shopOrderItems (orderId, productId, variantId, productName, variantLabel,
                                   imageLocation, unitPriceCents, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($lines as $line) {
            $add->execute(array($orderId, $line['product'], $line['variant'], $line['name'], $line['label'],
                $line['image'], $line['priceCents'], $line['quantity']));
        }
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollBack();
        throw $e;
    }

    $site = shopSiteUrl();
    $onPage = stripePaysOnPage();
    $params = array(
        'mode' => 'payment',
        'client_reference_id' => shopOrderNumber($orderId),
        'metadata' => array('order_token' => $token),
        'expires_at' => $expiresAt,
        'line_items' => array(),
        // The address is asked for with the payment, limited to the country
        // the delivery price was worked out for
        'shipping_address_collection' => array('allowed_countries' => array($countryCode)),
        'shipping_options' => array(array('shipping_rate_data' => array(
            'type' => 'fixed_amount',
            'display_name' => 'Delivery to ' . shopCountries()[$countryCode],
            'fixed_amount' => array('amount' => $shipping, 'currency' => $currency),
        ))),
        'phone_number_collection' => array('enabled' => 'true'), // couriers ask for one
        'payment_intent_data' => array(
            'description' => 'Order ' . shopOrderNumber($orderId) . ' — ambarvelasco.com',
            'metadata' => array('order_token' => $token, 'order_number' => shopOrderNumber($orderId)),
        ),
    );
    if ($onPage) {
        // Paid on the basket page: Stripe sends the customer on to the
        // thank-you page once the bank has said yes. (There is no "cancel"
        // address: going back is a button on the page itself.)
        $params['ui_mode'] = 'elements';
        $params['return_url'] = $site . '/shop/thank-you?order=' . $token;
    } else {
        $params['success_url'] = $site . '/shop/thank-you?order=' . $token;
        $params['cancel_url'] = $site . '/shop/basket?cancelled=' . $token;
    }
    foreach ($lines as $line) {
        $product = array('name' => $line['name']);
        if ($line['label'] !== '') {
            $product['description'] = $line['label'];
        }
        // Stripe shows the picture on its page; it has to be able to fetch it,
        // which it can't from a practice site
        if ($line['image'] !== '' && strpos($site, 'https://') === 0) {
            $product['images'] = array($site . '/baseImages/web/800/' . rawurlencode($line['image']));
        }
        $params['line_items'][] = array(
            'quantity' => $line['quantity'],
            'price_data' => array('currency' => $currency, 'unit_amount' => $line['priceCents'], 'product_data' => $product),
        );
    }

    try {
        // The promo code reaches Stripe as a one-off coupon for exactly the
        // amount worked out here, so its page and receipt show the saving
        // and its total can't differ from ours
        if ($discount > 0) {
            $coupon = stripeRequest('POST', '/v1/coupons', array(
                'amount_off' => $discount,
                'currency' => $currency,
                'duration' => 'once',
                'max_redemptions' => 1,
                'name' => 'Code ' . $promo['code'],
                'metadata' => array('order_token' => $token),
            ), 'coupon-' . $token);
            if (empty($coupon['id'])) {
                throw new StripeError('Stripe did not return a coupon');
            }
            $params['discounts'] = array(array('coupon' => $coupon['id']));
        }
        $session = stripeRequest('POST', '/v1/checkout/sessions', $params, 'order-' . $token);
        if (empty($session['id']) || empty($session[$onPage ? 'client_secret' : 'url'])) {
            throw new StripeError('Stripe did not return a payment');
        }
    } catch (StripeError $e) {
        // No payment page was made, so nothing can be paid: undo the order
        shopCancelOrder($conn, $orderId);
        error_log('Shop checkout: Stripe refused order ' . shopOrderNumber($orderId) . ': ' . $e->getMessage()
            . ($e->param ? ' (' . $e->param . ')' : ''));
        if ($e->param !== null && strpos($e->param, 'allowed_countries') !== false) {
            throw new ShopProblem("Sorry, online orders can't be sent to that country. Please get in touch and we'll work something out.");
        }
        throw new ShopProblem("Sorry, the payment page couldn't be opened. Nothing has been charged. Please try again in a moment.");
    }

    $conn->prepare('UPDATE shopOrders SET stripeSessionId = ? WHERE id = ?')->execute(array($session['id'], $orderId));
    if ($onPage) {
        return array('clientSecret' => (string) $session['client_secret'], 'token' => $token);
    }
    return array('url' => $session['url'], 'token' => $token);
}

// ---------------------------------------------------------------------------
// Finding out what happened
// ---------------------------------------------------------------------------

function shopFindOrder($conn, $column, $value)
{
    if (!in_array($column, array('id', 'token', 'stripeSessionId', 'stripePaymentIntentId'), true) || $value === null || $value === '') {
        return null;
    }
    $stmt = $conn->prepare("SELECT * FROM shopOrders WHERE $column = ? LIMIT 1");
    $stmt->execute(array($value));
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    return $order ?: null;
}

// Gives up an order that was never paid and puts its stock back. Only call
// once Stripe's payment page for it is closed (or was never made).
function shopCancelOrder($conn, $orderId)
{
    $conn->beginTransaction();
    try {
        // Whoever flips stockHeld from 1 to 0 puts the stock back, so it can
        // only ever go back once
        $release = $conn->prepare('UPDATE shopOrders SET stockHeld = 0 WHERE id = ? AND stockHeld = 1');
        $release->execute(array($orderId));
        if ($release->rowCount() === 1) {
            $items = $conn->prepare('SELECT variantId, quantity FROM shopOrderItems WHERE orderId = ?');
            $items->execute(array($orderId));
            $restore = $conn->prepare('UPDATE shopVariants SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL');
            foreach ($items->fetchAll(PDO::FETCH_ASSOC) as $item) {
                $restore->execute(array((int) $item['quantity'], (int) $item['variantId']));
            }
            // ...and its use of a promo code is given back
            $conn->prepare('UPDATE shopPromoCodes p JOIN shopOrders o ON o.promoId = p.id
                            SET p.usedCount = GREATEST(0, p.usedCount - 1) WHERE o.id = ?')
                 ->execute(array($orderId));
        }
        $conn->prepare("UPDATE shopOrders SET status = 'cancelled' WHERE id = ? AND status IN ('pending', 'processing')")
             ->execute(array($orderId));
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollBack();
        throw $e;
    }
}

// The name, email and address the customer gave on Stripe's page
function shopSaveCustomerDetails($conn, $orderId, $session)
{
    $customer = isset($session['customer_details']) && is_array($session['customer_details']) ? $session['customer_details'] : array();
    // (older and newer Stripe replies keep the delivery address in different places)
    $shipping = array();
    if (isset($session['shipping_details']) && is_array($session['shipping_details'])) {
        $shipping = $session['shipping_details'];
    } elseif (isset($session['collected_information']['shipping_details']) && is_array($session['collected_information']['shipping_details'])) {
        $shipping = $session['collected_information']['shipping_details'];
    }
    $address = isset($shipping['address']) && is_array($shipping['address']) ? $shipping['address']
        : (isset($customer['address']) && is_array($customer['address']) ? $customer['address'] : array());
    $text = function ($source, $key, $max = 255) {
        return isset($source[$key]) && is_scalar($source[$key]) ? substr(trim((string) $source[$key]), 0, $max) : '';
    };
    $intent = isset($session['payment_intent']) ? $session['payment_intent'] : null;
    $intentId = is_array($intent) ? (isset($intent['id']) ? $intent['id'] : null) : $intent;

    $conn->prepare('UPDATE shopOrders SET customerName = ?, customerEmail = ?, customerPhone = ?, shipName = ?, shipLine1 = ?,
                        shipLine2 = ?, shipCity = ?, shipState = ?, shipPostalCode = ?, shipCountry = ?,
                        stripePaymentIntentId = COALESCE(?, stripePaymentIntentId) WHERE id = ?')
         ->execute(array(
             $text($customer, 'name'), $text($customer, 'email'), $text($customer, 'phone', 60),
             $text($shipping, 'name') !== '' ? $text($shipping, 'name') : $text($customer, 'name'),
             $text($address, 'line1'), $text($address, 'line2'), $text($address, 'city'), $text($address, 'state'),
             $text($address, 'postal_code', 60), strtoupper($text($address, 'country', 2)),
             $intentId ? (string) $intentId : null, $orderId,
         ));
}

// Asks Stripe what became of an order's payment page and brings the order
// up to date. Safe to call any number of times. Returns the order's row.
function shopSyncOrder($conn, $order)
{
    if (!$order || !in_array($order['status'], array('pending', 'processing'), true)) {
        return $order;
    }
    $orderId = (int) $order['id'];
    if (empty($order['stripeSessionId'])) {
        // Stripe never made a payment page for it (the request failed part-way)
        if (strtotime($order['createdAt'] . ' UTC') < time() - 120) {
            shopCancelOrder($conn, $orderId);
        }
        return shopFindOrder($conn, 'id', $orderId);
    }

    $session = stripeRequest('GET', '/v1/checkout/sessions/' . rawurlencode($order['stripeSessionId']),
        array('expand' => array('payment_intent')));
    $status = isset($session['status']) ? $session['status'] : '';
    $paymentStatus = isset($session['payment_status']) ? $session['payment_status'] : '';

    if ($status === 'complete') {
        shopSaveCustomerDetails($conn, $orderId, $session);
        if ($paymentStatus === 'paid' || $paymentStatus === 'no_payment_required') {
            $total = isset($session['amount_total']) ? (int) $session['amount_total'] : (int) $order['totalCents'];
            // (the stock that was set aside is now simply sold)
            $paid = $conn->prepare("UPDATE shopOrders SET status = 'paid', stockHeld = 0, totalCents = ?, paidAt = ?
                                    WHERE id = ? AND status IN ('pending', 'processing')");
            $paid->execute(array($total, shopNow(), $orderId));
            if ($paid->rowCount() === 1) {
                // Only the request that marked it paid sends the emails, so
                // the webhook and the thank-you page can't both send them
                shopEmailOrderPaid($conn, $orderId);
            }
        } else {
            // A slow way of paying (a bank debit): the money is on its way,
            // or it has failed
            $intent = isset($session['payment_intent']) && is_array($session['payment_intent']) ? $session['payment_intent'] : array();
            $intentStatus = isset($intent['status']) ? $intent['status'] : '';
            if ($intentStatus === 'requires_payment_method' || $intentStatus === 'canceled') {
                shopCancelOrder($conn, $orderId);
            } else {
                $conn->prepare("UPDATE shopOrders SET status = 'processing' WHERE id = ? AND status = 'pending'")->execute(array($orderId));
            }
        }
    } elseif ($status === 'expired') {
        shopCancelOrder($conn, $orderId);
    } elseif ($status === 'open' && strtotime($order['expiresAt'] . ' UTC') < time() - 300) {
        // Should have closed by itself by now: close it, then give it up
        try {
            stripeRequest('POST', '/v1/checkout/sessions/' . rawurlencode($order['stripeSessionId']) . '/expire');
            shopCancelOrder($conn, $orderId);
        } catch (StripeError $e) {
            error_log('Shop: could not close payment page for ' . shopOrderNumber($orderId) . ': ' . $e->getMessage());
        }
    }
    return shopFindOrder($conn, 'id', $orderId);
}

// The customer came back from Stripe's page without paying: close it now, so
// what they had set aside goes straight back on sale
function shopAbandonOrder($conn, $token)
{
    $order = shopFindOrder($conn, 'token', $token);
    if (!$order || $order['status'] !== 'pending') {
        return;
    }
    if (!empty($order['stripeSessionId'])) {
        try {
            stripeRequest('POST', '/v1/checkout/sessions/' . rawurlencode($order['stripeSessionId']) . '/expire');
        } catch (StripeError $e) {
            // Already paid or already closed: find out which
            shopSyncOrder($conn, $order);
            return;
        }
    }
    shopCancelOrder($conn, (int) $order['id']);
}

// Orders whose payment page should have closed by now, in case Stripe's
// message about it never arrived. A few at a time; cheap when there are none.
function shopReleaseStaleOrders($conn)
{
    $stmt = $conn->prepare("SELECT * FROM shopOrders WHERE status = 'pending' AND expiresAt < ? ORDER BY id ASC LIMIT 5");
    $stmt->execute(array(gmdate('Y-m-d H:i:s', time() - 60)));
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $order) {
        try {
            shopSyncOrder($conn, $order);
        } catch (Throwable $e) {
            error_log('Shop: could not check order ' . shopOrderNumber($order['id']) . ': ' . $e->getMessage());
        }
    }
}

// Money returned from Stripe's dashboard: note it on the order
function shopMarkRefunded($conn, $paymentIntentId, $fully)
{
    $order = shopFindOrder($conn, 'stripePaymentIntentId', $paymentIntentId);
    if (!$order) {
        return;
    }
    if ($fully) {
        $conn->prepare("UPDATE shopOrders SET status = 'refunded' WHERE id = ? AND status IN ('paid', 'shipped', 'processing')")
             ->execute(array((int) $order['id']));
    }
}

// ---------------------------------------------------------------------------
// Reading orders
// ---------------------------------------------------------------------------

function shopOrderItems($conn, $orderIds)
{
    $byOrder = array();
    if (!$orderIds) {
        return $byOrder;
    }
    $in = implode(',', array_fill(0, count($orderIds), '?'));
    $stmt = $conn->prepare("SELECT * FROM shopOrderItems WHERE orderId IN ($in) ORDER BY id ASC");
    $stmt->execute(array_values($orderIds));
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $byOrder[(int) $row['orderId']][] = $row;
    }
    return $byOrder;
}

// What the customer's confirmation page shows: nothing private beyond what
// they typed themselves, and only to someone holding the order's own link
function shopOrderForCustomer($conn, $order)
{
    $items = shopOrderItems($conn, array((int) $order['id']));
    $lines = array();
    foreach (isset($items[(int) $order['id']]) ? $items[(int) $order['id']] : array() as $item) {
        $lines[] = array(
            'name' => $item['productName'],
            'label' => $item['variantLabel'],
            'image' => $item['imageLocation'],
            'quantity' => (int) $item['quantity'],
            'total' => shopMoney((int) $item['unitPriceCents'] * (int) $item['quantity'], $order['currency']),
        );
    }
    $countries = shopCountries();
    return array(
        'number' => shopOrderNumber($order['id']),
        'status' => $order['status'],
        'lines' => $lines,
        'subtotal' => shopMoney($order['subtotalCents'], $order['currency']),
        'discount' => (int) $order['discountCents'] > 0 ? shopMoney($order['discountCents'], $order['currency']) : null,
        'promoCode' => $order['promoCode'],
        'shipping' => shopMoney($order['shippingCents'], $order['currency']),
        'total' => shopMoney($order['totalCents'], $order['currency']),
        'email' => $order['customerEmail'],
        'sendTo' => array_values(array_filter(array(
            $order['shipName'], $order['shipLine1'], $order['shipLine2'],
            trim($order['shipPostalCode'] . ' ' . $order['shipCity']), $order['shipState'],
            isset($countries[$order['shipCountry']]) ? $countries[$order['shipCountry']] : $order['shipCountry'],
        ), function ($line) { return trim((string) $line) !== ''; })),
    );
}
