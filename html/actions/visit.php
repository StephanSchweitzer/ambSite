<?php
// Counts one address seen by a visitor (countVisit() in photoFunctions.js;
// what is and isn't kept: visitFunctions.php). Starts no session and sets no
// cookie. Always answers "204 nothing to say", counted or not, so it tells a
// caller nothing.

header('Cache-Control: no-store');

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    die;
}

// Only from this site's own pages (browsers say where a POST comes from)
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '') {
    $from = strtolower((string) parse_url($origin, PHP_URL_HOST));
    $port = parse_url($origin, PHP_URL_PORT);
    if ($from . ($port ? ':' . $port : '') !== strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''))) {
        http_response_code(204);
        die;
    }
}

include_once __DIR__ . '/rateLimit.php';

// A browser sends a handful a visit; this many an hour from one address is
// something else, and stops being counted
if (ambRateLimited('visits', 300)) {
    http_response_code(204);
    die;
}
ambRateCount('visits');

$body = json_decode((string) file_get_contents('php://input', false, null, 0, 2048), true);
if (is_array($body) && isset($body['path']) && is_string($body['path'])) {
    $pdoSoftFail = true;
    include __DIR__ . '/../database/pdo.php';
    if ($conn) {
        include_once __DIR__ . '/visitFunctions.php';
        ambRecordVisit(
            $conn,
            $body['path'],
            isset($body['from']) && is_string($body['from']) ? $body['from'] : '',
            substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 400),
            (string) ($_SERVER['REMOTE_ADDR'] ?? '')
        );
    }
}

http_response_code(204);
