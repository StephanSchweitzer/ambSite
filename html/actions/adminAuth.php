<?php
// For the admin API endpoints. A signed-out request gets a plain
// "401 signed out" answer the admin pages recognise, instead of a redirect
// that an AJAX call would silently follow.
if (!function_exists('requireAdminApi')) {
    function requireAdminApi()
    {
        if (($_SESSION["ambar"] ?? null) === "connected") {
            return;
        }
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(array(
            'status' => 'error',
            'success' => false,
            'signedOut' => true,
            'message' => 'You have been signed out. Please sign in again.'
        ));
        die;
    }
}
