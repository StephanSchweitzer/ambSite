<?php
// Serves the web-sized copy of an artwork, making it the first time it's asked
// for. .htaccess only sends /baseImages/web/<file> here while that file does
// not exist yet; once it has been written, Apache serves it as a plain file.
// Nothing has to be placed on the server by hand: the copies fill themselves
// in as visitors look at the works.

include_once __DIR__ . '/imageManipulationFunctions.php';

function notFound()
{
    http_response_code(404);
    die;
}

$file = isset($_GET['f']) ? (string) $_GET['f'] : '';

// A bare file name only — never a path into another folder
if ($file === '' || $file !== basename($file) || $file[0] === '.') {
    notFound();
}

$extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
if (!in_array($extension, array('jpg', 'jpeg', 'png', 'gif'), true)) {
    notFound();
}

$baseDir = dirname(__DIR__) . '/baseImages/';
$webDir = $baseDir . 'web/';
$source = $baseDir . $file;
$serve = $webDir . $file;

if (!is_file($source)) {
    notFound();
}

$isFallback = false;
if (!is_file($serve)) {
    $lock = null;
    try {
        if (!is_dir($webDir) && !@mkdir($webDir, 0755, true) && !is_dir($webDir)) {
            throw new Exception('Could not create ' . $webDir);
        }
        // One copy at a time: a page full of new works would otherwise start
        // several big resizes at once and could run the server short of memory
        $lock = @fopen($webDir . '.generating.lock', 'c');
        if ($lock) {
            flock($lock, LOCK_EX);
        }
        // Another request may have made it while this one waited
        if (!is_file($serve)) {
            createWebImage($source, $serve);
        }
    } catch (Throwable $e) {
        // Show the original rather than a broken image, and try again later
        error_log('webImage.php: ' . $file . ': ' . $e->getMessage());
        $serve = $source;
        $isFallback = true;
    }
    if ($lock) {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

$info = @getimagesize($serve);
header('Content-Type: ' . ($info ? $info['mime'] : 'application/octet-stream'));
header('Content-Length: ' . filesize($serve));
header('Cache-Control: public, max-age=' . ($isFallback ? 3600 : 604800));
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($serve)) . ' GMT');
readfile($serve);
