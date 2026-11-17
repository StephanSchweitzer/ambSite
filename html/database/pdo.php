<?php
/**
 * Database connection. Every entry point includes this file; it loads the
 * .env settings first (env.php), then connects.
 */

include __DIR__ . '/env.php';

$host = env('DB_HOST', 'localhost');
$dbname = env('DB_NAME');
$dbusername = env('DB_USER');
$dbpassword = env('DB_PASSWORD');

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname", $dbusername, $dbpassword);
} catch (PDOException $pe) {
    error_log('Database connection failed: ' . $pe->getMessage());
    // The public page shell (index.php) only uses the database for optional
    // extras like link-preview tags, so it sets $pdoSoftFail and carries on
    // without a connection instead of replacing the whole page with an error.
    if (!empty($pdoSoftFail)) {
        $conn = null;
        return;
    }
    http_response_code(500);
    echo $appEnv === 'production'
        ? 'Service temporarily unavailable.'
        : $pe->getMessage();
    die;
}
