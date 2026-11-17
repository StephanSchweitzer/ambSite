<?php
// The shop's own emails, sent through Resend (resend.com):
//   - the order confirmation, to the buyer, when the payment goes through
//   - "your order is on its way", to the buyer, when Ambar marks it as sent
//   - a new-order alert, to Ambar
// Ambar writes the wording of each in the Shop admin (the Emails tab); the
// order's details (what was bought, prices, address, tracking) are added
// below her words automatically.
//
// Settings, in .env:
//   RESEND_API_KEY    re_..., from Resend's dashboard. Without it no email
//                     is sent and the Emails tab says so; nothing else changes.
//   SHOP_EMAIL_FROM   who the emails come from, on a domain verified in
//                     Resend. Default: Ambar Velasco <shop@ambarvelasco.com>
//
// Like the Stripe code, no library: Resend's API is one HTTPS request.
//
// Each email goes out once because it is sent by whoever flips the order's
// status (pending -> paid, paid -> shipped), and only one request can win
// that flip. A failed send is logged, never allowed to stop the order, and
// can be sent again from the order in the admin.
//
// Included by shopFunctions.php; the order helpers it uses (shopFindOrder,
// shopOrderItems, shopSiteUrl) are in shopOrderFunctions.php.

class ShopEmailError extends Exception
{
}

function shopEmailKey()
{
    return trim((string) env('RESEND_API_KEY', ''));
}

function shopEmailConfigured()
{
    return shopEmailKey() !== '';
}

function shopEmailFrom()
{
    $from = trim((string) env('SHOP_EMAIL_FROM', ''));
    return $from !== '' ? $from : 'Ambar Velasco <shop@ambarvelasco.com>';
}

// The wording Ambar starts with; every one can be changed in the admin
function shopEmailDefaults()
{
    return array(
        'emailOwner' => '',      // Ambar's address: new-order alerts go here, and buyers' replies
        'emailConfirmOn' => '1',
        'emailConfirmSubject' => 'Thank you for your order {order}',
        'emailConfirmText' => "Hello {name},\n\nThank you so much for your order. I'll pack it carefully and send you another email as soon as it's on its way.\n\nHere is what you ordered:",
        'emailShippedOn' => '1',
        'emailShippedSubject' => 'Your order {order} is on its way',
        'emailShippedText' => "Hello {name},\n\nGood news: your order has just been posted. I hope you love it when it arrives.",
        'emailAlertOn' => '1',
        'emailSignature' => "Warmly,\nAmbar",
    );
}

function shopEmailIsAddress($text)
{
    return filter_var(trim((string) $text), FILTER_VALIDATE_EMAIL) !== false;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

// One email. Throws ShopEmailError if Resend refuses it or can't be reached.
function shopEmailSend($to, $subject, $html, $text, $replyTo = '', $idempotencyKey = null)
{
    $key = shopEmailKey();
    if ($key === '') {
        throw new ShopEmailError('Emails are not set up (no RESEND_API_KEY)');
    }
    if (!shopEmailIsAddress($to)) {
        throw new ShopEmailError('Not an email address: ' . $to);
    }
    // The practice site's orders are copies of real ones, so it never writes
    // to a buyer: everything goes to the shop's own address instead
    if (env('APP_ENV', 'production') !== 'production') {
        global $conn;
        $owner = $conn ? shopSettings($conn)['emailOwner'] : '';
        if (!shopEmailIsAddress($owner)) {
            throw new ShopEmailError('Practice site: no shop email address to send to instead of ' . $to);
        }
        if (strcasecmp(trim($to), trim($owner)) !== 0) {
            $subject = '[Practice, meant for ' . trim($to) . '] ' . $subject;
            $to = $owner;
        }
    }
    $message = array(
        'from' => shopEmailFrom(),
        'to' => array(trim($to)),
        'subject' => $subject,
        'html' => $html,
        'text' => $text,
    );
    if (shopEmailIsAddress($replyTo)) {
        $message['reply_to'] = trim($replyTo);
    }
    $body = json_encode($message, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

    // (RESEND_API_BASE only exists so the practice site can use a stand-in)
    $url = rtrim((string) env('RESEND_API_BASE', 'https://api.resend.com'), '/') . '/emails';
    $headers = array(
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
        'User-Agent: ambarvelasco-shop/1.0',
    );
    if ($idempotencyKey) {
        // The same email asked for twice (a retry) is only sent once
        $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
        ));
        $reply = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $failure = $reply === false ? curl_error($ch) : null;
    } else {
        $context = stream_context_create(array('http' => array(
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => $body,
            'timeout' => 20,
            'ignore_errors' => true,
        )));
        $reply = @file_get_contents($url, false, $context);
        $status = 0;
        if (function_exists('http_get_last_response_headers')) {
            $replyHeaders = http_get_last_response_headers();
        } else {
            $definedVars = get_defined_vars();
            $replyHeaders = isset($definedVars['http_response_header']) ? $definedVars['http_response_header'] : array();
        }
        if (!empty($replyHeaders[0]) && preg_match('#\s(\d{3})\s#', $replyHeaders[0] . ' ', $m)) {
            $status = (int) $m[1];
        }
        $failure = $reply === false ? 'no reply' : null;
    }

    if ($failure !== null) {
        throw new ShopEmailError('Could not reach Resend: ' . $failure);
    }
    $data = json_decode((string) $reply, true);
    if ($status < 200 || $status >= 300 || !is_array($data) || empty($data['id'])) {
        $why = is_array($data) && isset($data['message']) ? $data['message'] : 'HTTP ' . $status;
        throw new ShopEmailError('Resend refused the email: ' . $why);
    }
    return $data['id'];
}

