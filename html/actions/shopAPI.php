<?php
// What the public shop pages ask the server for (js/shop.js). No sign-in and
// no session: everything here is either public or reached with an order's
// own private link.
//
//   GET  ?view=page&path=/shop/12/name   that shop page, already drawn
//   GET  ?view=order&token=...           a customer's own order, for the thank-you page
//   POST {action: 'basket',   items}     the basket priced as of right now
//   POST {action: 'checkout', items, country}   start paying -> Stripe's page
//   POST {action: 'abandon',  token}     came back without paying: free the stock
//
// (The shop admin has its own file, shopAdminAPI.php.)

include __DIR__ . '/../database/pdo.php';
include_once __DIR__ . '/shopPageFunctions.php';
include_once __DIR__ . '/shopOrderFunctions.php';

function shopReply($data, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    die;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $view = isset($_GET['view']) ? (string) $_GET['view'] : '';

        if ($view === 'page') {
            $path = '/' . trim((string) ($_GET['path'] ?? ''), '/');
            $page = shopPage($conn, $path);
            shopReply(array(
                'view' => $page['view'],
                'path' => $page['path'],
                'title' => $page['status'] === 404 ? 'Page not found - Ambar Velasco' : $page['title'],
                'html' => $page['status'] === 404 ? ambRenderNotFound() : $page['html'],
            ), $page['status'] === 404 ? 404 : 200);
        }

        if ($view === 'order') {
            $token = (string) ($_GET['token'] ?? '');
            $order = shopReady($conn) && preg_match('/^[a-f0-9]{32}$/', $token) ? shopFindOrder($conn, 'token', $token) : null;
            if (!$order) {
                shopReply(array('message' => 'Order not found'), 404);
            }
            try {
                // The thank-you page can arrive before Stripe's own message does
                $order = shopSyncOrder($conn, $order);
            } catch (Throwable $e) {
                error_log('shopAPI order sync: ' . $e->getMessage());
            }
            shopReply(array('order' => shopOrderForCustomer($conn, $order)));
        }

        shopReply(array('message' => 'Unknown request'), 400);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode((string) file_get_contents('php://input'), true);
        $action = is_array($input) && isset($input['action']) ? (string) $input['action'] : '';
        if (!shopReady($conn)) {
            shopReply(array('message' => "The shop isn't open yet."), 503);
        }

        if ($action === 'basket') {
            $settings = shopSettings($conn);
            $lines = shopPriceBasket($conn, shopCleanBasket(isset($input['items']) ? $input['items'] : array()));
            $currencies = shopCurrencies();
            shopReply(array(
                'lines' => $lines,
                'symbol' => $currencies[$settings['currency']]['symbol'],
                'countries' => shopDeliveryCountries(shopGetZones($conn)),
                'paused' => $settings['paused'] === '1',
                'canPay' => stripeIsConfigured(),
                'contactEmail' => $settings['contactEmail'],
            ));
        }

        if ($action === 'checkout') {
            try {
                $started = shopStartCheckout($conn, isset($input['items']) ? $input['items'] : array(),
                    isset($input['country']) ? $input['country'] : '');
                shopReply(array('url' => $started['url']));
            } catch (ShopProblem $problem) {
                shopReply(array('message' => $problem->getMessage(), 'lines' => $problem->lines), 409);
            }
        }

        if ($action === 'abandon') {
            $token = isset($input['token']) ? (string) $input['token'] : '';
            if (preg_match('/^[a-f0-9]{32}$/', $token)) {
                shopAbandonOrder($conn, $token);
            }
            shopReply(array('ok' => true));
        }

        shopReply(array('message' => 'Unknown request'), 400);
    }

    shopReply(array('message' => 'Unknown request'), 405);
} catch (Throwable $e) {
    error_log('shopAPI: ' . $e->getMessage());
    shopReply(array('message' => 'Sorry, something went wrong. Please try again.'), 500);
}
