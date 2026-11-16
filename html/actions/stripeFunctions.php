<?php
// Talks to Stripe, the company that takes the card payments. There is no
// Stripe library here on purpose (the site has no package manager): Stripe's
// API is ordinary HTTPS requests, and the shop only needs three of them.
//
// Settings, in .env:
//   STRIPE_SECRET_KEY      sk_test_... while trying things out, sk_live_... for real
//   STRIPE_WEBHOOK_SECRET  whsec_..., from the webhook set up in Stripe's dashboard
//
// Card details never touch this server: the customer types them on Stripe's
// own page (Stripe Checkout), and Stripe tells us afterwards whether they paid.

// The reply shapes this code was written against. Stripe keeps old versions
// working, so asking for one by name means its answers don't change under us.
define('STRIPE_API_VERSION', '2024-06-20');

class StripeError extends Exception
{
    public $param = null;       // which thing we sent Stripe didn't accept
    public $stripeCode = null;
    public $httpStatus = 0;
}

function stripeSecretKey()
{
    return trim((string) env('STRIPE_SECRET_KEY', ''));
}

function stripeIsConfigured()
{
    return stripeSecretKey() !== '';
}

// True when the key is a real-money one
function stripeIsLive()
{
    return strpos(stripeSecretKey(), 'sk_live_') === 0 || strpos(stripeSecretKey(), 'rk_live_') === 0;
}

// One request to Stripe. Returns the decoded reply; throws StripeError if
// Stripe refuses it or can't be reached.
function stripeRequest($method, $path, $params = array(), $idempotencyKey = null)
{
    $key = stripeSecretKey();
    if ($key === '') {
        throw new StripeError('Stripe is not set up');
    }
    // (STRIPE_API_BASE only exists so the practice site can use a stand-in)
    $url = rtrim((string) env('STRIPE_API_BASE', 'https://api.stripe.com'), '/') . $path;
    $query = http_build_query($params);
    if ($method === 'GET' && $query !== '') {
        $url .= '?' . $query;
    }

    $headers = array(
        'Authorization: Bearer ' . $key,
        'Stripe-Version: ' . STRIPE_API_VERSION,
    );
    if ($method !== 'GET') {
        $headers[] = 'Content-Type: application/x-www-form-urlencoded';
        if ($idempotencyKey) {
            // Sending the same request twice (a retry) can't create two payments
            $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
        }
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 30,
        ));
        if ($method !== 'GET') {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $query);
        }
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $failure = $body === false ? curl_error($ch) : null;
    } else {
        // No curl on this server: PHP's own https support does the same job
        $context = stream_context_create(array('http' => array(
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'content' => $method === 'GET' ? '' : $query,
            'timeout' => 30,
            'ignore_errors' => true, // read Stripe's error replies too
        )));
        $body = @file_get_contents($url, false, $context);
        $status = 0;
        // (newer PHP has a function for the reply's headers; older PHP a variable,
        // read through get_defined_vars() because PHP 8.5 warns on naming it)
        if (function_exists('http_get_last_response_headers')) {
            $replyHeaders = http_get_last_response_headers();
        } else {
            $definedVars = get_defined_vars();
            $replyHeaders = isset($definedVars['http_response_header']) ? $definedVars['http_response_header'] : array();
        }
        if (!empty($replyHeaders[0]) && preg_match('#\s(\d{3})\s#', $replyHeaders[0] . ' ', $m)) {
            $status = (int) $m[1];
        }
        $failure = $body === false ? 'no reply' : null;
    }

    if ($failure !== null) {
        throw new StripeError('Could not reach Stripe: ' . $failure);
    }

    $data = json_decode((string) $body, true);
    if ($status < 200 || $status >= 300 || !is_array($data)) {
        $details = is_array($data) && isset($data['error']) && is_array($data['error']) ? $data['error'] : array();
        $error = new StripeError(isset($details['message']) ? (string) $details['message'] : 'Stripe answered with an error (' . $status . ')');
        $error->param = isset($details['param']) ? (string) $details['param'] : null;
        $error->stripeCode = isset($details['code']) ? (string) $details['code'] : null;
        $error->httpStatus = $status;
        throw $error;
    }
    return $data;
}

// Stripe signs every message it sends to the webhook (Stripe-Signature:
// t=<time>,v1=<signature>), so nobody else can pretend an order was paid.
// Returns the decoded event, or null if the message isn't genuine or is old.
function stripeVerifyWebhook($payload, $signatureHeader, $secret, $toleranceSeconds = 300)
{
    if ($secret === '' || $signatureHeader === '') {
        return null;
    }
    $timestamp = null;
    $signatures = array();
    foreach (explode(',', $signatureHeader) as $part) {
        $pair = explode('=', trim($part), 2);
        if (count($pair) !== 2) {
            continue;
        }
        if ($pair[0] === 't') {
            $timestamp = $pair[1];
        } elseif ($pair[0] === 'v1') {
            $signatures[] = $pair[1];
        }
    }
    if ($timestamp === null || !ctype_digit($timestamp) || !$signatures) {
        return null;
    }
    if (abs(time() - (int) $timestamp) > $toleranceSeconds) {
        return null;
    }
    $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
    foreach ($signatures as $signature) {
        if (hash_equals($expected, $signature)) {
            $event = json_decode($payload, true);
            return is_array($event) ? $event : null;
        }
    }
    return null;
}
