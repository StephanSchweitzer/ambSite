<?php
// The public site shows a web-sized copy of each artwork (baseImages/web/),
// not the original upload, which can be up to 4000px and 1.2 MB. These
// limits are the copy's maximum size; the web pages, the link previews and
// the copy-maker below all read them from here so they always agree.
if (!defined('AMB_WEB_MAX_WIDTH')) {
    define('AMB_WEB_MAX_WIDTH', 1600);
    define('AMB_WEB_MAX_HEIGHT', 2400);
    define('AMB_WEB_JPEG_QUALITY', 82);
    // Narrower copies (baseImages/web/<width>/) so phones and ordinary
    // screens can download a picture closer to the size they show it at.
    // Same list as WEB_VARIANT_WIDTHS in photoFunctions.js.
    define('AMB_WEB_VARIANT_WIDTHS', array(800, 1200));
    // The largest upload accepted, in pixels on its longest side. The admin
    // pages shrink bigger pictures before sending them (MAX_SIDE in
    // imagePrep.js); this turns away anything that arrives bigger anyway.
    // A picture's memory use depends on its pixels, not its file size: a
    // 1 MB file can be 10000 x 14000 pixels and take over 500 MB to open.
    define('AMB_UPLOAD_MAX_SIDE', 4000);
    // The zoom copy (baseImages/web/zoom/): what the viewer loads when a
    // visitor zooms in, never the original itself. Made the first time
    // someone zooms into that work.
    define('AMB_ZOOM_MAX_SIDE', 4000);
    define('AMB_ZOOM_JPEG_QUALITY', 85);
}

// The message to show if an uploaded picture is over AMB_UPLOAD_MAX_SIDE,
// or null if it's fine. Reads only the file's header, so it's cheap even for
// a huge picture.
function uploadTooLargeMessage($path)
{
    $size = @getimagesize($path);
    if (!$size || max($size[0], $size[1]) <= AMB_UPLOAD_MAX_SIDE) {
        return null;
    }
    return 'This picture is ' . number_format($size[0]) . ' x ' . number_format($size[1])
        . ' pixels; the most the site takes is ' . number_format(AMB_UPLOAD_MAX_SIDE)
        . ' on the longest side. Please reload the page and try again: it will shrink the picture for you.';
}

// Size of the web copy for an original of $width x $height
function webImageSize($width, $height)
{
    return fitImageSize($width, $height, AMB_WEB_MAX_WIDTH, AMB_WEB_MAX_HEIGHT);
}

// $width x $height shrunk (never enlarged) to fit inside $maxWidth x $maxHeight
function fitImageSize($width, $height, $maxWidth, $maxHeight)
{
    $scale = min(1, $maxWidth / $width, $maxHeight / $height);
    return array(max(1, (int) round($width * $scale)), max(1, (int) round($height * $scale)));
}

// The limits for each kind of copy made by createWebImage()
function webCopyLimits()
{
    // keepUnder: an original already within the size is used as it is if
    // its file is at most this big
    return array('width' => AMB_WEB_MAX_WIDTH, 'height' => AMB_WEB_MAX_HEIGHT,
        'quality' => AMB_WEB_JPEG_QUALITY, 'keepUnder' => 600 * 1024);
}

function zoomCopyLimits()
{
    return array('width' => AMB_ZOOM_MAX_SIDE, 'height' => AMB_ZOOM_MAX_SIDE,
        'quality' => AMB_ZOOM_JPEG_QUALITY, 'keepUnder' => PHP_INT_MAX);
}