// ---------------------------------------------------------------------------
// What happens to an order
// ---------------------------------------------------------------------------

// Just marked paid: the buyer's confirmation and Ambar's alert. Never throws.
function shopEmailOrderPaid($conn, $orderId)
{
    if (!shopEmailConfigured()) {
        return;
    }
    try {
        $order = shopFindOrder($conn, 'id', (int) $orderId);
        $settings = shopSettings($conn);
        if (!$order) {
            return;
        }
        $number = shopOrderNumber($order['id']);
        if ($settings['emailConfirmOn'] === '1' && shopEmailIsAddress($order['customerEmail'])) {
            try {
                $email = shopEmailBuild($conn, 'confirm', $order, $settings);
                shopEmailSend($order['customerEmail'], $email['subject'], $email['html'], $email['text'],
                    $settings['emailOwner'], 'order-' . $order['id'] . '-confirm');
            } catch (Throwable $e) {
                error_log('Shop email: confirmation for ' . $number . ' not sent: ' . $e->getMessage());
            }
        }
        if ($settings['emailAlertOn'] === '1' && shopEmailIsAddress($settings['emailOwner'])) {
            try {
                $email = shopEmailBuild($conn, 'alert', $order, $settings);
                shopEmailSend($settings['emailOwner'], $email['subject'], $email['html'], $email['text'],
                    $order['customerEmail'], 'order-' . $order['id'] . '-alert');
            } catch (Throwable $e) {
                error_log('Shop email: new-order alert for ' . $number . ' not sent: ' . $e->getMessage());
            }
        }
    } catch (Throwable $e) {
        error_log('Shop email: ' . $e->getMessage());
    }
}

// Just marked as sent: "on its way". Returns true if the email went.
function shopEmailOrderShipped($conn, $orderId)
{
    if (!shopEmailConfigured()) {
        return false;
    }
    try {
        $order = shopFindOrder($conn, 'id', (int) $orderId);
        $settings = shopSettings($conn);
        if (!$order || $settings['emailShippedOn'] !== '1' || !shopEmailIsAddress($order['customerEmail'])) {
            return false;
        }
        $email = shopEmailBuild($conn, 'shipped', $order, $settings);
        shopEmailSend($order['customerEmail'], $email['subject'], $email['html'], $email['text'], $settings['emailOwner']);
        return true;
    } catch (Throwable $e) {
        error_log('Shop email: "on its way" for order ' . (int) $orderId . ' not sent: ' . $e->getMessage());
        return false;
    }
}

// ---------------------------------------------------------------------------
// Writing an email
// ---------------------------------------------------------------------------

function shopEmailEsc($text)
{
    return htmlspecialchars((string) $text, ENT_QUOTES, 'UTF-8');
}

// Ambar's words with {name} and {order} filled in
function shopEmailFill($text, $order)
{
    $first = trim(preg_split('/\s+/', trim((string) $order['customerName']))[0]);
    return strtr((string) $text, array(
        '{name}' => $first !== '' ? $first : 'there',
        '{order}' => shopOrderNumber($order['id']),
    ));
}

