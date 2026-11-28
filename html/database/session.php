<?php
// Starts the session with safe cookie settings. Every page that uses the
// sign-in includes this instead of calling session_start() itself.
// - HttpOnly: page scripts can't read the cookie
// - SameSite=Lax: other websites can't make the browser send it along with
//   a form they submit to this site (so they can't save things as the admin)
// - Secure: only sent over https (the practice site runs on plain http)
//
// And a second lock on the same door: anything that saves (not a GET) and
// says it comes from another website is turned away before the session is
// even looked at. Browsers say where a request comes from (the Origin
// header) on every save they send, so this holds even for an old browser
// that ignores SameSite. A request with no Origin at all (curl, Stripe) is
// let through, as before: without the sign-in cookie it can't save anything.
if (!function_exists('ambRefuseOtherSites')) {
    function ambRefuseOtherSites()
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if (in_array($method, array('GET', 'HEAD', 'OPTIONS'), true) || !isset($_SERVER['HTTP_ORIGIN'])) {
            return;
        }
        $origin = strtolower(trim((string) $_SERVER['HTTP_ORIGIN']));
        $host = parse_url($origin, PHP_URL_HOST);
        $port = parse_url($origin, PHP_URL_PORT);
        $from = $host ? $host . ($port ? ':' . $port : '') : '';
        if ($from !== '' && $from === strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''))) {
            return;
        }
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(array('status' => 'error', 'success' => false, 'message' => 'Not allowed from another website.'));
        die;
    }
}
ambRefuseOtherSites();

// A session (and its cookie) only for someone signed in, or signing in
// (verifySignIn.php sets $ambStartSession). A visitor to the public site
// reaches endpoints that include this file (the newsletter sign-up, the
// menu), and must not be handed a cookie for it: without the cookie
// there's no session, so $_SESSION is just empty and nothing is saved.
$ambHasSessionCookie = isset($_COOKIE[session_name()]) && $_COOKIE[session_name()] !== '';
if (session_status() === PHP_SESSION_NONE && !$ambHasSessionCookie && empty($ambStartSession)) {
    $_SESSION = array();
} elseif (session_status() === PHP_SESSION_NONE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params(array(
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ));
    ini_set('session.use_strict_mode', '1');
    session_start();
}