// GD decodes the whole original into memory (about 5 bytes per pixel, so a
// 140-megapixel scan needs ~700 MB). Only go ahead when both PHP and the
// server can spare that; otherwise the caller falls back to something safer.
function webImageMemoryAvailable($bytesNeeded)
{
    $serverFree = null;
    if (@is_readable('/proc/meminfo')) {
        $meminfo = @file_get_contents('/proc/meminfo');
        if ($meminfo && preg_match('/MemAvailable:\s+(\d+)\s+kB/', $meminfo, $m)) {
            $serverFree = (int) $m[1] * 1024;
        }
    }
    $ceiling = $serverFree !== null ? $serverFree * 0.6 : 512 * 1024 * 1024;
    if ($bytesNeeded > $ceiling) {
        return false;
    }

    $limit = trim((string) ini_get('memory_limit'));
    if ($limit === '-1') {
        return true;
    }
    $limitBytes = (int) $limit;
    $unit = strtolower(substr($limit, -1));
    if ($unit === 'g') { $limitBytes *= 1024 * 1024 * 1024; }
    if ($unit === 'm') { $limitBytes *= 1024 * 1024; }
    if ($unit === 'k') { $limitBytes *= 1024; }

    $wanted = memory_get_usage() + $bytesNeeded;
    if ($limitBytes >= $wanted) {
        return true;
    }
    return @ini_set('memory_limit', (string) ceil($wanted / 1048576) . 'M') !== false;
}

// Writes the web-sized copy of $sourcePath to $destPath (or, with
// zoomCopyLimits(), the zoom copy). Written to a temp file and renamed into
// place, so a visitor can never be served half a file.
function createWebImage($sourcePath, $destPath, $limits = null)
{
    $limits = $limits ?: webCopyLimits();
    $info = @getimagesize($sourcePath);
    if (!$info) {
        throw new Exception('Not a readable image');
    }
    list($width, $height, $type) = $info;
    list($newWidth, $newHeight) = fitImageSize($width, $height, $limits['width'], $limits['height']);

    $dir = dirname($destPath);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new Exception('Could not create ' . $dir);
    }

    $tmpPath = $destPath . '.tmp' . getmypid();
    $finish = function () use ($tmpPath, $destPath) {
        if (!@rename($tmpPath, $destPath)) {
            @unlink($tmpPath);
            throw new Exception('Could not save web image');
        }
    };

    // Already small, or a GIF (re-encoding would drop any animation): the
    // original bytes are fine as they are
    if ($type === IMAGETYPE_GIF || ($newWidth === $width && filesize($sourcePath) <= $limits['keepUnder'])) {
        if (!@copy($sourcePath, $tmpPath)) {
            throw new Exception('Could not write web image');
        }
        $finish();
        return;
    }

    if ($type !== IMAGETYPE_JPEG && $type !== IMAGETYPE_PNG) {
        throw new Exception('Unsupported image type');
    }

    if (!webImageMemoryAvailable($width * $height * 5 + 64 * 1024 * 1024)) {
        if (class_exists('Imagick')) {
            // ImageMagick can decode a JPEG at reduced size, so it copes with
            // giant scans in a fraction of the memory
            $im = new Imagick();
            if ($type === IMAGETYPE_JPEG) {
                $im->setOption('jpeg:size', ($newWidth * 2) . 'x' . ($newHeight * 2));
            }
            $im->readImage($sourcePath);
            $im->thumbnailImage($newWidth, $newHeight);
            if ($type === IMAGETYPE_JPEG) {
                $im->setImageFormat('jpeg');
                $im->setImageCompressionQuality($limits['quality']);
                $im->setInterlaceScheme(Imagick::INTERLACE_PLANE);
            } else {
                $im->setImageFormat('png');
            }
            $im->writeImage($tmpPath);
            $im->clear();
        } else {
            // No safe way to shrink it here — use the original rather than
            // risk running the server out of memory
            if (!@copy($sourcePath, $tmpPath)) {
                throw new Exception('Could not write web image');
            }
        }
        $finish();
        return;
    }

    $src = $type === IMAGETYPE_JPEG ? @imagecreatefromjpeg($sourcePath) : @imagecreatefrompng($sourcePath);
    if (!$src) {
        throw new Exception('Could not decode image');
    }

    $dst = imagecreatetruecolor($newWidth, $newHeight);
    if ($type === IMAGETYPE_PNG) {
        // Keep transparency
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
    }
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    imagedestroy($src);

    if ($type === IMAGETYPE_JPEG) {
        imageinterlace($dst, 1);
        $ok = imagejpeg($dst, $tmpPath, $limits['quality']);
    } else {
        $ok = imagepng($dst, $tmpPath, 6);
    }
    imagedestroy($dst);

    if (!$ok) {
        @unlink($tmpPath);
        throw new Exception('Could not encode web image');
    }
    $finish();
}