// Plain text -> paragraphs (a blank line starts a new one)
function shopEmailParagraphs($text, $style)
{
    $html = '';
    foreach (preg_split("/\n\s*\n/", trim(str_replace("\r", '', (string) $text))) as $paragraph) {
        if (trim($paragraph) !== '') {
            $html .= '<p style="' . $style . '">' . nl2br(shopEmailEsc(trim($paragraph)), false) . '</p>';
        }
    }
    return $html;
}

function shopEmailAddressLines($order)
{
    $countries = shopCountries();
    return array_values(array_filter(array(
        $order['shipName'], $order['shipLine1'], $order['shipLine2'],
        trim($order['shipPostalCode'] . ' ' . $order['shipCity']), $order['shipState'],
        isset($countries[$order['shipCountry']]) ? $countries[$order['shipCountry']] : $order['shipCountry'],
    ), function ($line) { return trim((string) $line) !== ''; }));
}

// $kind: 'confirm' | 'shipped' | 'alert'. $items: the order's rows from
// shopOrderItems (read from the database when not given).
// Returns array('subject' => ..., 'html' => ..., 'text' => ...).
function shopEmailBuild($conn, $kind, $order, $settings, $items = null)
{
    if ($items === null) {
        $byOrder = shopOrderItems($conn, array((int) $order['id']));
        $items = isset($byOrder[(int) $order['id']]) ? $byOrder[(int) $order['id']] : array();
    }
    // Pictures and links must work from someone's inbox, so always the real
    // site's address except on the practice site
    $site = env('APP_ENV', 'production') === 'production' ? AMB_SITE_URL : shopSiteUrl();
    $currency = $order['currency'];
    $number = shopOrderNumber($order['id']);
    $test = (int) $order['liveMode'] !== 1 ? '[Test] ' : '';

    $ink = '#1d1d1b';
    $muted = '#75756f';
    $line = '#eae8e3';
    $serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
    $sans = "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif";
    $p = "margin:0 0 14px;font-family:$sans;font-size:15px;line-height:1.6;color:$ink;";
    $small = "font-family:$sans;font-size:13px;line-height:1.5;color:$muted;";
    $heading = "margin:28px 0 10px;font-family:$serif;font-size:20px;font-weight:600;color:$ink;";
    $button = "display:inline-block;padding:11px 22px;background:$ink;color:#ffffff;text-decoration:none;" .
        "font-family:$sans;font-size:14px;letter-spacing:0.03em;border-radius:2px;";

    // What was bought
    $rows = '';
    $textLines = array();
    foreach ($items as $item) {
        $price = shopMoney((int) $item['unitPriceCents'] * (int) $item['quantity'], $currency);
        $label = $item['variantLabel'] !== '' ? ' (' . $item['variantLabel'] . ')' : '';
        $picture = $item['imageLocation'] !== ''
            ? '<img src="' . shopEmailEsc($site . '/thumbnails/' . rawurlencode($item['imageLocation'])) . '" width="56" alt="" ' .
              'style="display:block;width:56px;height:auto;border:0;">'
            : '';
        $rows .= '<tr>' .
            '<td width="68" style="padding:10px 12px 10px 0;border-bottom:1px solid ' . $line . ';vertical-align:top;">' . $picture . '</td>' .
            '<td style="padding:10px 0;border-bottom:1px solid ' . $line . ';vertical-align:top;font-family:' . $sans . ';font-size:15px;line-height:1.4;color:' . $ink . ';">' .
                shopEmailEsc($item['productName']) .
                ($label !== '' ? '<br><span style="font-size:13px;color:' . $muted . ';">' . shopEmailEsc($item['variantLabel']) . '</span>' : '') .
                ((int) $item['quantity'] > 1 ? '<br><span style="font-size:13px;color:' . $muted . ';">&times; ' . (int) $item['quantity'] . '</span>' : '') .
            '</td>' .
            '<td align="right" style="padding:10px 0 10px 12px;border-bottom:1px solid ' . $line . ';vertical-align:top;white-space:nowrap;font-family:' . $sans . ';font-size:15px;color:' . $ink . ';">' .
                shopEmailEsc($price) . '</td></tr>';
        $textLines[] = (int) $item['quantity'] . ' x ' . $item['productName'] . $label . '  ' . $price;
    }
    $sum = function ($name, $value, $strong = false) use ($sans, $ink, $muted) {
        $style = 'padding:4px 0;font-family:' . $sans . ';font-size:' . ($strong ? '16px;font-weight:700;color:' . $ink : '14px;color:' . $muted) . ';';
        return '<tr><td colspan="2" style="' . $style . '">' . shopEmailEsc($name) . '</td>' .
            '<td align="right" style="' . $style . 'white-space:nowrap;">' . shopEmailEsc($value) . '</td></tr>';
    };
    $totals = $sum('Items', shopMoney($order['subtotalCents'], $currency));
    $textTotals = array('Items: ' . shopMoney($order['subtotalCents'], $currency));
    if ((int) $order['discountCents'] > 0) {
        $off = '−' . shopMoney($order['discountCents'], $currency);
        $totals .= $sum('Promo code ' . $order['promoCode'], $off);
        $textTotals[] = 'Promo code ' . $order['promoCode'] . ': ' . $off;
    }
    $totals .= $sum('Delivery', shopMoney($order['shippingCents'], $currency));
    $totals .= $sum('Total', shopMoney($order['totalCents'], $currency), true);
    $textTotals[] = 'Delivery: ' . shopMoney($order['shippingCents'], $currency);
    $textTotals[] = 'Total: ' . shopMoney($order['totalCents'], $currency);

    $orderTable = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid ' . $line . ';">' .
        $rows . '<tr><td colspan="3" style="height:8px;"></td></tr>' . $totals . '</table>';

    $address = shopEmailAddressLines($order);
    $addressHtml = $address ? '<p style="' . $p . '">' . implode('<br>', array_map('shopEmailEsc', $address)) . '</p>' : '';

    $tracking = trim((string) $order['tracking']);
    $trackingHtml = '';
    $trackingText = '';
    if ($tracking !== '') {
        if (preg_match('#^https?://\S+$#i', $tracking)) {
            $trackingHtml = '<p style="margin:22px 0;"><a href="' . shopEmailEsc($tracking) . '" style="' . $button . '">Follow your parcel</a></p>';
            $trackingText = "Follow your parcel: $tracking";
        } else {
            $trackingHtml = '<p style="' . $p . '"><strong>Tracking number:</strong> ' . shopEmailEsc($tracking) . '</p>';
            $trackingText = "Tracking number: $tracking";
        }
    }

    $orderLink = $site . '/shop/thank-you?order=' . rawurlencode($order['token']);
    $signature = shopEmailParagraphs($settings['emailSignature'], $p);
    $canReply = shopEmailIsAddress($settings['emailOwner']);

    if ($kind === 'alert') {
        $subject = $test . 'New order ' . $number . ' · ' . shopMoney($order['totalCents'], $currency) .
            ($order['customerName'] !== '' ? ' from ' . $order['customerName'] : '');
        $who = array_filter(array($order['customerName'], $order['customerEmail'], $order['customerPhone']));
        $body = '<p style="' . $p . '">Someone has just bought from your shop' . ($test ? ' (a test order: no real money moved)' : '') . '.</p>' .
            '<h2 style="' . $heading . '">' . shopEmailEsc($number) . '</h2>' . $orderTable .
            '<h2 style="' . $heading . '">Send it to</h2>' . $addressHtml .
            '<h2 style="' . $heading . '">Customer</h2><p style="' . $p . '">' . implode('<br>', array_map('shopEmailEsc', $who)) . '</p>' .
            '<p style="margin:26px 0;"><a href="' . shopEmailEsc($site . '/admin/shopAdmin.php') . '" style="' . $button . '">Open the shop&rsquo;s orders</a></p>' .
            '<p style="' . $small . '">Replying to this email writes to the customer.</p>';
        $text = "Someone has just bought from your shop" . ($test ? ' (a test order: no real money moved)' : '') . ".\n\n" .
            "$number\n" . implode("\n", $textLines) . "\n\n" . implode("\n", $textTotals) . "\n\n" .
            "Send it to:\n" . implode("\n", $address) . "\n\nCustomer:\n" . implode("\n", $who) . "\n\n" .
            "Open the shop's orders: $site/admin/shopAdmin.php\n";
        return array('subject' => $subject, 'html' => shopEmailPage($body, $site, false, $sans, $muted), 'text' => $text);
    }

    if ($kind === 'shipped') {
        $words = shopEmailFill($settings['emailShippedText'], $order);
        $subject = $test . shopEmailFill($settings['emailShippedSubject'], $order);
        $body = shopEmailParagraphs($words, $p) . $trackingHtml . $signature .
            '<h2 style="' . $heading . '">Your order ' . shopEmailEsc($number) . '</h2>' . $orderTable .
            '<h2 style="' . $heading . '">Sent to</h2>' . $addressHtml;
        $text = trim($words) . "\n\n" . ($trackingText !== '' ? "$trackingText\n\n" : '') . trim($settings['emailSignature']) . "\n\n" .
            "Your order $number\n" . implode("\n", $textLines) . "\n\nSent to:\n" . implode("\n", $address) . "\n";
        return array('subject' => $subject, 'html' => shopEmailPage($body, $site, $canReply, $sans, $muted), 'text' => $text);
    }

    // 'confirm'
    $words = shopEmailFill($settings['emailConfirmText'], $order);
    $subject = $test . shopEmailFill($settings['emailConfirmSubject'], $order);
    $body = shopEmailParagraphs($words, $p) .
        '<h2 style="' . $heading . '">Order ' . shopEmailEsc($number) . '</h2>' . $orderTable .
        '<h2 style="' . $heading . '">Sending to</h2>' . $addressHtml .
        '<p style="margin:22px 0 28px;"><a href="' . shopEmailEsc($orderLink) . '" style="' . $button . '">See your order</a></p>' .
        $signature;
    $text = trim($words) . "\n\nOrder $number\n" . implode("\n", $textLines) . "\n\n" . implode("\n", $textTotals) . "\n\n" .
        "Sending to:\n" . implode("\n", $address) . "\n\nSee your order: $orderLink\n\n" . trim($settings['emailSignature']) . "\n";
    return array('subject' => $subject, 'html' => shopEmailPage($body, $site, $canReply, $sans, $muted), 'text' => $text);
}

