<?php
// Serves a web-sized copy of an artwork, making it the first time it's asked
// for. .htaccess only sends /baseImages/web/<file> (the full web copy),
// /baseImages/web/<width>/<file> (a narrower one) and
// /baseImages/web/zoom/<file> (the bigger copy for zooming in) here while
// that file does not exist yet; once it has been written, Apache serves it
// as a plain file.
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
$zoom = !empty($_GET['zoom']);

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
$serve = $zoom ? $webDir . 'zoom/' . $file : ($width ? $webDir . $width . '/' . $file : $webPath);

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
        // zoom copy is made from the original; the narrower copies from the
        // full web copy, so that comes first.
        if ($zoom) {
            if (!is_file($serve)) {
                createWebImage($source, $serve, zoomCopyLimits());
            }
        } elseif (!is_file($webPath)) {
            createWebImage($source, $webPath);
        }
        if (!$zoom && $width && !is_file($serve)) {
            createWebImageVariant($webPath, $serve, $width);
        }
    } catch (Throwable $e) {
        // Show a bigger copy rather than a broken image, and try again later
        error_log('webImage.php: ' . ($zoom ? 'zoom/' : ($width ? $width . '/' : '')) . $file . ': ' . $e->getMessage());
        $serve = is_file($webPath) ? $webPath : $source;
        $isFallback = true;
    }
    if ($lock) {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

// A zoom copy that couldn't be made is never replaced by the original
// itself, which can be big enough to crash a phone: the viewer just keeps
// the copy it's already showing
if ($zoom && $isFallback && $serve === $source) {
    notFound();
}

$info = @getimagesize($serve);
header('Content-Type: ' . ($info ? $info['mime'] : 'application/octet-stream'));
header('Content-Length: ' . filesize($serve));
// Same as the artwork rule in .htaccess
header('Cache-Control: public, max-age=' . ($isFallback ? 3600 : 2592000));
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($serve)) . ' GMT');
readfile($serve);