// Writes a copy of the web copy ($webPath) that is $width pixels wide. Made
// from the web copy, not the original, so it's quick and needs little memory.
function createWebImageVariant($webPath, $destPath, $width)
{
    $info = @getimagesize($webPath);
    if (!$info) {
        throw new Exception('Not a readable image');
    }
    list($srcWidth, $srcHeight, $type) = $info;

    $dir = dirname($destPath);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new Exception('Could not create ' . $dir);
    }

    $tmpPath = $destPath . '.tmp' . getmypid();

    // Already narrow enough, or a GIF (keep any animation): use it as it is
    if ($type === IMAGETYPE_GIF || $srcWidth <= $width) {
        if (!@copy($webPath, $tmpPath) || !@rename($tmpPath, $destPath)) {
            @unlink($tmpPath);
            throw new Exception('Could not save web image copy');
        }
        return;
    }
    if ($type !== IMAGETYPE_JPEG && $type !== IMAGETYPE_PNG) {
        throw new Exception('Unsupported image type');
    }

    $newHeight = max(1, (int) round($srcHeight * $width / $srcWidth));
    if (!webImageMemoryAvailable(($srcWidth * $srcHeight + $width * $newHeight) * 5 + 32 * 1024 * 1024)) {
        throw new Exception('Not enough memory');
    }

    $src = $type === IMAGETYPE_JPEG ? @imagecreatefromjpeg($webPath) : @imagecreatefrompng($webPath);
    if (!$src) {
        throw new Exception('Could not decode image');
    }
    $dst = imagecreatetruecolor($width, $newHeight);
    if ($type === IMAGETYPE_PNG) {
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
    }
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $width, $newHeight, $srcWidth, $srcHeight);
    imagedestroy($src);

    if ($type === IMAGETYPE_JPEG) {
        imageinterlace($dst, 1);
        $ok = imagejpeg($dst, $tmpPath, AMB_WEB_JPEG_QUALITY);
    } else {
        $ok = imagepng($dst, $tmpPath, 6);
    }
    imagedestroy($dst);

    if (!$ok || !@rename($tmpPath, $destPath)) {
        @unlink($tmpPath);
        throw new Exception('Could not save web image copy');
    }
}

// Every narrower copy of the web copy, made now (at upload) rather than on
// the first visit. Failures are left for webImage.php to retry later.
function createWebImageVariants($webPath, $webDir, $fileName)
{
    foreach (AMB_WEB_VARIANT_WIDTHS as $width) {
        try {
            createWebImageVariant($webPath, $webDir . $width . '/' . $fileName, $width);
        } catch (Throwable $e) {
            error_log('Web copy ' . $width . ' not made for ' . $fileName . ': ' . $e->getMessage());
        }
    }
}

// Where every copy of an artwork lives, relative to html/actions/ — used to
// keep upload names unique and to clean up after a permanent delete
function artworkImageDirs()
{
    $dirs = array('../baseImages/', '../baseImages/web/', '../baseImages/web/zoom/', '../thumbnails/');
    foreach (AMB_WEB_VARIANT_WIDTHS as $width) {
        $dirs[] = '../baseImages/web/' . $width . '/';
    }
    return $dirs;
}

