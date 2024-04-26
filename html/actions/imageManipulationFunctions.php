<?php
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

