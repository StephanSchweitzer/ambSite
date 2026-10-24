<?php
// Serves a web-sized copy of an artwork, making it the first time it's asked
// for. .htaccess only sends /baseImages/web/<file> (the full web copy) and
// /baseImages/web/<width>/<file> (a narrower one) here while that file does
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
$width = isset($_GET['w']) ? (string) $_GET['w'] : '';

// A bare file name only — never a path into another folder
if ($file === '' || $file !== basename($file) || $file[0] === '.') {
    notFound();
}
// Only the narrower sizes the site itself asks for
if ($width !== '' && !in_array((int) $width, AMB_WEB_VARIANT_WIDTHS, true)) {
    notFound();
}
$width = (int) $width;

$extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
if (!in_array($extension, array('jpg', 'jpeg', 'png', 'gif'), true)) {
    notFound();
}

$baseDir = dirname(__DIR__) . '/baseImages/';
$webDir = $baseDir . 'web/';
$source = $baseDir . $file;
$webPath = $webDir . $file;
$serve = $width ? $webDir . $width . '/' . $file : $webPath;

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
        // Another request may have made them while this one waited. The
        // narrower copies are made from the full web copy, so that comes first.
        if (!is_file($webPath)) {
            createWebImage($source, $webPath);
        }
        if ($width && !is_file($serve)) {
            createWebImageVariant($webPath, $serve, $width);
        }
    } catch (Throwable $e) {
        // Show a bigger copy rather than a broken image, and try again later
        error_log('webImage.php: ' . ($width ? $width . '/' : '') . $file . ': ' . $e->getMessage());
        $serve = is_file($webPath) ? $webPath : $source;
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
// Same as the artwork rule in .htaccess
header('Cache-Control: public, max-age=' . ($isFallback ? 3600 : 2592000));
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($serve)) . ' GMT');
readfile($serve);
