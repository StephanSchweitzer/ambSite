<?php
// The public site shows a web-sized copy of each artwork (baseImages/web/),
// not the original upload, which is often 4000-14000px and several MB. These
// limits are the copy's maximum size; the web pages, the link previews and
// the copy-maker below all read them from here so they always agree.
if (!defined('AMB_WEB_MAX_WIDTH')) {
    define('AMB_WEB_MAX_WIDTH', 1600);
    define('AMB_WEB_MAX_HEIGHT', 2400);
    define('AMB_WEB_JPEG_QUALITY', 82);
}

// Size of the web copy for an original of $width x $height
function webImageSize($width, $height)
{
    $scale = min(1, AMB_WEB_MAX_WIDTH / $width, AMB_WEB_MAX_HEIGHT / $height);
    return array(max(1, (int) round($width * $scale)), max(1, (int) round($height * $scale)));
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

// Writes the web-sized copy of $sourcePath to $destPath. Written to a temp
// file and renamed into place, so a visitor can never be served half a file.
function createWebImage($sourcePath, $destPath)
{
    $info = @getimagesize($sourcePath);
    if (!$info) {
        throw new Exception('Not a readable image');
    }
    list($width, $height, $type) = $info;
    list($newWidth, $newHeight) = webImageSize($width, $height);

    $tmpPath = $destPath . '.tmp' . getmypid();
    $finish = function () use ($tmpPath, $destPath) {
        if (!@rename($tmpPath, $destPath)) {
            @unlink($tmpPath);
            throw new Exception('Could not save web image');
        }
    };

    // Already small, or a GIF (re-encoding would drop any animation): the
    // original bytes are fine as they are
    if ($type === IMAGETYPE_GIF || ($newWidth === $width && filesize($sourcePath) <= 600 * 1024)) {
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
                $im->setImageCompressionQuality(AMB_WEB_JPEG_QUALITY);
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
        $ok = imagejpeg($dst, $tmpPath, AMB_WEB_JPEG_QUALITY);
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

function createAndSaveThumbnail($filePath, $targetDirectory, $fileName, $newWidth = 400) {
    // Get the original image's dimensions and type
    list($width, $height, $type) = getimagesize($filePath);

    // Calculate new dimensions to maintain aspect ratio
    $ratio = $newWidth / $width;
    $newHeight = $height * $ratio;

    // Create image resource of the original image based on its type
    switch ($type) {
        case IMAGETYPE_JPEG:
            $srcImage = imagecreatefromjpeg($filePath);
            break;
        case IMAGETYPE_PNG:
            $srcImage = imagecreatefrompng($filePath);
            break;
        case IMAGETYPE_GIF:
            $srcImage = imagecreatefromgif($filePath);
            break;
        default:
            die("Unsupported file type");
    }

    // Create a new true color image
    $thumbImage = imagecreatetruecolor($newWidth, $newHeight);

    // Copy and resize the old image into the new image
    imagecopyresampled($thumbImage, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    // Save the resized image to the target directory with the original file name
    $savePath = $targetDirectory . $fileName;
    imagejpeg($thumbImage, $savePath, 90); // Adjust compression quality as needed

    // Clear memory
    imagedestroy($srcImage);
    imagedestroy($thumbImage);

    return "Thumbnail created at: " . $savePath;
}

function convertToProgressiveJPEGAndUpload($sourcePath, $destinationPath) {
    // Determine the type of the source image
    $imageInfo = getimagesize($sourcePath);
    $imageType = $imageInfo[2];

    // Create an image resource from the source image based on its type
    switch ($imageType) {
        case IMAGETYPE_JPEG:
            $image = imagecreatefromjpeg($sourcePath);
            break;
        case IMAGETYPE_PNG:
            $image = imagecreatefrompng($sourcePath);
            // Convert PNG to JPEG
            $bg = imagecreatetruecolor(imagesx($image), imagesy($image));
            imagefill($bg, 0, 0, imagecolorallocate($bg, 255, 255, 255));
            imagecopy($bg, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));
            imagedestroy($image);
            $image = $bg;
            break;
        case IMAGETYPE_GIF:
            $image = imagecreatefromgif($sourcePath);
            // Convert GIF to JPEG
            $bg = imagecreatetruecolor(imagesx($image), imagesy($image));
            imagefill($bg, 0, 0, imagecolorallocate($bg, 255, 255, 255));
            imagecopy($bg, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));
            imagedestroy($image);
            $image = $bg;
            break;
        default:
            throw new Exception('Unsupported image type.');
    }

    // Enable interlacing for progressive JPEGs
    imageinterlace($image, 1);

    // Save the image as a progressive JPEG
    imagejpeg($image, $destinationPath, 90); // Set quality as needed, typically between 75-90 is good for web

    // Free up memory
    imagedestroy($image);
}