// The frame every email shares: the logo, a white card, a quiet footer
function shopEmailPage($body, $site, $canReply, $sans, $muted)
{
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' .
        '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light">' .
        '<title>Ambar Velasco</title></head>' .
        '<body style="margin:0;padding:0;background:#fbfaf8;">' .
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbfaf8;">' .
        '<tr><td align="center" style="padding:32px 16px;">' .
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">' .
        '<tr><td align="center" style="padding:0 0 24px;"><a href="' . shopEmailEsc($site) . '/">' .
            '<img src="' . shopEmailEsc($site) . '/miscIcons/logo.png" width="190" alt="Ambar Velasco" style="display:block;width:190px;height:auto;border:0;"></a></td></tr>' .
        '<tr><td style="background:#ffffff;border:1px solid #eae8e3;padding:32px 28px;">' . $body . '</td></tr>' .
        '<tr><td align="center" style="padding:20px 8px 0;font-family:' . $sans . ';font-size:12px;line-height:1.6;color:' . $muted . ';">' .
            ($canReply ? 'Questions? Just reply to this email.<br>' : '') .
            '<a href="' . shopEmailEsc($site) . '/" style="color:' . $muted . ';">ambarvelasco.com</a></td></tr>' .
        '</table></td></tr></table></body></html>';
}

