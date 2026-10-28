<?php
/**
 * Loads the .env settings and sets up error display, without touching the
 * database. pdo.php includes this first; a page that may not need the
 * database at all (the About reply when it's cached) includes just this.
 *
 * .env lives at the project root, one level above the web root (html/), so it
 * is never reachable over HTTP.
 */

$projectRoot = dirname(__DIR__, 2);
$envFile = $projectRoot . '/.env';

// Real environment variables take priority, so a deploy runner that injects
// config directly keeps working without a .env file present.
if (is_readable($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }

        list($key, $value) = array_pad(explode('=', $line, 2), 2, '');
        $key = trim($key);
        $value = trim($value);

        // Strip one layer of surrounding quotes, so values containing spaces
        // or a # can be quoted in the file.
        $len = strlen($value);
        if ($len > 1 && ($value[0] === '"' || $value[0] === "'") && $value[$len - 1] === $value[0]) {
            $value = substr($value, 1, -1);
        }

        if ($key !== '' && getenv($key) === false) {
            putenv("$key=$value");
        }
    }
}

// Guarded because this file is included with `include`, not `include_once`,
// and a redeclared function would be a fatal error.
if (!function_exists('env')) {
    function env($key, $default = null)
    {
        $value = getenv($key);
        return $value === false ? $default : $value;
    }
}

$appEnv = env('APP_ENV', 'production');

// Errors printed to the page leak file paths, queries and connection details.
// Log them instead, always, and only display them outside production.
error_reporting(E_ALL);
ini_set('log_errors', '1');
ini_set('display_errors', $appEnv === 'production' ? '0' : '1');
ini_set('display_startup_errors', $appEnv === 'production' ? '0' : '1');
