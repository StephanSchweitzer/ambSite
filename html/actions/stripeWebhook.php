<?php
// Stripe calls this address whenever something happens to a payment (paid,
// the payment page closed unpaid, a refund). It is set up once in Stripe's
// dashboard (Developers > Webhooks) to send these to
// https://ambarvelasco.com/actions/stripeWebhook.php:
//
//   checkout.session.completed
//   checkout.session.expired
//   checkout.session.async_payment_succeeded
//   checkout.session.async_payment_failed
//   charge.refunded
//
// The message itself is only treated as a nudge. After checking that it
// really is from Stripe (its signature), the order is brought up to date by
// asking Stripe directly (shopSyncOrder), so the outcome never depends on
// what the message says or how it is laid out.
//
// Answering 200 tells Stripe the message was dealt with; anything else and
// Stripe sends it again later, for up to three days.

include __DIR__ . '/../database/pdo.php';
include_once __DIR__ . '/shopOrderFunctions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die;
}

$payload = (string) file_get_contents('php://input');
$event = stripeVerifyWebhook($payload, (string) ($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? ''), trim((string) env('STRIPE_WEBHOOK_SECRET', '')));
if (!$event) {
    http_response_code(400);
    echo 'Not a genuine Stripe message';
    die;
}

try {
    if (!shopReady($conn)) {
        throw new Exception('the shop tables are missing');
    }
    $type = isset($event['type']) ? (string) $event['type'] : '';
    $object = isset($event['data']['object']) && is_array($event['data']['object']) ? $event['data']['object'] : array();

    if (strpos($type, 'checkout.session.') === 0) {
        $order = shopFindOrder($conn, 'stripeSessionId', isset($object['id']) ? (string) $object['id'] : '');
        if (!$order && isset($object['metadata']['order_token'])) {
            $order = shopFindOrder($conn, 'token', (string) $object['metadata']['order_token']);
        }
        if ($order) {
            shopSyncOrder($conn, $order);
        }
    } elseif ($type === 'charge.refunded') {
        $intent = isset($object['payment_intent']) ? $object['payment_intent'] : '';
        shopMarkRefunded($conn, is_array($intent) ? (isset($intent['id']) ? $intent['id'] : '') : (string) $intent, !empty($object['refunded']));
    }

    http_response_code(200);
    echo 'ok';
} catch (Throwable $e) {
    error_log('stripeWebhook: ' . $e->getMessage());
    http_response_code(500);
    echo 'Could not process this yet';
}