// A made-up order for previews and test emails, using a real item's picture
// when the shop has one
function shopEmailSampleOrder($conn, $settings)
{
    $picture = '';
    $name = 'A painting';
    try {
        $row = $conn->query("SELECT p.name, i.fileLocation FROM shopProducts p
                             LEFT JOIN shopProductImages i ON i.productId = p.id
                             WHERE p.status = 'live' ORDER BY p.sortOrder ASC, i.sortOrder ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $name = $row['name'];
            $picture = (string) $row['fileLocation'];
        }
    } catch (Throwable $e) {
        // no picture, then
    }
    $order = array(
        'id' => 0, 'token' => str_repeat('0', 32), 'currency' => $settings['currency'], 'liveMode' => 1,
        'subtotalCents' => 12000, 'discountCents' => 0, 'promoCode' => '', 'shippingCents' => 800, 'totalCents' => 12800,
        'customerName' => 'Alex Example', 'customerEmail' => 'alex@example.com', 'customerPhone' => '',
        'shipName' => 'Alex Example', 'shipLine1' => '12 Example Street', 'shipLine2' => '',
        'shipCity' => 'Brussels', 'shipState' => '', 'shipPostalCode' => '1000', 'shipCountry' => 'BE',
        'tracking' => 'https://example.com/track/AB123456789',
    );
    $items = array(array('productName' => $name, 'variantLabel' => '', 'imageLocation' => $picture,
        'unitPriceCents' => 12000, 'quantity' => 1));
    return array($order, $items);
}
