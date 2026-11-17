<?php
// Starts the session with safe cookie settings. Every page that uses the
// sign-in includes this instead of calling session_start() itself.
// - HttpOnly: page scripts can't read the cookie
// - SameSite=Lax: other websites can't make the browser send it along with
//   a form they submit to this site (so they can't save things as the admin)
// - Secure: only sent over https (the practice site runs on plain http)
if (session_status() === PHP_SESSION_NONE) {
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