function createAndSaveThumbnail($filePath, $targetDirectory, $fileName, $newWidth = 400) {
    $info = @getimagesize($filePath);
    if (!$info) {
        throw new Exception('Not a readable image');
    }
    list($width, $height, $type) = $info;

    // Keep the aspect ratio. GD wants whole pixels.
    $newHeight = max(1, (int) round($height * $newWidth / $width));

    switch ($type) {
        case IMAGETYPE_JPEG:
            $srcImage = @imagecreatefromjpeg($filePath);
            break;
        case IMAGETYPE_PNG:
            $srcImage = @imagecreatefrompng($filePath);
            break;
        case IMAGETYPE_GIF:
            $srcImage = @imagecreatefromgif($filePath);
            break;
        default:
            throw new Exception('Unsupported file type');
    }
    if (!$srcImage) {
        throw new Exception('Could not decode image');
    }

    $thumbImage = imagecreatetruecolor($newWidth, $newHeight);
    imagecopyresampled($thumbImage, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    $savePath = $targetDirectory . $fileName;
    $ok = imagejpeg($thumbImage, $savePath, 90);

    imagedestroy($srcImage);
    imagedestroy($thumbImage);

    if (!$ok) {
        throw new Exception('Could not save thumbnail');
    }
    return "Thumbnail created at: " . $savePath;
}

function convertToProgressiveJPEGAndUpload($sourcePath, $destinationPath) {
    $imageInfo = @getimagesize($sourcePath);
    if (!$imageInfo) {
        throw new Exception('Not a readable image');
    }
    $imageType = $imageInfo[2];

    switch ($imageType) {
        case IMAGETYPE_JPEG:
            $image = @imagecreatefromjpeg($sourcePath);
            break;
        case IMAGETYPE_PNG:
            $image = @imagecreatefrompng($sourcePath);
            break;
        case IMAGETYPE_GIF:
            $image = @imagecreatefromgif($sourcePath);
            break;
        default:
            throw new Exception('Unsupported image type.');
    }
    if (!$image) {
        throw new Exception('Could not decode image');
    }

    // Phone photos are often stored sideways with a note saying which way is
    // up. GD ignores that note and the re-saved file drops it, so turn the
    // picture upright here.
    if ($imageType === IMAGETYPE_JPEG) {
        $image = applyExifOrientation($image, $sourcePath);
    }

    // PNG and GIF become JPEG on a white background (JPEG has no transparency)
    if ($imageType !== IMAGETYPE_JPEG) {
        $bg = imagecreatetruecolor(imagesx($image), imagesy($image));
        imagefill($bg, 0, 0, imagecolorallocate($bg, 255, 255, 255));
        imagecopy($bg, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));
        imagedestroy($image);
        $image = $bg;
    }

    // Progressive JPEG
    imageinterlace($image, 1);
    $ok = imagejpeg($image, $destinationPath, 90);
    imagedestroy($image);

    if (!$ok) {
        throw new Exception('Could not save image');
    }
}

// Turns a decoded JPEG upright according to its EXIF orientation tag
function applyExifOrientation($image, $sourcePath)
{
    if (!function_exists('exif_read_data')) {
        return $image;
    }
    $exif = @exif_read_data($sourcePath);
    $orientation = is_array($exif) && isset($exif['Orientation']) ? (int) $exif['Orientation'] : 1;

    $rotate = function ($img, $angle) {
        $rotated = imagerotate($img, $angle, 0);
        if ($rotated === false) {
            return $img;
        }
        imagedestroy($img);
        return $rotated;
    };

    switch ($orientation) {
        case 2: imageflip($image, IMG_FLIP_HORIZONTAL); break;
        case 3: $image = $rotate($image, 180); break;
        case 4: imageflip($image, IMG_FLIP_VERTICAL); break;
        case 5: imageflip($image, IMG_FLIP_VERTICAL); $image = $rotate($image, -90); break;
        case 6: $image = $rotate($image, -90); break;
        case 7: imageflip($image, IMG_FLIP_HORIZONTAL); $image = $rotate($image, -90); break;
        case 8: $image = $rotate($image, 90); break;
    }
    return $image;
}
